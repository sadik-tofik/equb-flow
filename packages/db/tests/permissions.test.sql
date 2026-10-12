-- packages/db/tests/permissions.test.sql
-- Comprehensive database permissions and integrity verification test suite for EqubFlow.
-- Tests role permissions (agent, executor, watcher, authorizer, authenticated, anon),
-- RLS non-recursion, destination checks, column immutability, truncate prevention,
-- and two-call decision chain linkage.
--
-- Run with:
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f packages/db/tests/permissions.test.sql

\set ON_ERROR_STOP on

begin;

-- ============================================================================
-- 0. FIXTURE SETUP (Run as postgres/migration admin)
-- ============================================================================
do $$
declare
  v_group_a uuid := '10000000-0000-0000-0000-000000000001'::uuid;
  v_group_b uuid := '10000000-0000-0000-0000-000000000002'::uuid;
  v_user_a  uuid := '11111111-1111-1111-1111-111111111111'::uuid;
  v_user_b  uuid := '22222222-2222-2222-2222-222222222222'::uuid;
  v_member_a uuid := '33333333-3333-3333-3333-333333333331'::uuid;
  v_member_b uuid := '33333333-3333-3333-3333-333333333332'::uuid;
  v_round_a uuid := '44444444-4444-4444-4444-444444444441'::uuid;
  v_round_b uuid := '44444444-4444-4444-4444-444444444442'::uuid;
  v_wallet_a text := '0x1111111111111111111111111111111111111111';
  v_wallet_b text := '0x2222222222222222222222222222222222222222';
  v_gate text := '0xeb21103e749d682c3f0e36a23852f246b1b4d016';
  v_dec_rec decision_records;
  v_action_id uuid := '55555555-5555-5555-5555-555555555551'::uuid;
  v_transfer_id uuid := '66666666-6666-6666-6666-666666666661'::uuid;
begin
  raise notice '>>> Setting up test fixtures...';

  -- Create two test groups
  insert into groups (id, name, mode, stake, status, destination_address, cadence_seconds, grace_seconds, contribution_amount, member_count, order_method, created_by)
  values
    (v_group_a, 'Equb Alpha', 'real', 'testnet', 'running', v_gate, 86400, 3600, 1000000, 3, 'fixed', v_user_a),
    (v_group_b, 'Equb Beta',  'real', 'testnet', 'running', v_gate, 86400, 3600, 1000000, 3, 'fixed', v_user_b);

  -- Create wallet registry records
  insert into wallet_registry (address, mode, stake, custody, owner_role)
  values
    (v_wallet_a, 'real', 'testnet', 'self_custody', 'member'),
    (v_wallet_b, 'real', 'testnet', 'self_custody', 'member');

  -- Create members
  insert into members (id, group_id, user_id, alias, role, mode, stake, custody, wallet_address, position)
  values
    (v_member_a, v_group_a, v_user_a, 'Alice', 'organizer', 'real', 'testnet', 'self_custody', v_wallet_a, 1),
    (v_member_b, v_group_b, v_user_b, 'Bob',   'organizer', 'real', 'testnet', 'self_custody', v_wallet_b, 1);

  -- Create rounds
  insert into rounds (id, group_id, cycle_no, round_no, recipient_member_id, opens_at, deadline_at, grace_ends_at, status)
  values
    (v_round_a, v_group_a, 1, 1, v_member_a, now(), now() + interval '1 day', now() + interval '2 days', 'collecting'),
    (v_round_b, v_group_b, 1, 1, v_member_b, now(), now() + interval '1 day', now() + interval '2 days', 'collecting');

  -- Create genesis decision record via append_decision_record
  v_dec_rec := append_decision_record(
    v_group_a,
    1,
    repeat('0', 64),
    'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    'group_created',
    null,
    'real',
    '{"action":"genesis"}'::jsonb
  );

  -- Create an authorized action for executor tests
  insert into authorized_actions (
    id, group_id, round_id, kind, to_address, amount, idempotency_key, decision_record_id, status
  ) values (
    v_action_id, v_group_a, v_round_a, 'payout_release', v_wallet_a, 1000000, 'payout:alpha:1:1', v_dec_rec.id, 'authorized'
  );

  -- Create observed transfer for watcher/refund tests
  insert into observed_transfers (
    id, tx_hash, log_index, block_number, block_time, token, from_address, to_address, amount, finality, mode, stake, group_id
  ) values (
    v_transfer_id, '0xaaa111', 0, 1000, now(), '0x3600000000000000000000000000000000000000', v_wallet_a, v_gate, 1000000, 'final', 'real', 'testnet', v_group_a
  );

  raise notice '>>> Fixtures created successfully.';
