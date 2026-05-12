import fs from "fs";
import os from "os";
import path from "path";
import { execFileSync } from "child_process";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

let rootDir = "";
let baseDir = "";

function writeJson(filePath: string, value: unknown) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2) + "\n", "utf-8");
}

describe("resetCompanyOs", () => {
  beforeEach(() => {
    baseDir = fs.mkdtempSync(path.join(os.tmpdir(), "company-os-reset-"));
    rootDir = path.join(baseDir, "control-center");
    fs.mkdirSync(path.join(rootDir, "data"), { recursive: true });
    fs.mkdirSync(path.join(rootDir, "..", "data"), { recursive: true });
    fs.mkdirSync(path.join(rootDir, "..", "logs"), { recursive: true });
  });

  afterEach(() => {
    if (baseDir) fs.rmSync(baseDir, { recursive: true, force: true });
  });

  it("refuses to run without explicit confirmation", async () => {
    const { resetCompanyOs } = await import("@/lib/resetCompanyOs");
    expect(() => resetCompanyOs({ rootDir })).toThrow(/CONFIRM_RESET=AI_COMPANY_OS_RESET/);
  });

  it("resets user data while preserving agent config files", async () => {
    const { RESET_CONFIRMATION, resetCompanyOs } = await import("@/lib/resetCompanyOs");
    writeJson(path.join(rootDir, "data", "company-workspaces.json"), { workspaces: [{ id: "old-company", name: "ELEVIO" }] });
    writeJson(path.join(rootDir, "data", "ceo-projects.json"), { projects: [{ id: "old-project", name: "Logo ELEVIO" }] });
    writeJson(path.join(rootDir, "data", "visible-outputs.json"), { outputs: [{ id: "old-output", title: "ELEVIO concept" }] });
    writeJson(path.join(rootDir, "data", "approvals.json"), { approvals: [{ id: "old-approval", status: "pending", title: "ELEVIO" }] });
    writeJson(path.join(rootDir, "data", "conversations.json"), { folders: [], threads: [{ id: "old-thread", title: "ELEVIO" }] });
    writeJson(path.join(rootDir, "data", "ceo-chat.json"), { messages: [{ id: "msg-1", text: "ELEVIO" }] });
    writeJson(path.join(rootDir, "data", "onboarding-state.json"), { completed: true, preferences: { companyName: "ELEVIO" } });
    writeJson(path.join(rootDir, "data", "agent-profiles.json"), { profiles: [{ agentId: "ceo" }] });
    writeJson(path.join(rootDir, "..", "data", "autopilot-sessions.json"), [{ sessionId: "old-session" }]);
    fs.writeFileSync(path.join(rootDir, ".env.local"), "NVIDIA_API_KEY=secret\n", "utf-8");
    fs.writeFileSync(path.join(rootDir, "..", "logs", "agent_activity.jsonl"), "{\"old\":true}\n", "utf-8");

    const result = resetCompanyOs({ rootDir, confirm: RESET_CONFIRMATION });

    expect(result.ok).toBe(true);
    expect(JSON.parse(fs.readFileSync(path.join(rootDir, "data", "company-workspaces.json"), "utf-8")).workspaces).toEqual([]);
    expect(JSON.parse(fs.readFileSync(path.join(rootDir, "data", "ceo-projects.json"), "utf-8")).projects).toEqual([]);
    expect(JSON.parse(fs.readFileSync(path.join(rootDir, "data", "visible-outputs.json"), "utf-8")).outputs).toEqual([]);
    expect(JSON.parse(fs.readFileSync(path.join(rootDir, "data", "approvals.json"), "utf-8")).approvals).toEqual([]);
    expect(JSON.parse(fs.readFileSync(path.join(rootDir, "data", "conversations.json"), "utf-8")).threads).toEqual([]);
    expect(JSON.parse(fs.readFileSync(path.join(rootDir, "data", "ceo-chat.json"), "utf-8")).messages).toEqual([]);
    expect(JSON.parse(fs.readFileSync(path.join(rootDir, "data", "onboarding-state.json"), "utf-8")).completed).toBe(false);
    expect(JSON.parse(fs.readFileSync(path.join(rootDir, "..", "data", "autopilot-sessions.json"), "utf-8"))).toEqual([]);
    expect(fs.readFileSync(path.join(rootDir, "..", "logs", "agent_activity.jsonl"), "utf-8")).toBe("");
    expect(JSON.parse(fs.readFileSync(path.join(rootDir, "data", "agent-profiles.json"), "utf-8")).profiles).toHaveLength(1);
    expect(fs.readFileSync(path.join(rootDir, ".env.local"), "utf-8")).toBe("NVIDIA_API_KEY=secret\n");
    expect(JSON.stringify(result)).not.toContain("NVIDIA_API_KEY=secret");
    expect(JSON.stringify({
      workspaces: JSON.parse(fs.readFileSync(path.join(rootDir, "data", "company-workspaces.json"), "utf-8")),
      projects: JSON.parse(fs.readFileSync(path.join(rootDir, "data", "ceo-projects.json"), "utf-8")),
      outputs: JSON.parse(fs.readFileSync(path.join(rootDir, "data", "visible-outputs.json"), "utf-8")),
      approvals: JSON.parse(fs.readFileSync(path.join(rootDir, "data", "approvals.json"), "utf-8")),
      conversations: JSON.parse(fs.readFileSync(path.join(rootDir, "data", "conversations.json"), "utf-8")),
      chat: JSON.parse(fs.readFileSync(path.join(rootDir, "data", "ceo-chat.json"), "utf-8")),
    })).not.toContain("ELEVIO");
  });

  it("cleans generated-products only when the optional flag is enabled", async () => {
    const { RESET_CONFIRMATION, resetCompanyOs } = await import("@/lib/resetCompanyOs");
    const generatedDir = path.join(rootDir, "generated-products");
    fs.mkdirSync(path.join(generatedDir, "elevio"), { recursive: true });
    fs.writeFileSync(path.join(generatedDir, ".gitkeep"), "", "utf-8");
    fs.writeFileSync(path.join(generatedDir, "elevio", "README.md"), "ELEVIO", "utf-8");

    resetCompanyOs({ rootDir, confirm: RESET_CONFIRMATION });
    expect(fs.existsSync(path.join(generatedDir, "elevio", "README.md"))).toBe(true);

    resetCompanyOs({ rootDir, confirm: RESET_CONFIRMATION, resetGeneratedProducts: true });
    expect(fs.existsSync(path.join(generatedDir, "elevio"))).toBe(false);
    expect(fs.existsSync(path.join(generatedDir, ".gitkeep"))).toBe(true);
  });

  it("cleans AI Company OS browser storage without touching theme or view mode", async () => {
    const { cleanupCompanyOsClientStorage } = await import("@/lib/clientStorageReset");
    const store = new Map<string, string>([
      ["ai-company-os-theme", "dark"],
      ["ai-company-os-view-mode", "expert"],
      ["ai-company-os-old-ceo-message", "ELEVIO"],
      ["simple-agency-cache", "old"],
      ["unrelated-key", "keep"],
    ]);
    const storage = {
      get length() { return store.size; },
      key: (index: number) => Array.from(store.keys())[index] ?? null,
      removeItem: (key: string) => { store.delete(key); },
    };

    const removed = cleanupCompanyOsClientStorage([storage]);

    expect(removed).toEqual(expect.arrayContaining(["ai-company-os-old-ceo-message", "simple-agency-cache"]));
    expect(store.has("ai-company-os-old-ceo-message")).toBe(false);
    expect(store.has("simple-agency-cache")).toBe(false);
    expect(store.get("ai-company-os-theme")).toBe("dark");
    expect(store.get("ai-company-os-view-mode")).toBe("expert");
    expect(store.get("unrelated-key")).toBe("keep");
  });

  it("the CLI reset command refuses without CONFIRM_RESET and accepts with it", () => {
    const scriptPath = path.join(process.cwd(), "scripts", "reset-ai-company-os.mjs");
    writeJson(path.join(rootDir, "data", "ceo-chat.json"), { messages: [{ text: "ELEVIO" }] });

    expect(() => execFileSync(process.execPath, [scriptPath], {
      cwd: process.cwd(),
      env: { ...process.env, AI_COMPANY_OS_ROOT: rootDir, CONFIRM_RESET: "" },
      stdio: "pipe",
    })).toThrow();

    const output = execFileSync(process.execPath, [scriptPath], {
      cwd: process.cwd(),
      env: { ...process.env, AI_COMPANY_OS_ROOT: rootDir, CONFIRM_RESET: "AI_COMPANY_OS_RESET" },
      encoding: "utf-8",
      stdio: "pipe",
    });

    expect(output).toContain("Reset termine");
    expect(output).not.toContain("NVIDIA_API_KEY");
    expect(JSON.parse(fs.readFileSync(path.join(rootDir, "data", "ceo-chat.json"), "utf-8")).messages).toEqual([]);
  });

  it("refuses production reset unless explicitly allowed", async () => {
    const { RESET_CONFIRMATION, resetCompanyOs } = await import("@/lib/resetCompanyOs");
    expect(() => resetCompanyOs({ rootDir, confirm: RESET_CONFIRMATION, production: true })).toThrow(/production/);
    expect(resetCompanyOs({ rootDir, confirm: RESET_CONFIRMATION, production: true, allowProduction: true }).ok).toBe(true);
  });
});
