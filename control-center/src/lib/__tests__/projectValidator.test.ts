import { describe, expect, it, vi, beforeAll } from "vitest";

// ─── Mock setup ──────────────────────────────────────────────────────────────

const writtenFiles = new Map<string, string>();

function mockWriteFileSync(p: string, data: string) {
  writtenFiles.set(p, data);
}

function mockExistsSync(p: string) {
  for (const key of writtenFiles.keys()) {
    if (p === key || key.startsWith(p + "/")) return true;
  }
  return false;
}

function mockReadFileSync(p: string) {
  return writtenFiles.get(p) ?? "";
}

vi.mock("fs", () => ({
  default: {
    mkdirSync: vi.fn(),
    existsSync: vi.fn((p: string) => mockExistsSync(p)),
    readFileSync: vi.fn((p: string) => mockReadFileSync(p)),
    writeFileSync: vi.fn((p: string, data: string) => mockWriteFileSync(p, data)),
    readdirSync: vi.fn(() => []),
    statSync: vi.fn(() => ({ size: 100, mtime: new Date() })),
  },
  mkdirSync: vi.fn(),
  existsSync: vi.fn((p: string) => mockExistsSync(p)),
  readFileSync: vi.fn((p: string) => mockReadFileSync(p)),
  writeFileSync: vi.fn((p: string, data: string) => mockWriteFileSync(p, data)),
  readdirSync: vi.fn(() => []),
  statSync: vi.fn(() => ({ size: 100, mtime: new Date() })),
}));