end;
$$;


-- ============================================================================
-- 1. AGENT ROLE TESTS
-- ============================================================================
-- Checks:
-- a) insert into authorized_actions fails
-- b) update on decision_records fails
-- c) delete on decision_records fails
-- d) insert into proposals works
do $$
declare
  v_passed boolean := false;
begin
  raise notice '--- Running Agent Role Tests ---';

  -- a) insert into authorized_actions must fail
  begin
    set local role agent;
    insert into authorized_actions (group_id, kind, to_address, amount, idempotency_key, decision_record_id)
    values ('10000000-0000-0000-0000-000000000001', 'contribution_send', '0x111', 100, 'k1', gen_random_uuid());
    raise exception 'TEST FAILED: agent was able to insert into authorized_actions!';
  exception when insufficient_privilege then
    reset role;
    raise notice '  [PASS] agent: insert into authorized_actions refused (insufficient_privilege)';
  end;

  -- b) update on decision_records must fail
  begin
    set local role agent;
    update decision_records set kind = 'tampered' where seq = 1;
    raise exception 'TEST FAILED: agent was able to update decision_records!';
  exception when insufficient_privilege then
    reset role;
    raise notice '  [PASS] agent: update on decision_records refused (insufficient_privilege)';
  end;

  -- c) delete on decision_records must fail
  begin
    set local role agent;
    delete from decision_records where seq = 1;
    raise exception 'TEST FAILED: agent was able to delete from decision_records!';
  exception when insufficient_privilege then
    reset role;
    raise notice '  [PASS] agent: delete on decision_records refused (insufficient_privilege)';
  end;

  -- d) insert into proposals must succeed
  begin
    set local role agent;
    insert into proposals (group_id, decision_type, subject, action, reasoning, proposed_by)
    values (
      '10000000-0000-0000-0000-000000000001',
      'D1',
      '{"transferId":"66666666-6666-6666-6666-666666666661"}'::jsonb,
      'assign_to_member',
      'Matched exact payment from registered member wallet',
      'agent'
    );
    reset role;
    raise notice '  [PASS] agent: insert into proposals succeeded';
  exception when others then
    reset role;
    raise exception 'TEST FAILED: agent could not insert proposal: %', sqlerrm;
  end;
end;
$$;


-- ============================================================================
-- 2. EXECUTOR ROLE TESTS
-- ============================================================================
-- Checks:
-- a) insert into authorized_actions fails
-- b) update of to_address fails (column grant + freeze trigger)
-- c) update of status works
do $$
declare
  v_action_id uuid := '55555555-5555-5555-5555-555555555551'::uuid;
  v_group_id uuid := '10000000-0000-0000-0000-000000000001'::uuid;
  v_member_id uuid := '30000000-0000-0000-0000-000000000001'::uuid;
