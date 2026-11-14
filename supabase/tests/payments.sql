-- Waybill Stage 5: payment rule checks. Every change is undone; nothing is kept.
-- Uses a throwaway server key inside the test, then restores the real one.
create temp table if not exists payment_results (n int, test text, result text);
truncate payment_results;

do $$
declare
  v_msg text;
  v_ref text;
  v_key text;
  v_quote jsonb := '{"totalMinor": 5240625}'::jsonb;
begin
  -- 1
  begin
    perform public.booking_for_payment('wbk_wrong', 'BK-AAAAAA');
    v_msg := 'ALLOWED'; raise exception 'undo';
  exception when others then if sqlerrm <> 'undo' then v_msg := sqlerrm; end if; end;
  insert into payment_results values (1, 'Read a booking without the server key (should be blocked)', v_msg);

  -- 2
  begin
    perform public.record_payment_result(null, 'BK-AAAAAA-0123456789ab', 'success', 100, 'NGN', now(), 'card', 'ok');
    v_msg := 'ALLOWED'; raise exception 'undo';
  exception when others then if sqlerrm <> 'undo' then v_msg := sqlerrm; end if; end;
  insert into payment_results values (2, 'Mark paid without the server key (should be blocked)', v_msg);

  -- 3 to 6 run with a temporary key, rolled back afterwards
  begin
    v_key := public.create_server_key();
    v_ref := public.submit_booking('Air Express', 'NG', 'GB', 'London', 2.2, null, null, null, 1,
      'Fabric', 0, 'drop_off', '', 'Ada Obi', '+234 803 000 0000', 'pay-test@example.com',
      'Tunde Obi', '+44 7700 900000', '', '10 Example Road, London', v_quote, 5240625, '2026-11');

    begin
      perform public.start_payment(v_key, v_ref, v_ref || '-0123456789ab', 100);
      insert into payment_results values (3, 'Start a payment for the wrong amount (should be blocked)', 'ALLOWED');
    exception when others then
      insert into payment_results values (3, 'Start a payment for the wrong amount (should be blocked)', sqlerrm);
    end;

    perform public.start_payment(v_key, v_ref, v_ref || '-0123456789ab', 5240625);

    begin
      perform public.record_payment_result(v_key, v_ref || '-0123456789ab', 'success', 100, 'NGN', now(), 'card', 'ok');
      insert into payment_results values (4, 'Record a smaller paid amount (should be blocked)', 'ALLOWED');
    exception when others then
      insert into payment_results values (4, 'Record a smaller paid amount (should be blocked)', sqlerrm);
    end;

    insert into payment_results values (5, 'Record the right amount (should mark paid)',
      public.record_payment_result(v_key, v_ref || '-0123456789ab', 'success', 5240625, 'NGN', now(), 'card', 'Approved')
      || ', booking ' || (select status::text from public.bookings where reference = v_ref));

    insert into payment_results values (6, 'Same confirmation twice (should be harmless)',
      public.record_payment_result(v_key, v_ref || '-0123456789ab', 'success', 5240625, 'NGN', now(), 'card', 'Approved'));

    raise exception 'undo';
  exception when others then
    if sqlerrm <> 'undo' then
      insert into payment_results values (99, 'Unexpected error', sqlerrm);
    end if;
  end;
end $$;

select n, test, result from payment_results order by n;
