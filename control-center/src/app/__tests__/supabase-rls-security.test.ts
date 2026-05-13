import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

const migrationPath = path.join(process.cwd(), "supabase", "migrations", "20260513193500_enable_rls_public_tables.sql");
const migrationSql = fs.readFileSync(migrationPath, "utf-8");
const phase8MigrationPath = path.join(process.cwd(), "supabase", "migrations", "20260513175314_secure_rls_policies.sql");
const phase8MigrationSql = fs.readFileSync(phase8MigrationPath, "utf-8");
const securityPagePath = path.join(process.cwd(), "src", "app", "ceo", "expert", "security", "page.tsx");
const securityPageSource = fs.readFileSync(securityPagePath, "utf-8");

describe("Supabase RLS security migration", () => {
  it("backs up existing policies before changing RLS", () => {
    expect(migrationSql).toContain("security_audit.rls_policy_backup");
    expect(migrationSql).toMatch(/insert into security_audit\.rls_policy_backup/i);
    expect(migrationSql).toMatch(/from pg_policies/i);
    expect(migrationSql).toContain("security_audit.public_table_rls_audit");
  });

  it("enables and forces row level security on existing public tables", () => {
    expect(migrationSql).toMatch(/enable row level security/i);
    expect(migrationSql).toMatch(/force row level security/i);
    expect(migrationSql).toMatch(/to_regclass\(format\('public\.%I'/i);
  });

  it("covers the critical AI Company OS table families", () => {
    for (const table of [
      "users",
      "profiles",
      "missions",
      "artifacts",
      "outputs",
      "uploads",
      "files",
      "companies",
      "projects",
      "workspaces",
      "chats",
      "messages",
      "logs",
      "runtime",
      "evals",
      "skills",
    ]) {
      expect(migrationSql).toContain(`'${table}'`);
    }
  });

  it("uses owner/self/admin policies and avoids unrestricted anon access", () => {
    expect(migrationSql).toMatch(/auth\.uid\(\) = user_id/i);
    expect(migrationSql).toMatch(/auth\.uid\(\) = owner_id/i);
    expect(migrationSql).toMatch(/auth\.uid\(\) = created_by/i);
    expect(migrationSql).toMatch(/security_audit\.is_admin\(\)/i);
    expect(migrationSql).not.toMatch(/using\s*\(\s*true\s*\)/i);
    expect(migrationSql).not.toMatch(/with check\s*\(\s*true\s*\)/i);
  });

  it("keeps anon reads limited to explicit public rows and makes sensitive buckets private", () => {
    expect(migrationSql).toMatch(/to anon, authenticated using \(is_public = true\)/i);
    expect(migrationSql).toMatch(/to anon, authenticated using \(visibility = ''public''\)/i);
    expect(migrationSql).toMatch(/update storage\.buckets[\s\S]*set public = false/i);
  });

  it("adds Phase 8 expected RLS coverage for mission runtime tables", () => {
    expect(phase8MigrationSql).toContain("security_audit.expected_rls_tables");
    expect(phase8MigrationSql).toContain("security_audit.phase8_rls_expected_status");
    for (const table of [
      "companies",
      "projects",
      "missions",
      "messages",
      "chats",
      "artifacts",
      "outputs",
      "uploads",
      "files",
      "logs",
      "runtime_events",
      "events",
      "agent_runs",
      "agent_logs",
    ]) {
      expect(phase8MigrationSql).toContain(`'${table}'`);
    }
  });

  it("removes anonymous write policies and keeps privileged access scoped", () => {
    expect(phase8MigrationSql).toMatch(/and 'anon' = any\(roles\)[\s\S]*cmd in \('INSERT', 'UPDATE', 'DELETE', 'ALL'\)/i);
    expect(phase8MigrationSql).toMatch(/drop policy if exists %I on %s/i);
    expect(phase8MigrationSql).toMatch(/security_audit\.is_admin\(\)/i);
    expect(phase8MigrationSql).toMatch(/auth\.uid\(\) = user_id/i);
    expect(phase8MigrationSql).toMatch(/auth\.uid\(\) = owner_id/i);
    expect(phase8MigrationSql).not.toMatch(/using\s*\(\s*true\s*\)/i);
    expect(phase8MigrationSql).not.toMatch(/with check\s*\(\s*true\s*\)/i);
  });

  it("locks expected storage buckets to private authenticated access", () => {
    expect(phase8MigrationSql).toMatch(/update storage\.buckets[\s\S]*set public = false/i);
    for (const bucket of ["uploads", "files", "artifacts", "mission-artifacts", "workspaces", "ceo-uploads"]) {
      expect(phase8MigrationSql).toContain(`'${bucket}'`);
    }
    expect(phase8MigrationSql).toMatch(/create policy "phase8_storage_private_insert"/i);
    expect(phase8MigrationSql).toMatch(/auth\.uid\(\) = owner/i);
    expect(phase8MigrationSql).toMatch(/auth\.uid\(\)::text = owner_id/i);
    expect(phase8MigrationSql).not.toMatch(/storage\.objects[^']*for insert[^']*to anon/i);
  });

  it("adds an expert security diagnostic page without exposing secret values", () => {
    expect(securityPageSource).toContain("Supabase Security Diagnostics");
    expect(securityPageSource).toContain("NEXT_PUBLIC_SUPABASE_URL");
    expect(securityPageSource).toContain("SUPABASE_SERVICE_ROLE_KEY");
    expect(securityPageSource).toContain("present(item.key)");
    expect(securityPageSource).not.toContain("process.env.SUPABASE_SERVICE_ROLE_KEY");
    expect(securityPageSource).not.toContain("process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY");
  });
});