begin
  raise notice '--- Running Executor Role Tests ---';

  -- a) insert into authorized_actions must fail
  begin
    set local role executor;
    insert into authorized_actions (group_id, kind, to_address, amount, idempotency_key, decision_record_id)
    values ('10000000-0000-0000-0000-000000000001', 'contribution_send', '0x111', 100, 'k2', gen_random_uuid());
    raise exception 'TEST FAILED: executor was able to insert into authorized_actions!';
  exception when insufficient_privilege then
    reset role;
    raise notice '  [PASS] executor: insert into authorized_actions refused (insufficient_privilege)';
  end;

  -- b) update of to_address must fail
  begin
    set local role executor;
    update authorized_actions set to_address = '0x9999999999999999999999999999999999999999' where id = v_action_id;
    raise exception 'TEST FAILED: executor was able to update to_address on authorized_actions!';
  exception when insufficient_privilege then
    reset role;
    raise notice '  [PASS] executor: update of to_address refused (insufficient_privilege)';
  end;

  -- c) update of status must succeed
  begin
    set local role executor;
    update authorized_actions set status = 'sending', attempts = attempts + 1, tx_hash = '0xbbb222' where id = v_action_id;
    reset role;
    raise notice '  [PASS] executor: update of status and tx_hash succeeded';
  exception when others then
    reset role;
    raise exception 'TEST FAILED: executor could not update status: %', sqlerrm;
  end;

  -- d) wallet provisioning: update of destination_address on groups must succeed
  begin
    set local role executor;
    update groups set destination_address = '0x9999999999999999999999999999999999999999' where id = v_group_id;
    update groups set destination_address = '0x3333333333333333333333333333333333333333' where id = v_group_id;
    reset role;
    raise notice '  [PASS] executor: update of destination_address on groups succeeded';
  exception when others then
    reset role;
    raise exception 'TEST FAILED: executor could not update destination_address: %', sqlerrm;
  end;

  -- e) wallet provisioning: update of wallet_address on members must succeed
  begin
    set local role executor;
    update members set wallet_address = '0x8888888888888888888888888888888888888888' where id = v_member_id;
    update members set wallet_address = '0x1111111111111111111111111111111111111111' where id = v_member_id;
    reset role;
    raise notice '  [PASS] executor: update of wallet_address on members succeeded';
  exception when others then
    reset role;
    raise exception 'TEST FAILED: executor could not update wallet_address: %', sqlerrm;
  end;

  -- f) wallet provisioning: insert into wallet_registry must succeed
  begin
    set local role executor;
    insert into wallet_registry (address, mode, stake, custody, owner_role)
    values ('0x8888888888888888888888888888888888888888', 'real', 'testnet', 'app_managed', 'member')
    on conflict (address) do nothing;
    reset role;
    raise notice '  [PASS] executor: insert into wallet_registry succeeded';
  exception when others then
    reset role;
    raise exception 'TEST FAILED: executor could not insert into wallet_registry: %', sqlerrm;
  end;

  -- g) executor cannot update non-provisioning columns on groups (e.g. cadence_seconds)
  begin
    set local role executor;
    update groups set cadence_seconds = 7200 where id = v_group_id;
    raise exception 'TEST FAILED: executor was able to update cadence_seconds on groups!';
  exception when insufficient_privilege then
    reset role;
    raise notice '  [PASS] executor: update of unauthorized column on groups refused (insufficient_privilege)';
  end;
end;
$$;


-- ============================================================================
-- 3. WATCHER ROLE TESTS
-- ============================================================================
-- Checks:
-- a) select on decision_records fails
-- b) insert and update on observed_transfers works
do $$
declare
  v_dummy int;
begin
  raise notice '--- Running Watcher Role Tests ---';

  -- a) select on decision_records must fail
  begin
    set local role watcher;
    select count(*) into v_dummy from decision_records;
    raise exception 'TEST FAILED: watcher was able to select from decision_records!';
  exception when insufficient_privilege then
    reset role;
    raise notice '  [PASS] watcher: select on decision_records refused (insufficient_privilege)';
  end;

  -- b) insert into observed_transfers must succeed
  begin
    set local role watcher;
    insert into observed_transfers (
      tx_hash, log_index, block_number, block_time, token, from_address, to_address, amount, finality, mode, stake, group_id
    ) values (
      '0xccc333', 1, 1001, now(), '0x3600000000000000000000000000000000000000', '0x111', '0xeb21103e749d682c3f0e36a23852f246b1b4d016', 500000, 'pending', 'real', 'testnet', '10000000-0000-0000-0000-000000000001'
    );
    -- and update classification fields
    update observed_transfers set class = 'exact', finality = 'final' where tx_hash = '0xccc333';
    reset role;
    raise notice '  [PASS] watcher: insert and update on observed_transfers succeeded';
  exception when others then
    reset role;
    raise exception 'TEST FAILED: watcher failed on observed_transfers: %', sqlerrm;
  end;
  -- c) select on contributions must succeed for watcher
  begin
    set local role watcher;
    select count(*) into v_dummy from contributions;
    reset role;
    raise notice '  [PASS] watcher: select on contributions succeeded';
  exception when others then
    reset role;
    raise exception 'TEST FAILED: watcher failed to select from contributions: %', sqlerrm;
  end;

  -- d) insert, select, and update on watcher_cursors must succeed for watcher
  begin
    set local role watcher;
    insert into watcher_cursors (chain_id, last_block) values (5042002, 100);
    select last_block into v_dummy from watcher_cursors where chain_id = 5042002;
    if v_dummy <> 100 then
      raise exception 'TEST FAILED: watcher cursor read % instead of 100', v_dummy;
    end if;
    update watcher_cursors set last_block = 101 where chain_id = 5042002;
    reset role;
    raise notice '  [PASS] watcher: insert, select, and update on watcher_cursors succeeded';
  exception when others then
    reset role;
    raise exception 'TEST FAILED: watcher failed on watcher_cursors: %', sqlerrm;
  end;
