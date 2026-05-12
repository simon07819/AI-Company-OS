import { describe, expect, it } from "vitest";
import { capabilityPacks, defaultToolContext, runToolAdapter, toolRegistry } from "@/agents/capabilities/registry";
import { assertRepoScopedPath, assertSafeShellCommand } from "@/agents/capabilities/guards";

const requiredTools = [
  "filesystem.project",
  "shell.safe",
  "git.repo",
  "visual.svg",
  "website.preview",
  "quality.evaluate",
  "artifact.store",
  "browser.preview",
  "mcp.generic",
  "mcp.github",
  "mcp.playwright",
];

describe("agent capability registry", () => {
  it("registers callable tool adapters with permissions", () => {
    for (const toolId of requiredTools) {
      const tool = toolRegistry[toolId];
      expect(tool, toolId).toBeTruthy();
      expect(tool.permissions.length).toBeGreaterThan(0);
      expect(typeof tool.run).toBe("function");
    }
  });

  it("capability packs reference existing tools and skills", async () => {
    const { skillRegistry } = await import("@/agents/registry");
    for (const pack of Object.values(capabilityPacks)) {
      expect(pack.agentRoles.length).toBeGreaterThan(0);
      expect(pack.guardrails.length).toBeGreaterThan(0);
      for (const toolId of pack.tools) expect(toolRegistry[toolId], `${pack.id}.${toolId}`).toBeTruthy();
      for (const skillId of pack.skills) expect(skillRegistry[skillId], `${pack.id}.${skillId}`).toBeTruthy();
    }
  });
});

describe("capability guardrails", () => {
  it("blocks unsafe shell commands", () => {
    expect(() => assertSafeShellCommand("rm -rf .next")).toThrow();
    expect(() => assertSafeShellCommand("cat .env")).toThrow();
    expect(() => assertSafeShellCommand("printenv")).toThrow();
    expect(() => assertSafeShellCommand("npm run deploy")).toThrow();
    expect(() => assertSafeShellCommand("git status --short")).not.toThrow();
  });

  it("blocks secret and out-of-repo filesystem access", () => {
    const repoRoot = process.cwd();
    expect(() => assertRepoScopedPath(".env.local", repoRoot)).toThrow();
    expect(() => assertRepoScopedPath("../.env", repoRoot)).toThrow();
    expect(() => assertRepoScopedPath("src/agents/types.ts", repoRoot)).not.toThrow();
  });

  it("keeps optional MCP adapters disabled by default", () => {
    const context = defaultToolContext({ role: "browser_agent", agentId: "browser_agent" });
    const result = runToolAdapter("mcp.playwright", {}, context, ["mcp.playwright"], "browser-qa");
    expect(result.status).toBe("ok");
    expect(result.output).toMatchObject({ enabled: false });
  });

  it("does not allow agents to call unassigned tools", () => {
    const context = defaultToolContext({ role: "ceo", agentId: "ceo" });
    const result = runToolAdapter("filesystem.project", { action: "exists", path: "package.json" }, context, ["quality.evaluate"], "ceo-core");
    expect(result.status).toBe("blocked");
  });
});
