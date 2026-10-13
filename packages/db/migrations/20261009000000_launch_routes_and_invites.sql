-- packages/db/migrations/20261009000000_launch_routes_and_invites.sql
-- ============================================================================
-- EqubFlow Migration: Launch Routes, Group Invites & Wallet Provisioning
-- ============================================================================

-- 1. Allow nullable destination_address on groups and wallet_address on members
--    so groups and members can be created in 'draft'/'pending' before the executor provisions wallets.
alter table public.groups alter column destination_address drop not null;
alter table public.members alter column wallet_address drop not null;

-- 2. Group Invites table
create table if not exists public.group_invites (
  token text primary key,
  group_id uuid not null references public.groups(id) on delete cascade,
  created_by uuid not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  claimed_by uuid,
  claimed_at timestamptz,
  status text not null default 'active' check (status in ('active','used','expired'))
);

-- 3. RLS for group_invites (Revoke select from anon and authenticated; only server/authorizer route looks up)
alter table public.group_invites enable row level security;
drop policy if exists read_invites on public.group_invites;

drop policy if exists authorizer_invites on public.group_invites;
create policy authorizer_invites on public.group_invites for all to authorizer using (true) with check (true);

-- Revoke all permissions on group_invites from public, anon, authenticated
revoke all on public.group_invites from public, anon, authenticated;

-- 4. Update member_reads_group so organizers can see their created groups before member rows are established
drop policy if exists member_reads_group on public.groups;
create policy member_reads_group on public.groups for select to authenticated
  using (is_member(id) or created_by = auth.uid() or public_audit = true);

-- 5. Executor RLS policies for wallet provisioning
drop policy if exists executor_update_groups on public.groups;
create policy executor_update_groups on public.groups for update to executor using (true) with check (true);

drop policy if exists executor_update_members on public.members;
create policy executor_update_members on public.members for update to executor using (true) with check (true);

drop policy if exists executor_insert_registry on public.wallet_registry;
create policy executor_insert_registry on public.wallet_registry for insert to executor with check (true);

-- 6. Role Grants
-- authorizer:
grant insert on public.groups, public.members, public.rule_sets, public.wallet_registry to authorizer;
grant update on public.members to authorizer;
grant select, insert, update on public.group_invites to authorizer;
grant insert, update on public.approvals to authorizer;
grant select on public.authorized_actions to authorizer;
grant authenticated to authorizer;

-- executor (wallet provisioning loop):
grant update (destination_address) on public.groups to executor;
grant update (wallet_address) on public.members to executor;
grant insert on public.wallet_registry to executor;

-- 7. Authenticated reads on observed_transfers and authorized_actions (group-scoped)
drop policy if exists member_reads_transfers on public.observed_transfers;
create policy member_reads_transfers on public.observed_transfers for select to authenticated
  using (is_member(group_id));

drop policy if exists member_reads_actions on public.authorized_actions;
create policy member_reads_actions on public.authorized_actions for select to authenticated
  using (is_member(group_id));

grant select on public.observed_transfers, public.authorized_actions to authenticated;