end;
$$;


-- ============================================================================
-- 4. AUTHENTICATED ROLE (MEMBER RLS ISOLATION) TESTS
-- ============================================================================
-- Checks:
-- a) is_member avoids recursion and allows member of Group A to see only Group A
-- b) Member of Group A CANNOT see Group B rows
-- c) insert into groups, decision_records, authorized_actions fails
do $$
declare
  v_user_a  uuid := '11111111-1111-1111-1111-111111111111'::uuid;
  v_group_a uuid := '10000000-0000-0000-0000-000000000001'::uuid;
  v_group_b uuid := '10000000-0000-0000-0000-000000000002'::uuid;
  v_cnt int;
begin
  raise notice '--- Running Authenticated Member RLS Tests ---';

  -- Simulate authenticated user A session
  set local role authenticated;
  set local "request.jwt.claim.sub" = '11111111-1111-1111-1111-111111111111';

  -- a) sees own group (Group A)
  select count(*) into v_cnt from groups where id = v_group_a;
  if v_cnt <> 1 then
    reset role;
    raise exception 'TEST FAILED: authenticated user A could not see own group A!';
  end if;

  -- b) CANNOT see other group (Group B)
  select count(*) into v_cnt from groups where id = v_group_b;
  if v_cnt <> 0 then
    reset role;
    raise exception 'TEST FAILED: authenticated user A saw group B (RLS leak)!';
  end if;

  -- c) CANNOT see other group's members
  select count(*) into v_cnt from members where group_id = v_group_b;
  if v_cnt <> 0 then
    reset role;
    raise exception 'TEST FAILED: authenticated user A saw members of group B!';
  end if;

  -- d) CANNOT see other group's rounds
  select count(*) into v_cnt from rounds where group_id = v_group_b;
  if v_cnt <> 0 then
    reset role;
    raise exception 'TEST FAILED: authenticated user A saw rounds of group B!';
  end if;

  reset role;
  raise notice '  [PASS] authenticated: RLS non-recursive isolation confirmed (sees only own-group rows)';

  -- e) insert into tables without grant must fail
  begin
    set local role authenticated;
    set local "request.jwt.claim.sub" = '11111111-1111-1111-1111-111111111111';
    insert into groups (name, mode, stake, destination_address, cadence_seconds, grace_seconds, contribution_amount, member_count, order_method, created_by)
    values ('Hack Group', 'real', 'testnet', '0x123', 86400, 3600, 1000, 3, 'fixed', v_user_a);
    raise exception 'TEST FAILED: authenticated was able to insert into groups directly!';
  exception when insufficient_privilege then
    reset role;
    raise notice '  [PASS] authenticated: direct insert into groups refused (insufficient_privilege)';
  end;

  begin
    set local role authenticated;
    set local "request.jwt.claim.sub" = '11111111-1111-1111-1111-111111111111';
    insert into authorized_actions (group_id, kind, to_address, amount, idempotency_key, decision_record_id)
    values (v_group_a, 'payout_release', '0x111', 100, 'hack_key', gen_random_uuid());
    raise exception 'TEST FAILED: authenticated was able to insert into authorized_actions!';
  exception when insufficient_privilege then
    reset role;
    raise notice '  [PASS] authenticated: direct insert into authorized_actions refused (insufficient_privilege)';
  end;

  -- d) selecting evidence_* views must fail for authenticated
  begin
    set local role authenticated;
    select count(*) into v_cnt from evidence_groups_view;
    raise exception 'TEST FAILED: authenticated was able to select from evidence_groups_view!';
  exception when insufficient_privilege then
    reset role;
    raise notice '  [PASS] authenticated: select from evidence_groups_view refused (insufficient_privilege)';
  end;

  begin
    set local role authenticated;
    select count(*) into v_cnt from evidence_rounds_view;
    raise exception 'TEST FAILED: authenticated was able to select from evidence_rounds_view!';
  exception when insufficient_privilege then
    reset role;
    raise notice '  [PASS] authenticated: select from evidence_rounds_view refused (insufficient_privilege)';
  end;

  begin
    set local role authenticated;
    select count(*) into v_cnt from evidence_volume_view;
    raise exception 'TEST FAILED: authenticated was able to select from evidence_volume_view!';
  exception when insufficient_privilege then
    reset role;
    raise notice '  [PASS] authenticated: select from evidence_volume_view refused (insufficient_privilege)';
  end;

  begin
    set local role authenticated;
    select count(*) into v_cnt from evidence_decisions_view;
    raise exception 'TEST FAILED: authenticated was able to select from evidence_decisions_view!';
  exception when insufficient_privilege then
    reset role;
    raise notice '  [PASS] authenticated: select from evidence_decisions_view refused (insufficient_privilege)';
  end;

  begin
    set local role authenticated;
    select count(*) into v_cnt from evidence_discrepancies_view;
    raise exception 'TEST FAILED: authenticated was able to select from evidence_discrepancies_view!';
  exception when insufficient_privilege then
    reset role;
    raise notice '  [PASS] authenticated: select from evidence_discrepancies_view refused (insufficient_privilege)';
  end;

  -- insert into watcher_cursors must fail for authenticated
  begin
    set local role authenticated;
    insert into watcher_cursors (chain_id, last_block) values (5042002, 999);
    raise exception 'TEST FAILED: authenticated was able to insert into watcher_cursors!';
  exception when insufficient_privilege then
    reset role;
    raise notice '  [PASS] authenticated: insert into watcher_cursors refused (insufficient_privilege)';
  end;
