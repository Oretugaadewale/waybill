-- Waybill: refund flags and delivered lock. Every change is undone; nothing is kept.
create temp table if not exists refund_results (n int, test text, result text);
truncate refund_results;

do $$
declare
  v_key text;
  v_ref text;
  v_ref2 text;
  v_tn text;
  v_out text[] := array[]::text[];
  v_quote jsonb := '{"totalMinor": 5240625}'::jsonb;
  v_msg text;
begin
  begin
    v_key := public.create_server_key();

    -- 1. Money arriving for a declined booking is kept and flagged.
    v_ref := public.submit_booking('Air Express', 'NG', 'GB', 'London', 2.2, null, null, null, 1,
      'Fabric', 0, 'drop_off', '', 'Ada Obi', '+234 803 000 0000', 'refund-1@example.com',
      'Tunde Obi', '+44 7700 900000', '', '10 Example Road, London', v_quote, 5240625, '2026-11');
    perform public.start_payment(v_key, v_ref, v_ref || '-0123456789ab', 5240625);
    update public.bookings set status = 'declined', decline_reason = 'Test' where reference = v_ref;
    v_msg := public.record_payment_result(v_key, v_ref || '-0123456789ab', 'success', 5240625, 'NGN', now(), 'card', 'ok');
    v_msg := v_msg || ', flagged ' || (select refund_needed::text from public.payments where paystack_reference = v_ref || '-0123456789ab');
    v_out := v_out || array['1|Payment on a declined booking (should be refund_needed, flagged true)|' || v_msg];

    -- 2. Cancelling a shipment from a paid booking flags its payment.
    v_ref2 := public.submit_booking('Air Express', 'NG', 'GB', 'London', 2.2, null, null, null, 1,
      'Fabric', 0, 'drop_off', '', 'Ada Obi', '+234 803 000 0000', 'refund-2@example.com',
      'Tunde Obi', '+44 7700 900000', '', '10 Example Road, London', v_quote, 5240625, '2026-11');
    perform public.start_payment(v_key, v_ref2, v_ref2 || '-0123456789ab', 5240625);
    perform public.record_payment_result(v_key, v_ref2 || '-0123456789ab', 'success', 5240625, 'NGN', now(), 'card', 'ok');
    -- convert as the database owner: create the shipment and link it
    v_tn := 'WB-0001-UK';
    insert into public.shipments (tracking_number, origin_city, origin_country, origin_hub, destination_city,
      destination_country, destination_hub, service, carrier, weight_kg, pieces, contents, estimated_delivery)
    values (v_tn, 'Lagos', 'NG', 'LOS', 'London', 'GB', 'LHR', 'Air Express', 'DHL', 2.2, 1, 'Fabric', current_date + 7);
    insert into public.tracking_events (shipment_id, stage, occurred_at, local_offset_minutes, location, note)
    select id, 'booked', now() - interval '1 hour', 60, 'Lagos, Nigeria', 'Booked' from public.shipments where tracking_number = v_tn;
    update public.bookings set status = 'converted', shipment_id = (select id from public.shipments where tracking_number = v_tn)
      where reference = v_ref2;
    update public.shipments set cancelled_at = now(), cancel_reason = 'Test' where tracking_number = v_tn;
    v_out := v_out || array['2|Cancel a shipment from a paid booking (should be true)|' ||
      (select refund_needed::text from public.payments where paystack_reference = v_ref2 || '-0123456789ab')];

    -- 3. A delivered shipment's details are locked.
    begin
      insert into public.shipments (tracking_number, origin_city, origin_country, origin_hub, destination_city,
        destination_country, destination_hub, service, carrier, weight_kg, pieces, contents, estimated_delivery)
      values ('WB-0002-UK', 'Lagos', 'NG', 'LOS', 'London', 'GB', 'LHR', 'Air Express', 'DHL', 2, 1, 'Fabric', current_date + 7);
      insert into public.tracking_events (shipment_id, stage, occurred_at, local_offset_minutes, location, note)
      select id, s.stage::public.shipment_stage, now() - (interval '1 minute' * (10 - s.n)), 60, 'Lagos, Nigeria', 'x'
      from public.shipments, (values (1, 'booked'), (2, 'delivered')) as s(n, stage)
      where tracking_number = 'WB-0002-UK' order by s.n;
      update public.shipments set weight_kg = 5 where tracking_number = 'WB-0002-UK';
      v_out := v_out || array['3|Edit a delivered shipment (should be blocked)|ALLOWED'];
    exception when others then
      v_out := v_out || array['3|Edit a delivered shipment (should be blocked)|' || sqlerrm];
    end;

    -- 4. Only admins can mark refunds.
    begin
      perform public.mark_payment_refunded(v_ref || '-0123456789ab');
      v_out := v_out || array['4|Mark refunded without admin login (should be blocked)|ALLOWED'];
    exception when others then
      v_out := v_out || array['4|Mark refunded without admin login (should be blocked)|' || sqlerrm];
    end;

    -- 5. The customer page can now see the tracking number.
    v_out := v_out || array['5|Tracking number on the booking (should be WB-0001-UK)|' ||
      coalesce(public.booking_for_payment(v_key, v_ref2) ->> 'trackingNumber', 'missing')];

    raise exception 'undo';
  exception when others then
    if sqlerrm <> 'undo' then v_out := v_out || array['99|Unexpected error|' || sqlerrm]; end if;
  end;

  insert into refund_results
  select split_part(x, '|', 1)::int, split_part(x, '|', 2), split_part(x, '|', 3)
  from unnest(v_out) as x;
end $$;

select n, test, result from refund_results order by n;
