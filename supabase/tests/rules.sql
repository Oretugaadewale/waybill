-- Waybill Stage 3: rule checks. Every change is undone; nothing is kept.
create temp table if not exists rule_results (n int, test text, result text);
truncate rule_results;

do $$
declare
  v_customs uuid := (select id from public.shipments where tracking_number = 'WB-2087-NG');
  v_delivered uuid := (select id from public.shipments where tracking_number = 'WB-1042-US');
  v_booked uuid := (select id from public.shipments where tracking_number = 'WB-6604-UK');
  v_msg text;
begin
  -- 1
  begin
    insert into public.tracking_events (shipment_id, stage, occurred_at, local_offset_minutes, location, note)
    values (v_customs, 'in_transit', now(), 60, 'Test', 'Test');
    v_msg := 'ALLOWED'; raise exception 'undo';
  exception when others then if sqlerrm <> 'undo' then v_msg := sqlerrm; end if; end;
  insert into rule_results values (1, 'Go back a stage (should be blocked)', v_msg);

  -- 2
  begin
    insert into public.tracking_events (shipment_id, stage, occurred_at, local_offset_minutes, location, note)
    values (v_customs, 'at_customs', now(), 60, 'Test', 'Test');
    v_msg := 'ALLOWED'; raise exception 'undo';
  exception when others then if sqlerrm <> 'undo' then v_msg := sqlerrm; end if; end;
  insert into rule_results values (2, 'Second customs scan (should be allowed)', v_msg);

  -- 3
  begin
    insert into public.tracking_events (shipment_id, stage, occurred_at, local_offset_minutes, location, note)
    values (v_delivered, 'delivered', now(), 60, 'Test', 'Test');
    v_msg := 'ALLOWED'; raise exception 'undo';
  exception when others then if sqlerrm <> 'undo' then v_msg := sqlerrm; end if; end;
  insert into rule_results values (3, 'Scan after delivery (should be blocked)', v_msg);

  -- 4
  begin
    insert into public.tracking_events (shipment_id, stage, occurred_at, local_offset_minutes, location, note)
    values (v_customs, 'out_for_delivery', now() + interval '2 days', 60, 'Test', 'Test');
    v_msg := 'ALLOWED'; raise exception 'undo';
  exception when others then if sqlerrm <> 'undo' then v_msg := sqlerrm; end if; end;
  insert into rule_results values (4, 'Scan in the future (should be blocked)', v_msg);

  -- 5
  begin
    insert into public.tracking_events (shipment_id, stage, occurred_at, local_offset_minutes, location, note)
    values (v_customs, 'out_for_delivery', '2020-01-01', 60, 'Test', 'Test');
    v_msg := 'ALLOWED'; raise exception 'undo';
  exception when others then if sqlerrm <> 'undo' then v_msg := sqlerrm; end if; end;
  insert into rule_results values (5, 'Scan earlier than the last one (should be blocked)', v_msg);

  -- 6
  begin
    delete from public.tracking_events where id = (
      select id from public.tracking_events where shipment_id = v_customs order by occurred_at limit 1);
    v_msg := 'ALLOWED'; raise exception 'undo';
  exception when others then if sqlerrm <> 'undo' then v_msg := sqlerrm; end if; end;
  insert into rule_results values (6, 'Remove an older scan (should be blocked)', v_msg);

  -- 7
  begin
    delete from public.tracking_events where shipment_id = v_booked;
    v_msg := 'ALLOWED'; raise exception 'undo';
  exception when others then if sqlerrm <> 'undo' then v_msg := sqlerrm; end if; end;
  insert into rule_results values (7, 'Remove the only Booked scan (should be blocked)', v_msg);

  -- 8
  begin
    delete from public.tracking_events where id = (
      select id from public.tracking_events where shipment_id = v_customs order by occurred_at desc limit 1);
    v_msg := 'ALLOWED'; raise exception 'undo';
  exception when others then if sqlerrm <> 'undo' then v_msg := sqlerrm; end if; end;
  insert into rule_results values (8, 'Remove the latest scan (should be allowed)', v_msg);

  -- 9
  begin
    update public.shipments set destination_city = 'Abuja' where id = v_customs;
    v_msg := 'ALLOWED'; raise exception 'undo';
  exception when others then if sqlerrm <> 'undo' then v_msg := sqlerrm; end if; end;
  insert into rule_results values (9, 'Change the route (should be blocked)', v_msg);

  -- 10
  begin
    update public.shipments set cancelled_at = now(), cancel_reason = 'Test' where id = v_delivered;
    v_msg := 'ALLOWED'; raise exception 'undo';
  exception when others then if sqlerrm <> 'undo' then v_msg := sqlerrm; end if; end;
  insert into rule_results values (10, 'Cancel a delivered shipment (should be blocked)', v_msg);

  -- 11
  begin
    update public.shipments set cancelled_at = now(), cancel_reason = 'Test' where id = v_customs;
    insert into public.tracking_events (shipment_id, stage, occurred_at, local_offset_minutes, location, note)
    values (v_customs, 'out_for_delivery', now(), 60, 'Test', 'Test');
    v_msg := 'ALLOWED'; raise exception 'undo';
  exception when others then if sqlerrm <> 'undo' then v_msg := sqlerrm; end if; end;
  insert into rule_results values (11, 'Scan after cancelling (should be blocked)', v_msg);

  -- 12
  begin
    perform public.create_shipment('Lagos', 'NG', 'LOS', 'Toronto', 'CA', 'YYZ', 'Air Express',
      'DHL', 1, 1, 'Test', current_date, 'Lagos, Nigeria', 60::smallint);
    v_msg := 'ALLOWED'; raise exception 'undo';
  exception when others then if sqlerrm <> 'undo' then v_msg := sqlerrm; end if; end;
  insert into rule_results values (12, 'Create a shipment without an admin login (should be blocked)', v_msg);
end $$;

select n, test, result from rule_results order by n;
