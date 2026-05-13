-- Phase 8 security hardening for AI Company OS.
-- Non-destructive: no data is dropped. Existing dangerous anonymous write
-- policies on critical app tables are removed, RLS is enforced, and storage
-- buckets used for user/runtime artifacts are kept private.

create schema if not exists security_audit;

create table if not exists security_audit.expected_rls_tables (
  table_name text primary key,
  access_model text not null,
  public_read_allowed boolean not null default false,
  notes text not null,
  updated_at timestamptz not null default now()
);

insert into security_audit.expected_rls_tables (table_name, access_model, public_read_allowed, notes)
values
  ('users', 'self_or_admin', false, 'User identity records must be visible only to the user or admins.'),
  ('profiles', 'self_or_admin', false, 'Profiles may include private account metadata.'),
  ('companies', 'owner_or_admin', false, 'Company workspaces are private business data.'),
  ('projects', 'owner_or_admin', false, 'Project records are private unless explicitly published.'),
  ('missions', 'owner_or_admin', false, 'Mission state may include prompts, plans, and client data.'),
  ('mission_memory', 'owner_or_admin', false, 'Mission memory is runtime-private.'),
  ('mission_artifacts', 'owner_or_admin', false, 'Mission artifacts must be scoped to their owner.'),
  ('artifacts', 'owner_or_admin', false, 'Artifacts are private by default.'),
  ('outputs', 'owner_or_admin', false, 'Outputs are private unless explicitly public.'),
  ('visible_outputs', 'explicit_public_or_owner', true, 'Only explicit public rows may be readable anonymously.'),
  ('uploads', 'owner_or_admin', false, 'Uploaded files must remain private.'),
  ('files', 'owner_or_admin', false, 'Stored files must remain private.'),
  ('chats', 'owner_or_admin', false, 'Chats are private.'),
  ('messages', 'owner_or_admin', false, 'Messages are private.'),
  ('conversations', 'owner_or_admin', false, 'Conversation indexes are private.'),
  ('logs', 'admin_only', false, 'Runtime logs can contain operational details.'),
  ('runtime', 'admin_only', false, 'Runtime state is operational data.'),
  ('runtime_events', 'admin_only', false, 'Runtime events are operational data.'),
  ('events', 'admin_only', false, 'Generic events are operational data.'),
  ('agent_runs', 'admin_only', false, 'Agent runs can expose prompts and tool traces.'),
  ('agentruns', 'admin_only', false, 'Camel-case compatible agent run table.'),
  ('agent_logs', 'admin_only', false, 'Agent logs are operational data.'),
  ('evals', 'admin_only', false, 'Evaluation data is internal.'),
  ('approvals', 'owner_or_admin', false, 'Approval records are private workflow data.')
on conflict (table_name) do update set
  access_model = excluded.access_model,
  public_read_allowed = excluded.public_read_allowed,
  notes = excluded.notes,
  updated_at = now();

create or replace function security_audit.is_admin()
returns boolean
language sql
stable
as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin'
    or coalesce(auth.jwt() -> 'user_metadata' ->> 'role', '') = 'admin';
$$;

do $$
declare
  target record;
  qualified_table text;
  anon_policy record;
  has_user_id boolean;
  has_owner_id boolean;
  has_created_by boolean;
  has_id boolean;
  has_visibility boolean;
  has_is_public boolean;