describe("projectValidator", () => {
  beforeAll(() => {
    writtenFiles.clear();
  });

  it("validateGeneratedProject returns ok for complete scaffold", async () => {
    const { validateGeneratedProject } = await import("@/lib/projectValidator");
    const { createWorkspaceForSession, generateProjectScaffold } = await import("@/lib/workspaceStore");

    const session = {
      sessionId: "ap-val-ok",
      projectName: "ValidApp",
      projectIdea: "A valid SaaS app",
      template: "b2b-saas", stack: "nextjs-prisma",
      status: "running" as const, currentPhase: "frontend" as const, progress: 0,
      assignedAgents: [], roadmap: [], tasks: [], logs: [],
      runtime: { status: "online", provider: "NVIDIA API", activeWorkers: 0, lastEvent: "" },
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), productType: null,
    };

    createWorkspaceForSession(session);
    generateProjectScaffold(session);

    const result = validateGeneratedProject(session.sessionId);

    expect(result.ok).toBe(true);
    expect(result.score).toBeGreaterThanOrEqual(80);
    expect(result.checks.length).toBeGreaterThan(0);
    expect(result.checks.filter((c) => c.passed).length).toBeGreaterThan(0);
    expect(result.generatedAt).toBeTruthy();
  });

  it("validateGeneratedProject fails if package.json missing", async () => {
    const { validateGeneratedProject } = await import("@/lib/projectValidator");

    // Create a workspace with project dir but no package.json
    const sid = "ap-val-nopkg";
    const { createWorkspaceForSession } = await import("@/lib/workspaceStore");

    const session = {
      sessionId: sid,
      projectName: "NoPkg",
      projectIdea: "Missing package.json",
      template: null, stack: null,
      status: "running" as const, currentPhase: "idea" as const, progress: 0,
      assignedAgents: [], roadmap: [], tasks: [], logs: [],
      runtime: { status: "online", provider: "NVIDIA API", activeWorkers: 0, lastEvent: "" },
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), productType: null,
    };

    createWorkspaceForSession(session);

    // Do NOT generate scaffold — no project dir at all
    const result = validateGeneratedProject(sid);

    expect(result.ok).toBe(false);
    expect(result.score).toBeLessThan(80);
    expect(result.checks.some((c) => !c.passed)).toBe(true);
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it("validateGeneratedProject writes validation-report.json", async () => {
    const { validateGeneratedProject } = await import("@/lib/projectValidator");
    const { createWorkspaceForSession, generateProjectScaffold } = await import("@/lib/workspaceStore");

    const session = {
      sessionId: "ap-val-report",
      projectName: "ReportApp",
      projectIdea: "Test report generation",
      template: null, stack: null,
      status: "running" as const, currentPhase: "frontend" as const, progress: 0,
      assignedAgents: [], roadmap: [], tasks: [], logs: [],
      runtime: { status: "online", provider: "NVIDIA API", activeWorkers: 0, lastEvent: "" },
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), productType: null,
    };

    createWorkspaceForSession(session);
    generateProjectScaffold(session);
    validateGeneratedProject(session.sessionId);

    const reportPaths = [...writtenFiles.keys()].filter((p) =>
      p.includes("ap-val-report") && p.includes("validation-report")
    );
    expect(reportPaths.some((p) => p.endsWith("validation-report.json"))).toBe(true);
    expect(reportPaths.some((p) => p.endsWith("validation-report.md"))).toBe(true);

    // JSON report should be parseable
    const jsonReport = [...writtenFiles.entries()].find(([p]) =>
      p.endsWith("validation-report.json") && p.includes("ap-val-report")
    );
    expect(jsonReport).toBeDefined();
    const parsed = JSON.parse(jsonReport![1]);
    expect(parsed.ok).toBe(true);
    expect(parsed.score).toBeGreaterThanOrEqual(80);
  });

  it("validateGeneratedProject detects empty critical files", async () => {
    const { validateGeneratedProject } = await import("@/lib/projectValidator");
    const { createWorkspaceForSession, generateProjectScaffold, writeWorkspaceFile } = await import("@/lib/workspaceStore");

    const session = {
      sessionId: "ap-val-empty",
      projectName: "EmptyApp",
      projectIdea: "Test empty file detection",
      template: null, stack: null,
      status: "running" as const, currentPhase: "frontend" as const, progress: 0,
      assignedAgents: [], roadmap: [], tasks: [], logs: [],
      runtime: { status: "online", provider: "NVIDIA API", activeWorkers: 0, lastEvent: "" },
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), productType: null,
    };

    createWorkspaceForSession(session);
    generateProjectScaffold(session);

    // Overwrite page.tsx with empty content
    writeWorkspaceFile(session.sessionId, "project/app/page.tsx", "");

    const result = validateGeneratedProject(session.sessionId);

    const emptyCheck = result.checks.find((c) => c.name === "non-empty:app/page.tsx");
    expect(emptyCheck).toBeDefined();
    expect(emptyCheck!.passed).toBe(false);
    expect(result.warnings.some((w) => w.includes("empty"))).toBe(true);
  });

  it("getValidationResult returns null when no report exists", async () => {
    const { getValidationResult } = await import("@/lib/projectValidator");

    const result = getValidationResult("nonexistent-session");
    expect(result).toBeNull();
  });

  it("getValidationResult returns saved report", async () => {
    const { validateGeneratedProject, getValidationResult } = await import("@/lib/projectValidator");
    const { createWorkspaceForSession, generateProjectScaffold } = await import("@/lib/workspaceStore");

    const session = {
      sessionId: "ap-val-get",
      projectName: "GetApp",
      projectIdea: "Test getValidationResult",
      template: null, stack: null,
      status: "running" as const, currentPhase: "frontend" as const, progress: 0,
      assignedAgents: [], roadmap: [], tasks: [], logs: [],
      runtime: { status: "online", provider: "NVIDIA API", activeWorkers: 0, lastEvent: "" },
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), productType: null,
    };

    createWorkspaceForSession(session);
    generateProjectScaffold(session);
    validateGeneratedProject(session.sessionId);

    const result = getValidationResult(session.sessionId);
    expect(result).not.toBeNull();
    expect(result!.ok).toBe(true);
    expect(result!.score).toBeGreaterThanOrEqual(80);
  });
});
