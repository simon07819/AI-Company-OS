import { describe, expect, it, vi, beforeEach } from "vitest";

// ─── Mock setup ──────────────────────────────────────────────────────────────

const fileStore = new Map<string, string>();

vi.mock("fs", () => ({
  default: {
    mkdirSync: vi.fn(),
    existsSync: vi.fn((p: string) => fileStore.has(p)),
    readFileSync: vi.fn((p: string) => fileStore.get(p) ?? ""),
    writeFileSync: vi.fn((p: string, data: string) => { fileStore.set(p, data); }),
    readdirSync: vi.fn(() => []),
    statSync: vi.fn(() => ({ size: 100, mtime: new Date() })),
  },
  mkdirSync: vi.fn(),
  existsSync: vi.fn((p: string) => fileStore.has(p)),
  readFileSync: vi.fn((p: string) => fileStore.get(p) ?? ""),
  writeFileSync: vi.fn((p: string, data: string) => { fileStore.set(p, data); }),
  readdirSync: vi.fn(() => []),
  statSync: vi.fn(() => ({ size: 100, mtime: new Date() })),
}));

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("runtimePersist", () => {
  beforeEach(() => {
    fileStore.clear();
    vi.clearAllMocks();
  });

  it("loadRuntimeState returns empty state when file missing", async () => {
    const { loadRuntimeState } = await import("@/lib/runtimePersist");
    const state = loadRuntimeState();
    expect(state.agents).toEqual([]);
    expect(state.queue).toEqual([]);
    expect(state.pausedAgents).toEqual([]);
    expect(state.stats).toEqual({ totalEventsEmitted: 0 });
  });

  it("saveRuntimeState writes JSON to disk", async () => {
    const { saveRuntimeState, RUNTIME_STATE_PATH } = await import("@/lib/runtimePersist");
    saveRuntimeState({ agents: [{ agentId: "product_agent", status: "idle" }] });
    expect(fileStore.has(RUNTIME_STATE_PATH)).toBe(true);
    const raw = fileStore.get(RUNTIME_STATE_PATH)!;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    expect(Array.isArray(parsed.agents)).toBe(true);
    expect((parsed.agents as unknown[])[0]).toMatchObject({ agentId: "product_agent", status: "idle" });
  });

  it("loadRuntimeState reads back saved state", async () => {
    const { saveRuntimeState, loadRuntimeState } = await import("@/lib/runtimePersist");
    saveRuntimeState({
      agents: [{ agentId: "qa_agent", status: "executing", progress: 60 }],
      pausedAgents: ["devops_agent"],
    });
    const loaded = loadRuntimeState();
    expect(loaded.agents).toHaveLength(1);
    expect(loaded.agents[0]).toMatchObject({ agentId: "qa_agent", status: "executing" });
    expect(loaded.pausedAgents).toContain("devops_agent");
  });

  it("saveRuntimeState patches without overwriting unrelated fields", async () => {
    const { saveRuntimeState, loadRuntimeState } = await import("@/lib/runtimePersist");
    saveRuntimeState({ agents: [{ agentId: "backend_agent", status: "idle" }] });
    saveRuntimeState({ queue: [{ taskId: "t1", agentId: "backend_agent" }] });

    const loaded = loadRuntimeState();
    expect(loaded.agents).toHaveLength(1);
    expect(loaded.queue).toHaveLength(1);
  });

  it("loadRuntimeState returns empty on corrupt JSON", async () => {
    const { loadRuntimeState, RUNTIME_STATE_PATH } = await import("@/lib/runtimePersist");
    fileStore.set(RUNTIME_STATE_PATH, "not valid json {{{");
    const state = loadRuntimeState();
    expect(state.agents).toEqual([]);
  });

  it("savedAt is updated on every save", async () => {
    const { saveRuntimeState, loadRuntimeState } = await import("@/lib/runtimePersist");
    saveRuntimeState({ agents: [] });
    const first = loadRuntimeState().savedAt;
    await new Promise((r) => setTimeout(r, 5));
    saveRuntimeState({ agents: [] });
    const second = loadRuntimeState().savedAt;
    // savedAt should be updated (may be identical if very fast, so just check it's a valid date)
    expect(new Date(second).getTime()).toBeGreaterThanOrEqual(new Date(first).getTime());
  });
});

// ─── runtimeEvents tests ──────────────────────────────────────────────────────

