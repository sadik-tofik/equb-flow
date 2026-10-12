-- packages/db/tests/upgrade-path.test.sql
-- ============================================================================
-- EqubFlow Upgrade-Path Test: append_decision_record Overload Resolution
-- ============================================================================
-- Tests:
-- 1. Sets up the previous 9-argument overload of append_decision_record.
-- 2. Applies the migration step: drops 9-argument overload and creates 10-argument overload with p_at default null.
-- 3. Asserts that exactly one overload exists in pg_proc.
-- 4. Asserts that a call WITHOUT p_at resolves without ambiguity.
-- 5. Asserts that a call WITH p_at resolves without ambiguity and correctly stores p_at.
-- ============================================================================

begin;

do $$
declare
  v_overload_count int;
  v_group_id uuid := gen_random_uuid();
  v_user_id uuid := gen_random_uuid();
  v_rec1 record;
  v_rec2 record;
  v_test_at timestamptz := now() - interval '10 seconds';
begin
  raise notice '>>> Starting upgrade-path test for append_decision_record...';

  -- 1. Create a dummy group for testing
  insert into public.groups (
    id, name, mode, stake, status, destination_address, cadence_seconds, grace_seconds,
    contribution_amount, member_count, order_method, created_by
  ) values (
    v_group_id, 'Upgrade Test Group', 'sandbox', 'testnet', 'running', '0x1111111111111111111111111111111111111111', 86400, 3600,
    1000000, 3, 'fixed', v_user_id
  );

  -- 2. Simulate the PREVIOUS state: 9-argument append_decision_record
  drop function if exists public.append_decision_record(uuid, bigint, text, text, text, text, participant_mode, jsonb, text);
  drop function if exists public.append_decision_record(uuid, bigint, text, text, text, text, participant_mode, jsonb, text, timestamptz);

  create function public.append_decision_record(
    p_group_id uuid,
    p_seq bigint,
    p_prev_hash text,
    p_hash text,
    p_kind text,
    p_decision_type text,
    p_mode participant_mode,
    p_payload jsonb,
    p_signature text default null
  ) returns decision_records as $fn9$
  declare
    v_head_seq bigint;
    v_head_hash text;
    v_group_mode participant_mode;
    v_record decision_records;
  begin
    perform pg_advisory_xact_lock(hashtext('group_decision_' || p_group_id::text));
    select mode into v_group_mode from public.groups where id = p_group_id;
    if not found then raise exception 'Group % not found', p_group_id; end if;
    if p_mode <> v_group_mode then raise exception 'Mode mismatch'; end if;
    select seq, hash into v_head_seq, v_head_hash
    from public.decision_records where group_id = p_group_id order by seq desc limit 1;
    if not found then
      if p_seq <> 1 or p_prev_hash <> repeat('0', 64) then raise exception 'Genesis error'; end if;
    else
      if p_seq <> v_head_seq + 1 then raise exception 'Seq gap'; end if;
      if p_prev_hash <> v_head_hash then raise exception 'PrevHash mismatch'; end if;
    end if;
    insert into public.decision_records (
      group_id, seq, kind, decision_type, mode, payload, prev_hash, hash, signature, created_at
    ) values (
      p_group_id, p_seq, p_kind, p_decision_type, p_mode, p_payload, p_prev_hash, p_hash, p_signature, now()
    ) returning * into v_record;
    return v_record;
  end;
  $fn9$ language plpgsql security definer set search_path = public, pg_temp;

  select count(*) into v_overload_count
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = 'append_decision_record';
  if v_overload_count <> 1 then
    raise exception 'TEST FAILED: expected 1 overload for initial 9-arg function, found %', v_overload_count;
  end if;
  raise notice '  [PASS] Initial state: 9-argument overload established.';

  -- 3. Apply the current migration upgrade logic:
  -- Drop 9-argument version explicitly before creating 10-argument version
  drop function if exists public.append_decision_record(uuid, bigint, text, text, text, text, participant_mode, jsonb, text);

  create or replace function public.append_decision_record(
    p_group_id uuid,
    p_seq bigint,
    p_prev_hash text,
    p_hash text,
    p_kind text,
    p_decision_type text,
    p_mode participant_mode,
    p_payload jsonb,
    p_signature text default null,
    p_at timestamptz default null
  ) returns decision_records as $fn10$
  declare
    v_head_seq bigint;
    v_head_hash text;
    v_group_mode participant_mode;
    v_record decision_records;
  begin
    if p_at is not null and abs(extract(epoch from (p_at - now()))) > 60 then
      raise exception 'p_at is more than 60 seconds from database time';
    end if;
    perform pg_advisory_xact_lock(hashtext('group_decision_' || p_group_id::text));
    select mode into v_group_mode from public.groups where id = p_group_id;
    if not found then raise exception 'Group % not found', p_group_id; end if;
    if p_mode <> v_group_mode then raise exception 'Mode mismatch'; end if;
    select seq, hash into v_head_seq, v_head_hash
    from public.decision_records where group_id = p_group_id order by seq desc limit 1;
    if not found then
      if p_seq <> 1 or p_prev_hash <> repeat('0', 64) then raise exception 'Genesis error'; end if;
    else
      if p_seq <> v_head_seq + 1 then raise exception 'Seq gap'; end if;
      if p_prev_hash <> v_head_hash then raise exception 'PrevHash mismatch'; end if;
    end if;
    insert into public.decision_records (
      group_id, seq, kind, decision_type, mode, payload, prev_hash, hash, signature, created_at
    ) values (
      p_group_id, p_seq, p_kind, p_decision_type, p_mode, p_payload, p_prev_hash, p_hash, p_signature, coalesce(p_at, now())
    ) returning * into v_record;
    return v_record;
  end;
  $fn10$ language plpgsql security definer set search_path = public, pg_temp;

  -- 4. Assert exactly one overload exists in pg_proc
  select count(*) into v_overload_count
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = 'append_decision_record';
  if v_overload_count <> 1 then
    raise exception 'TEST FAILED: expected exactly 1 overload after upgrade, found %', v_overload_count;
  end if;
  raise notice '  [PASS] Post-upgrade: exactly 1 overload of append_decision_record exists in pg_proc.';

  -- 5. Test call WITHOUT p_at: 8 required args + default null signature (resolves cleanly)
  select * into v_rec1 from public.append_decision_record(
    v_group_id,
    1::bigint,
    repeat('0', 64),
    '1111111111111111111111111111111111111111111111111111111111111111',
    'group_created',
    null,
    'sandbox'::participant_mode,
    '{"action":"genesis"}'::jsonb
  );
  if v_rec1.seq <> 1 then
    raise exception 'TEST FAILED: call without p_at failed to insert record at seq 1';
  end if;
  raise notice '  [PASS] Call WITHOUT p_at resolved cleanly (seq 1 inserted).';

  -- 6. Test call WITH p_at: passing explicit p_at
  select * into v_rec2 from public.append_decision_record(
    v_group_id,
    2::bigint,
    '1111111111111111111111111111111111111111111111111111111111111111',
    '2222222222222222222222222222222222222222222222222222222222222222',
    'member_joined',
    null,
    'sandbox'::participant_mode,
    '{"member":"Alice"}'::jsonb,
    null,
    v_test_at
  );
  if v_rec2.seq <> 2 or v_rec2.created_at <> v_test_at then
    raise exception 'TEST FAILED: call with p_at failed to store exact p_at: expected %, got %', v_test_at, v_rec2.created_at;
  end if;
  raise notice '  [PASS] Call WITH p_at resolved cleanly (seq 2 inserted with exact timestamp).';

  raise notice '>>> UPGRADE-PATH TEST PASSED SUCCESSFULLY!';
end;
$$;

rollback;