begin
  for target in select * from security_audit.expected_rls_tables loop
    if to_regclass(format('public.%I', target.table_name)) is null then
      continue;
    end if;

    qualified_table := format('public.%I', target.table_name);

    execute format('alter table %s enable row level security', qualified_table);
    execute format('alter table %s force row level security', qualified_table);

    for anon_policy in
      select policyname
      from pg_policies
      where schemaname = 'public'
        and tablename = target.table_name
        and 'anon' = any(roles)
        and cmd in ('INSERT', 'UPDATE', 'DELETE', 'ALL')
    loop
      execute format('drop policy if exists %I on %s', anon_policy.policyname, qualified_table);
    end loop;

    select exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = target.table_name and column_name = 'user_id'
    ) into has_user_id;
    select exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = target.table_name and column_name = 'owner_id'
    ) into has_owner_id;
    select exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = target.table_name and column_name = 'created_by'
    ) into has_created_by;
    select exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = target.table_name and column_name = 'id'
    ) into has_id;
    select exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = target.table_name and column_name = 'visibility'
    ) into has_visibility;
    select exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = target.table_name and column_name = 'is_public'
    ) into has_is_public;

    execute format('drop policy if exists %I on %s', 'phase8_admin_all_' || target.table_name, qualified_table);
    execute format(
      'create policy %I on %s for all to authenticated using (security_audit.is_admin()) with check (security_audit.is_admin())',
      'phase8_admin_all_' || target.table_name,
      qualified_table
    );

    if target.access_model in ('owner_or_admin', 'explicit_public_or_owner') then
      if has_user_id then
        execute format('drop policy if exists %I on %s', 'phase8_owner_select_' || target.table_name, qualified_table);
        execute format('drop policy if exists %I on %s', 'phase8_owner_insert_' || target.table_name, qualified_table);
        execute format('drop policy if exists %I on %s', 'phase8_owner_update_' || target.table_name, qualified_table);
        execute format('drop policy if exists %I on %s', 'phase8_owner_delete_' || target.table_name, qualified_table);
        execute format('create policy %I on %s for select to authenticated using (auth.uid() = user_id)', 'phase8_owner_select_' || target.table_name, qualified_table);
        execute format('create policy %I on %s for insert to authenticated with check (auth.uid() = user_id)', 'phase8_owner_insert_' || target.table_name, qualified_table);
        execute format('create policy %I on %s for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id)', 'phase8_owner_update_' || target.table_name, qualified_table);
        execute format('create policy %I on %s for delete to authenticated using (auth.uid() = user_id)', 'phase8_owner_delete_' || target.table_name, qualified_table);
      elsif has_owner_id then
        execute format('drop policy if exists %I on %s', 'phase8_owner_select_' || target.table_name, qualified_table);
        execute format('drop policy if exists %I on %s', 'phase8_owner_insert_' || target.table_name, qualified_table);
        execute format('drop policy if exists %I on %s', 'phase8_owner_update_' || target.table_name, qualified_table);
        execute format('drop policy if exists %I on %s', 'phase8_owner_delete_' || target.table_name, qualified_table);
        execute format('create policy %I on %s for select to authenticated using (auth.uid() = owner_id)', 'phase8_owner_select_' || target.table_name, qualified_table);
        execute format('create policy %I on %s for insert to authenticated with check (auth.uid() = owner_id)', 'phase8_owner_insert_' || target.table_name, qualified_table);
        execute format('create policy %I on %s for update to authenticated using (auth.uid() = owner_id) with check (auth.uid() = owner_id)', 'phase8_owner_update_' || target.table_name, qualified_table);
        execute format('create policy %I on %s for delete to authenticated using (auth.uid() = owner_id)', 'phase8_owner_delete_' || target.table_name, qualified_table);
      elsif has_created_by then
        execute format('drop policy if exists %I on %s', 'phase8_creator_select_' || target.table_name, qualified_table);
        execute format('drop policy if exists %I on %s', 'phase8_creator_insert_' || target.table_name, qualified_table);
        execute format('drop policy if exists %I on %s', 'phase8_creator_update_' || target.table_name, qualified_table);
        execute format('drop policy if exists %I on %s', 'phase8_creator_delete_' || target.table_name, qualified_table);
        execute format('create policy %I on %s for select to authenticated using (auth.uid() = created_by)', 'phase8_creator_select_' || target.table_name, qualified_table);
        execute format('create policy %I on %s for insert to authenticated with check (auth.uid() = created_by)', 'phase8_creator_insert_' || target.table_name, qualified_table);
        execute format('create policy %I on %s for update to authenticated using (auth.uid() = created_by) with check (auth.uid() = created_by)', 'phase8_creator_update_' || target.table_name, qualified_table);
        execute format('create policy %I on %s for delete to authenticated using (auth.uid() = created_by)', 'phase8_creator_delete_' || target.table_name, qualified_table);
      end if;
    elsif target.access_model = 'self_or_admin' and has_id then
      execute format('drop policy if exists %I on %s', 'phase8_self_select_' || target.table_name, qualified_table);
      execute format('drop policy if exists %I on %s', 'phase8_self_update_' || target.table_name, qualified_table);
      execute format('create policy %I on %s for select to authenticated using (auth.uid() = id)', 'phase8_self_select_' || target.table_name, qualified_table);
      execute format('create policy %I on %s for update to authenticated using (auth.uid() = id) with check (auth.uid() = id)', 'phase8_self_update_' || target.table_name, qualified_table);
    end if;

    if target.public_read_allowed and has_is_public then
      execute format('drop policy if exists %I on %s', 'phase8_public_read_' || target.table_name, qualified_table);
      execute format('create policy %I on %s for select to anon, authenticated using (is_public = true)', 'phase8_public_read_' || target.table_name, qualified_table);
    elsif target.public_read_allowed and has_visibility then
      execute format('drop policy if exists %I on %s', 'phase8_public_read_' || target.table_name, qualified_table);
      execute format('create policy %I on %s for select to anon, authenticated using (visibility = ''public'')', 'phase8_public_read_' || target.table_name, qualified_table);
    end if;
  end loop;
