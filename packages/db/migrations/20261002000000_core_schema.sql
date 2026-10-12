-- packages/db/migrations/20261002000000_core_schema.sql
-- Core schema, types, integrity triggers, append-only decision linkage, RLS, and role permissions.
-- Designed to execute cleanly in one transaction on an empty database and be safe to rerun.

-- ============================================================================
-- 0. ROLE CREATION (Must precede any GRANT, REVOKE, POLICY, or references)
-- ============================================================================
do $$
begin
  if not exists (select from pg_roles where rolname = 'authorizer') then
    create role authorizer nologin;
  end if;
  if not exists (select from pg_roles where rolname = 'executor') then
    create role executor nologin;
  end if;
  if not exists (select from pg_roles where rolname = 'agent') then
    create role agent nologin;
  end if;
  if not exists (select from pg_roles where rolname = 'watcher') then
    create role watcher nologin;
  end if;
  if not exists (select from pg_roles where rolname = 'evidence') then
    create role evidence nologin;
  end if;

  -- Ensure migration user (e.g. postgres) can SET ROLE to these roles in tests
  execute format('grant authorizer, executor, agent, watcher, evidence to %I', current_user);
end
$$;

create extension if not exists "pgcrypto";

-- ============================================================================
-- 1. ENUMERATIONS (Idempotent creation)
-- ============================================================================
do $$
begin
  if not exists (select 1 from pg_type where typname = 'participant_mode') then
    create type participant_mode as enum ('real','simulated','sandbox');
  end if;
  if not exists (select 1 from pg_type where typname = 'stake_type') then
    create type stake_type as enum ('testnet','mainnet');
  end if;
  if not exists (select 1 from pg_type where typname = 'custody_type') then
    create type custody_type as enum ('app_managed','self_custody','system');
  end if;
  if not exists (select 1 from pg_type where typname = 'group_status') then
    create type group_status as enum ('draft','recruiting','running','paused','completed','aborted');
  end if;
  if not exists (select 1 from pg_type where typname = 'round_status') then
    create type round_status as enum ('pending','collecting','ready','paying','paid','blocked');
  end if;
  if not exists (select 1 from pg_type where typname = 'transfer_class') then
    create type transfer_class as enum ('exact','partial','over','duplicate','late','wrong_token','wrong_destination','unmatched');
  end if;
  if not exists (select 1 from pg_type where typname = 'finality_state') then
    create type finality_state as enum ('pending','final');
  end if;
  if not exists (select 1 from pg_type where typname = 'discrepancy_status') then
    create type discrepancy_status as enum ('open','proposed','resolved','refunded');
  end if;
  if not exists (select 1 from pg_type where typname = 'action_kind') then
    create type action_kind as enum ('contribution_send','payout_release','refund','float_deposit','float_redeem','anchor_head');
  end if;
  if not exists (select 1 from pg_type where typname = 'action_status') then
    create type action_status as enum ('authorized','sending','submitted','confirmed','failed','needs_review','cancelled');
  end if;
  if not exists (select 1 from pg_type where typname = 'proposal_status') then
    create type proposal_status as enum ('proposed','awaiting_approval','approved','rejected','sent_back','executed','expired');
  end if;
end
$$;

-- ============================================================================
-- 2. CORE TABLES (19 tables, IF NOT EXISTS)
-- ============================================================================

create table if not exists groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  mode participant_mode not null,
  stake stake_type not null,
  status group_status not null default 'draft',
  destination_address text not null,            -- the gate (or treasury) that receives contributions
  gate_address text,                            -- EqubGate contract, null when service-only
  cadence_seconds int not null check (cadence_seconds >= 3600),
  grace_seconds int not null check (grace_seconds >= 0),
  contribution_amount bigint not null check (contribution_amount > 0),
  member_count int not null check (member_count between 3 and 12),
  order_method text not null check (order_method in ('fixed','verifiable_random')),
  cycle_no int not null default 1,
  current_round_no int not null default 0,
  paused boolean not null default false,
  public_audit boolean not null default false,
  created_by uuid not null,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

alter table groups add column if not exists completed_at timestamptz;

create table if not exists rule_sets (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups(id),
  version int not null,
  rules jsonb not null,
  rules_hash text not null,
  frozen_at timestamptz,
  unique (group_id, version)
);

