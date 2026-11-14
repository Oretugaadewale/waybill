-- Waybill: customer bookings (Stage 4)
--
-- Security model
--   * The public can create a booking, but only through submit_booking(), which
--     checks every field and limits how many bookings one email can send.
--   * Nobody but an admin can read a booking: they hold names, phone numbers
--     and addresses.
--   * Admins can only move a booking on (convert it to a shipment, or decline
--     it). The customer's details cannot be edited afterwards.
--   * The price is worked out by the server from the rate card. The stored
--     quote is a record of what the customer saw; payment (Stage 5) always
--     recomputes the amount, so a forged quote gains nothing.

create type public.booking_status as enum (
  'awaiting_payment',
  'paid',
  'converted',
  'declined'
);

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique check (reference ~ '^BK-[A-HJ-NP-Z2-9]{6}$'),
  status public.booking_status not null default 'awaiting_payment',

  service public.service_level not null,
  origin_country char(2) not null check (origin_country in ('NG', 'CN')),
  destination_country char(2) not null check (destination_country ~ '^[A-Z]{2}$'),
  destination_city text not null check (length(destination_city) between 1 and 80),

  weight_kg numeric(8, 2) not null check (weight_kg > 0 and weight_kg <= 5000),
  length_cm numeric(6, 1) check (length_cm > 0 and length_cm <= 300),
  width_cm numeric(6, 1) check (width_cm > 0 and width_cm <= 300),
  height_cm numeric(6, 1) check (height_cm > 0 and height_cm <= 300),
  pieces integer not null default 1 check (pieces between 1 and 99),
  contents text not null check (length(contents) between 1 and 200),
  declared_value_minor bigint not null check (declared_value_minor >= 0),

  collection text not null check (collection in ('drop_off', 'pickup')),
  pickup_address text check (length(pickup_address) between 5 and 300),

  sender_name text not null check (length(sender_name) between 2 and 100),
  sender_phone text not null check (sender_phone ~ '^\+?[0-9 ()-]{7,20}$'),
  sender_email text not null check (sender_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' and length(sender_email) <= 254),
  receiver_name text not null check (length(receiver_name) between 2 and 100),
  receiver_phone text not null check (receiver_phone ~ '^\+?[0-9 ()-]{7,20}$'),
  receiver_email text check (receiver_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' and length(receiver_email) <= 254),
  receiver_address text not null check (length(receiver_address) between 5 and 300),

  currency char(3) not null default 'NGN' check (currency = 'NGN'),
  quote jsonb not null,
  total_minor bigint not null check (total_minor > 0),
  rate_card_version text not null,

  shipment_id uuid unique references public.shipments (id),
  decline_reason text check (length(decline_reason) between 1 and 300),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint bookings_dimensions_all_or_none
    check (num_nulls(length_cm, width_cm, height_cm) in (0, 3)),
  constraint bookings_pickup_needs_address
    check ((collection = 'pickup') = (pickup_address is not null)),
  constraint bookings_declined_needs_reason
    check ((status = 'declined') = (decline_reason is not null)),
  constraint bookings_converted_has_shipment
    check ((status = 'converted') = (shipment_id is not null)),
  constraint bookings_route
    check (
      origin_country <> destination_country
      and (service <> 'Sea Freight'
        or (origin_country = 'NG' and destination_country in ('US', 'CA', 'GB')))
    )
);

create index bookings_status_created_at_idx on public.bookings (status, created_at desc);
create index bookings_sender_email_created_at_idx on public.bookings (lower(sender_email), created_at desc);

comment on table public.bookings is
  'Customer booking requests. Admin-only reads; the public writes through submit_booking().';

create trigger bookings_set_updated_at
  before update on public.bookings
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Admins may only move a booking on, never rewrite what the customer sent
-- ---------------------------------------------------------------------------

create function public.check_booking_update()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_editable constant text[] := array['status', 'decline_reason', 'shipment_id', 'updated_at'];
begin
  if old.status in ('converted', 'declined') then
    raise exception 'This booking is already closed, so it cannot change.'
      using errcode = 'P0001';
  end if;

  if (to_jsonb(new) - v_editable) <> (to_jsonb(old) - v_editable) then
    raise exception 'The customer''s booking details cannot be edited.'
      using errcode = 'P0001';
  end if;

  if new.status = 'awaiting_payment' and old.status <> 'awaiting_payment' then
    raise exception 'A booking cannot go back to awaiting payment.'
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;

create trigger bookings_check_update
  before update on public.bookings
  for each row execute function public.check_booking_update();

-- ---------------------------------------------------------------------------
-- Public entry point
-- ---------------------------------------------------------------------------

create function public.submit_booking(
  p_service public.service_level,
  p_origin_country text,
  p_destination_country text,
  p_destination_city text,
  p_weight_kg numeric,
  p_length_cm numeric,
  p_width_cm numeric,
  p_height_cm numeric,
  p_pieces integer,
  p_contents text,
  p_declared_value_minor bigint,
  p_collection text,
  p_pickup_address text,
  p_sender_name text,
  p_sender_phone text,
  p_sender_email text,
  p_receiver_name text,
  p_receiver_phone text,
  p_receiver_email text,
  p_receiver_address text,
  p_quote jsonb,
  p_total_minor bigint,
  p_rate_card_version text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_reference text;
  v_recent integer;
  v_inserted uuid;
begin
  -- Simple abuse limit: at most 5 bookings an hour from one email address.
  select count(*) into v_recent
  from public.bookings b
  where lower(b.sender_email) = lower(trim(p_sender_email))
    and b.created_at > now() - interval '1 hour';

  if v_recent >= 5 then
    raise exception 'Too many bookings from this email in the last hour. Try again later or contact us.'
      using errcode = 'P0001';
  end if;

  for attempt in 1..20 loop
    v_reference := 'BK-';
    for i in 1..6 loop
      v_reference := v_reference || substr(v_alphabet, 1 + floor(random() * length(v_alphabet))::int, 1);
    end loop;

    insert into public.bookings (
      reference, service, origin_country, destination_country, destination_city,
      weight_kg, length_cm, width_cm, height_cm, pieces, contents, declared_value_minor,
      collection, pickup_address,
      sender_name, sender_phone, sender_email,
      receiver_name, receiver_phone, receiver_email, receiver_address,
      quote, total_minor, rate_card_version
    )
    values (
      v_reference, p_service, upper(trim(p_origin_country)), upper(trim(p_destination_country)), trim(p_destination_city),
      p_weight_kg, p_length_cm, p_width_cm, p_height_cm, p_pieces, trim(p_contents), p_declared_value_minor,
      p_collection, nullif(trim(p_pickup_address), ''),
      trim(p_sender_name), trim(p_sender_phone), lower(trim(p_sender_email)),
      trim(p_receiver_name), trim(p_receiver_phone), nullif(lower(trim(p_receiver_email)), ''), trim(p_receiver_address),
      p_quote, p_total_minor, p_rate_card_version
    )
    on conflict (reference) do nothing
    returning id into v_inserted;

    exit when v_inserted is not null;
  end loop;

  if v_inserted is null then
    raise exception 'Could not create a booking reference. Try again.' using errcode = 'P0001';
  end if;

  return v_reference;
exception
  when check_violation or not_null_violation or invalid_text_representation then
    raise exception 'Some booking details are not valid. Check the form and try again.'
      using errcode = 'P0001';
end;
$$;

revoke all on function public.submit_booking(
  public.service_level, text, text, text, numeric, numeric, numeric, numeric, integer, text,
  bigint, text, text, text, text, text, text, text, text, text, jsonb, bigint, text
) from public;
grant execute on function public.submit_booking(
  public.service_level, text, text, text, numeric, numeric, numeric, numeric, integer, text,
  bigint, text, text, text, text, text, text, text, text, text, jsonb, bigint, text
) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Turn a booking into a shipment, in one transaction
-- ---------------------------------------------------------------------------

create function public.convert_booking(
  p_reference text,
  p_origin_city text,
  p_origin_hub text,
  p_destination_hub text,
  p_carrier text,
  p_estimated_delivery date,
  p_booked_location text,
  p_booked_offset_minutes smallint
)
returns text
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_booking public.bookings%rowtype;
  v_tracking_number text;
begin
  if not (select public.is_admin()) then
    raise exception 'Only admins can convert bookings.' using errcode = '42501';
  end if;

  select * into v_booking
  from public.bookings b
  where b.reference = p_reference
  for update;

  if not found then
    raise exception 'That booking does not exist.' using errcode = 'P0001';
  end if;

  if v_booking.status not in ('awaiting_payment', 'paid') then
    raise exception 'This booking is already closed.' using errcode = 'P0001';
  end if;

  v_tracking_number := public.create_shipment(
    p_origin_city, v_booking.origin_country, p_origin_hub,
    v_booking.destination_city, v_booking.destination_country, p_destination_hub,
    v_booking.service, p_carrier, v_booking.weight_kg, v_booking.pieces,
    v_booking.contents, p_estimated_delivery, p_booked_location, p_booked_offset_minutes
  );

  update public.bookings
  set status = 'converted',
      shipment_id = (select s.id from public.shipments s where s.tracking_number = v_tracking_number)
  where id = v_booking.id;

  return v_tracking_number;
end;
$$;

revoke all on function public.convert_booking(text, text, text, text, text, date, text, smallint)
  from public, anon;
grant execute on function public.convert_booking(text, text, text, text, text, date, text, smallint)
  to authenticated;

-- ---------------------------------------------------------------------------
-- Grants and Row Level Security
-- ---------------------------------------------------------------------------

revoke all on public.bookings from anon;
revoke all on public.bookings from authenticated;
grant select, update on public.bookings to authenticated;

alter table public.bookings enable row level security;

create policy "Admins can read bookings"
  on public.bookings for select to authenticated
  using ((select public.is_admin()));

create policy "Admins can update bookings"
  on public.bookings for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));
