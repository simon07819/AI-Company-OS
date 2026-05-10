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
  return writtenFiles.get(p) ?? "[]";
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

describe("workspaceStore", () => {
  beforeAll(() => {
    writtenFiles.clear();
  });

  it("createWorkspaceForSession creates base files", async () => {
    const { createWorkspaceForSession } = await import("@/lib/workspaceStore");

    const session = {
      sessionId: "ap-test-ws",
      projectName: "TestCRM",
      projectIdea: "A CRM for restaurants",
      template: "b2b-saas",
      stack: "nextjs-prisma",
      status: "running" as const,
      currentPhase: "idea" as const,
      progress: 0,
      assignedAgents: [],
      roadmap: ["Validate market", "Build MVP"],
      tasks: [
        { id: "AP-001", title: "Analyze idea", description: "Test", phase: "idea", agent: "product_agent", status: "running" as const, priority: 1, progress: 10, dependencies: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      ],
      logs: [{ id: "log-1", timestamp: new Date().toISOString(), level: "info" as const, agent: "product_agent", message: "Started", source: "autopilot" }],
      runtime: { status: "online", provider: "NVIDIA API", activeWorkers: 1, lastEvent: "Started" },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      productType: null,
    };

    createWorkspaceForSession(session);

    const paths = [...writtenFiles.keys()];

    expect(paths.some((p) => p.endsWith("README.md"))).toBe(true);
    expect(paths.some((p) => p.endsWith("roadmap.md"))).toBe(true);
    expect(paths.some((p) => p.endsWith("tasks.json"))).toBe(true);
    expect(paths.some((p) => p.endsWith("logs.md"))).toBe(true);
    expect(paths.some((p) => p.includes("phases/01-idea-analysis.md"))).toBe(true);
    expect(paths.some((p) => p.includes("phases/08-runtime-monitoring.md"))).toBe(true);
  });

  it("createWorkspaceForSession writes correct README content", async () => {
    const readme = [...writtenFiles.entries()].find(([p]) => p.endsWith("README.md"));
    expect(readme).toBeDefined();
    expect(readme![1]).toContain("TestCRM");
    expect(readme![1]).toContain("A CRM for restaurants");
  });

  it("writeWorkspaceFile writes content and can be read back", async () => {
    const { writeWorkspaceFile, readWorkspaceFile } = await import("@/lib/workspaceStore");

    writeWorkspaceFile("ap-ws-test", "src/app/page.tsx", "export default function Page() {}");
    const content = readWorkspaceFile("ap-ws-test", "src/app/page.tsx");
    expect(content).toBe("export default function Page() {}");
  });

  it("writeWorkspaceFile rejects path traversal", async () => {
    const { writeWorkspaceFile } = await import("@/lib/workspaceStore");

    const result = writeWorkspaceFile("ap-traversal", "../../etc/passwd", "hacked");
    expect(result).toBe(false);
  });

  it("readWorkspaceFile rejects path traversal", async () => {
    const { readWorkspaceFile } = await import("@/lib/workspaceStore");

    const content = readWorkspaceFile("ap-traversal-read", "../../etc/passwd");
    expect(content).toBeNull();
  });

  it("getWorkspaceSummary returns correct structure for nonexistent workspace", async () => {
    const { getWorkspaceSummary } = await import("@/lib/workspaceStore");

    const summary = getWorkspaceSummary("ap-nonexistent-xyz");
    expect(summary.exists).toBe(false);
    expect(summary.fileCount).toBe(0);
  });

  it("updateWorkspaceAfterStep writes tasks, logs and phase file", async () => {
    const { updateWorkspaceAfterStep } = await import("@/lib/workspaceStore");

    // Create a workspace first so updateWorkspaceAfterStep finds the dir
    const { createWorkspaceForSession } = await import("@/lib/workspaceStore");
    createWorkspaceForSession({
      sessionId: "ap-update-test",
      projectName: "UpTest",
      projectIdea: "test",
      template: null, stack: null,
      status: "running" as const, currentPhase: "idea" as const, progress: 0,
      assignedAgents: [], roadmap: [], tasks: [], logs: [],
      runtime: { status: "online", provider: "NVIDIA API", activeWorkers: 0, lastEvent: "" },
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), productType: null,
    });

    const tasks = [
      { id: "AP-001", title: "Analyze", description: "Test", phase: "idea", agent: "product_agent", status: "completed" as const, priority: 1, progress: 100, dependencies: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    ];
    const logs = [
      { id: "log-2", timestamp: new Date().toISOString(), level: "success" as const, agent: "product_agent", message: "Completed", source: "agent" },
    ];

    updateWorkspaceAfterStep("ap-update-test", tasks, logs, tasks[0]);

    // Verify the files were written
    const tasksJson = [...writtenFiles.entries()].find(([p]) => p.endsWith("tasks.json") && p.includes("ap-update-test"));
    expect(tasksJson).toBeDefined();
    const parsed = JSON.parse(tasksJson![1]);
    expect(parsed[0].status).toBe("completed");

    const phaseFile = [...writtenFiles.entries()].find(([p]) => p.includes("phases/01-idea-analysis.md") && p.includes("ap-update-test"));
    expect(phaseFile).toBeDefined();
    expect(phaseFile![1]).toContain("completed");
  });
});
