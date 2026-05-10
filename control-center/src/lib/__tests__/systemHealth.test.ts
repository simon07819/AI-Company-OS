import { describe, expect, it, vi, beforeAll, afterEach } from "vitest";

// ─── Mock fs ─────────────────────────────────────────────────────────────

let storeData: Record<string, string> = {};

vi.mock("fs", () => ({
  default: {
    readdirSync: vi.fn((p: string) => {
      if (p.includes("backups")) return [];
      if (p.includes("data")) return Object.keys(storeData).filter((k) => !k.includes("/")).map((k) => k);
      return [];
    }),
    statSync: vi.fn((p: string) => ({ size: (storeData[p] ?? "").length, mtime: new Date() })),
    mkdirSync: vi.fn(),
    unlinkSync: vi.fn(),
    existsSync: vi.fn((p: string) => {
      if (p.endsWith(".health-write-test")) return false;
      if (p.includes("backups")) return false;
      // Check if the specific filename exists in storeData
      const filename = p.split("/").pop();
      return filename ? filename in storeData : false;
    }),
    readFileSync: vi.fn((p: string) => {
      for (const [key, val] of Object.entries(storeData)) {
        if (p.endsWith(key)) return val;
      }
      return "{}";
    }),
    writeFileSync: vi.fn((p: string, data: string) => {
      // Store by filename for test inspection
      const name = p.split("/").pop() ?? p;
      storeData[name] = data;
    }),
  },
}));

vi.mock("path", async (importOriginal) => {
  const actual = await importOriginal<typeof import("path")>();
  return { ...actual, resolve: (...args: string[]) => args.join("/") };
});

vi.mock("@/lib/demoQa", () => ({
  runDemoQa: vi.fn(() => ({
    score: 50, totalChecks: 12, passed: 6, failed: 2, warnings: 4,
    checks: [
      { id: "onboarding", label: "Onboarding", status: "fail", detail: "No company", href: "/onboarding" },
      { id: "stores", label: "Stores", status: "pass", detail: "8 stores present", href: "/system" },
    ],
    runAt: new Date().toISOString(),
    recommendations: ["Complete onboarding at /onboarding"],
  })),
}));

vi.mock("@/lib/nvidiaAgentAdapter", () => ({
  runNvidiaAdapter: vi.fn(() => Promise.resolve({ ok: true, result: "simulated", provider: "NVIDIA API" })),
}));

vi.mock("@/lib/deliverableReview", () => ({
  reviewDeliverables: vi.fn(() => ({ ok: true, report: { score: 85, issues: [], recommendations: [] } })),
  loadReviewReport: vi.fn(() => null),
  approveDeliverable: vi.fn(),
  rejectDeliverable: vi.fn(),
}));

vi.mock("@/lib/missionDeliverables", () => ({
  generateMissionDeliverables: vi.fn(() => ({ ok: true, files: [] })),
}));

vi.mock("@/lib/agentRuntime", () => ({
  updateAgentState: vi.fn(),
  getAllAgentStates: vi.fn(() => [
    { agentId: "product_agent", status: "available" },
    { agentId: "frontend_agent", status: "available" },
    { agentId: "backend_agent", status: "available" },
    { agentId: "architect_agent", status: "available" },
    { agentId: "qa_agent", status: "available" },
    { agentId: "devops_agent", status: "available" },
  ]),
}));

vi.mock("@/lib/runtimeEvents", () => ({
  emitEvent: vi.fn(),
}));

vi.mock("@/lib/deliveryPackage", () => ({
  generateDeliveryPackage: vi.fn(() => ({ ok: true, package: {} })),
  loadDeliveryPackage: vi.fn(() => null),
}));

vi.mock("@/lib/onboarding", () => ({
  getOnboardingOverview: vi.fn(() => ({
    state: { completed: false, preferences: { companyName: "" }, completedSteps: [] },
    runtime: { nvidiaConfigured: false, provider: "NVIDIA API" },
    checklist: [],
  })),
}));

vi.mock("@/lib/businessOps", () => ({
  getBusinessOverview: vi.fn(() => ({
    totalMissions: 0, activeMissions: 0, clientReadyMissions: 0, deliveredMissions: 0,
    recurringMissions: 0, approvedDeliverables: 0, deliveryPackagesGenerated: 0,
    activeLoops: 0, estimatedRevenuePotential: 0,
    missionsByStatus: {}, missionsByType: {},
  })),
  getBusinessPipeline: vi.fn(() => []),
  getRecommendedActions: vi.fn(() => []),
}));

vi.mock("@/lib/clientCrm", () => ({
  getCrmOverview: vi.fn(() => ({
    totalLeads: 0, activeLeads: 0, totalClients: 0, activeClients: 0,
    openOpportunities: 0, pipelineValue: 0, wonValue: 0,
    leadsByStatus: {}, clientsByStatus: {}, recentInteractions: [],
  })),
}));

vi.mock("@/lib/revenueSystem", () => ({
  getRevenueOverview: vi.fn(() => ({
    totalRevenue: 0, monthlyRevenue: 0, estimatedMonthlyRevenue: 0, pipelineValue: 0,
    acceptedProposalValue: 0, outstandingInvoices: 0, outstandingInvoiceValue: 0,
    paidInvoices: 0, proposalConversionRate: 0, totalProposals: 0, openProposals: 0,
    totalInvoices: 0, recentRevenue: [], proposalsByStatus: {}, invoicesByStatus: {},
  })),
}));

vi.mock("@/lib/distributionEngine", () => ({
  getDistributionOverview: vi.fn(() => ({
    totalJobs: 0, queuedJobs: 0, scheduledJobs: 0, failedJobs: 0,
    publishedAssets: 0, activeCampaigns: 0, distributionSuccessRate: 0,
    channelPerformance: {}, recentAssets: [], retryableJobs: [],
  })),
}));