end;
$$;


-- ============================================================================
-- 5. ANON ROLE TESTS
-- ============================================================================
-- Checks:
-- a) anon sees nothing (all grants revoked)
-- b) selecting any evidence_* view is refused
do $$
declare
  v_cnt int;
begin
  raise notice '--- Running Anon Role Tests ---';

  begin
    set local role anon;
    select count(*) into v_cnt from groups;
    raise exception 'TEST FAILED: anon was able to select from groups!';
  exception when insufficient_privilege then
    reset role;
    raise notice '  [PASS] anon: select from groups refused (insufficient_privilege)';
  end;

  begin
    set local role anon;
    select count(*) into v_cnt from decision_records;
    raise exception 'TEST FAILED: anon was able to select from decision_records!';
  exception when insufficient_privilege then
    reset role;
    raise notice '  [PASS] anon: select from decision_records refused (insufficient_privilege)';
  end;

  -- b) selecting evidence_* views must fail for anon
  begin
    set local role anon;
    select count(*) into v_cnt from evidence_groups_view;
    raise exception 'TEST FAILED: anon was able to select from evidence_groups_view!';
  exception when insufficient_privilege then
    reset role;
    raise notice '  [PASS] anon: select from evidence_groups_view refused (insufficient_privilege)';
  end;

  begin
    set local role anon;
    select count(*) into v_cnt from evidence_rounds_view;
    raise exception 'TEST FAILED: anon was able to select from evidence_rounds_view!';
  exception when insufficient_privilege then
    reset role;
    raise notice '  [PASS] anon: select from evidence_rounds_view refused (insufficient_privilege)';
  end;

  begin
    set local role anon;
    select count(*) into v_cnt from evidence_volume_view;
    raise exception 'TEST FAILED: anon was able to select from evidence_volume_view!';
  exception when insufficient_privilege then
    reset role;
    raise notice '  [PASS] anon: select from evidence_volume_view refused (insufficient_privilege)';
  end;

  begin
    set local role anon;
    select count(*) into v_cnt from evidence_decisions_view;
    raise exception 'TEST FAILED: anon was able to select from evidence_decisions_view!';
  exception when insufficient_privilege then
    reset role;
    raise notice '  [PASS] anon: select from evidence_decisions_view refused (insufficient_privilege)';
  end;

  begin
    set local role anon;
    select count(*) into v_cnt from evidence_discrepancies_view;
    raise exception 'TEST FAILED: anon was able to select from evidence_discrepancies_view!';
  exception when insufficient_privilege then
    reset role;
    raise notice '  [PASS] anon: select from evidence_discrepancies_view refused (insufficient_privilege)';
  end;

  -- insert into watcher_cursors must fail for anon
  begin
    set local role anon;
    insert into watcher_cursors (chain_id, last_block) values (5042002, 999);
    raise exception 'TEST FAILED: anon was able to insert into watcher_cursors!';
  exception when insufficient_privilege then
    reset role;
    raise notice '  [PASS] anon: insert into watcher_cursors refused (insufficient_privilege)';
  end;
end;
$$;


-- ============================================================================
-- 6. EVIDENCE ROLE TESTS
-- ============================================================================
-- Checks:
-- a) select from each evidence_* view succeeds
-- b) select from members, notifications, authorized_actions, decision_records is refused
do $$
declare
  v_cnt int;
