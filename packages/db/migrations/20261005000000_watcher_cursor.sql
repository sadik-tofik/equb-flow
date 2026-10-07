-- packages/db/migrations/20261005000000_watcher_cursor.sql
-- Table for persisting chain watcher block cursor per chain ID.

create table if not exists watcher_cursors (
  chain_id bigint primary key,
  last_block bigint not null,
  updated_at timestamptz not null default now()
);

alter table watcher_cursors enable row level security;

drop policy if exists watcher_cursors_all on watcher_cursors;
create policy watcher_cursors_all on watcher_cursors for all to watcher using (true) with check (true);

revoke all on watcher_cursors from public, anon, authenticated;
grant select, insert, update on watcher_cursors to watcher;
