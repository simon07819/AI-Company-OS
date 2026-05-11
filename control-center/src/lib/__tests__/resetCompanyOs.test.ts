import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

let rootDir = "";

function writeJson(filePath: string, value: unknown) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2) + "\n", "utf-8");
}

describe("resetCompanyOs", () => {
  beforeEach(() => {
    rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "company-os-reset-"));
    fs.mkdirSync(path.join(rootDir, "data"), { recursive: true });
    fs.mkdirSync(path.join(rootDir, "..", "data"), { recursive: true });
    fs.mkdirSync(path.join(rootDir, "..", "logs"), { recursive: true });
  });

  afterEach(() => {
    if (rootDir) fs.rmSync(rootDir, { recursive: true, force: true });
  });

  it("refuses to run without explicit confirmation", async () => {
    const { resetCompanyOs } = await import("@/lib/resetCompanyOs");
    expect(() => resetCompanyOs({ rootDir })).toThrow(/CONFIRM_RESET=AI_COMPANY_OS_RESET/);
  });

  it("resets user data while preserving agent config files", async () => {
    const { RESET_CONFIRMATION, resetCompanyOs } = await import("@/lib/resetCompanyOs");
    writeJson(path.join(rootDir, "data", "company-workspaces.json"), { workspaces: [{ id: "old-company" }] });
    writeJson(path.join(rootDir, "data", "ceo-projects.json"), { projects: [{ id: "old-project" }] });
    writeJson(path.join(rootDir, "data", "visible-outputs.json"), { outputs: [{ id: "old-output" }] });
    writeJson(path.join(rootDir, "data", "approvals.json"), { approvals: [{ id: "old-approval", status: "pending" }] });
    writeJson(path.join(rootDir, "data", "conversations.json"), { folders: [], threads: [{ id: "old-thread" }] });
    writeJson(path.join(rootDir, "data", "agent-profiles.json"), { profiles: [{ agentId: "ceo" }] });
    writeJson(path.join(rootDir, "..", "data", "autopilot-sessions.json"), [{ sessionId: "old-session" }]);
    fs.writeFileSync(path.join(rootDir, "..", "logs", "agent_activity.jsonl"), "{\"old\":true}\n", "utf-8");

    const result = resetCompanyOs({ rootDir, confirm: RESET_CONFIRMATION });

    expect(result.ok).toBe(true);
    expect(JSON.parse(fs.readFileSync(path.join(rootDir, "data", "company-workspaces.json"), "utf-8")).workspaces).toEqual([]);
    expect(JSON.parse(fs.readFileSync(path.join(rootDir, "data", "ceo-projects.json"), "utf-8")).projects).toEqual([]);
    expect(JSON.parse(fs.readFileSync(path.join(rootDir, "data", "visible-outputs.json"), "utf-8")).outputs).toEqual([]);
    expect(JSON.parse(fs.readFileSync(path.join(rootDir, "data", "approvals.json"), "utf-8")).approvals).toEqual([]);
    expect(JSON.parse(fs.readFileSync(path.join(rootDir, "data", "conversations.json"), "utf-8")).threads).toEqual([]);
    expect(JSON.parse(fs.readFileSync(path.join(rootDir, "..", "data", "autopilot-sessions.json"), "utf-8"))).toEqual([]);
    expect(fs.readFileSync(path.join(rootDir, "..", "logs", "agent_activity.jsonl"), "utf-8")).toBe("");
    expect(JSON.parse(fs.readFileSync(path.join(rootDir, "data", "agent-profiles.json"), "utf-8")).profiles).toHaveLength(1);
  });

  it("refuses production reset unless explicitly allowed", async () => {
    const { RESET_CONFIRMATION, resetCompanyOs } = await import("@/lib/resetCompanyOs");
    expect(() => resetCompanyOs({ rootDir, confirm: RESET_CONFIRMATION, production: true })).toThrow(/production/);
    expect(resetCompanyOs({ rootDir, confirm: RESET_CONFIRMATION, production: true, allowProduction: true }).ok).toBe(true);
  });
});