begin
  raise notice '--- Running Evidence Role Tests ---';

  -- a) Select from all 5 evidence_* views must succeed
  begin
    set local role evidence;
    select count(*) into v_cnt from evidence_groups_view;
    select count(*) into v_cnt from evidence_rounds_view;
    select count(*) into v_cnt from evidence_volume_view;
    select count(*) into v_cnt from evidence_decisions_view;
    select count(*) into v_cnt from evidence_discrepancies_view;
    reset role;
    raise notice '  [PASS] evidence: select from all 5 evidence_* views succeeded';
  exception when others then
    reset role;
    raise exception 'TEST FAILED: evidence could not select from evidence views: %', sqlerrm;
  end;

  -- b) Select from raw tables must fail
  begin
    set local role evidence;
    select count(*) into v_cnt from members;
    raise exception 'TEST FAILED: evidence was able to select from members!';
  exception when insufficient_privilege then
    reset role;
    raise notice '  [PASS] evidence: select from members refused (insufficient_privilege)';
  end;

  begin
    set local role evidence;
    select count(*) into v_cnt from notifications;
    raise exception 'TEST FAILED: evidence was able to select from notifications!';
  exception when insufficient_privilege then
    reset role;
    raise notice '  [PASS] evidence: select from notifications refused (insufficient_privilege)';
  end;

  begin
    set local role evidence;
    select count(*) into v_cnt from authorized_actions;
    raise exception 'TEST FAILED: evidence was able to select from authorized_actions!';
  exception when insufficient_privilege then
    reset role;
    raise notice '  [PASS] evidence: select from authorized_actions refused (insufficient_privilege)';
  end;

  begin
    set local role evidence;
    select count(*) into v_cnt from decision_records;
    raise exception 'TEST FAILED: evidence was able to select from decision_records!';
  exception when insufficient_privilege then
    reset role;
    raise notice '  [PASS] evidence: select from decision_records refused (insufficient_privilege)';
  end;
end;
$$;


-- ============================================================================
-- 7. AUTHORIZER, TWO-CALL LINKAGE & INTEGRITY TESTS
-- ============================================================================
-- Checks:
-- a) next_decision_slot + append_decision_record works
-- b) sequence gap is refused
-- c) prev_hash mismatch is refused
-- d) mode mismatch is refused
-- e) TRUNCATE on decision_records is blocked by trigger
-- f) UPDATE on core columns of authorized_actions is blocked by trigger
-- g) Destination checks for payout, contribution, refund, float_deposit
do $$
declare
  v_group_a uuid := '10000000-0000-0000-0000-000000000001'::uuid;
  v_member_a uuid := '33333333-3333-3333-3333-333333333331'::uuid;
  v_round_a uuid := '44444444-4444-4444-4444-444444444441'::uuid;
  v_transfer_id uuid := '66666666-6666-6666-6666-666666666661'::uuid;
  v_slot record;
  v_rec decision_records;
  v_action authorized_actions;
  v_dummy int;
