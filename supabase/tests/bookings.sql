-- Waybill Stage 4: booking rule checks. Every change is undone; nothing is kept.
create temp table if not exists booking_results (n int, test text, result text);
truncate booking_results;

do $$
declare
  v_msg text;
  v_ref text;
  v_quote jsonb := '{"totalMinor": 5240625}'::jsonb;
begin
  -- 1
  begin
    v_ref := public.submit_booking('Air Express', 'NG', 'GB', 'London', 2.2, null, null, null, 1,
      'Aso oke fabric', 15000000, 'drop_off', '', 'Ada Obi', '+234 803 000 0000', 'test@example.com',
      'Tunde Obi', '+44 7700 900000', '', '10 Example Road, London', v_quote, 5240625, '2026-11');
    v_msg := 'ALLOWED, reference ' || v_ref; raise exception 'undo';
  exception when others then if sqlerrm <> 'undo' then v_msg := sqlerrm; end if; end;
  insert into booking_results values (1, 'Valid booking (should be allowed)', v_msg);

  -- 2
  begin
    perform public.submit_booking('Sea Freight', 'NG', 'FR', 'Paris', 20, 50, 50, 50, 1,
      'Furniture', 0, 'drop_off', '', 'Ada Obi', '+234 803 000 0000', 'test@example.com',
      'Tunde Obi', '+33 6 00 00 00 00', '', '1 Rue Example, Paris', v_quote, 100, '2026-11');
    v_msg := 'ALLOWED'; raise exception 'undo';
  exception when others then if sqlerrm <> 'undo' then v_msg := sqlerrm; end if; end;
  insert into booking_results values (2, 'Sea freight to France (should be blocked)', v_msg);

  -- 3
  begin
    perform public.submit_booking('Air Express', 'NG', 'GB', 'London', 2, null, null, null, 1,
      'Fabric', 0, 'pickup', '', 'Ada Obi', '+234 803 000 0000', 'test@example.com',
      'Tunde Obi', '+44 7700 900000', '', '10 Example Road, London', v_quote, 100, '2026-11');
    v_msg := 'ALLOWED'; raise exception 'undo';
  exception when others then if sqlerrm <> 'undo' then v_msg := sqlerrm; end if; end;
  insert into booking_results values (3, 'Pickup without an address (should be blocked)', v_msg);

  -- 4
  begin
    for i in 1..6 loop
      perform public.submit_booking('Air Express', 'NG', 'GB', 'London', 2, null, null, null, 1,
        'Fabric', 0, 'drop_off', '', 'Ada Obi', '+234 803 000 0000', 'flood@example.com',
        'Tunde Obi', '+44 7700 900000', '', '10 Example Road, London', v_quote, 100, '2026-11');
    end loop;
    v_msg := 'ALLOWED'; raise exception 'undo';
  exception when others then if sqlerrm <> 'undo' then v_msg := sqlerrm; end if; end;
  insert into booking_results values (4, 'Sixth booking in an hour from one email (should be blocked)', v_msg);

  -- 5
  begin
    v_ref := public.submit_booking('Air Express', 'NG', 'GB', 'London', 2, null, null, null, 1,
      'Fabric', 0, 'drop_off', '', 'Ada Obi', '+234 803 000 0000', 'edit@example.com',
      'Tunde Obi', '+44 7700 900000', '', '10 Example Road, London', v_quote, 100, '2026-11');
    update public.bookings set receiver_address = 'Somewhere else entirely' where reference = v_ref;
    v_msg := 'ALLOWED'; raise exception 'undo';
  exception when others then if sqlerrm <> 'undo' then v_msg := sqlerrm; end if; end;
  insert into booking_results values (5, 'Edit the customer''s address (should be blocked)', v_msg);

  -- 6
  begin
    v_ref := public.submit_booking('Air Express', 'NG', 'GB', 'London', 2, null, null, null, 1,
      'Fabric', 0, 'drop_off', '', 'Ada Obi', '+234 803 000 0000', 'decline@example.com',
      'Tunde Obi', '+44 7700 900000', '', '10 Example Road, London', v_quote, 100, '2026-11');
    update public.bookings set status = 'declined', decline_reason = 'Test' where reference = v_ref;
    update public.bookings set status = 'paid', decline_reason = null where reference = v_ref;
    v_msg := 'ALLOWED'; raise exception 'undo';
  exception when others then if sqlerrm <> 'undo' then v_msg := sqlerrm; end if; end;
  insert into booking_results values (6, 'Reopen a declined booking (should be blocked)', v_msg);

  -- 7
  begin
    v_ref := public.submit_booking('Air Express', 'NG', 'GB', 'London', 2, null, null, null, 1,
      'Fabric', 0, 'drop_off', '', 'Ada Obi', '+234 803 000 0000', 'convert@example.com',
      'Tunde Obi', '+44 7700 900000', '', '10 Example Road, London', v_quote, 100, '2026-11');
    perform public.convert_booking(v_ref, 'Lagos', 'LOS', 'LHR', 'DHL', current_date + 7, 'Lagos, Nigeria', 60::smallint);
    v_msg := 'ALLOWED'; raise exception 'undo';
  exception when others then if sqlerrm <> 'undo' then v_msg := sqlerrm; end if; end;
  insert into booking_results values (7, 'Convert without an admin login (should be blocked)', v_msg);
end $$;

select n, test, result from booking_results order by n;
