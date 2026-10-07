-- packages/db/tests/supabase-stub.sql
-- Creates Supabase-provided environment components on plain PostgreSQL
-- (roles, auth schema, auth.uid() function) for local and CI testing.

create extension if not exists "pgcrypto";

-- Supabase default roles
do $$
begin
  if not exists (select from pg_roles where rolname = 'anon') then
    create role anon nologin;
  end if;
  if not exists (select from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin;
  end if;
  if not exists (select from pg_roles where rolname = 'service_role') then
    create role service_role nologin;
  end if;

  -- Ensure migration user can set role to Supabase roles during tests
  execute format('grant anon, authenticated, service_role to %I', current_user);
end
$$;

-- Supabase auth schema and helper functions
create schema if not exists auth;

create or replace function auth.uid()
returns uuid as $$
  select nullif(
    coalesce(
      current_setting('request.jwt.claim.sub', true),
      (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
    ),
    ''
  )::uuid;
$$ language sql stable;

create or replace function auth.role()
returns text as $$
  select nullif(
    coalesce(
      current_setting('request.jwt.claim.role', true),
      (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role')
    ),
    ''
  )::text;
$$ language sql stable;

grant usage on schema auth to public, anon, authenticated, service_role;
grant execute on function auth.uid() to public, anon, authenticated, service_role;
grant execute on function auth.role() to public, anon, authenticated, service_role;
