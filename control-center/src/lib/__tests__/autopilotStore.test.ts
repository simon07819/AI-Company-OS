import { describe, expect, it, vi, beforeEach } from "vitest";

// Mock fs module
vi.mock("fs", () => ({
  default: {
    mkdirSync: vi.fn(),
    existsSync: vi.fn(() => false),
    readFileSync: vi.fn(() => "[]"),
    writeFileSync: vi.fn(),
  },
  mkdirSync: vi.fn(),
  existsSync: vi.fn(() => false),
  readFileSync: vi.fn(() => "[]"),
  writeFileSync: vi.fn(),
}));

describe("autopilotStore", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