create table if not exists members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups(id),
  user_id uuid,                                 -- auth user, null for simulated personas
  alias text not null,                          -- pseudonym shown publicly
  role text not null check (role in ('organizer','member')),
  mode participant_mode not null,
  stake stake_type not null,
  custody custody_type not null,
  wallet_address text not null,
  position int,                                 -- payout position, set at cycle start
  acknowledged_rule_version int,
  joined_at timestamptz not null default now(),
  unique (group_id, wallet_address),
  unique (group_id, position)
);

create table if not exists wallet_registry (
  address text primary key,
  mode participant_mode not null,
  stake stake_type not null,
  custody custody_type not null,
  owner_role text not null,                     -- member | persona | sandbox | system
  funding_source text,
  added_at timestamptz not null default now()
);

create table if not exists rounds (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups(id),
  cycle_no int not null,
  round_no int not null,
  recipient_member_id uuid not null references members(id),
  opens_at timestamptz not null,
  deadline_at timestamptz not null,
  grace_ends_at timestamptz not null,
  status round_status not null default 'pending',
  unique (group_id, cycle_no, round_no)
);

create table if not exists invoices (
  id uuid primary key default gen_random_uuid(),
  group_id uuid references groups(id),          -- invoice mode uses a business group
  issuer_user_id uuid not null,
  payer_alias text not null,
  purpose_note text not null,                   -- what the real-world invoice was for
  real_world_amount_note text,                  -- e.g. "1,500 ETB" (Evidence Spec C4)
  expected_amount bigint not null check (expected_amount > 0),
  due_at timestamptz not null,
  mode participant_mode not null,
  stake stake_type not null,
  status text not null default 'open'
);

create table if not exists payment_requests (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups(id),
  kind text not null check (kind in ('contribution','invoice')),
  round_id uuid references rounds(id),
  invoice_id uuid references invoices(id),
  member_id uuid references members(id),
  destination text not null,
  expected_amount bigint not null check (expected_amount > 0),
  bound_sender text not null,                   -- the only sender that can satisfy it
  deadline_at timestamptz not null,
  status text not null default 'open' check (status in ('open','credited','partial','expired','cancelled')),
  check ((round_id is not null) <> (invoice_id is not null))
);

create table if not exists observed_transfers (
  id uuid primary key default gen_random_uuid(),
  tx_hash text not null,
  log_index int not null,
  block_number bigint not null,
  block_time timestamptz not null,
  token text not null,
  from_address text not null,
  to_address text not null,
  amount bigint not null check (amount >= 0),
  finality finality_state not null default 'pending',
  class transfer_class,
  amount_relation text check (amount_relation in ('equal','below','above')),
  late_by_seconds int,
  matched_request_id uuid references payment_requests(id),
  group_id uuid references groups(id),
  mode participant_mode,
  stake stake_type,
  note text,
  observed_at timestamptz not null default now(),
  unique (tx_hash, log_index)
);

alter table public.observed_transfers add column if not exists note text;

create table if not exists contributions (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups(id),
  round_id uuid references rounds(id),
  member_id uuid references members(id),
  request_id uuid not null references payment_requests(id),
  transfer_id uuid not null unique references observed_transfers(id),   -- one credit per transfer (T10)
  amount bigint not null,
  credited_at timestamptz not null default now(),
  via_proposal_id uuid
);

create table if not exists discrepancies (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups(id),
  round_id uuid references rounds(id),
  member_id uuid references members(id),
  request_id uuid references payment_requests(id),
  transfer_id uuid references observed_transfers(id),
  kind transfer_class not null,
  expected bigint not null,
  observed bigint not null,
  delta bigint not null,                        -- observed - expected, signed; never rounded
  status discrepancy_status not null default 'open',
  owner_member_id uuid references members(id),
  opened_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolution jsonb
);

