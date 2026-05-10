import { describe, expect, it, vi, beforeEach } from "vitest";

// ─── Top-level mock setup for autopilotStore integration tests ────────────────

let _store: unknown[] = [];
const _wsFiles = new Map<string, string>();

vi.mock("fs", () => ({
  default: {
    mkdirSync: vi.fn(),
    existsSync: vi.fn((p: string) => {
      if (p.includes("autopilot-sessions.json")) return true;
      for (const key of _wsFiles.keys()) {
        if (p === key || key.startsWith(p + "/")) return true;
      }
      return false;
    }),
    readFileSync: vi.fn((p: string) => {
      if (p.includes("autopilot-sessions.json")) return JSON.stringify(_store);
      return _wsFiles.get(p) ?? "[]";
    }),
    writeFileSync: vi.fn((p: string, data: string) => {
      if (p.includes("autopilot-sessions.json")) {
        try { _store = JSON.parse(data); } catch { /* ignore */ }
      } else {
        _wsFiles.set(p, data);
      }
    }),
    readdirSync: vi.fn(() => []),
    statSync: vi.fn(() => ({ size: 100, mtime: new Date() })),
  },
  mkdirSync: vi.fn(),
  existsSync: vi.fn((p: string) => {
    if (p.includes("autopilot-sessions.json")) return true;
    for (const key of _wsFiles.keys()) {
      if (p === key || key.startsWith(p + "/")) return true;
    }
    return false;
  }),
  readFileSync: vi.fn((p: string) => {
    if (p.includes("autopilot-sessions.json")) return JSON.stringify(_store);
    return _wsFiles.get(p) ?? "[]";
  }),
  writeFileSync: vi.fn((p: string, data: string) => {
    if (p.includes("autopilot-sessions.json")) {
      try { _store = JSON.parse(data); } catch { /* ignore */ }
    } else {
      _wsFiles.set(p, data);
    }
  }),
  readdirSync: vi.fn(() => []),
  statSync: vi.fn(() => ({ size: 100, mtime: new Date() })),
}));

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("agentRuntime", () => {
  beforeEach(async () => {
    const { resetRuntime } = await import("@/lib/agentRuntime");
    resetRuntime();
  });

  it("getAllAgentStates returns 6 default agents", async () => {
    const { getAllAgentStates } = await import("@/lib/agentRuntime");
    const states = getAllAgentStates();
    expect(states).toHaveLength(6);
    const ids = states.map((s) => s.agentId);
    expect(ids).toContain("product_agent");
    expect(ids).toContain("architect_agent");
    expect(ids).toContain("frontend_agent");
    expect(ids).toContain("backend_agent");
    expect(ids).toContain("qa_agent");
    expect(ids).toContain("devops_agent");
  });

  it("all agents start idle", async () => {
    const { getAllAgentStates } = await import("@/lib/agentRuntime");
    const states = getAllAgentStates();
    for (const s of states) {
      expect(s.status).toBe("idle");
      expect(s.currentTaskId).toBeNull();
      expect(s.currentMissionId).toBeNull();
      expect(s.progress).toBe(0);
      expect(s.retryCount).toBe(0);
    }
  });

  it("getAgentState returns null for unknown agent", async () => {
    const { getAgentState } = await import("@/lib/agentRuntime");
    expect(getAgentState("nonexistent")).toBeNull();
  });

  it("updateAgentState patches fields", async () => {
    const { updateAgentState, getAgentState } = await import("@/lib/agentRuntime");
    updateAgentState("product_agent", { status: "executing", currentTaskId: "AP-001", progress: 50 });
    const state = getAgentState("product_agent");
    expect(state?.status).toBe("executing");
    expect(state?.currentTaskId).toBe("AP-001");
    expect(state?.progress).toBe(50);
  });

  it("pauseAgent sets status to idle and returns true", async () => {
    const { pauseAgent, getAgentState } = await import("@/lib/agentRuntime");
    updateState("product_agent", "executing");
    const ok = pauseAgent("product_agent");
    expect(ok).toBe(true);
    expect(getAgentState("product_agent")?.status).toBe("idle");
  });

  it("pauseAgent returns false for unknown agent", async () => {
    const { pauseAgent } = await import("@/lib/agentRuntime");
    expect(pauseAgent("ghost_agent")).toBe(false);
  });

  it("resumeAgent returns true and unmarks pause", async () => {
    const { pauseAgent, resumeAgent, isAgentPaused } = await import("@/lib/agentRuntime");
    pauseAgent("qa_agent");
    expect(isAgentPaused("qa_agent")).toBe(true);
    const ok = resumeAgent("qa_agent");
    expect(ok).toBe(true);
    expect(isAgentPaused("qa_agent")).toBe(false);
  });

  it("isAgentAvailable returns false when paused", async () => {
    const { pauseAgent, isAgentAvailable } = await import("@/lib/agentRuntime");
    pauseAgent("backend_agent");
    expect(isAgentAvailable("backend_agent")).toBe(false);
  });

  it("isAgentAvailable returns false when executing", async () => {
    const { updateAgentState, isAgentAvailable } = await import("@/lib/agentRuntime");
    updateAgentState("frontend_agent", { status: "executing" });
    expect(isAgentAvailable("frontend_agent")).toBe(false);
  });

  it("isAgentAvailable returns true when idle", async () => {
    const { isAgentAvailable } = await import("@/lib/agentRuntime");
    expect(isAgentAvailable("devops_agent")).toBe(true);
  });

  it("resetRuntime restores all agents to idle", async () => {
    const { updateAgentState, pauseAgent, resetRuntime, getAllAgentStates, isAgentPaused } = await import("@/lib/agentRuntime");
    updateAgentState("product_agent", { status: "executing", progress: 80 });
    pauseAgent("qa_agent");

    resetRuntime();

    const states = getAllAgentStates();
    for (const s of states) {
      expect(s.status).toBe("idle");
      expect(s.progress).toBe(0);
    }
    expect(isAgentPaused("qa_agent")).toBe(false);
  });
});