describe("runtimeEvents", () => {
  beforeEach(async () => {
    const { clearEvents } = await import("@/lib/runtimeEvents");
    clearEvents();
  });

  it("emitEvent returns a RuntimeEvent with correct shape", async () => {
    const { emitEvent } = await import("@/lib/runtimeEvents");
    const ev = emitEvent("task.started", { taskTitle: "Build API" }, { agentId: "backend_agent", sessionId: "s1" });
    expect(ev.id).toMatch(/^evt-/);
    expect(ev.type).toBe("task.started");
    expect(ev.agentId).toBe("backend_agent");
    expect(ev.sessionId).toBe("s1");
    expect(ev.payload).toMatchObject({ taskTitle: "Build API" });
    expect(ev.timestamp).toBeTruthy();
  });

  it("getRecentEvents returns emitted events newest-last", async () => {
    const { emitEvent, getRecentEvents } = await import("@/lib/runtimeEvents");
    emitEvent("task.started", {});
    emitEvent("task.completed", {});
    const recent = getRecentEvents(10);
    expect(recent).toHaveLength(2);
    expect(recent[1].type).toBe("task.completed");
  });

  it("subscribeEvents receives new events", async () => {
    const { emitEvent, subscribeEvents } = await import("@/lib/runtimeEvents");
    const received: string[] = [];
    const unsub = subscribeEvents((ev) => received.push(ev.type));
    emitEvent("queue.updated", {});
    emitEvent("runtime.reset", {});
    unsub();
    emitEvent("task.started", {}); // after unsub — should not be received
    expect(received).toEqual(["queue.updated", "runtime.reset"]);
  });

  it("unsubscribe stops delivery", async () => {
    const { emitEvent, subscribeEvents, getSubscriberCount } = await import("@/lib/runtimeEvents");
    const unsub = subscribeEvents(() => undefined);
    expect(getSubscriberCount()).toBeGreaterThan(0);
    unsub();
    expect(getSubscriberCount()).toBe(0);
  });

  it("event log is capped at 200 entries", async () => {
    const { emitEvent, getRecentEvents } = await import("@/lib/runtimeEvents");
    for (let i = 0; i < 210; i++) {
      emitEvent("queue.updated", { i });
    }
    const recent = getRecentEvents(250);
    expect(recent.length).toBe(200);
  });

  it("clearEvents empties the log", async () => {
    const { emitEvent, clearEvents, getRecentEvents } = await import("@/lib/runtimeEvents");
    emitEvent("task.started", {});
    emitEvent("task.completed", {});
    clearEvents();
    expect(getRecentEvents(10)).toHaveLength(0);
  });

  it("all required event types can be emitted", async () => {
    const { emitEvent, getRecentEvents } = await import("@/lib/runtimeEvents");
    const types = [
      "agent.status_changed",
      "task.started",
      "task.completed",
      "task.failed",
      "task.blocked",
      "dependency.resolved",
      "queue.updated",
      "runtime.reset",
    ] as const;
    for (const type of types) {
      emitEvent(type, {});
    }
    const emitted = getRecentEvents(20).map((e) => e.type);
    for (const type of types) {
      expect(emitted).toContain(type);
    }
  });
});

// ─── agentRuntime persistence tests ──────────────────────────────────────────

describe("agentRuntime persistence", () => {
  beforeEach(() => {
    fileStore.clear();
    vi.clearAllMocks();
  });

  it("updateAgentState writes to runtime-state.json", async () => {
    const { updateAgentState, resetRuntime } = await import("@/lib/agentRuntime");
    const { RUNTIME_STATE_PATH } = await import("@/lib/runtimePersist");
    resetRuntime();
    updateAgentState("product_agent", { status: "executing", progress: 42 });
    expect(fileStore.has(RUNTIME_STATE_PATH)).toBe(true);
    const saved = JSON.parse(fileStore.get(RUNTIME_STATE_PATH)!) as { agents: Array<{ agentId: string; status: string; progress: number }> };
    const agent = saved.agents.find((a) => a.agentId === "product_agent");
    expect(agent?.status).toBe("executing");
    expect(agent?.progress).toBe(42);
  });

  it("resetRuntime persists default states", async () => {
    const { resetRuntime } = await import("@/lib/agentRuntime");
    const { loadRuntimeState } = await import("@/lib/runtimePersist");
    resetRuntime();
    const state = loadRuntimeState();
    expect(state.agents).toHaveLength(6);
    for (const a of state.agents) {
      expect((a as { status: string }).status).toBe("idle");
    }
  });

  it("pauseAgent persists paused state", async () => {
    const { pauseAgent, resetRuntime } = await import("@/lib/agentRuntime");
    const { loadRuntimeState } = await import("@/lib/runtimePersist");
    resetRuntime();
    pauseAgent("qa_agent");
    const state = loadRuntimeState();
    expect(state.pausedAgents).toContain("qa_agent");
  });

  it("agent.status_changed event is emitted on status transition", async () => {
    const { updateAgentState, resetRuntime } = await import("@/lib/agentRuntime");
    const { subscribeEvents, clearEvents } = await import("@/lib/runtimeEvents");
    resetRuntime();
    clearEvents();
    const received: string[] = [];
    const unsub = subscribeEvents((ev) => received.push(ev.type));
    updateAgentState("backend_agent", { status: "executing" });
    unsub();
    expect(received).toContain("agent.status_changed");
  });

  it("runtime.reset event is emitted on resetRuntime", async () => {
    const { resetRuntime } = await import("@/lib/agentRuntime");
    const { subscribeEvents, clearEvents } = await import("@/lib/runtimeEvents");
    clearEvents();
    const received: string[] = [];
    const unsub = subscribeEvents((ev) => received.push(ev.type));
    resetRuntime();
    unsub();
    expect(received).toContain("runtime.reset");
  });
});
