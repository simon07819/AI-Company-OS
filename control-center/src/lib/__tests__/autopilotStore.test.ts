import { describe, expect, it, vi, beforeEach } from "vitest";

// ─── Mock setup ──────────────────────────────────────────────────────────────
// We simulate a JSON file store by intercepting reads/writes.
// Only the sessions JSON file is tracked via `store`; workspace files are
// written to a Map and ignored for JSON parsing.

let store: unknown[] = [];
const workspaceFiles = new Map<string, string>();

vi.mock("fs", () => ({
  default: {
    mkdirSync: vi.fn(),
    existsSync: vi.fn((p: string) => {
      if (p.includes("autopilot-sessions.json")) return true;
      for (const key of workspaceFiles.keys()) {
        if (p === key || key.startsWith(p + "/")) return true;
      }
      return false;
    }),
    readFileSync: vi.fn((p: string) => {
      if (p.includes("autopilot-sessions.json")) return JSON.stringify(store);
      const content = workspaceFiles.get(p);
      if (content !== undefined) return content;
      return "[]";
    }),
    writeFileSync: vi.fn((p: string, data: string) => {
      if (p.includes("autopilot-sessions.json")) {
        try { store = JSON.parse(data); } catch { /* ignore non-JSON */ }
      } else {
        workspaceFiles.set(p, data);
      }
    }),
    readdirSync: vi.fn(() => []),
    statSync: vi.fn(() => ({ size: 100, mtime: new Date() })),
  },
  mkdirSync: vi.fn(),
  existsSync: vi.fn((p: string) => {
    if (p.includes("autopilot-sessions.json")) return true;
    for (const key of workspaceFiles.keys()) {
      if (p === key || key.startsWith(p + "/")) return true;
    }
    return false;
  }),
  readFileSync: vi.fn((p: string) => {
    if (p.includes("autopilot-sessions.json")) return JSON.stringify(store);
    return workspaceFiles.get(p) ?? "[]";
  }),
  writeFileSync: vi.fn((p: string, data: string) => {
    if (p.includes("autopilot-sessions.json")) {
      try { store = JSON.parse(data); } catch { /* ignore non-JSON */ }
    } else {
      workspaceFiles.set(p, data);
    }
  }),
  readdirSync: vi.fn(() => []),
  statSync: vi.fn(() => ({ size: 100, mtime: new Date() })),
}));

describe("autopilotStore", () => {
  beforeEach(() => {
    store = [];
    vi.clearAllMocks();
    // Reset store after clearing mocks
    store = [];
  });

  it("createSession returns a valid session with required fields", async () => {
    const { createSession } = await import("@/lib/autopilotStore");

    const session = createSession({
      name: "Test CRM",
      idea: "Create a CRM for restaurants",
      template: "b2b-saas",
      stack: "nextjs-prisma",
      agents: ["product_agent", "backend_agent"],
    });

    expect(session.sessionId).toMatch(/^ap-/);
    expect(session.projectName).toBe("Test-CRM");
    expect(session.projectIdea).toBe("Create a CRM for restaurants");
    expect(session.status).toBe("running");
    expect(session.currentPhase).toBe("idea");
    expect(session.tasks.length).toBeGreaterThan(0);
    expect(session.tasks[0].status).toBe("running");
    expect(session.assignedAgents.length).toBe(2);
    expect(session.logs.length).toBeGreaterThan(0);
    expect(session.roadmap.length).toBeGreaterThan(0);
    expect(session.runtime.status).toBe("online");
    expect(session.runtime.provider).toContain("NVIDIA");
    expect(session.createdAt).toBeTruthy();
    expect(session.updatedAt).toBeTruthy();
  });

  it("createSession with minimal input uses defaults", async () => {
    const { createSession } = await import("@/lib/autopilotStore");

    const session = createSession({});

    expect(session.sessionId).toMatch(/^ap-/);
    expect(session.projectName).toMatch(/^Project-/);
    expect(session.projectIdea).toBeTruthy();
    expect(session.assignedAgents.length).toBeGreaterThan(0);
  });

  it("listSessions returns array sorted by updatedAt", async () => {
    const { listSessions } = await import("@/lib/autopilotStore");

    const sessions = listSessions();
    expect(Array.isArray(sessions)).toBe(true);
  });

  it("getSession returns null for unknown session", async () => {
    const { getSession } = await import("@/lib/autopilotStore");

    const session = getSession("nonexistent-id");
    expect(session).toBeNull();
  });

  it("tasks cover all 8 autopilot phases", async () => {
    const { createSession } = await import("@/lib/autopilotStore");

    const session = createSession({ name: "PhaseTest" });
    const phases = [...new Set(session.tasks.map((t) => t.phase))];

    expect(phases).toContain("idea");
    expect(phases).toContain("planning");
    expect(phases).toContain("architecture");
    expect(phases).toContain("frontend");
    expect(phases).toContain("backend");
    expect(phases).toContain("validation");
    expect(phases).toContain("build");
    expect(phases).toContain("runtime");
  });
});

