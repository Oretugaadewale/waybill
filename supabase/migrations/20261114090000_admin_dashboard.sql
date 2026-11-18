-- Waybill: admin dashboard (Stage 3)
--
-- The rules that keep tracking honest live here, in the database, so they hold
-- no matter which client writes: the admin pages, the SQL editor or a script.
--   * Stages only move forward. In transit and at customs may repeat.
--   * Scans are in time order and not in the future.
--   * Delivered and cancelled shipments take no more scans.
--   * Scans cannot be edited. Only the latest one can be removed, and never the
--     first "booked" scan, so a mistake is undone without rewriting history.
--   * Shipments are cancelled, never deleted, so there is always a record.

-- ---------------------------------------------------------------------------
-- Cancellation
-- ---------------------------------------------------------------------------

alter table public.shipments
  add column cancelled_at timestamptz,
  add column cancel_reason text
    check (cancel_reason is null or length(cancel_reason) between 1 and 300),
  add constraint shipments_cancel_reason_with_date
    check ((cancelled_at is null) = (cancel_reason is null));

-- No deleting shipments: cancel instead.
drop policy "Admins can delete shipments" on public.shipments;
revoke delete on public.shipments from authenticated;

-- Scans are append-only; mistakes are fixed by removing the latest scan.
drop policy "Admins can update tracking events" on public.tracking_events;
revoke update on public.tracking_events from authenticated;

-- ---------------------------------------------------------------------------
-- Rules for new scans
-- ---------------------------------------------------------------------------

create function public.check_tracking_event_insert()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_cancelled_at timestamptz;
  v_last public.tracking_events%rowtype;
begin
  -- Lock the shipment so two scans posted at once are checked one after the other.
  select s.cancelled_at into v_cancelled_at
  from public.shipments s
  where s.id = new.shipment_id
  for update;

  if v_cancelled_at is not null then
    raise exception 'This shipment was cancelled, so it cannot take new updates.'
      using errcode = 'P0001';
  end if;

  if new.occurred_at > now() + interval '5 minutes' then
    raise exception 'The scan time is in the future. Check the date and time.'
      using errcode = 'P0001';
  end if;

  select e.* into v_last
  from public.tracking_events e
  where e.shipment_id = new.shipment_id
  order by e.occurred_at desc, e.created_at desc
  limit 1;

  if not found then
    if new.stage <> 'booked' then
      raise exception 'The first scan on a shipment must be Booked.'
        using errcode = 'P0001';
    end if;
    return new;
  end if;

  if v_last.stage = 'delivered' then
    raise exception 'This shipment is already delivered, so it cannot take new updates.'
      using errcode = 'P0001';
  end if;

  -- Enum values compare in the order they were declared.
  if new.stage < v_last.stage then
    raise exception 'A shipment cannot go back a stage.'
      using errcode = 'P0001';
  end if;

  if new.stage = v_last.stage and new.stage not in ('in_transit', 'at_customs') then
    raise exception 'The shipment is already at this stage.'
      using errcode = 'P0001';
  end if;

  if new.occurred_at < v_last.occurred_at then
    raise exception 'The scan time is earlier than the last scan. Updates must be in time order.'
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;

create trigger tracking_events_check_insert
  before insert on public.tracking_events
  for each row execute function public.check_tracking_event_insert();

-- ---------------------------------------------------------------------------
-- Rules for removing a scan
-- ---------------------------------------------------------------------------

create function public.check_tracking_event_delete()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_cancelled_at timestamptz;
  v_latest_id uuid;
  v_count integer;
begin
  select s.cancelled_at into v_cancelled_at
  from public.shipments s
  where s.id = old.shipment_id
  for update;

  if v_cancelled_at is not null then
    raise exception 'This shipment was cancelled, so its history is locked.'
      using errcode = 'P0001';
  end if;

  select count(*) into v_count
  from public.tracking_events e
  where e.shipment_id = old.shipment_id;

  if v_count <= 1 then
    raise exception 'The first Booked scan cannot be removed.'
      using errcode = 'P0001';
  end if;

  select e.id into v_latest_id
  from public.tracking_events e
  where e.shipment_id = old.shipment_id
  order by e.occurred_at desc, e.created_at desc
  limit 1;

  if v_latest_id <> old.id then
    raise exception 'Only the latest scan can be removed.'
      using errcode = 'P0001';
  end if;

  return old;
end;
$$;

create trigger tracking_events_check_delete
  before delete on public.tracking_events
  for each row execute function public.check_tracking_event_delete();