async function updateState(agentId: string, status: string) {
  const { updateAgentState } = await import("@/lib/agentRuntime");
  updateAgentState(agentId, { status: status as never });
}

// ─── runtimeQueue tests ───────────────────────────────────────────────────────

describe("runtimeQueue", () => {
  beforeEach(async () => {
    const { clearQueue } = await import("@/lib/runtimeQueue");
    clearQueue();
  });

  it("enqueueTask adds task to queue", async () => {
    const { enqueueTask, listQueue } = await import("@/lib/runtimeQueue");
    enqueueTask({ sessionId: "s1", taskId: "t1", agentId: "product_agent", phase: "idea", priority: 1, dependencies: [] });
    expect(listQueue()).toHaveLength(1);
  });

  it("enqueueTask ignores duplicate task", async () => {
    const { enqueueTask, listQueue } = await import("@/lib/runtimeQueue");
    enqueueTask({ sessionId: "s1", taskId: "t1", agentId: "product_agent", phase: "idea", priority: 1, dependencies: [] });
    enqueueTask({ sessionId: "s1", taskId: "t1", agentId: "product_agent", phase: "idea", priority: 1, dependencies: [] });
    expect(listQueue()).toHaveLength(1);
  });

  it("queue is sorted by priority descending", async () => {
    const { enqueueTask, listQueue } = await import("@/lib/runtimeQueue");
    enqueueTask({ sessionId: "s1", taskId: "t1", agentId: "product_agent", phase: "idea", priority: 1, dependencies: [] });
    enqueueTask({ sessionId: "s1", taskId: "t2", agentId: "backend_agent", phase: "backend", priority: 3, dependencies: [] });
    enqueueTask({ sessionId: "s1", taskId: "t3", agentId: "qa_agent", phase: "validation", priority: 2, dependencies: [] });
    const q = listQueue();
    expect(q[0].taskId).toBe("t2");
    expect(q[1].taskId).toBe("t3");
    expect(q[2].taskId).toBe("t1");
  });

  it("dequeueNextRunnable respects completed deps", async () => {
    const { enqueueTask, dequeueNextRunnable } = await import("@/lib/runtimeQueue");
    enqueueTask({ sessionId: "s1", taskId: "t1", agentId: "product_agent", phase: "idea", priority: 1, dependencies: ["t0"] });

    const completedIds = new Set<string>();
    const activeAgents = new Set<string>();
    // t0 not completed — should not dequeue
    expect(dequeueNextRunnable(completedIds, activeAgents, 3)).toBeNull();

    // Now complete t0
    completedIds.add("t0");
    const dequeued = dequeueNextRunnable(completedIds, activeAgents, 3);
    expect(dequeued?.taskId).toBe("t1");
  });

  it("dequeueNextRunnable respects maxConcurrency", async () => {
    const { enqueueTask, dequeueNextRunnable } = await import("@/lib/runtimeQueue");
    enqueueTask({ sessionId: "s1", taskId: "t1", agentId: "product_agent", phase: "idea", priority: 1, dependencies: [] });

    const activeAgents = new Set(["product_agent", "backend_agent"]);
    expect(dequeueNextRunnable(new Set(), activeAgents, 2)).toBeNull();
  });

  it("dequeueNextRunnable skips active agent tasks", async () => {
    const { enqueueTask, dequeueNextRunnable } = await import("@/lib/runtimeQueue");
    enqueueTask({ sessionId: "s1", taskId: "t1", agentId: "product_agent", phase: "idea", priority: 2, dependencies: [] });
    enqueueTask({ sessionId: "s1", taskId: "t2", agentId: "backend_agent", phase: "backend", priority: 1, dependencies: [] });

    const activeAgents = new Set(["product_agent"]);
    const dequeued = dequeueNextRunnable(new Set(), activeAgents, 3);
    expect(dequeued?.taskId).toBe("t2");
    expect(dequeued?.agentId).toBe("backend_agent");
  });

  it("clearSessionTasks removes only that session's tasks", async () => {
    const { enqueueTask, clearSessionTasks, listQueue } = await import("@/lib/runtimeQueue");
    enqueueTask({ sessionId: "s1", taskId: "t1", agentId: "product_agent", phase: "idea", priority: 1, dependencies: [] });
    enqueueTask({ sessionId: "s2", taskId: "t2", agentId: "backend_agent", phase: "backend", priority: 1, dependencies: [] });

    clearSessionTasks("s1");
    const q = listQueue();
    expect(q).toHaveLength(1);
    expect(q[0].sessionId).toBe("s2");
  });

  it("getQueueStats counts runnable vs blocked correctly", async () => {
    const { enqueueTask, getQueueStats } = await import("@/lib/runtimeQueue");
    enqueueTask({ sessionId: "s1", taskId: "t1", agentId: "product_agent", phase: "idea", priority: 1, dependencies: [] });
    enqueueTask({ sessionId: "s1", taskId: "t2", agentId: "backend_agent", phase: "backend", priority: 1, dependencies: ["t1"] });

    const completedIds = new Set<string>();
    const stats = getQueueStats(completedIds);
    expect(stats.total).toBe(2);
    expect(stats.runnable).toBe(1);
    expect(stats.blocked).toBe(1);
  });
});

