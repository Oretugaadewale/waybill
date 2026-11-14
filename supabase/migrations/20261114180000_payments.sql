-- Waybill: Paystack payments (Stage 5)
--
-- Security model
--   * The app talks to the database with the public key, so the database needs
--     another way to know a request really comes from the Waybill server, and
--     not from a customer trying to mark their own booking as paid.
--   * That is the server key: a random secret held only in Vercel. The database
--     stores just its SHA-256 hash in a schema the Data API cannot see.
--   * Every payment function demands the server key. The server only calls
--     record_payment_result() after Paystack itself has confirmed the payment,
--     by verifying it over the Paystack API or by a signed webhook.
--   * Amounts are checked in kobo against the booking at every step.

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table private.server_keys (
  id smallint primary key default 1 check (id = 1),
  key_hash text not null check (key_hash ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now()
);

-- Not reachable through the Data API anyway; Row Level Security with no
-- policies is a second lock.
alter table private.server_keys enable row level security;

-- Run once in the SQL editor (as the database owner). It returns a new key a
-- single time and keeps only its hash. Running it again replaces the key.
create function public.create_server_key()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_key text := 'wbk_' || replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
begin
  insert into private.server_keys (id, key_hash)
  values (1, encode(sha256(convert_to(v_key, 'UTF8')), 'hex'))
  on conflict (id) do update set key_hash = excluded.key_hash, created_at = now();
  return v_key;
end;
$$;

revoke all on function public.create_server_key() from public, anon, authenticated;

create function private.require_server_key(p_key text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_key is null or not exists (
    select 1 from private.server_keys k
    where k.key_hash = encode(sha256(convert_to(p_key, 'UTF8')), 'hex')
  ) then
    raise exception 'Not allowed.' using errcode = '42501';
  end if;
end;
$$;

revoke all on function private.require_server_key(text) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Payments
-- ---------------------------------------------------------------------------

create type public.payment_status as enum ('initialized', 'success', 'failed', 'abandoned');

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings (id),
  paystack_reference text not null unique
    check (paystack_reference ~ '^[A-Za-z0-9.=-]{8,100}$'),
  amount_minor bigint not null check (amount_minor > 0),
  currency char(3) not null default 'NGN' check (currency = 'NGN'),
  status public.payment_status not null default 'initialized',
  channel text check (length(channel) <= 40),
  gateway_response text check (length(gateway_response) <= 200),
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint payments_paid_at_when_success check ((status = 'success') = (paid_at is not null))
);

create index payments_booking_id_idx on public.payments (booking_id, created_at desc);

comment on table public.payments is
  'One row per Paystack payment attempt. Written only through functions that need the server key.';

create trigger payments_set_updated_at
  before update on public.payments
  for each row execute function public.set_updated_at();

revoke all on public.payments from anon, authenticated;
grant select on public.payments to authenticated;

alter table public.payments enable row level security;

create policy "Admins can read payments"
  on public.payments for select to authenticated
  using ((select public.is_admin()));

-- ---------------------------------------------------------------------------
-- What the payment page and Paystack need to know about a booking
-- ---------------------------------------------------------------------------

create function public.booking_for_payment(p_server_key text, p_reference text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform private.require_server_key(p_server_key);

  return (
    select jsonb_build_object(
      'reference', b.reference,
      'status', b.status,
      'service', b.service,
      'originCountry', b.origin_country,
      'destinationCountry', b.destination_country,
      'destinationCity', b.destination_city,
      'weightKg', b.weight_kg,
      'lengthCm', b.length_cm,
      'widthCm', b.width_cm,
      'heightCm', b.height_cm,
      'collection', b.collection,
      'senderEmail', b.sender_email,
      'totalMinor', b.total_minor,
      'paidAt', (
        select max(p.paid_at) from public.payments p
        where p.booking_id = b.id and p.status = 'success'
      )
    )
    from public.bookings b
    where b.reference = p_reference
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Record that a Paystack transaction was started for a booking
-- ---------------------------------------------------------------------------

create function public.start_payment(
  p_server_key text,
  p_reference text,
  p_paystack_reference text,
  p_amount_minor bigint
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_booking public.bookings%rowtype;
begin
  perform private.require_server_key(p_server_key);

  select * into v_booking from public.bookings b where b.reference = p_reference for update;
  if not found then
    raise exception 'That booking does not exist.' using errcode = 'P0001';
  end if;
  if v_booking.status <> 'awaiting_payment' then
    raise exception 'This booking is not waiting for payment.' using errcode = 'P0001';
  end if;
  if p_amount_minor <> v_booking.total_minor then
    raise exception 'The amount does not match the booking.' using errcode = 'P0001';
  end if;

  insert into public.payments (booking_id, paystack_reference, amount_minor)
  values (v_booking.id, p_paystack_reference, p_amount_minor);
end;
$$;

-- ---------------------------------------------------------------------------
-- Record what Paystack said about a transaction. Safe to call more than once:
-- the redirect back and the webhook usually both arrive.
-- ---------------------------------------------------------------------------

create function public.record_payment_result(
  p_server_key text,
  p_paystack_reference text,
  p_status text,
  p_amount_minor bigint,
  p_currency text,
  p_paid_at timestamptz,
  p_channel text,
  p_gateway_response text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_payment public.payments%rowtype;
begin
  perform private.require_server_key(p_server_key);

  select * into v_payment
  from public.payments p
  where p.paystack_reference = p_paystack_reference
  for update;

  if not found then
    raise exception 'Unknown payment reference.' using errcode = 'P0001';
  end if;

  if v_payment.status = 'success' then
    return 'already_paid';
  end if;

  if p_status = 'success' then
    if p_amount_minor is distinct from v_payment.amount_minor or p_currency is distinct from 'NGN' then
      raise exception 'Paid amount does not match the payment.' using errcode = 'P0001';
    end if;

    update public.payments
    set status = 'success',
        paid_at = coalesce(p_paid_at, now()),
        channel = left(p_channel, 40),
        gateway_response = left(p_gateway_response, 200)
    where id = v_payment.id;

    update public.bookings
    set status = 'paid'
    where id = v_payment.booking_id and status = 'awaiting_payment';

    return 'paid';
  end if;

  if p_status in ('failed', 'abandoned') then
    update public.payments
    set status = p_status::public.payment_status,
        channel = left(p_channel, 40),
        gateway_response = left(p_gateway_response, 200)
    where id = v_payment.id;
    return p_status;
  end if;

  return 'pending';
end;
$$;

-- The server reaches these with the public key; without the server key they
-- refuse to do anything.
revoke all on function public.booking_for_payment(text, text) from public;
revoke all on function public.start_payment(text, text, text, bigint) from public;
revoke all on function public.record_payment_result(text, text, text, bigint, text, timestamptz, text, text) from public;
grant execute on function public.booking_for_payment(text, text) to anon, authenticated;
grant execute on function public.start_payment(text, text, text, bigint) to anon, authenticated;
grant execute on function public.record_payment_result(text, text, text, bigint, text, timestamptz, text, text) to anon, authenticated;
