-- Waybill: fixes from end-to-end testing (16 Nov 2026)
--
--   * Customers can see their tracking number once a shipment exists.
--   * A payment that lands on a booking that is no longer waiting for one
--     (declined, already paid, a stale checkout tab) is kept, but flagged
--     for refund so staff see it.
--   * Cancelling a shipment from a paid booking flags that payment for refund.
--   * Admins can mark a flagged payment as refunded.
--   * Delivered shipments' details are locked.

-- ---------------------------------------------------------------------------
-- Refund tracking
-- ---------------------------------------------------------------------------

alter table public.payments
  add column refund_needed boolean not null default false,
  add column refunded_at timestamptz,
  add constraint payments_refunded_only_if_needed
    check (refunded_at is null or refund_needed);

create or replace function public.record_payment_result(
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
  v_booking_status public.booking_status;
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

    select b.status into v_booking_status
    from public.bookings b
    where b.id = v_payment.booking_id
    for update;

    -- Money arrived for a booking that no longer wanted it (declined, already
    -- paid, or a checkout tab left open): keep the record and flag it.
    update public.payments
    set status = 'success',
        paid_at = coalesce(p_paid_at, now()),
        channel = left(p_channel, 40),
        gateway_response = left(p_gateway_response, 200),
        refund_needed = v_booking_status <> 'awaiting_payment'
    where id = v_payment.id;

    if v_booking_status = 'awaiting_payment' then
      update public.bookings set status = 'paid' where id = v_payment.booking_id;
      return 'paid';
    end if;
    return 'refund_needed';
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

-- Cancelling a shipment that came from a paid booking means the money should go back.
create function public.flag_refund_on_cancel()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.cancelled_at is null and new.cancelled_at is not null then
    update public.payments p
    set refund_needed = true
    from public.bookings b
    where b.shipment_id = new.id
      and p.booking_id = b.id
      and p.status = 'success'
      and p.refunded_at is null;
  end if;
  return null;
end;
$$;

create trigger shipments_flag_refund_on_cancel
  after update of cancelled_at on public.shipments
  for each row execute function public.flag_refund_on_cancel();

create function public.mark_payment_refunded(p_paystack_reference text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not (select public.is_admin()) then
    raise exception 'Only admins can mark refunds.' using errcode = '42501';
  end if;

  update public.payments
  set refunded_at = now()
  where paystack_reference = p_paystack_reference
    and refund_needed
    and refunded_at is null;

  return found;
end;
$$;

revoke all on function public.mark_payment_refunded(text) from public, anon;
grant execute on function public.mark_payment_refunded(text) to authenticated;

-- ---------------------------------------------------------------------------
-- What the customer's booking page can show
-- ---------------------------------------------------------------------------

create or replace function public.booking_for_payment(p_server_key text, p_reference text)
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
      ),
      'trackingNumber', (
        select s.tracking_number from public.shipments s where s.id = b.shipment_id
      ),
      'latestAttempt', (
        select jsonb_build_object('reference', p.paystack_reference, 'status', p.status)
        from public.payments p
        where p.booking_id = b.id
        order by p.created_at desc
        limit 1
      )
    )
    from public.bookings b
    where b.reference = p_reference
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Delivered shipments are finished: lock their details
-- ---------------------------------------------------------------------------

create or replace function public.check_shipment_update()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_delivered boolean;
begin
  if old.cancelled_at is not null then
    raise exception 'This shipment was cancelled, so it cannot be changed.'
      using errcode = 'P0001';
  end if;

  if new.tracking_number <> old.tracking_number
    or new.origin_city <> old.origin_city
    or new.origin_country <> old.origin_country
    or new.origin_hub <> old.origin_hub
    or new.destination_city <> old.destination_city
    or new.destination_country <> old.destination_country
    or new.destination_hub <> old.destination_hub
    or new.service <> old.service then
    raise exception 'The tracking number, route and service cannot change after booking. Cancel and book again instead.'
      using errcode = 'P0001';
  end if;

  v_delivered := exists (
    select 1 from public.tracking_events e
    where e.shipment_id = old.id and e.stage = 'delivered'
  );

  if v_delivered and new.cancelled_at is not null then
    raise exception 'A delivered shipment cannot be cancelled.'
      using errcode = 'P0001';
  end if;

  if v_delivered and (
    new.carrier <> old.carrier
    or new.weight_kg <> old.weight_kg
    or new.pieces <> old.pieces
    or new.contents <> old.contents
    or new.estimated_delivery <> old.estimated_delivery
  ) then
    raise exception 'This shipment is delivered, so its details are locked.'
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;