// ─── dependency integration tests ────────────────────────────────────────────

describe("autopilotStore dependencies", () => {
  beforeEach(() => {
    _store = [];
    _wsFiles.clear();
    vi.clearAllMocks();
  });

  it("saas_project tasks have phase dependencies wired", async () => {
    const { createSession } = await import("@/lib/autopilotStore");
    const session = createSession({ name: "DepTest", idea: "Test deps" });

    const tasks = session.tasks;
    // First task (idea) has no deps
    expect(tasks[0].dependencies).toHaveLength(0);

    // Tasks in later phases should have at least one dependency
    const planningTasks = tasks.filter((t) => t.phase === "planning");
    expect(planningTasks[0].dependencies.length).toBeGreaterThan(0);

    const frontendTasks = tasks.filter((t) => t.phase === "frontend");
    expect(frontendTasks[0].dependencies.length).toBeGreaterThan(0);

    const validationTasks = tasks.filter((t) => t.phase === "validation");
    // validation depends on both frontend and backend
    expect(validationTasks[0].dependencies.length).toBeGreaterThanOrEqual(1);
  });

  it("blocked tasks are unblocked when dependency completes", async () => {
    const { createSession, runStep, getSession, updateSession } = await import("@/lib/autopilotStore");
    const session = createSession({ name: "UnblockTest" });

    // Initially task 0 is running, task 1 is queued with dep on task 0
    const task1 = session.tasks[1];
    expect(task1).toBeDefined();

    // Complete task 0 via runStep
    const result = await runStep(session.sessionId);
    expect(result.ok).toBe(true);

    // After completing task 0, task 1 should be runnable (not blocked)
    const updated = getSession(session.sessionId);
    const updatedTask1 = updated?.tasks.find((t) => t.id === task1.id);
    // task 1 should be either queued (if task 0 succeeded) or failed (cascade)
    expect(["queued", "failed", "running", "completed"]).toContain(updatedTask1?.status);
  });

  it("runAll terminates session as completed or failed", async () => {
    const { createSession, runAll, getSession } = await import("@/lib/autopilotStore");
    const session = createSession({ name: "TerminateTest" });

    const result = await runAll(session.sessionId, 30);
    expect(result.ok).toBe(true);
    expect(result.stepsExecuted).toBeGreaterThan(0);

    const updated = getSession(session.sessionId);
    expect(["completed", "failed"]).toContain(updated?.status);
  });
});