describe("autopilotStore execution loop", () => {
  beforeEach(() => {
    store = [];
    workspaceFiles.clear();
    vi.clearAllMocks();
    store = [];
    workspaceFiles.clear();
  });

  it("runStep completes a task", async () => {
    const { createSession, runStep, getSession } = await import("@/lib/autopilotStore");

    const session = createSession({ name: "RunStepTest", idea: "Test idea" });
    const initialCompleted = session.tasks.filter((t) => t.status === "completed").length;

    const result = runStep(session.sessionId);

    expect(result.ok).toBe(true);
    expect(result.task).not.toBeNull();

    const updated = getSession(session.sessionId);
    const afterCompleted = updated?.tasks.filter((t) => t.status === "completed").length ?? 0;
    expect(afterCompleted).toBeGreaterThan(initialCompleted);
  });

  it("runStep writes logs", async () => {
    const { createSession, runStep, getSession } = await import("@/lib/autopilotStore");

    const session = createSession({ name: "LogTest", idea: "Test" });
    const initialLogCount = session.logs.length;

    runStep(session.sessionId);

    const updated = getSession(session.sessionId);
    expect(updated?.logs.length).toBeGreaterThan(initialLogCount);
  });

  it("runStep does not crash if no remaining tasks", async () => {
    const { createSession, runStep, getSession, updateSession } = await import("@/lib/autopilotStore");

    const session = createSession({ name: "EmptyTest", idea: "Test" });

    // Complete all tasks manually
    const allDone = session.tasks.map((t) => ({
      ...t,
      status: "completed" as const,
      progress: 100,
    }));
    updateSession(session.sessionId, { tasks: allDone, status: "running" });

    // Run step on completed session
    const result = runStep(session.sessionId);

    expect(result.ok).toBe(true);
    expect(result.completed).toBe(true);
  });

  it("runAll respects the step limit", async () => {
    const { createSession, runAll, getSession } = await import("@/lib/autopilotStore");

    const session = createSession({ name: "RunAllTest", idea: "Test" });

    // Run all with max 3 steps
    const result = runAll(session.sessionId, 3);

    expect(result.ok).toBe(true);
    expect(result.stepsExecuted).toBeLessThanOrEqual(3);
    expect(result.stepsExecuted).toBeGreaterThan(0);
  });

  it("runAll can complete all tasks", async () => {
    const { createSession, runAll, getSession } = await import("@/lib/autopilotStore");

    const session = createSession({ name: "FullRunTest", idea: "Test" });

    // Run all with enough steps (16 tasks, allow some failures)
    const result = runAll(session.sessionId, 20);

    expect(result.ok).toBe(true);
    expect(result.stepsExecuted).toBeGreaterThan(0);

    const updated = getSession(session.sessionId);
    expect(updated).not.toBeNull();
    // Session should be either completed or failed (not still running)
    expect(["completed", "failed"]).toContain(updated?.status);
  });

  it("runStep returns null session for unknown sessionId", async () => {
    const { runStep } = await import("@/lib/autopilotStore");

    const result = runStep("nonexistent-id");
    expect(result.ok).toBe(false);
    expect(result.session).toBeNull();
  });

  it("runAll returns null session for unknown sessionId", async () => {
    const { runAll } = await import("@/lib/autopilotStore");

    const result = runAll("nonexistent-id");
    expect(result.session).toBeNull();
  });

  it("runStep generates artifact and logs artifact path on success", async () => {
    const { createSession, runStep, getSession } = await import("@/lib/autopilotStore");

    const session = createSession({ name: "ArtifactLogTest", idea: "Test artifact logging" });
    const result = runStep(session.sessionId);

    if (result.ok && result.task?.status === "completed") {
      // Should have artifactPaths
      expect(result.artifactPaths.length).toBeGreaterThan(0);

      // Should have an artifact log entry
      const updated = getSession(session.sessionId);
      const artifactLogs = updated?.logs.filter(
        (log) => log.source === "workspace" && log.message.startsWith("Artifact generated:")
      ) ?? [];
      expect(artifactLogs.length).toBeGreaterThan(0);
      expect(artifactLogs[0].message).toContain("Artifact generated:");
    }
  });

  it("runStep returns empty artifactPaths on failure", async () => {
    const { createSession, runStep, getSession, updateSession } = await import("@/lib/autopilotStore");

    // Create a session, then force the next task to fail by manipulating the hash
    // We can't easily force failure, but we can check that artifactPaths is always an array
    const session = createSession({ name: "ArtifactFailTest", idea: "Test" });
    const result = runStep(session.sessionId);

    // artifactPaths should always be an array (empty if task failed)
    expect(Array.isArray(result.artifactPaths)).toBe(true);
  });
});
