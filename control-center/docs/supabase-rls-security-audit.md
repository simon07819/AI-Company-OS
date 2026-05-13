# Supabase RLS Security Audit

## Repo Findings

- No existing `supabase/`, Prisma schema, SQL schema, or RLS policy migrations were present in this repo before this fix.
- No Supabase client dependency or `service_role` usage was found in `src/`, `app/`, `pages/`, `lib/`, or `components`.
- Current app storage in this repo is local file based (`data/`, `generated-products/`, upload metadata in `data/ceo-files.json`), not direct Supabase access.
- No Supabase Storage bucket config was present in the repo.

## Migrations Added

`supabase/migrations/20260513193500_enable_rls_public_tables.sql`

The migration is idempotent and non-destructive:

- Backs up existing `public` policies into `security_audit.rls_policy_backup`.
- Creates `security_audit.public_table_rls_audit` to inspect RLS, anon policies, and anon write exposure after migration.
- Enables and forces RLS on known AI Company OS public tables if they exist.
- Adds admin policies using JWT metadata role `admin`.
- Adds owner policies when a table has `user_id`, `owner_id`, or `created_by`.
- Adds self policies for `profiles` / `users` when `id` maps to `auth.uid()`.
- Allows anonymous reads only for rows explicitly marked `is_public = true` or `visibility = 'public'`.
- Makes common sensitive storage buckets private if they exist.

`supabase/migrations/20260513175314_secure_rls_policies.sql`

The Phase 8 migration is also idempotent and non-destructive:

- Records expected security posture in `security_audit.expected_rls_tables`.
- Creates `security_audit.phase8_rls_expected_status` for post-migration verification.
- Re-enables and forces RLS on critical table families when present.
- Removes existing `anon` write policies on critical public tables.
- Keeps `visible_outputs` public reads limited to explicit `is_public` or `visibility = 'public'` rows.
- Locks expected Storage buckets to private and adds authenticated owner/admin policies on `storage.objects` when Storage exists.

## Critical Table Families Covered

- `users`, `profiles`
- `missions`, `mission_memory`
- `artifacts`, `mission_artifacts`, `outputs`, `visible_outputs`
- `uploads`, `files`
- `companies`, `projects`, `workspaces`
- `chats`, `messages`, `conversations`
- `logs`, `runtime`, `runtime_events`, `agent_logs`
- `events`, `agent_runs`, `agentruns`
- `evals`, `skills`, `approvals`

## Access Model

- `anon`: no access by default; readonly only for explicit public rows.
- `authenticated`: own rows only when ownership columns exist.
- `admin`: full access when JWT metadata role is `admin`.
- tables without ownership columns: admin-only by default.

## Verification Queries

Run after applying the migration:

```sql
select * from security_audit.public_table_rls_audit order by table_name;
select * from security_audit.public_table_rls_audit where not rls_enabled or anon_can_write;
select * from security_audit.phase8_rls_expected_status order by table_name;
select * from security_audit.phase8_rls_expected_status where anon_can_write or rls_enabled is not true;
select * from security_audit.rls_policy_backup order by backed_up_at desc;
```

## API / Storage Notes

- No Next.js route in this repo imports Supabase or uses a Supabase service role key.
- If Supabase is configured outside this repo, verify those server-side endpoints separately.
- Buckets named `uploads`, `files`, `artifacts`, `mission-artifacts`, `workspaces`, or `ceo-uploads` are forced private by the migration if present.
- CEO local uploads sanitize file names before writing to disk and serve files with private cache headers plus `X-Content-Type-Options: nosniff`.
- `/ceo/expert/security` exposes the expected posture and required variable presence without rendering secret values.
