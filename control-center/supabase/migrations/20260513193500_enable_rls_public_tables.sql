-- Security hardening for AI Company OS public schema.
-- Non-destructive: backs up existing policy definitions, enables RLS on known
-- application tables when present, and installs least-privilege policies.

create schema if not exists security_audit;

create table if not exists security_audit.rls_policy_backup (
  id bigserial primary key,
  backed_up_at timestamptz not null default now(),
  schemaname text not null,
  tablename text not null,
  policyname text not null,
  permissive text,
  roles text[],
  cmd text,
  qual text,
  with_check text
);

insert into security_audit.rls_policy_backup (
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
)
select
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
from pg_policies
where schemaname = 'public';

create or replace function security_audit.is_admin()
returns boolean
language sql
stable
as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin'
    or coalesce(auth.jwt() -> 'user_metadata' ->> 'role', '') = 'admin';
$$;

create or replace view security_audit.public_table_rls_audit as
select
  n.nspname as schema_name,
  c.relname as table_name,
  c.relrowsecurity as rls_enabled,
  c.relforcerowsecurity as rls_forced,
  count(p.policyname) as policy_count,
  coalesce(bool_or('anon' = any(p.roles)), false) as has_anon_policy,
  coalesce(bool_or(p.cmd in ('INSERT', 'UPDATE', 'DELETE', 'ALL') and 'anon' = any(p.roles)), false) as anon_can_write
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
left join pg_policies p on p.schemaname = n.nspname and p.tablename = c.relname
where n.nspname = 'public'
  and c.relkind = 'r'
group by n.nspname, c.relname, c.relrowsecurity, c.relforcerowsecurity;

do $$
declare
  target_table text;
  table_names text[] := array[
    'users',
    'profiles',
    'missions',
    'mission_memory',
    'mission_artifacts',
    'artifacts',
    'outputs',
    'visible_outputs',
    'uploads',
    'files',
    'companies',
    'projects',
    'workspaces',
    'chats',
    'messages',
    'conversations',
    'logs',
    'runtime',
    'runtime_events',
    'agent_logs',
    'evals',
    'skills',
    'approvals'
  ];
  has_user_id boolean;
  has_owner_id boolean;
  has_created_by boolean;
  has_id boolean;
  has_visibility boolean;
  has_is_public boolean;
  qualified_table text;
