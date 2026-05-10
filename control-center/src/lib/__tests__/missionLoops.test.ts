import { describe, expect, it, vi, beforeAll, afterEach } from "vitest";
import type { AutopilotSession, AutopilotTask } from "@/lib/autopilotStore";
import type { LoopState } from "@/lib/loopScheduler";

// ─── Mock fs ─────────────────────────────────────────────────────────────

let store: AutopilotSession[] = [];
const workspaceFiles = new Map<string, string>();
const loopFiles = new Map<string, string>();

vi.mock("fs", () => ({
  default: {
    readdirSync: vi.fn(() => []),
    statSync: vi.fn(() => ({ size: 100, mtime: new Date() })),
    mkdirSync: vi.fn(),
    existsSync: vi.fn((p: string) => {
      if (p.includes("autopilot-sessions.json")) return true;
      if (p.includes("loop-state.json")) return true;
      for (const key of workspaceFiles.keys()) {
        if (p === key || key.startsWith(p + "/")) return true;
      }
      return false;
    }),
    readFileSync: vi.fn((p: string) => {
      if (p.includes("autopilot-sessions.json")) return JSON.stringify(store);
      if (p.includes("loop-state.json")) return loopFiles.get(p) ?? "[]";
      return workspaceFiles.get(p) ?? "[]";
    }),
    writeFileSync: vi.fn((p: string, data: string) => {
      if (p.includes("autopilot-sessions.json")) {
        try { store = JSON.parse(data); } catch { /* ignore non-JSON */ }
      } else if (p.includes("loop-state.json")) {
        loopFiles.set(p, data);
      } else {
        workspaceFiles.set(p, data);
      }
    }),
  },
}));

vi.mock("path", async (importOriginal) => {
  const actual = await importOriginal<typeof import("path")>();
  return { ...actual, resolve: (...args: string[]) => args.join("/") };
});

vi.mock("@/lib/nvidiaAgentAdapter", () => ({
  runNvidiaAdapter: vi.fn(() => Promise.resolve({ ok: true, result: "simulated", provider: "NVIDIA API" })),
}));

vi.mock("@/lib/deliverableReview", () => ({
  reviewDeliverables: vi.fn(() => ({ ok: true, report: { score: 85, issues: [], recommendations: [] } })),
}));

vi.mock("@/lib/missionDeliverables", () => ({
  generateMissionDeliverables: vi.fn(() => ({ ok: true, files: [] })),
}));

vi.mock("@/lib/agentRuntime", () => ({
  updateAgentState: vi.fn(),
}));

vi.mock("@/lib/runtimeEvents", () => ({
  emitEvent: vi.fn(),
}));

// ─── Helpers ─────────────────────────────────────────────────────────────

function resetStore() {
  store = [];
  workspaceFiles.clear();
  loopFiles.clear();
}

// ─── Tests ───────────────────────────────────────────────────────────────

describe("missionLoops", () => {
  beforeAll(() => { resetStore(); });

  afterEach(() => { resetStore(); });

  it("LOOP_TYPES has 5 loop modes", async () => {
    const { LOOP_TYPES } = await import("@/lib/missionLoops");
    expect(LOOP_TYPES.length).toBe(5);
    const ids = LOOP_TYPES.map((l) => l.id);
    expect(ids).toContain("one_shot");
    expect(ids).toContain("recurring_daily");
    expect(ids).toContain("recurring_weekly");
    expect(ids).toContain("monitoring");
    expect(ids).toContain("optimization_loop");
  });

  it("getLoopType returns correct definition", async () => {
    const { getLoopType } = await import("@/lib/missionLoops");
    const daily = getLoopType("recurring_daily");
    expect(daily?.label).toBe("Daily Recurring");
    expect(daily?.intervalMs).toBe(24 * 60 * 60 * 1000);
    expect(daily?.taskTemplates.length).toBeGreaterThan(0);
  });

  it("computeNextRun returns null for one_shot", async () => {
    const { computeNextRun } = await import("@/lib/missionLoops");
    expect(computeNextRun("one_shot")).toBeNull();
  });

  it("computeNextRun returns future date for recurring modes", async () => {
    const { computeNextRun } = await import("@/lib/missionLoops");
    const next = computeNextRun("recurring_daily");
    expect(next).not.toBeNull();
    expect(new Date(next!).getTime()).toBeGreaterThan(Date.now() - 1000);
  });

  it("isLoopDue returns false for inactive loop", async () => {
    const { isLoopDue } = await import("@/lib/missionLoops");
    expect(isLoopDue({ mode: "recurring_daily", status: "inactive", nextRunAt: null, lastRunAt: null, history: [] })).toBe(false);
  });

  it("isLoopDue returns true when nextRunAt is in the past", async () => {
    const { isLoopDue } = await import("@/lib/missionLoops");
    const past = new Date(Date.now() - 60000).toISOString();
    expect(isLoopDue({ mode: "recurring_daily", status: "active", nextRunAt: past, lastRunAt: null, history: [] })).toBe(true);
  });

  it("isLoopDue returns false when nextRunAt is in the future", async () => {
    const { isLoopDue } = await import("@/lib/missionLoops");
    const future = new Date(Date.now() + 60000).toISOString();
    expect(isLoopDue({ mode: "recurring_daily", status: "active", nextRunAt: future, lastRunAt: null, history: [] })).toBe(false);
  });

  it("getDefaultLoopConfig returns one_shot inactive", async () => {
    const { getDefaultLoopConfig } = await import("@/lib/missionLoops");
    const config = getDefaultLoopConfig();
    expect(config.mode).toBe("one_shot");
    expect(config.status).toBe("inactive");
    expect(config.history).toEqual([]);
  });
});