create table if not exists proposals (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups(id),
  decision_type text not null check (decision_type in ('D1','D2','D3','D4','D5','D6','D7','D8')),
  subject jsonb not null,                       -- ids of the transfer, request, member involved
  action text not null,                         -- from the fixed set for the type
  params jsonb not null default '{}',
  reasoning text not null,
  evidence_ids uuid[] not null default '{}',
  proposed_by text not null check (proposed_by in ('agent','engine')),
  validator_result jsonb,
  rule_check jsonb,
  status proposal_status not null default 'proposed',
  approvals_required int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists approvals (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references proposals(id),
  member_id uuid not null references members(id),
  decision text not null check (decision in ('approve','reject','send_back')),
  note text,
  created_at timestamptz not null default now(),
  unique (proposal_id, member_id)
);

create table if not exists decision_records (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups(id),
  seq bigint not null,
  kind text not null,
  decision_type text,
  mode participant_mode not null,
  payload jsonb not null,
  prev_hash text not null,
  hash text not null,
  signature text,
  created_at timestamptz not null default now(),
  unique (group_id, seq)
);

create table if not exists authorized_actions (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups(id),
  round_id uuid references rounds(id),
  kind action_kind not null,
  to_address text not null,
  amount bigint not null check (amount >= 0),
  params jsonb not null default '{}',
  idempotency_key text not null unique,         -- e.g. payout:{group}:{cycle}:{round}
  decision_record_id uuid not null references decision_records(id),
  status action_status not null default 'authorized',
  tx_hash text,
  attempts int not null default 0,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- At most one live payout per round (T3, double payout guard)
create unique index if not exists one_live_payout_per_round on authorized_actions (group_id, round_id)
  where kind = 'payout_release' and status in ('authorized','sending','submitted','confirmed');

create table if not exists executions (
  id uuid primary key default gen_random_uuid(),
  action_id uuid not null references authorized_actions(id),
  group_id uuid not null references groups(id),
  round_id uuid references rounds(id),
  tx_hash text not null,
  block_number bigint not null,
  block_time timestamptz not null,
  gas_used bigint,
  effective_gas_price bigint,
  status text not null check (status in ('confirmed','reverted')),
  executed_at timestamptz not null default now()
);

create table if not exists chain_anchors (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups(id),
  seq bigint not null,
  head_hash text not null,
  tx_hash text,
  anchored_at timestamptz not null default now()
);

create table if not exists model_calls (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid references proposals(id),
  provider text not null,
  model text not null,
  input_hash text not null,
  output_hash text,
  tokens_in int,
  tokens_out int,
  latency_ms int,
  replayed boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  group_id uuid references groups(id),
  kind text not null,
  body text not null,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create table if not exists metric_snapshots (
  id uuid primary key default gen_random_uuid(),
  taken_at timestamptz not null default now(),
  mode participant_mode not null,
  stake stake_type not null,
  payload jsonb not null
);

-- ============================================================================
-- 3. INTEGRITY FUNCTIONS & TRIGGERS
-- ============================================================================

-- A. Append-only and truncate enforcement on decision_records
create or replace function protect_decision_records() returns trigger as $$
begin
  raise exception 'decision_records is append-only; update and delete are forbidden';
end;
$$ language plpgsql set search_path = public, pg_temp;

drop trigger if exists trg_decision_records_immutable on decision_records;
create trigger trg_decision_records_immutable
before update or delete on decision_records
for each row execute function protect_decision_records();

create or replace function block_table_truncate() returns trigger as $$
begin
  raise exception 'TRUNCATE is strictly forbidden on %', tg_table_name;
end;
$$ language plpgsql set search_path = public, pg_temp;

drop trigger if exists trg_decision_records_block_truncate on public.decision_records;
create trigger trg_decision_records_block_truncate
before truncate on public.decision_records
for each statement execute function block_table_truncate();

drop trigger if exists trg_authorized_actions_block_truncate on public.authorized_actions;
create trigger trg_authorized_actions_block_truncate
before truncate on public.authorized_actions
for each statement execute function block_table_truncate();

-- B. Mode and stake immutability
create or replace function protect_mode_stake() returns trigger as $$
begin
  if (new.mode is distinct from old.mode) or (new.stake is distinct from old.stake) then
    raise exception 'mode and stake are immutable once created';
  end if;
  return new;
end;
$$ language plpgsql set search_path = public, pg_temp;

drop trigger if exists trg_groups_mode_stake on groups;
create trigger trg_groups_mode_stake before update on groups
for each row execute function protect_mode_stake();

drop trigger if exists trg_members_mode_stake on members;
create trigger trg_members_mode_stake before update on members
for each row execute function protect_mode_stake();

drop trigger if exists trg_wallet_registry_mode_stake on wallet_registry;
create trigger trg_wallet_registry_mode_stake before update on wallet_registry
for each row execute function protect_mode_stake();

-- C. Wallet address immutability while running
create or replace function protect_member_wallet() returns trigger as $$
declare
  v_group_status group_status;
begin
  if new.wallet_address is distinct from old.wallet_address then
    select status into v_group_status from groups where id = old.group_id;
    if v_group_status in ('running', 'paused') then
      raise exception 'Member wallet address cannot be modified while group is running or paused (T5)';
    end if;
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public, pg_temp;

drop trigger if exists trg_members_wallet on members;
create trigger trg_members_wallet before update on members
for each row execute function protect_member_wallet();

-- D. Rule sets immutability when frozen
create or replace function protect_frozen_rules() returns trigger as $$
begin
  if old.frozen_at is not null then
    raise exception 'Rule set is frozen and immutable';
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public, pg_temp;

drop trigger if exists trg_rule_sets_immutable on rule_sets;
create trigger trg_rule_sets_immutable before update or delete on rule_sets
for each row execute function protect_frozen_rules();

-- E. Destination checks for authorized actions (payout_release, contribution_send, refund, float_deposit)
create or replace function check_action_destination() returns trigger as $$
declare
  v_recipient_member_id uuid;
  v_expected_wallet text;
  v_group_destination text;
  v_transfer_sender text;
  v_transfer_group_id uuid;
  v_transfer_amount bigint;
  v_overpaid bigint;
  v_max_refund bigint;
begin
  if new.kind = 'payout_release' then
    if new.round_id is null then
      raise exception 'Payout release must reference a valid round_id';
    end if;

    select recipient_member_id into v_recipient_member_id
    from public.rounds where id = new.round_id;

    if v_recipient_member_id is null then
      raise exception 'Payout release must reference a valid round';
    end if;

    select wallet_address into v_expected_wallet
    from public.members where id = v_recipient_member_id;

    if lower(trim(new.to_address)) <> lower(trim(v_expected_wallet)) then
      raise exception 'Payout to_address (%) must match round recipient snapshot wallet (%)', new.to_address, v_expected_wallet;
    end if;

  elsif new.kind = 'contribution_send' then
    select destination_address into v_group_destination
    from public.groups where id = new.group_id;

    if lower(trim(new.to_address)) <> lower(trim(v_group_destination)) then
      raise exception 'contribution_send to_address (%) must match group destination (%)', new.to_address, v_group_destination;
    end if;

  elsif new.kind = 'refund' then
    if (new.params->>'transfer_id') is null then
      raise exception 'Refund action must specify params.transfer_id (T15)';
    end if;

    select from_address, group_id, amount into v_transfer_sender, v_transfer_group_id, v_transfer_amount
    from public.observed_transfers where id = (new.params->>'transfer_id')::uuid;

    if v_transfer_sender is null then
      raise exception 'Refund transfer % not found', new.params->>'transfer_id';
    end if;

    if v_transfer_group_id is not null and v_transfer_group_id <> new.group_id then
      raise exception 'Refund transfer belongs to group %, not %', v_transfer_group_id, new.group_id;
    end if;

    if lower(trim(new.to_address)) <> lower(trim(v_transfer_sender)) then
      raise exception 'Refund to_address (%) must match original transfer from_address (%) (T15)', new.to_address, v_transfer_sender;
    end if;

    -- Check refund amount does not exceed overpaid / transfer amount
    select delta into v_overpaid
    from public.discrepancies
    where transfer_id = (new.params->>'transfer_id')::uuid
      and delta > 0
    order by opened_at desc
    limit 1;

    v_max_refund := coalesce(v_overpaid, v_transfer_amount);
    if new.amount > v_max_refund then
      raise exception 'Refund amount (%) exceeds overpaid/transfer amount (%)', new.amount, v_max_refund;
    end if;

  elsif new.kind = 'float_deposit' then
    -- USYC Teller contract address on Arc Testnet (AGENTS.md)
    if lower(trim(new.to_address)) <> lower('0x9fdF14c5B14173D74C08Af27AebFf39240dC105A') then
      raise exception 'float_deposit to_address (%) must match authorized USYC Teller (%)', new.to_address, '0x9fdF14c5B14173D74C08Af27AebFf39240dC105A';
    end if;
  end if;

  return new;
end;
$$ language plpgsql security definer set search_path = public, pg_temp;

drop trigger if exists trg_check_action_destination on authorized_actions;
create trigger trg_check_action_destination
before insert on authorized_actions
for each row execute function check_action_destination();

-- F. Freeze core columns on authorized_actions on update
create or replace function protect_authorized_action_core() returns trigger as $$
begin
  if (new.kind is distinct from old.kind) or
     (new.to_address is distinct from old.to_address) or
     (new.amount is distinct from old.amount) or
     (new.group_id is distinct from old.group_id) then
    raise exception 'Cannot modify core columns (kind, to_address, amount, group_id) of authorized_actions';
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public, pg_temp;

drop trigger if exists trg_authorized_actions_freeze_core on authorized_actions;
create trigger trg_authorized_actions_freeze_core
before update on authorized_actions
for each row execute function protect_authorized_action_core();

-- G. Cross-mode guard triggers (TDD 3.3, PDR 7a)
create or replace function check_cross_mode_transfer() returns trigger as $$
declare
  v_group_mode participant_mode;
begin
  if new.group_id is not null and new.mode is not null then
    select mode into v_group_mode from public.groups where id = new.group_id;
    if v_group_mode is not null and new.mode <> v_group_mode then
      raise exception 'Cross-mode violation: transfer mode (%) does not match group mode (%)', new.mode, v_group_mode;
    end if;
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public, pg_temp;

drop trigger if exists trg_check_cross_mode_transfer on observed_transfers;
create trigger trg_check_cross_mode_transfer
before insert or update on observed_transfers
for each row execute function check_cross_mode_transfer();

create or replace function check_cross_mode_contribution() returns trigger as $$
declare
  v_group_mode participant_mode;
  v_transfer_mode participant_mode;
begin
  select mode into v_group_mode from public.groups where id = new.group_id;
  select mode into v_transfer_mode from public.observed_transfers where id = new.transfer_id;
  if v_transfer_mode is not null and v_group_mode is not null and v_transfer_mode <> v_group_mode then
    raise exception 'Cross-mode violation: contribution transfer mode (%) does not match group mode (%)', v_transfer_mode, v_group_mode;
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public, pg_temp;

drop trigger if exists trg_check_cross_mode_contribution on contributions;
create trigger trg_check_cross_mode_contribution
before insert or update on contributions
for each row execute function check_cross_mode_contribution();

create or replace function check_cross_mode_action() returns trigger as $$
declare
  v_group_mode participant_mode;
  v_decision_mode participant_mode;
begin
  select mode into v_group_mode from public.groups where id = new.group_id;
  select mode into v_decision_mode from public.decision_records where id = new.decision_record_id;
  if v_decision_mode is not null and v_group_mode is not null and v_decision_mode <> v_group_mode then
    raise exception 'Cross-mode violation: action decision record mode (%) does not match group mode (%)', v_decision_mode, v_group_mode;
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public, pg_temp;

drop trigger if exists trg_check_cross_mode_action on authorized_actions;
create trigger trg_check_cross_mode_action
before insert or update on authorized_actions
for each row execute function check_cross_mode_action();

-- ============================================================================
-- 4. TWO-CALL DECISION LINKAGE FUNCTIONS (M1 Pattern)
-- ============================================================================

-- Call 1: Reserves the slot under advisory lock and returns head linkage
create or replace function next_decision_slot(
  p_group_id uuid
) returns table (next_seq bigint, prev_hash text) as $$
declare
  v_seq bigint;
  v_prev_hash text;
begin
  -- Per-group advisory lock to serialize record creation and hash chaining
  perform pg_advisory_xact_lock(hashtext('group_decision_' || p_group_id::text));

  select seq, hash into v_seq, v_prev_hash
  from public.decision_records
  where group_id = p_group_id
  order by seq desc
  limit 1;

  if not found then
    next_seq := 1;
    prev_hash := repeat('0', 64);
  else
    next_seq := v_seq + 1;
    prev_hash := v_prev_hash;
  end if;

  return next;
end;
$$ language plpgsql security definer set search_path = public, pg_temp;

-- Call 2: Verifies linkage and group mode, then inserts the canonical record
drop function if exists public.append_decision_record(uuid, bigint, text, text, text, text, participant_mode, jsonb, text);

create or replace function append_decision_record(
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
) returns decision_records as $$
declare
  v_head_seq bigint;
  v_head_hash text;
  v_group_mode participant_mode;
  v_record decision_records;
begin
  -- Validate p_at timestamp if provided: rejected if more than 60 seconds from now()
  if p_at is not null and abs(extract(epoch from (p_at - now()))) > 60 then
    raise exception 'p_at is more than 60 seconds from database time';
  end if;

  -- Per-group advisory lock to serialize record creation and hash chaining (re-entrant within same transaction)
  perform pg_advisory_xact_lock(hashtext('group_decision_' || p_group_id::text));

  -- Lock group row for update to ensure transaction-level consistency
  select mode into v_group_mode from public.groups where id = p_group_id;
  if not found then
    raise exception 'Group % not found', p_group_id;
  end if;

  if p_mode <> v_group_mode then
    raise exception 'Decision record mode (%) does not match group mode (%)', p_mode, v_group_mode;
  end if;

  select seq, hash into v_head_seq, v_head_hash
  from public.decision_records
  where group_id = p_group_id
  order by seq desc
  limit 1;

  if not found then
    if p_seq <> 1 or p_prev_hash <> repeat('0', 64) then
      raise exception 'Genesis record must have seq=1 and prev_hash=64 zeros';
    end if;
  else
    if p_seq <> v_head_seq + 1 then
      raise exception 'Sequence gap: expected %, got %', v_head_seq + 1, p_seq;
    end if;
    if p_prev_hash <> v_head_hash then
      raise exception 'PrevHash mismatch: expected %, got %', v_head_hash, p_prev_hash;
    end if;
  end if;

  insert into public.decision_records (
    group_id, seq, kind, decision_type, mode, payload, prev_hash, hash, signature, created_at
  ) values (
    p_group_id, p_seq, p_kind, p_decision_type, p_mode, p_payload, p_prev_hash, p_hash, p_signature, coalesce(p_at, now())
  ) returning * into v_record;

  return v_record;
end;
$$ language plpgsql security definer set search_path = public, pg_temp;

-- ============================================================================
-- 5. BASELINE SECURITY (Lock down public, anon, authenticated)
-- ============================================================================
revoke all on all tables in schema public from anon, authenticated;
alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke all on functions from anon, authenticated;

-- Revoke all table write access from decision_records
revoke update, delete, truncate on public.decision_records from public, anon, authenticated;
revoke insert, update, delete, truncate on public.authorized_actions from public, anon, authenticated;

-- Function access: only authorizer and postgres
revoke execute on function next_decision_slot(uuid) from public, anon, authenticated;
grant execute on function next_decision_slot(uuid) to authorizer, postgres;

revoke execute on function append_decision_record(uuid, bigint, text, text, text, text, participant_mode, jsonb, text, timestamptz) from public, anon, authenticated;
grant execute on function append_decision_record(uuid, bigint, text, text, text, text, participant_mode, jsonb, text, timestamptz) to authorizer, postgres;

-- If service_role exists, also revoke execution
do $$
begin
  if exists (select from pg_roles where rolname = 'service_role') then
    execute 'revoke execute on function next_decision_slot(uuid) from service_role';
    execute 'revoke execute on function append_decision_record(uuid, bigint, text, text, text, text, participant_mode, jsonb, text, timestamptz) from service_role';
  end if;
end
$$;

-- ============================================================================
-- 6. ROW LEVEL SECURITY (Enable on all 19 tables)
-- ============================================================================
alter table groups enable row level security;
alter table rule_sets enable row level security;
alter table members enable row level security;
alter table wallet_registry enable row level security;
alter table rounds enable row level security;
alter table invoices enable row level security;
alter table payment_requests enable row level security;
alter table observed_transfers enable row level security;
alter table contributions enable row level security;
alter table discrepancies enable row level security;
alter table proposals enable row level security;
alter table approvals enable row level security;
alter table authorized_actions enable row level security;
alter table executions enable row level security;
alter table decision_records enable row level security;
alter table chain_anchors enable row level security;
alter table model_calls enable row level security;
alter table notifications enable row level security;
alter table metric_snapshots enable row level security;

-- ============================================================================
-- 7. COMPONENT RLS POLICIES (Idempotent: drop before create)
-- ============================================================================

-- authorizer policies
drop policy if exists authorizer_all on groups;
create policy authorizer_all on groups for all to authorizer using (true) with check (true);

drop policy if exists authorizer_rule_sets on rule_sets;
create policy authorizer_rule_sets on rule_sets for all to authorizer using (true) with check (true);

drop policy if exists authorizer_members on members;
create policy authorizer_members on members for all to authorizer using (true) with check (true);

drop policy if exists authorizer_rounds on rounds;
create policy authorizer_rounds on rounds for all to authorizer using (true) with check (true);

drop policy if exists authorizer_registry on wallet_registry;
create policy authorizer_registry on wallet_registry for all to authorizer using (true) with check (true);

drop policy if exists authorizer_requests on payment_requests;
create policy authorizer_requests on payment_requests for all to authorizer using (true) with check (true);

drop policy if exists authorizer_transfers on observed_transfers;
create policy authorizer_transfers on observed_transfers for all to authorizer using (true) with check (true);

drop policy if exists authorizer_contributions on contributions;
create policy authorizer_contributions on contributions for all to authorizer using (true) with check (true);

drop policy if exists authorizer_discrepancies on discrepancies;
create policy authorizer_discrepancies on discrepancies for all to authorizer using (true) with check (true);

drop policy if exists authorizer_proposals on proposals;
create policy authorizer_proposals on proposals for all to authorizer using (true) with check (true);

drop policy if exists authorizer_approvals on approvals;
create policy authorizer_approvals on approvals for all to authorizer using (true) with check (true);

drop policy if exists authorizer_actions on authorized_actions;
create policy authorizer_actions on authorized_actions for all to authorizer using (true) with check (true);

drop policy if exists authorizer_decisions on decision_records;
create policy authorizer_decisions on decision_records for all to authorizer using (true) with check (true);

-- executor policies
drop policy if exists executor_groups on groups;
create policy executor_groups on groups for select to executor using (true);

drop policy if exists executor_rounds on rounds;
create policy executor_rounds on rounds for select to executor using (true);

drop policy if exists executor_members on members;
create policy executor_members on members for select to executor using (true);

drop policy if exists executor_registry on wallet_registry;
create policy executor_registry on wallet_registry for select to executor using (true);

drop policy if exists executor_actions on authorized_actions;
create policy executor_actions on authorized_actions for all to executor using (true) with check (true);

drop policy if exists executor_executions on executions;
create policy executor_executions on executions for all to executor using (true) with check (true);

-- agent policies
drop policy if exists agent_groups on groups;
create policy agent_groups on groups for select to agent using (true);

drop policy if exists agent_rounds on rounds;
create policy agent_rounds on rounds for select to agent using (true);

drop policy if exists agent_members on members;
create policy agent_members on members for select to agent using (true);

drop policy if exists agent_requests on payment_requests;
create policy agent_requests on payment_requests for select to agent using (true);

drop policy if exists agent_transfers on observed_transfers;
create policy agent_transfers on observed_transfers for select to agent using (true);

drop policy if exists agent_discrepancies on discrepancies;
create policy agent_discrepancies on discrepancies for select to agent using (true);

drop policy if exists agent_rules on rule_sets;
create policy agent_rules on rule_sets for select to agent using (true);

drop policy if exists agent_proposals on proposals;
create policy agent_proposals on proposals for all to agent using (true) with check (true);

drop policy if exists agent_calls on model_calls;
create policy agent_calls on model_calls for all to agent using (true) with check (true);

-- watcher policies
drop policy if exists watcher_requests on payment_requests;
create policy watcher_requests on payment_requests for select to watcher using (true);

drop policy if exists watcher_groups on groups;
create policy watcher_groups on groups for select to watcher using (true);

drop policy if exists watcher_members on members;
create policy watcher_members on members for select to watcher using (true);

drop policy if exists watcher_transfers on observed_transfers;
create policy watcher_transfers on observed_transfers for all to watcher using (true) with check (true);

drop policy if exists watcher_contributions on contributions;
create policy watcher_contributions on contributions for select to watcher using (true);

-- ============================================================================
-- 8. MEMBER SECURITY & RLS POLICIES
-- ============================================================================

-- Helper function to avoid RLS infinite recursion
create or replace function is_member(p_group_id uuid)
returns boolean as $$
  select exists (
    select 1 from public.members
    where group_id = p_group_id
      and user_id = auth.uid()
  );
$$ language sql stable security definer set search_path = public, pg_temp;

revoke execute on function is_member(uuid) from public, anon;
grant execute on function is_member(uuid) to authenticated;

-- Member-Scoped RLS Policies (authenticated user session)
drop policy if exists member_reads_group on groups;
create policy member_reads_group on groups for select to authenticated
  using (is_member(id));

drop policy if exists member_reads_members on members;
create policy member_reads_members on members for select to authenticated
  using (user_id = auth.uid() or is_member(group_id));

drop policy if exists member_reads_rounds on rounds;
create policy member_reads_rounds on rounds for select to authenticated
  using (is_member(group_id));

drop policy if exists member_reads_rules on rule_sets;
create policy member_reads_rules on rule_sets for select to authenticated
  using (is_member(group_id));

drop policy if exists member_reads_requests on payment_requests;
create policy member_reads_requests on payment_requests for select to authenticated
  using (is_member(group_id));

drop policy if exists member_reads_contributions on contributions;
create policy member_reads_contributions on contributions for select to authenticated
  using (is_member(group_id));

drop policy if exists member_reads_discrepancies on discrepancies;
create policy member_reads_discrepancies on discrepancies for select to authenticated
  using (is_member(group_id));

drop policy if exists member_reads_proposals on proposals;
create policy member_reads_proposals on proposals for select to authenticated
  using (is_member(group_id));

drop policy if exists member_reads_approvals on approvals;
create policy member_reads_approvals on approvals for select to authenticated
  using (exists (
    select 1 from public.proposals p
    where p.id = proposal_id and is_member(p.group_id)
  ));

drop policy if exists member_acts_approvals on approvals;
create policy member_acts_approvals on approvals for insert to authenticated
  with check (member_id in (select id from public.members where user_id = auth.uid()));

drop policy if exists member_updates_approvals on approvals;
create policy member_updates_approvals on approvals for update to authenticated
  using (member_id in (select id from public.members where user_id = auth.uid()))
  with check (member_id in (select id from public.members where user_id = auth.uid()));

drop policy if exists member_reads_decisions on decision_records;
create policy member_reads_decisions on decision_records for select to authenticated
  using (is_member(group_id));

drop policy if exists member_reads_notifications on notifications;
create policy member_reads_notifications on notifications for select to authenticated
  using (user_id = auth.uid());

-- ============================================================================
-- 9. TABLE PERMISSIONS MATRIX (authorizer, executor, watcher, agent, authenticated)
-- ============================================================================

-- authorizer:
grant select on groups, rounds, members, wallet_registry, rule_sets, payment_requests, observed_transfers, contributions, discrepancies, proposals, approvals to authorizer;
grant insert on contributions, discrepancies, proposals, authorized_actions to authorizer;
grant update (class, amount_relation, late_by_seconds, matched_request_id, note) on observed_transfers to authorizer;
grant update on discrepancies, rounds, groups, payment_requests, proposals to authorizer;
grant select on decision_records to authorizer;

-- executor:
grant select on groups, rounds, members, wallet_registry to executor;
grant select, update (status, tx_hash, attempts, last_error, updated_at) on authorized_actions to executor;
grant select, insert on executions to executor;
revoke insert, delete, truncate on authorized_actions from executor;
revoke all on decision_records from executor;

-- watcher:
grant select on payment_requests, groups, members, contributions to watcher;
grant select, insert, update (class, amount_relation, late_by_seconds, matched_request_id, finality, note) on observed_transfers to watcher;
revoke all on authorized_actions from watcher;
revoke all on decision_records from watcher;

-- agent:
grant select on groups, rounds, members, payment_requests, observed_transfers, discrepancies, rule_sets to agent;
grant select, insert on proposals to agent;
grant select, insert on model_calls to agent;
revoke all on authorized_actions from agent;
revoke all on decision_records from agent;

-- authenticated member reads:
grant select on groups, members, rounds, rule_sets, payment_requests, contributions, discrepancies, proposals, notifications, decision_records to authenticated;
grant insert, update on approvals to authenticated;

-- ============================================================================
-- 10. PSEUDONYMOUS VIEWS FOR EVIDENCE ROLE (T29)
-- ============================================================================

create or replace view evidence_groups_view as
  select id, name, mode, stake, status, cadence_seconds, grace_seconds, contribution_amount, member_count, order_method, cycle_no, current_round_no, paused
  from public.groups;

create or replace view evidence_rounds_view as
  select id, group_id, cycle_no, round_no, opens_at, deadline_at, grace_ends_at, status
  from public.rounds;

create or replace view evidence_volume_view as
  select id, group_id, round_id, amount, credited_at
  from public.contributions
  where amount > 0;

create or replace view evidence_decisions_view as
  select
    id,
    group_id,
    seq,
    kind,
    decision_type,
    mode,
    prev_hash,
    hash,
    created_at,
    (payload->>'reason') as reason,
    (payload->>'ruleSetVersion') as rule_set_version,
    (payload->>'action') as action_name
  from public.decision_records;

create or replace view evidence_discrepancies_view as
  select id, group_id, round_id, kind, expected, observed, delta, status, opened_at, resolved_at
  from public.discrepancies;

-- Baseline: revoke all on all tables (and views) from evidence
revoke all on all tables in schema public from evidence;

-- Lock down evidence views from public, anon, and authenticated
revoke all on evidence_groups_view, evidence_rounds_view, evidence_volume_view, evidence_decisions_view, evidence_discrepancies_view from public, anon, authenticated;

-- Grant SELECT on the five evidence_* views to evidence role LAST
grant select on evidence_groups_view, evidence_rounds_view, evidence_volume_view, evidence_decisions_view, evidence_discrepancies_view to evidence;
