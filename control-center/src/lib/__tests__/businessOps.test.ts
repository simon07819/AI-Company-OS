import { describe, expect, it, vi, beforeAll, afterEach } from "vitest";
import type { AutopilotSession } from "@/lib/autopilotStore";

// ─── Mock fs ─────────────────────────────────────────────────────────────

let store: AutopilotSession[] = [];

vi.mock("fs", () => ({
  default: {
    readdirSync: vi.fn(() => []),
    statSync: vi.fn(() => ({ size: 100, mtime: new Date() })),
    mkdirSync: vi.fn(),
    existsSync: vi.fn((p: string) => {
      if (p.includes("autopilot-sessions.json")) return true;
      if (p.includes("loop-state.json")) return true;
      return false;
    }),
    readFileSync: vi.fn((p: string) => {
      if (p.includes("autopilot-sessions.json")) return JSON.stringify(store);
      if (p.includes("loop-state.json")) return "[]";
      return "[]";
    }),
    writeFileSync: vi.fn((p: string, data: string) => {
      if (p.includes("autopilot-sessions.json")) {
        try { store = JSON.parse(data); } catch { /* ignore */ }
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

// ─── Tests ───────────────────────────────────────────────────────────────

describe("businessOps", () => {
  beforeAll(() => { store = []; });
  afterEach(() => { store = []; });

  it("getBusinessOverview returns zero counts when no sessions", async () => {
    const { getBusinessOverview } = await import("@/lib/businessOps");
    const overview = getBusinessOverview();
    expect(overview.totalMissions).toBe(0);
    expect(overview.activeMissions).toBe(0);
    expect(overview.clientReadyMissions).toBe(0);
    expect(overview.estimatedRevenuePotential).toBe(0);
    expect(overview.activeLoops).toBe(0);
  });

  it("getBusinessOverview counts sessions correctly", async () => {
    const { createSession } = await import("@/lib/autopilotStore");
    const { getBusinessOverview } = await import("@/lib/businessOps");

    createSession({ name: "SaaS One", missionType: "saas_project" });
    createSession({ name: "Web Two", missionType: "website" });
    createSession({ name: "Flyer Three", missionType: "flyer" });

    const overview = getBusinessOverview();
    expect(overview.totalMissions).toBe(3);
    expect(overview.activeMissions).toBe(3); // all running
    expect(overview.missionsByStatus.idea).toBe(3);
    expect(overview.missionsByType.saas_project).toBe(1);
    expect(overview.missionsByType.website).toBe(1);
    expect(overview.missionsByType.flyer).toBe(1);
  });

  it("getBusinessOverview estimates revenue based on status", async () => {
    const { createSession, updateSession } = await import("@/lib/autopilotStore");
    const { getBusinessOverview } = await import("@/lib/businessOps");

    const s1 = createSession({ name: "Revenue SaaS", missionType: "saas_project" });
    updateSession(s1.sessionId, { businessStatus: "client_ready" } as Partial<AutopilotSession>);

    const overview = getBusinessOverview();
    // saas_project = $5000, client_ready = 90%
    expect(overview.estimatedRevenuePotential).toBe(4500);
  });

  it("getBusinessOverview counts delivered missions with full revenue", async () => {
    const { createSession, updateSession } = await import("@/lib/autopilotStore");
    const { getBusinessOverview } = await import("@/lib/businessOps");

    const s1 = createSession({ name: "Delivered Web", missionType: "website" });
    updateSession(s1.sessionId, { businessStatus: "delivered" } as Partial<AutopilotSession>);

    const overview = getBusinessOverview();
    // website = $2500, delivered = 100%
    expect(overview.estimatedRevenuePotential).toBe(2500);
    expect(overview.deliveredMissions).toBe(1);
  });

  it("getBusinessPipeline returns sorted pipeline entries", async () => {
    const { createSession, updateSession } = await import("@/lib/autopilotStore");
    const { getBusinessPipeline } = await import("@/lib/businessOps");

    const s1 = createSession({ name: "Idea One", missionType: "saas_project" });
    const s2 = createSession({ name: "Review Two", missionType: "website" });
    updateSession(s2.sessionId, { businessStatus: "review" } as Partial<AutopilotSession>);

    const pipeline = getBusinessPipeline();
    expect(pipeline.length).toBe(2);
    // "review" should come before "idea" in the pipeline
    expect(pipeline[0].businessStatus).toBe("review");
    expect(pipeline[1].businessStatus).toBe("idea");
  });

  it("getBusinessPipeline includes mission labels", async () => {
    const { createSession } = await import("@/lib/autopilotStore");
    const { getBusinessPipeline } = await import("@/lib/businessOps");

    createSession({ name: "Brand One", missionType: "branding_pack" });

    const pipeline = getBusinessPipeline();
    expect(pipeline[0].missionLabel).toBe("Branding Pack");
  });

  it("getRecommendedActions recommends review for missions in review status", async () => {
    const { createSession, updateSession } = await import("@/lib/autopilotStore");
    const { getRecommendedActions } = await import("@/lib/businessOps");

    const s1 = createSession({ name: "Reviewable", missionType: "saas_project" });
    updateSession(s1.sessionId, { businessStatus: "review" } as Partial<AutopilotSession>);

    const actions = getRecommendedActions();
    expect(actions.length).toBeGreaterThan(0);
    expect(actions.some((a) => a.action === "review")).toBe(true);
  });

  it("getRecommendedActions recommends package for client_ready missions", async () => {
    const { createSession, updateSession } = await import("@/lib/autopilotStore");
    const { getRecommendedActions } = await import("@/lib/businessOps");

    const s1 = createSession({ name: "ClientReady", missionType: "website" });
    updateSession(s1.sessionId, { businessStatus: "client_ready" } as Partial<AutopilotSession>);

    const actions = getRecommendedActions();
    expect(actions.some((a) => a.action === "package")).toBe(true);
  });

  it("getRecommendedActions recommends retry for failed missions", async () => {
    const { createSession, updateSession } = await import("@/lib/autopilotStore");
    const { getRecommendedActions } = await import("@/lib/businessOps");

    const s1 = createSession({ name: "Failed One", missionType: "flyer" });
    updateSession(s1.sessionId, { status: "failed" } as Partial<AutopilotSession>);

    const actions = getRecommendedActions();
    expect(actions.some((a) => a.action === "retry")).toBe(true);
  });

  it("actions are sorted by priority", async () => {
    const { createSession, updateSession } = await import("@/lib/autopilotStore");
    const { getRecommendedActions } = await import("@/lib/businessOps");

    const s1 = createSession({ name: "HighPri", missionType: "saas_project" });
    updateSession(s1.sessionId, { businessStatus: "review" } as Partial<AutopilotSession>); // high

    const s2 = createSession({ name: "ClientReady", missionType: "website" });
    updateSession(s2.sessionId, { businessStatus: "client_ready" } as Partial<AutopilotSession>); // medium

    const actions = getRecommendedActions();
    if (actions.length >= 2) {
      const priorityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
      for (let i = 1; i < actions.length; i++) {
        expect(priorityOrder[actions[i].priority]).toBeGreaterThanOrEqual(priorityOrder[actions[i - 1].priority]);
      }
    }
  });

  it("createSession defaults businessStatus to idea", async () => {
    const { createSession } = await import("@/lib/autopilotStore");

    const session = createSession({ name: "BizTest" });
    expect(session.businessStatus).toBe("idea");
  });
});