begin
  foreach target_table in array table_names loop
    if to_regclass(format('public.%I', target_table)) is null then
      continue;
    end if;

    qualified_table := format('public.%I', target_table);

    execute format('alter table %s enable row level security', qualified_table);
    execute format('alter table %s force row level security', qualified_table);

    select exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and information_schema.columns.table_name = target_table and column_name = 'user_id'
    ) into has_user_id;

    select exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and information_schema.columns.table_name = target_table and column_name = 'owner_id'
    ) into has_owner_id;

    select exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and information_schema.columns.table_name = target_table and column_name = 'created_by'
    ) into has_created_by;

    select exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and information_schema.columns.table_name = target_table and column_name = 'id'
    ) into has_id;

    select exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and information_schema.columns.table_name = target_table and column_name = 'visibility'
    ) into has_visibility;

    select exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and information_schema.columns.table_name = target_table and column_name = 'is_public'
    ) into has_is_public;

    execute format('drop policy if exists "admin_all_%1$s" on %2$s', target_table, qualified_table);
    execute format(
      'create policy "admin_all_%1$s" on %2$s for all to authenticated using (security_audit.is_admin()) with check (security_audit.is_admin())',
      target_table,
      qualified_table
    );

    if has_user_id then
      execute format('drop policy if exists "owner_select_%1$s" on %2$s', target_table, qualified_table);
      execute format('drop policy if exists "owner_insert_%1$s" on %2$s', target_table, qualified_table);
      execute format('drop policy if exists "owner_update_%1$s" on %2$s', target_table, qualified_table);
      execute format('drop policy if exists "owner_delete_%1$s" on %2$s', target_table, qualified_table);
      execute format('create policy "owner_select_%1$s" on %2$s for select to authenticated using (auth.uid() = user_id)', target_table, qualified_table);
      execute format('create policy "owner_insert_%1$s" on %2$s for insert to authenticated with check (auth.uid() = user_id)', target_table, qualified_table);
      execute format('create policy "owner_update_%1$s" on %2$s for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id)', target_table, qualified_table);
      execute format('create policy "owner_delete_%1$s" on %2$s for delete to authenticated using (auth.uid() = user_id)', target_table, qualified_table);
    elsif has_owner_id then
      execute format('drop policy if exists "owner_select_%1$s" on %2$s', target_table, qualified_table);
      execute format('drop policy if exists "owner_insert_%1$s" on %2$s', target_table, qualified_table);
      execute format('drop policy if exists "owner_update_%1$s" on %2$s', target_table, qualified_table);
      execute format('drop policy if exists "owner_delete_%1$s" on %2$s', target_table, qualified_table);
      execute format('create policy "owner_select_%1$s" on %2$s for select to authenticated using (auth.uid() = owner_id)', target_table, qualified_table);
      execute format('create policy "owner_insert_%1$s" on %2$s for insert to authenticated with check (auth.uid() = owner_id)', target_table, qualified_table);
      execute format('create policy "owner_update_%1$s" on %2$s for update to authenticated using (auth.uid() = owner_id) with check (auth.uid() = owner_id)', target_table, qualified_table);
      execute format('create policy "owner_delete_%1$s" on %2$s for delete to authenticated using (auth.uid() = owner_id)', target_table, qualified_table);
    elsif has_created_by then
      execute format('drop policy if exists "creator_select_%1$s" on %2$s', target_table, qualified_table);
      execute format('drop policy if exists "creator_insert_%1$s" on %2$s', target_table, qualified_table);
      execute format('drop policy if exists "creator_update_%1$s" on %2$s', target_table, qualified_table);
      execute format('drop policy if exists "creator_delete_%1$s" on %2$s', target_table, qualified_table);
      execute format('create policy "creator_select_%1$s" on %2$s for select to authenticated using (auth.uid() = created_by)', target_table, qualified_table);
      execute format('create policy "creator_insert_%1$s" on %2$s for insert to authenticated with check (auth.uid() = created_by)', target_table, qualified_table);
      execute format('create policy "creator_update_%1$s" on %2$s for update to authenticated using (auth.uid() = created_by) with check (auth.uid() = created_by)', target_table, qualified_table);
      execute format('create policy "creator_delete_%1$s" on %2$s for delete to authenticated using (auth.uid() = created_by)', target_table, qualified_table);
    elsif target_table in ('profiles', 'users') and has_id then
      execute format('drop policy if exists "self_select_%1$s" on %2$s', target_table, qualified_table);
      execute format('drop policy if exists "self_update_%1$s" on %2$s', target_table, qualified_table);
      execute format('create policy "self_select_%1$s" on %2$s for select to authenticated using (auth.uid() = id)', target_table, qualified_table);
      execute format('create policy "self_update_%1$s" on %2$s for update to authenticated using (auth.uid() = id) with check (auth.uid() = id)', target_table, qualified_table);
    end if;

    if has_is_public then
      execute format('drop policy if exists "public_read_%1$s" on %2$s', target_table, qualified_table);
      execute format('create policy "public_read_%1$s" on %2$s for select to anon, authenticated using (is_public = true)', target_table, qualified_table);
    elsif has_visibility then
      execute format('drop policy if exists "public_read_%1$s" on %2$s', target_table, qualified_table);
      execute format('create policy "public_read_%1$s" on %2$s for select to anon, authenticated using (visibility = ''public'')', target_table, qualified_table);
    end if;
  end loop;
end $$;

do $$
begin
  if exists (select 1 from pg_namespace where nspname = 'storage') then
    if to_regclass('storage.buckets') is not null then
      update storage.buckets
      set public = false
      where name in ('uploads', 'files', 'artifacts', 'mission-artifacts', 'workspaces')
        and public = true;
    end if;
  end if;
end $$;