begin
  raise notice '--- Running Decision Linkage & Integrity Tests ---';

  -- a) two-call append works
  set local role authorizer;
  select * into v_slot from next_decision_slot(v_group_a);
  if v_slot.next_seq <> 2 then
    reset role;
    raise exception 'TEST FAILED: expected next_seq=2, got %', v_slot.next_seq;
  end if;

  v_rec := append_decision_record(
    v_group_a,
    v_slot.next_seq,
    v_slot.prev_hash,
    'hash_for_seq_2_abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
    'payout_authorized',
    null,
    'real',
    '{"recipientMemberId":"33333333-3333-3333-3333-333333333331","amount":"1000000"}'::jsonb,
    null,
    now()
  );
  reset role;
  raise notice '  [PASS] authorizer: two-call append_decision_record succeeded (seq 2)';

  -- a0) p_at rejected if more than 60 seconds from now()
  begin
    set local role authorizer;
    perform append_decision_record(
      v_group_a,
      3,
      v_rec.hash,
      'hash_bad_time',
      'test_time_rejected',
      null,
      'real',
      '{}'::jsonb,
      null,
      now() - interval '5 minutes'
    );
    raise exception 'TEST FAILED: p_at older than 60s was accepted!';
  exception when others then
    if sqlerrm like '%p_at is more than 60 seconds from database time%' then
      reset role;
      raise notice '  [PASS] integrity: p_at > 60s from now() correctly refused';
    else
      reset role;
      raise exception 'TEST FAILED: unexpected error on p_at > 60s: %', sqlerrm;
    end if;
  end;

  -- a1) authorizer can select and update observed_transfers restricted to (class, amount_relation, late_by_seconds, matched_request_id)
  begin
    set local role authorizer;
    update observed_transfers
    set class = 'exact',
        amount_relation = 'equal',
        late_by_seconds = 0,
        matched_request_id = null
    where id = v_transfer_id;

    select count(*) into v_dummy from observed_transfers where id = v_transfer_id;
    if v_dummy <> 1 then
      raise exception 'TEST FAILED: authorizer could not read observed_transfers!';
    end if;
    reset role;
    raise notice '  [PASS] authorizer: update on restricted columns of observed_transfers succeeded';
  exception when others then
    reset role;
    raise exception 'TEST FAILED: authorizer failed on allowed columns of observed_transfers: %', sqlerrm;
  end;

  -- a1_denied) authorizer cannot update unauthorized columns on observed_transfers (e.g. amount, mode, group_id, stake)
  begin
    set local role authorizer;
    update observed_transfers set amount = 9999999 where id = v_transfer_id;
    reset role;
    raise exception 'TEST FAILED: authorizer was able to update amount on observed_transfers!';
  exception when insufficient_privilege then
    reset role;
    raise notice '  [PASS] authorizer: update on unauthorized column (amount) on observed_transfers rejected';
  when others then
    reset role;
    raise exception 'TEST FAILED: expected insufficient_privilege for authorizer updating amount on observed_transfers, got: %', sqlerrm;
  end;

  begin
    set local role authorizer;
    update observed_transfers set mode = 'sandbox' where id = v_transfer_id;
    reset role;
    raise exception 'TEST FAILED: authorizer was able to update mode on observed_transfers!';
  exception when insufficient_privilege then
    reset role;
    raise notice '  [PASS] authorizer: update on unauthorized column (mode) on observed_transfers rejected';
  when others then
    reset role;
    raise exception 'TEST FAILED: expected insufficient_privilege for authorizer updating mode on observed_transfers, got: %', sqlerrm;
  end;

  -- a2) authorizer can insert into proposals (engine-default proposals)
  begin
    set local role authorizer;
    insert into proposals (group_id, decision_type, subject, action, reasoning, proposed_by)
    values (
      v_group_a,
      'D2',
      '{"transfer_id":"66666666-6666-6666-6666-666666666661"}'::jsonb,
      'request_topup',
      'Engine default proposal for partial payment',
      'engine'
    );
    reset role;
    raise notice '  [PASS] authorizer: insert into proposals succeeded (engine-default proposal)';
  exception when others then
    reset role;
    raise exception 'TEST FAILED: authorizer failed to insert into proposals: %', sqlerrm;
  end;

  -- b) sequence gap refused
  begin
    set local role authorizer;
    perform append_decision_record(
      v_group_a,
      5, -- gap! expected 3
      v_rec.hash,
      'hash_gap',
      'gap_kind',
      null,
      'real',
      '{}'::jsonb
    );
    raise exception 'TEST FAILED: sequence gap was accepted!';
  exception when others then
    if sqlerrm like '%Sequence gap%' then
      reset role;
      raise notice '  [PASS] integrity: sequence gap correctly refused';
    else
      reset role;
      raise exception 'TEST FAILED: unexpected error on gap: %', sqlerrm;
    end if;
  end;

  -- c) prev_hash mismatch refused
  begin
    set local role authorizer;
    perform append_decision_record(
      v_group_a,
      3,
      'wrong_prev_hash_111111111111111111111111111111111111111111111111111',
      'hash_bad_prev',
      'test_kind',
      null,
      'real',
      '{}'::jsonb
    );
    raise exception 'TEST FAILED: prev_hash mismatch was accepted!';
  exception when others then
    if sqlerrm like '%PrevHash mismatch%' then
      reset role;
      raise notice '  [PASS] integrity: prev_hash mismatch correctly refused';
    else
      reset role;
      raise exception 'TEST FAILED: unexpected error on prev_hash mismatch: %', sqlerrm;
    end if;
  end;

  -- d) mode mismatch refused
  begin
    set local role authorizer;
    perform append_decision_record(
      v_group_a,
      3,
      v_rec.hash,
      'hash_mode_mismatch',
      'test_kind',
      null,
      'simulated', -- group is real!
      '{}'::jsonb
    );
    raise exception 'TEST FAILED: mode mismatch was accepted!';
  exception when others then
    if sqlerrm like '%Decision record mode (%) does not match group mode (%)%' then
      reset role;
      raise notice '  [PASS] integrity: mode mismatch correctly refused';
    else
      reset role;
      raise exception 'TEST FAILED: unexpected error on mode mismatch: %', sqlerrm;
    end if;
  end;

  -- e) TRUNCATE on decision_records is blocked
  begin
    truncate table decision_records cascade;
    raise exception 'TEST FAILED: truncate on decision_records was allowed!';
  exception when others then
    if sqlerrm like '%TRUNCATE is strictly forbidden%' then
      raise notice '  [PASS] integrity: truncate on decision_records blocked by trigger';
    else
      raise exception 'TEST FAILED: unexpected error on truncate: %', sqlerrm;
    end if;
  end;

  -- f) Freeze core columns on authorized_actions
  begin
    update authorized_actions
    set amount = 99999999
    where id = '55555555-5555-5555-5555-555555555551';
    raise exception 'TEST FAILED: modifying amount on authorized_actions was allowed!';
  exception when others then
    if sqlerrm like '%Cannot modify core columns%' then
      raise notice '  [PASS] integrity: freezing core columns on authorized_actions works';
    else
      raise exception 'TEST FAILED: unexpected error on core freeze: %', sqlerrm;
    end if;
  end;

  -- g) Destination checks:
  -- Payout to wrong address fails
  begin
    set local role authorizer;
    insert into authorized_actions (group_id, round_id, kind, to_address, amount, idempotency_key, decision_record_id)
    values (v_group_a, v_round_a, 'payout_release', '0x9999999999999999999999999999999999999999', 1000000, 'payout_bad_dest', v_rec.id);
    raise exception 'TEST FAILED: payout to wrong address was accepted!';
  exception when others then
    if sqlerrm like '%Payout to_address%' then
      reset role;
      raise notice '  [PASS] destination: payout to wrong address refused by trigger';
    else
      reset role;
      raise exception 'TEST FAILED: unexpected error on bad payout destination: %', sqlerrm;
    end if;
  end;

  -- Contribution send to wrong address fails
  begin
    set local role authorizer;
    insert into authorized_actions (group_id, kind, to_address, amount, idempotency_key, decision_record_id)
    values (v_group_a, 'contribution_send', '0x9999999999999999999999999999999999999999', 1000000, 'send_bad_dest', v_rec.id);
    raise exception 'TEST FAILED: contribution_send to wrong address was accepted!';
  exception when others then
    if sqlerrm like '%contribution_send to_address%' then
      reset role;
      raise notice '  [PASS] destination: contribution_send to wrong address refused';
    else
      reset role;
      raise exception 'TEST FAILED: unexpected error on bad contribution destination: %', sqlerrm;
    end if;
  end;

  -- Refund to wrong address (not original sender) fails
  begin
    set local role authorizer;
    insert into authorized_actions (group_id, kind, to_address, amount, idempotency_key, decision_record_id, params)
    values (v_group_a, 'refund', '0x9999999999999999999999999999999999999999', 1000000, 'refund_bad_dest', v_rec.id, jsonb_build_object('transfer_id', v_transfer_id::text));
    raise exception 'TEST FAILED: refund to wrong address was accepted!';
  exception when others then
    if sqlerrm like '%Refund to_address%' then
      reset role;
      raise notice '  [PASS] destination: refund to non-sender address refused (T15)';
    else
      reset role;
      raise exception 'TEST FAILED: unexpected error on bad refund destination: %', sqlerrm;
    end if;
  end;

  -- Float deposit to non-Teller address fails
  begin
    set local role authorizer;
    insert into authorized_actions (group_id, kind, to_address, amount, idempotency_key, decision_record_id)
    values (v_group_a, 'float_deposit', '0x9999999999999999999999999999999999999999', 1000000, 'float_bad_dest', v_rec.id);
    raise exception 'TEST FAILED: float_deposit to wrong address was accepted!';
  exception when others then
    if sqlerrm like '%float_deposit to_address%' then
      reset role;
      raise notice '  [PASS] destination: float_deposit to non-Teller address refused';
    else
      reset role;
      raise exception 'TEST FAILED: unexpected error on bad float destination: %', sqlerrm;
    end if;
  end;

end;
$$;

-- Roll back all test data so the database remains completely pristine
rollback;

\echo '========================================================================'
\echo '>>> ALL DATABASE PERMISSION & INTEGRITY TESTS PASSED SUCCESSFULLY! <<<'
\echo '========================================================================'
