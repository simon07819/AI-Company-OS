import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

const migrationPath = path.join(process.cwd(), "supabase", "migrations", "20260513193500_enable_rls_public_tables.sql");
const migrationSql = fs.readFileSync(migrationPath, "utf-8");

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
});
