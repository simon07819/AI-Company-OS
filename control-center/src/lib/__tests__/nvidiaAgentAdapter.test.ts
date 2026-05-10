import { describe, expect, it, vi, beforeEach } from "vitest";
import type { AutopilotSession, AutopilotTask } from "@/lib/autopilotStore";

// ─── Mock fetch globally ──────────────────────────────────────────────────────

const _fetchMock = vi.fn();
vi.stubGlobal("fetch", _fetchMock);

// ─── Mock agents lookup ───────────────────────────────────────────────────────

vi.mock("@/lib/agents", () => ({
  getAgentById: vi.fn((id: string) => {
    if (id === "product_agent") {
      return {
        id: "product_agent",
        name: "Product Agent",
        role: "Product analyst",
        responsibilities: ["Define roadmap", "Write user stories"],
      };
    }
    return null;
  }),
}));

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const MOCK_SESSION: AutopilotSession = {
  sessionId: "ap-test-123",
  projectName: "TestApp",
  projectIdea: "A test application",
  productType: "b2b-saas",
  template: null,
  stack: "nextjs-prisma",
  missionType: "saas_project",
  status: "running",
  currentPhase: "idea",
  progress: 0,
  assignedAgents: [],
  roadmap: [],
  tasks: [],
  logs: [],
  runtime: { status: "online", provider: "NVIDIA API", activeWorkers: 1, lastEvent: "" },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const MOCK_TASK: AutopilotTask = {
  id: "AP-001",
  title: "Analyze ICP",
  description: "Identify target customers",
  phase: "idea",
  agent: "product_agent",
  status: "running",
  priority: 1,
  progress: 15,
  dependencies: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("nvidiaAgentAdapter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.NVIDIA_API_KEY;
    delete process.env.NVIDIA_MODEL;
  });

  it("returns simulation mode when NVIDIA_API_KEY is not set", async () => {
    const { runNvidiaAdapter } = await import("@/lib/nvidiaAgentAdapter");

    const result = await runNvidiaAdapter(MOCK_SESSION, MOCK_TASK);

    expect(result.ok).toBe(true);
    expect(result.mode).toBe("simulation");
    expect(result.agentId).toBe("product_agent");
    expect(result.taskId).toBe("AP-001");
    expect(result.output).toBeTruthy();
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toContain("NVIDIA_API_KEY");
    expect(_fetchMock).not.toHaveBeenCalled();
  });

  it("returns simulation mode when key is too short", async () => {
    process.env.NVIDIA_API_KEY = "short";
    const { runNvidiaAdapter } = await import("@/lib/nvidiaAgentAdapter");

    const result = await runNvidiaAdapter(MOCK_SESSION, MOCK_TASK);

    expect(result.mode).toBe("simulation");
    expect(_fetchMock).not.toHaveBeenCalled();
  });

  it("returns nvidia mode on successful API call", async () => {
    process.env.NVIDIA_API_KEY = "nvapi-test-secret-key-1234567890";
    _fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: "## Output\n\nGenerated content from NVIDIA." } }],
        usage: { total_tokens: 42 },
      }),
    });

    const { runNvidiaAdapter } = await import("@/lib/nvidiaAgentAdapter");
    const result = await runNvidiaAdapter(MOCK_SESSION, MOCK_TASK);

    expect(result.mode).toBe("nvidia");
    expect(result.ok).toBe(true);
    expect(result.output).toContain("Generated content from NVIDIA.");
    expect(result.tokensUsed).toBe(42);
    expect(result.warnings).toHaveLength(0);
  });

  it("falls back to simulation on HTTP error response", async () => {
    process.env.NVIDIA_API_KEY = "nvapi-test-secret-key-1234567890";
    _fetchMock.mockResolvedValueOnce({ ok: false, status: 503 });

    const { runNvidiaAdapter } = await import("@/lib/nvidiaAgentAdapter");
    const result = await runNvidiaAdapter(MOCK_SESSION, MOCK_TASK);

    expect(result.mode).toBe("simulation");
    expect(result.ok).toBe(true);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toContain("503");
  });

  it("falls back to simulation when API returns empty content", async () => {
    process.env.NVIDIA_API_KEY = "nvapi-test-secret-key-1234567890";
    _fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ choices: [{ message: { content: "" } }] }),
    });

    const { runNvidiaAdapter } = await import("@/lib/nvidiaAgentAdapter");
    const result = await runNvidiaAdapter(MOCK_SESSION, MOCK_TASK);

    expect(result.mode).toBe("simulation");
    expect(result.ok).toBe(true);
  });

  it("falls back to simulation on fetch error", async () => {
    process.env.NVIDIA_API_KEY = "nvapi-test-secret-key-1234567890";
    _fetchMock.mockRejectedValueOnce(new Error("Network unreachable"));

    const { runNvidiaAdapter } = await import("@/lib/nvidiaAgentAdapter");
    const result = await runNvidiaAdapter(MOCK_SESSION, MOCK_TASK);

    expect(result.mode).toBe("simulation");
    expect(result.ok).toBe(true);
    expect(result.warnings[0]).toContain("Network unreachable");
  });

  it("never includes the API key in output or warnings", async () => {
    const SECRET = "nvapi-super-secret-key-do-not-leak-999";
    process.env.NVIDIA_API_KEY = SECRET;
    _fetchMock.mockResolvedValueOnce({ ok: false, status: 401 });

    const { runNvidiaAdapter } = await import("@/lib/nvidiaAgentAdapter");
    const result = await runNvidiaAdapter(MOCK_SESSION, MOCK_TASK);

    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain(SECRET);
    expect(result.output).not.toContain(SECRET);
    result.warnings.forEach((w) => expect(w).not.toContain(SECRET));
  });

  it("result always has required fields", async () => {
    const { runNvidiaAdapter } = await import("@/lib/nvidiaAgentAdapter");

    const result = await runNvidiaAdapter(MOCK_SESSION, MOCK_TASK);

    expect(typeof result.ok).toBe("boolean");
    expect(typeof result.agentId).toBe("string");
    expect(typeof result.taskId).toBe("string");
    expect(typeof result.output).toBe("string");
    expect(["nvidia", "simulation"]).toContain(result.mode);
    expect(typeof result.durationMs).toBe("number");
    expect(Array.isArray(result.warnings)).toBe(true);
  });
});