vi.mock("@/lib/executiveCommand", () => ({
  getExecutiveCommandOverview: vi.fn(() => ({
    healthScore: 80, healthGrade: "stable",
    workspaces: { total: 0, active: 0, top: [] },
    missions: { total: 0, active: 0, clientReady: 0, delivered: 0, pendingApprovals: 0, pipeline: [] },
    runtime: { totalAgents: 6, activeAgents: 0, failedAgents: 0, queuedTasks: 0, agents: [] },
    revenue: {}, crm: {}, distribution: {},
    loops: { total: 0, active: 0, paused: 0 },
    deliveryPackages: { generated: 0, pendingApprovals: 0 },
    alerts: [],
  })),
}));

vi.mock("@/lib/companyWorkspace", () => ({
  getWorkspaceOverview: vi.fn(() => ({
    totalWorkspaces: 0, activeWorkspaces: 0, totalRevenue: 0,
    activeMissions: 0, activeCampaigns: 0, publishedAssets: 0,
    crmClients: 0, crmLeads: 0, workspaces: [],
  })),
}));

vi.mock("@/lib/autopilotStore", () => ({
  listSessions: vi.fn(() => []),
}));

// ─── Helpers ─────────────────────────────────────────────────────────────

function resetStore() {
  storeData = {
    "autopilot-sessions.json": "[]",
    "client-crm.json": '{"leads":[],"clients":[],"opportunities":[],"interactions":[]}',
    "loop-state.json": "[]",
    "company-workspaces.json": '{"workspaces":[]}',
    "onboarding-state.json": '{"completed":false,"preferences":{"companyName":""},"completedSteps":[]}',
    "revenue-system.json": '{"records":[]}',
    "distribution-engine.json": '{"jobs":[],"campaigns":[],"publishedAssets":[]}',
    "runtime-state.json": '{"agents":[]}',
  };
}

// ─── Tests ───────────────────────────────────────────────────────────────

describe("systemHealth", () => {
  beforeAll(() => { resetStore(); });
  afterEach(() => { resetStore(); });

  it("getSystemHealth returns report with valid JSON stores", async () => {
    const { getSystemHealth } = await import("@/lib/systemHealth");
    const report = getSystemHealth();

    expect(report.score).toBeGreaterThan(0);
    expect(report.checks.length).toBeGreaterThan(0);
    expect(report.stores.length).toBe(8);
    expect(report.stores.every((s) => s.parseable)).toBe(true);
    expect(report.environment.nvidiaKeyPresent).toBe(false);
    expect(report.environment.nodeVersion).toBeTruthy();
    expect(report.diskUsage).toBeDefined();
    expect(report.warnings).toBeDefined();
    expect(report.recommendations).toBeDefined();
  });

  it("getSystemHealth detects corrupt JSON", async () => {
    storeData["autopilot-sessions.json"] = "{ broken json }";

    const { getSystemHealth } = await import("@/lib/systemHealth");
    const report = getSystemHealth();

    const corrupt = report.stores.find((s) => s.file === "autopilot-sessions.json");
    expect(corrupt?.parseable).toBe(false);
    expect(report.warnings.length).toBeGreaterThan(0);
    expect(report.warnings.some((w) => w.includes("Corrupt"))).toBe(true);
  });

  it("getSystemHealth detects missing stores", async () => {
    delete storeData["client-crm.json"];

    const { getSystemHealth } = await import("@/lib/systemHealth");
    const report = getSystemHealth();

    const missing = report.stores.find((s) => s.file === "client-crm.json");
    expect(missing?.exists).toBe(false);
  });

  it("getSystemHealth never exposes NVIDIA_API_KEY value", async () => {
    const { getSystemHealth } = await import("@/lib/systemHealth");
    const report = getSystemHealth();

    const nvidiaCheck = report.checks.find((c) => c.id === "nvidia_key");
    expect(nvidiaCheck?.detail).not.toContain(process.env.NVIDIA_API_KEY ?? "should-not-appear");
    expect(nvidiaCheck?.detail).toContain("simulation");
  });

  it("createBackup creates manifest with correct structure", async () => {
    const { createBackup } = await import("@/lib/systemHealth");
    const manifest = createBackup("Test backup");

    expect(manifest).not.toBeNull();
    expect(manifest!.id).toMatch(/^backup-/);
    expect(manifest!.note).toBe("Test backup");
    expect(manifest!.files.length).toBeGreaterThan(0);
    expect(manifest!.totalSize).toBeGreaterThan(0);
    expect(manifest!.createdAt).toBeTruthy();
  });

  it("createBackup returns null when fs fails", async () => {
    // Force writeFileSync to throw on the next call
    const fsMock = vi.mocked((await import("fs")).default);
    const origWrite = fsMock.writeFileSync;
    fsMock.writeFileSync = vi.fn((p: string) => {
      if (p.includes("manifest.json")) throw new Error("disk full");
      return origWrite(p, "");
    });

    const { createBackup } = await import("@/lib/systemHealth");
    const result = createBackup("Fail test");

    expect(result).toBeNull();

    // Restore
    fsMock.writeFileSync = origWrite;
  });

  it("listBackups returns array (structure validated)", async () => {
    const { listBackups } = await import("@/lib/systemHealth");
    const backups = listBackups();
    expect(Array.isArray(backups)).toBe(true);
    // If any backups exist, validate structure
    for (const b of backups) {
      expect(b.id).toMatch(/^backup-/);
      expect(b.createdAt).toBeTruthy();
      expect(b.files).toBeInstanceOf(Array);
      expect(typeof b.totalSize).toBe("number");
    }
  });
});