-- ---------------------------------------------------------------------------
-- Rules for changing a shipment
-- ---------------------------------------------------------------------------

create function public.check_shipment_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.cancelled_at is not null then
    raise exception 'This shipment was cancelled, so it cannot be changed.'
      using errcode = 'P0001';
  end if;

  -- The tracking number and route are fixed once booked; the number encodes
  -- the destination and customers may already have it.
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

  if new.cancelled_at is not null and exists (
    select 1 from public.tracking_events e
    where e.shipment_id = old.id and e.stage = 'delivered'
  ) then
    raise exception 'A delivered shipment cannot be cancelled.'
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;

create trigger shipments_check_update
  before update on public.shipments
  for each row execute function public.check_shipment_update();

-- ---------------------------------------------------------------------------
-- Create a shipment and its first scan in one step
-- ---------------------------------------------------------------------------

-- Security invoker: it runs with the caller's rights, so Row Level Security
-- still decides whether the inserts are allowed. The explicit admin check just
-- gives a clear message.
create function public.create_shipment(
  p_origin_city text,
  p_origin_country text,
  p_origin_hub text,
  p_destination_city text,
  p_destination_country text,
  p_destination_hub text,
  p_service public.service_level,
  p_carrier text,
  p_weight_kg numeric,
  p_pieces integer,
  p_contents text,
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
  -- The number ends in the destination country. GB is shown as UK, which is
  -- what customers write.
  v_suffix text := case when p_destination_country = 'GB' then 'UK' else p_destination_country end;
  v_tracking_number text;
  v_shipment_id uuid;
begin
  if not (select public.is_admin()) then
    raise exception 'Only admins can create shipments.' using errcode = '42501';
  end if;

  for attempt in 1..20 loop
    v_tracking_number := 'WB-' || lpad((floor(random() * 9000) + 1000)::int::text, 4, '0') || '-' || v_suffix;

    insert into public.shipments (
      tracking_number,
      origin_city, origin_country, origin_hub,
      destination_city, destination_country, destination_hub,
      service, carrier, weight_kg, pieces, contents, estimated_delivery
    )
    values (
      v_tracking_number,
      p_origin_city, p_origin_country, upper(p_origin_hub),
      p_destination_city, p_destination_country, upper(p_destination_hub),
      p_service, p_carrier, p_weight_kg, p_pieces, p_contents, p_estimated_delivery
    )
    on conflict (tracking_number) do nothing
    returning id into v_shipment_id;

    exit when v_shipment_id is not null;
  end loop;

  if v_shipment_id is null then
    raise exception 'Could not find a free tracking number. Try again.' using errcode = 'P0001';
  end if;

  insert into public.tracking_events (
    shipment_id, stage, occurred_at, local_offset_minutes, location, note
  )
  values (
    v_shipment_id, 'booked', now(), p_booked_offset_minutes, p_booked_location,
    'Shipment booked. Waiting for courier collection.'
  );

  return v_tracking_number;
end;
$$;

revoke all on function public.create_shipment(
  text, text, text, text, text, text, public.service_level, text, numeric, integer,
  text, date, text, smallint
) from public, anon;
grant execute on function public.create_shipment(
  text, text, text, text, text, text, public.service_level, text, numeric, integer,
  text, date, text, smallint
) to authenticated;

-- ---------------------------------------------------------------------------
-- Public read now says when a shipment was cancelled (not the internal reason)
-- ---------------------------------------------------------------------------

create or replace function public.get_shipment(p_tracking_number text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'trackingNumber', s.tracking_number,
    'origin', jsonb_build_object(
      'city', s.origin_city, 'country', s.origin_country, 'hub', s.origin_hub),
    'destination', jsonb_build_object(
      'city', s.destination_city, 'country', s.destination_country, 'hub', s.destination_hub),
    'service', s.service,
    'carrier', s.carrier,
    'weightKg', s.weight_kg,
    'pieces', s.pieces,
    'contents', s.contents,
    'estimatedDelivery', s.estimated_delivery,
    'cancelledAt', s.cancelled_at,
    'events', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'stage', e.stage,
          'occurredAt', e.occurred_at,
          'localOffsetMinutes', e.local_offset_minutes,
          'location', e.location,
          'note', e.note
        )
        order by e.occurred_at, e.created_at
      )
      from public.tracking_events e
      where e.shipment_id = s.id
    ), '[]'::jsonb)
  )
  from public.shipments s
  where s.tracking_number = p_tracking_number;
$$;