end $$;

create or replace view security_audit.phase8_rls_expected_status as
select
  expected.table_name,
  expected.access_model,
  expected.public_read_allowed,
  c.relrowsecurity as rls_enabled,
  c.relforcerowsecurity as rls_forced,
  coalesce(bool_or('anon' = any(p.roles)), false) as has_anon_policy,
  coalesce(bool_or(p.cmd in ('INSERT', 'UPDATE', 'DELETE', 'ALL') and 'anon' = any(p.roles)), false) as anon_can_write,
  count(p.policyname) as policy_count
from security_audit.expected_rls_tables expected
left join pg_class c on c.oid = to_regclass(format('public.%I', expected.table_name))
left join pg_namespace n on n.oid = c.relnamespace
left join pg_policies p on p.schemaname = n.nspname and p.tablename = c.relname
group by expected.table_name, expected.access_model, expected.public_read_allowed, c.relrowsecurity, c.relforcerowsecurity;

do $$
declare
  has_owner boolean;
  has_owner_id boolean;
begin
  if exists (select 1 from pg_namespace where nspname = 'storage') then
    if to_regclass('storage.buckets') is not null then
      update storage.buckets
      set public = false
      where name in ('uploads', 'files', 'artifacts', 'mission-artifacts', 'workspaces', 'ceo-uploads')
        and public = true;
    end if;

    if to_regclass('storage.objects') is not null then
      execute 'alter table storage.objects enable row level security';

      select exists (
        select 1 from information_schema.columns
        where table_schema = 'storage' and table_name = 'objects' and column_name = 'owner'
      ) into has_owner;
      select exists (
        select 1 from information_schema.columns
        where table_schema = 'storage' and table_name = 'objects' and column_name = 'owner_id'
      ) into has_owner_id;

      execute 'drop policy if exists "phase8_storage_admin_all" on storage.objects';
      execute 'create policy "phase8_storage_admin_all" on storage.objects for all to authenticated using (security_audit.is_admin()) with check (security_audit.is_admin())';

      execute 'drop policy if exists "phase8_storage_private_select" on storage.objects';
      execute 'drop policy if exists "phase8_storage_private_insert" on storage.objects';
      execute 'drop policy if exists "phase8_storage_private_update" on storage.objects';
      execute 'drop policy if exists "phase8_storage_private_delete" on storage.objects';

      if has_owner then
        execute 'create policy "phase8_storage_private_select" on storage.objects for select to authenticated using (bucket_id in (''uploads'', ''files'', ''artifacts'', ''mission-artifacts'', ''workspaces'', ''ceo-uploads'') and auth.uid() = owner)';
        execute 'create policy "phase8_storage_private_insert" on storage.objects for insert to authenticated with check (bucket_id in (''uploads'', ''files'', ''artifacts'', ''mission-artifacts'', ''workspaces'', ''ceo-uploads'') and auth.uid() = owner)';
        execute 'create policy "phase8_storage_private_update" on storage.objects for update to authenticated using (bucket_id in (''uploads'', ''files'', ''artifacts'', ''mission-artifacts'', ''workspaces'', ''ceo-uploads'') and auth.uid() = owner) with check (bucket_id in (''uploads'', ''files'', ''artifacts'', ''mission-artifacts'', ''workspaces'', ''ceo-uploads'') and auth.uid() = owner)';
        execute 'create policy "phase8_storage_private_delete" on storage.objects for delete to authenticated using (bucket_id in (''uploads'', ''files'', ''artifacts'', ''mission-artifacts'', ''workspaces'', ''ceo-uploads'') and auth.uid() = owner)';
      elsif has_owner_id then
        execute 'create policy "phase8_storage_private_select" on storage.objects for select to authenticated using (bucket_id in (''uploads'', ''files'', ''artifacts'', ''mission-artifacts'', ''workspaces'', ''ceo-uploads'') and auth.uid()::text = owner_id)';
        execute 'create policy "phase8_storage_private_insert" on storage.objects for insert to authenticated with check (bucket_id in (''uploads'', ''files'', ''artifacts'', ''mission-artifacts'', ''workspaces'', ''ceo-uploads'') and auth.uid()::text = owner_id)';
        execute 'create policy "phase8_storage_private_update" on storage.objects for update to authenticated using (bucket_id in (''uploads'', ''files'', ''artifacts'', ''mission-artifacts'', ''workspaces'', ''ceo-uploads'') and auth.uid()::text = owner_id) with check (bucket_id in (''uploads'', ''files'', ''artifacts'', ''mission-artifacts'', ''workspaces'', ''ceo-uploads'') and auth.uid()::text = owner_id)';
        execute 'create policy "phase8_storage_private_delete" on storage.objects for delete to authenticated using (bucket_id in (''uploads'', ''files'', ''artifacts'', ''mission-artifacts'', ''workspaces'', ''ceo-uploads'') and auth.uid()::text = owner_id)';
      else
        execute 'create policy "phase8_storage_private_select" on storage.objects for select to authenticated using (bucket_id in (''uploads'', ''files'', ''artifacts'', ''mission-artifacts'', ''workspaces'', ''ceo-uploads'') and (storage.foldername(name))[1] = auth.uid()::text)';
        execute 'create policy "phase8_storage_private_insert" on storage.objects for insert to authenticated with check (bucket_id in (''uploads'', ''files'', ''artifacts'', ''mission-artifacts'', ''workspaces'', ''ceo-uploads'') and (storage.foldername(name))[1] = auth.uid()::text)';
        execute 'create policy "phase8_storage_private_update" on storage.objects for update to authenticated using (bucket_id in (''uploads'', ''files'', ''artifacts'', ''mission-artifacts'', ''workspaces'', ''ceo-uploads'') and (storage.foldername(name))[1] = auth.uid()::text) with check (bucket_id in (''uploads'', ''files'', ''artifacts'', ''mission-artifacts'', ''workspaces'', ''ceo-uploads'') and (storage.foldername(name))[1] = auth.uid()::text)';
        execute 'create policy "phase8_storage_private_delete" on storage.objects for delete to authenticated using (bucket_id in (''uploads'', ''files'', ''artifacts'', ''mission-artifacts'', ''workspaces'', ''ceo-uploads'') and (storage.foldername(name))[1] = auth.uid()::text)';
      end if;
    end if;
  end if;
end $$;