describe("loopScheduler", () => {
  beforeAll(() => { resetStore(); });

  afterEach(() => { resetStore(); });

  it("activateLoop creates loop state for valid session", async () => {
    const { createSession } = await import("@/lib/autopilotStore");
    const { activateLoop, getLoopState } = await import("@/lib/loopScheduler");

    const session = createSession({ name: "LoopTest", missionType: "social_campaign" });
    const state = activateLoop(session.sessionId, "recurring_weekly");

    expect(state).not.toBeNull();
    expect(state!.loop.mode).toBe("recurring_weekly");
    expect(state!.loop.status).toBe("active");
    expect(state!.loop.nextRunAt).not.toBeNull();

    // Verify persisted
    const saved = getLoopState(session.sessionId);
    expect(saved).not.toBeNull();
    expect(saved!.loop.mode).toBe("recurring_weekly");
  });

  it("activateLoop returns null for inapplicable mission type", async () => {
    const { createSession } = await import("@/lib/autopilotStore");
    const { activateLoop } = await import("@/lib/loopScheduler");

    const session = createSession({ name: "BrandTest", missionType: "branding_pack" });
    // branding_pack is not in recurring_daily applicableMissions
    const state = activateLoop(session.sessionId, "recurring_daily");
    expect(state).toBeNull();
  });

  it("pauseLoop changes status to paused", async () => {
    const { createSession } = await import("@/lib/autopilotStore");
    const { activateLoop, pauseLoop, getLoopState } = await import("@/lib/loopScheduler");

    const session = createSession({ name: "PauseTest", missionType: "ecommerce_store" });
    activateLoop(session.sessionId, "recurring_weekly");

    const paused = pauseLoop(session.sessionId);
    expect(paused).not.toBeNull();
    expect(paused!.loop.status).toBe("paused");

    const saved = getLoopState(session.sessionId);
    expect(saved!.loop.status).toBe("paused");
  });

  it("resumeLoop changes status back to active", async () => {
    const { createSession } = await import("@/lib/autopilotStore");
    const { activateLoop, pauseLoop, resumeLoop, getLoopState } = await import("@/lib/loopScheduler");

    const session = createSession({ name: "ResumeTest", missionType: "ecommerce_store" });
    activateLoop(session.sessionId, "recurring_weekly");
    pauseLoop(session.sessionId);

    const resumed = resumeLoop(session.sessionId);
    expect(resumed).not.toBeNull();
    expect(resumed!.loop.status).toBe("active");
    expect(resumed!.loop.nextRunAt).not.toBeNull();
  });

  it("executeLoop creates new tasks from templates", async () => {
    const { createSession } = await import("@/lib/autopilotStore");
    const { activateLoop, executeLoop } = await import("@/lib/loopScheduler");

    const session = createSession({ name: "ExecTest", missionType: "social_campaign" });
    activateLoop(session.sessionId, "recurring_weekly");

    const result = executeLoop(session.sessionId);
    expect(result.tasksCreated).toBeGreaterThan(0);
    expect(result.message).toContain("tasks");
  });

  it("runScheduler finds and executes due loops", async () => {
    const { createSession, getSession } = await import("@/lib/autopilotStore");
    const { activateLoop, listLoopStates } = await import("@/lib/loopScheduler");
    const { isLoopDue } = await import("@/lib/missionLoops");
    const { runScheduler } = await import("@/lib/loopScheduler");

    // Create session with loop, then manually set nextRunAt to the past
    const session = createSession({ name: "SchedTest", missionType: "social_campaign" });
    activateLoop(session.sessionId, "recurring_weekly");

    // Force the nextRunAt to the past by manipulating the loop file
    const loopData = loopFiles.values().next().value;
    if (loopData) {
      const parsed = JSON.parse(loopData);
      parsed[0].loop.nextRunAt = new Date(Date.now() - 60000).toISOString();
      for (const [key] of loopFiles) {
        loopFiles.set(key, JSON.stringify(parsed));
      }
    }

    const result = runScheduler();
    expect(result.executed).toBe(1);
    expect(result.results[0].tasksCreated).toBeGreaterThan(0);
  });

  it("deactivateLoop removes loop state", async () => {
    const { createSession } = await import("@/lib/autopilotStore");
    const { activateLoop, deactivateLoop, getLoopState } = await import("@/lib/loopScheduler");

    const session = createSession({ name: "DeactTest", missionType: "ecommerce_store" });
    activateLoop(session.sessionId, "recurring_weekly");

    const result = deactivateLoop(session.sessionId);
    expect(result).toBe(true);

    const saved = getLoopState(session.sessionId);
    expect(saved).toBeNull();
  });

  it("listLoopStates returns all loop states", async () => {
    const { createSession } = await import("@/lib/autopilotStore");
    const { activateLoop, listLoopStates } = await import("@/lib/loopScheduler");

    const s1 = createSession({ name: "List1", missionType: "social_campaign" });
    const s2 = createSession({ name: "List2", missionType: "ecommerce_store" });
    activateLoop(s1.sessionId, "recurring_weekly");
    activateLoop(s2.sessionId, "monitoring");

    const states = listLoopStates();
    expect(states.length).toBeGreaterThanOrEqual(2);
  });
});
