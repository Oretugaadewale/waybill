-- Waybill: initial schema
--
-- Security model
--   * The public (anon role) cannot read any table directly. The only way to see a
--     shipment is get_shipment(), which needs the exact tracking number. Nobody can
--     list shipments or guess their way through the table.
--   * Signed-in users can read and write shipments only if they are in public.admins.
--   * Admins are granted by running SQL in the dashboard. There is no API to add one.

-- ---------------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------------

create type public.shipment_stage as enum (
  'booked',
  'picked_up',
  'in_transit',
  'at_customs',
  'out_for_delivery',
  'delivered'
);

create type public.service_level as enum (
  'Air Express',
  'Air Economy',
  'Sea Freight'
);

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.shipments (
  id uuid primary key default gen_random_uuid(),
  tracking_number text not null unique
    check (tracking_number ~ '^WB-[0-9]{4}-[A-Z]{2}$'),

  origin_city text not null check (length(origin_city) between 1 and 80),
  origin_country char(2) not null check (origin_country ~ '^[A-Z]{2}$'),
  origin_hub char(3) not null check (origin_hub ~ '^[A-Z]{3}$'),

  destination_city text not null check (length(destination_city) between 1 and 80),
  destination_country char(2) not null check (destination_country ~ '^[A-Z]{2}$'),
  destination_hub char(3) not null check (destination_hub ~ '^[A-Z]{3}$'),

  service public.service_level not null,
  carrier text not null check (length(carrier) between 1 and 80),
  weight_kg numeric(8, 2) not null check (weight_kg > 0),
  pieces integer not null check (pieces > 0),
  contents text not null check (length(contents) between 1 and 200),
  estimated_delivery date not null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.shipments is
  'One row per shipment. Not readable by the public; see get_shipment().';

create table public.tracking_events (
  id uuid primary key default gen_random_uuid(),
  shipment_id uuid not null references public.shipments (id) on delete cascade,
  stage public.shipment_stage not null,
  occurred_at timestamptz not null,
  -- Offset of the place where the scan happened, so times can be shown in local
  -- time ("arrived 9:30 am Houston time"). timestamptz alone loses this.
  local_offset_minutes smallint not null
    check (local_offset_minutes between -720 and 840),
  location text not null check (length(location) between 1 and 120),
  note text not null check (length(note) between 1 and 300),
  created_at timestamptz not null default now()
);

create index tracking_events_shipment_id_occurred_at_idx
  on public.tracking_events (shipment_id, occurred_at);

comment on table public.tracking_events is
  'Every scan on a shipment''s journey. Not readable by the public; see get_shipment().';

create table public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

comment on table public.admins is
  'Users allowed into /admin. Managed with SQL only; there is no API to add one.';

-- ---------------------------------------------------------------------------
-- updated_at
-- ---------------------------------------------------------------------------

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger shipments_set_updated_at
  before update on public.shipments
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

-- Security definer so policies can call it without granting read access to admins.
create function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.admins a where a.user_id = (select auth.uid())
  );
$$;

revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

-- The only public read path: one shipment, by its exact tracking number.
-- Returns null when there is no match, so callers cannot tell "wrong format"
-- from "not found" and cannot enumerate.
create function public.get_shipment(p_tracking_number text)
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
    'events', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'stage', e.stage,
          'occurredAt', e.occurred_at,
          'localOffsetMinutes', e.local_offset_minutes,
          'location', e.location,
          'note', e.note
        )
        order by e.occurred_at
      )
      from public.tracking_events e
      where e.shipment_id = s.id
    ), '[]'::jsonb)
  )
  from public.shipments s
  where s.tracking_number = p_tracking_number;
$$;

revoke all on function public.get_shipment(text) from public;
grant execute on function public.get_shipment(text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Grants (tables are not exposed to the Data API by default in this project)
-- ---------------------------------------------------------------------------

revoke all on public.shipments, public.tracking_events, public.admins from anon;
grant select, insert, update, delete on public.shipments to authenticated;
grant select, insert, update, delete on public.tracking_events to authenticated;
grant select on public.admins to authenticated;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.shipments enable row level security;
alter table public.tracking_events enable row level security;
alter table public.admins enable row level security;

create policy "Admins can read shipments"
  on public.shipments for select to authenticated
  using ((select public.is_admin()));

create policy "Admins can create shipments"
  on public.shipments for insert to authenticated
  with check ((select public.is_admin()));

create policy "Admins can update shipments"
  on public.shipments for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy "Admins can delete shipments"
  on public.shipments for delete to authenticated
  using ((select public.is_admin()));

create policy "Admins can read tracking events"
  on public.tracking_events for select to authenticated
  using ((select public.is_admin()));

create policy "Admins can create tracking events"
  on public.tracking_events for insert to authenticated
  with check ((select public.is_admin()));

create policy "Admins can update tracking events"
  on public.tracking_events for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy "Admins can delete tracking events"
  on public.tracking_events for delete to authenticated
  using ((select public.is_admin()));

-- A signed-in user can see whether they are an admin, and nothing more.
create policy "Users can read their own admin row"
  on public.admins for select to authenticated
  using (user_id = (select auth.uid()));
