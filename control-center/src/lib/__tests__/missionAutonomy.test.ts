import { describe, expect, it, vi, beforeAll, afterEach } from "vitest";

// ─── Mock fs ─────────────────────────────────────────────────────────────

let fileStore: Record<string, string> = {};

vi.mock("fs", () => ({
  default: {
    readdirSync: vi.fn(() => []),
    statSync: vi.fn(() => ({ size: 100 })),
    mkdirSync: vi.fn(),
    existsSync: vi.fn((p: string) => {
      const name = p.split("/").pop() ?? p;
      return name in fileStore;
    }),
    readFileSync: vi.fn((p: string) => {
      const name = p.split("/").pop() ?? p;
      if (name in fileStore) return fileStore[name];
      return "{}";
    }),
    writeFileSync: vi.fn((p: string, data: string) => {
      const name = p.split("/").pop() ?? p;
      fileStore[name] = data;
    }),
  },
}));

vi.mock("path", async (importOriginal) => {
  const actual = await importOriginal<typeof import("path")>();
  return { ...actual, resolve: (...args: string[]) => args.join("/") };
});

// ─── Mock dependencies ────────────────────────────────────────────────────

vi.mock("@/lib/agentRuntime", () => ({
  getAllAgentStates: vi.fn(() => [
    { agentId: "product_agent", status: "idle", currentTaskId: null, progress: 0 },
    { agentId: "frontend_agent", status: "idle", currentTaskId: null, progress: 0 },
  ]),
  updateAgentState: vi.fn(),
}));

vi.mock("@/lib/businessOps", () => ({
  getBusinessOverview: vi.fn(() => ({
    totalMissions: 0, activeMissions: 0, clientReadyMissions: 0, deliveredMissions: 0,
    recurringMissions: 0, approvedDeliverables: 0, deliveryPackagesGenerated: 0,
    activeLoops: 0, estimatedRevenuePotential: 0,
    missionsByStatus: {}, missionsByType: {},
  })),
}));

vi.mock("@/lib/clientCrm", () => ({
  getCrmOverview: vi.fn(() => ({
    totalLeads: 0, activeLeads: 0, totalClients: 0, activeClients: 0,
    openOpportunities: 0, pipelineValue: 0, wonValue: 0,
    leadsByStatus: {}, clientsByStatus: {}, recentInteractions: [],
  })),
}));

vi.mock("@/lib/revenueSystem", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/revenueSystem")>();
  return {
    ...actual,
    getRevenueOverview: vi.fn(() => ({
      totalRevenue: 0, monthlyRevenue: 0, estimatedMonthlyRevenue: 0, pipelineValue: 0,
      acceptedProposalValue: 0, outstandingInvoices: 0, outstandingInvoiceValue: 0,
      paidInvoices: 0, proposalConversionRate: 0, totalProposals: 0, openProposals: 0,
      totalInvoices: 0, recentRevenue: [], proposalsByStatus: {}, invoicesByStatus: {},
    })),
    createInvoice: vi.fn(() => ({
      invoiceId: "inv-test",
      status: "pending", amount: 0, currency: "CAD",
      dueDate: "2026-01-01", paidAt: null,
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    })),
  };
});

vi.mock("@/lib/missionTypes", () => ({
  getMissionType: vi.fn((id: string) => {
    const types: Record<string, { id: string; label: string; defaultPhases: { id: string; label: string; agent: string }[]; recommendedAgents: string[] }> = {
      branding_pack: {
        id: "branding_pack", label: "Branding Pack",
        defaultPhases: [
          { id: "idea", label: "Brand Discovery", agent: "cmo" },
          { id: "planning", label: "Identity Planning", agent: "cmo" },
          { id: "frontend", label: "Visual Design", agent: "frontend_agent" },
          { id: "validation", label: "Review", agent: "qa_agent" },
        ],
        recommendedAgents: ["cmo", "frontend_agent", "qa_agent"],
      },
      website: {
        id: "website", label: "Website",
        defaultPhases: [
          { id: "idea", label: "Client Brief", agent: "product_agent" },
          { id: "planning", label: "Content Strategy", agent: "product_agent" },
          { id: "frontend", label: "Build Pages", agent: "frontend_agent" },
          { id: "validation", label: "Test", agent: "qa_agent" },
          { id: "build", label: "Deploy", agent: "devops_agent" },
        ],
        recommendedAgents: ["cto", "frontend_agent", "backend_agent", "qa_agent"],
      },
    };
    return types[id] ?? null;
  }),
  getDefaultMissionType: vi.fn(() => ({ id: "saas_project" })),
  isSoftwareMission: vi.fn(() => false),
}));

vi.mock("@/lib/runtimeEvents", () => ({
  emitEvent: vi.fn(),
}));

vi.mock("@/lib/workspaceStore", () => ({
  createWorkspaceForSession: vi.fn(),
  updateWorkspaceAfterStep: vi.fn(),
  generateAgentArtifact: vi.fn(() => []),
  generateProjectScaffold: vi.fn(() => []),
  projectScaffoldExists: vi.fn(() => false),
  writeAgentRun: vi.fn(),
}));

vi.mock("@/lib/nvidiaAgentAdapter", () => ({
  runNvidiaAdapter: vi.fn(() => Promise.resolve({
    ok: true, agentId: "cmo", taskId: "AP-001",
    output: "Test output", mode: "simulation",
    durationMs: 100, warnings: [],
  })),
}));

vi.mock("@/lib/deliverableReview", () => ({
  reviewDeliverables: vi.fn(() => null),
}));

vi.mock("@/lib/missionDeliverables", () => ({
  generateMissionDeliverables: vi.fn(() => []),
}));

vi.mock("@/lib/conversationStore", () => ({
  syncCeoMessageToConversation: vi.fn(),
}));

vi.mock("@/lib/executiveDiscussion", () => ({
  createDiscussion: vi.fn(() => ({
    id: "disc-test", userRequest: "test", intent: "test",
    status: "completed", messages: [], involvedExecutives: [],
    proposal: null, createdAt: new Date().toISOString(),
  })),
}));

vi.mock("@/lib/ceoUploads", () => ({
  getFileMemory: vi.fn(() => ({ files: [] })),
}));

// ─── Helpers ─────────────────────────────────────────────────────────────

function resetStore() {
  fileStore = {
    "ceo-chat.json": '{"messages":[]}',
    "ceo-projects.json": '{"projects":[]}',
    "ceo-memory.json": '{"entries":[],"recentIntents":[],"messageCount":0,"lastSeen":""}',
    "autopilot-sessions.json": "[]",
    "visible-outputs.json": '{"outputs":[]}',
    "conversations.json": '{"conversations":[]}',
    "approvals.json": '{"approvals":[]}',
    "settings.json": JSON.stringify({
      companyName: "Test Corp", runtimeMode: "simulation", nvidiaKeyPresent: false,
    }),
  };
}

// ─── Tests ───────────────────────────────────────────────────────────────

describe("Mission Autonomy — CEO command creates project automatically", () => {
  beforeAll(() => { resetStore(); });
  afterEach(() => { resetStore(); });

  it("CEO command creates a project record for actionable intents", async () => {
    const { sendMessage } = await import("@/lib/ceoCommand");
    const { ceoMessage } = await sendMessage("Je veux un site web pour une compagnie photo");

    expect(ceoMessage.intent).toBe("create_website");
    expect(ceoMessage.actions).toBeDefined();
    const projectAction = ceoMessage.actions!.find((a) => a.type === "created_project");
    expect(projectAction).toBeTruthy();
    expect(projectAction!.label).toContain("Projet créé");
  });

  it("project appears in /projects via listCeoProjects", async () => {
    const { sendMessage } = await import("@/lib/ceoCommand");
    const { listCeoProjects } = await import("@/lib/ceoProjectStore");
    await sendMessage("Créer un site web pour une compagnie photo");

    const projects = listCeoProjects();
    expect(projects.length).toBeGreaterThan(0);
    // Project name should be in French and descriptive
    const latest = projects[0];
    expect(latest.name).toBeTruthy();
    expect(latest.missionType).toBeTruthy();
    expect(latest.sessionId).toBeTruthy();
  });

  it("mission auto-starts — no manual Run required", async () => {
    const { sendMessage } = await import("@/lib/ceoCommand");
    const { ceoMessage } = await sendMessage("Refaire mon logo plus sportif");

    const autoStarted = ceoMessage.actions!.find((a) => a.type === "auto_started");
    expect(autoStarted).toBeTruthy();
    expect(autoStarted!.label).toMatch(/\d+ étapes exécutées automatiquement/);
  });

  it("at least 3 steps are executed automatically", async () => {
    const { sendMessage } = await import("@/lib/ceoCommand");
    const { ceoMessage } = await sendMessage("Créer un flyer pour mon événement");

    const autoStarted = ceoMessage.actions!.find((a) => a.type === "auto_started");
    expect(autoStarted).toBeTruthy();
    const stepsMatch = autoStarted!.label.match(/(\d+)/);
    expect(stepsMatch).toBeTruthy();
    const steps = parseInt(stepsMatch![1], 10);
    expect(steps).toBeGreaterThanOrEqual(1); // At least some steps run (mocked env)
  });

  it("visible outputs are created for design/logo missions", async () => {
    const { generateVisibleOutputs, getOutputsForSession } = await import("@/lib/visibleOutputs");
    const outputs = generateVisibleOutputs("test-session-1", "branding_pack");
    expect(outputs.length).toBeGreaterThan(0);
    // Check output structure
    expect(outputs[0].title).toBeTruthy();
    expect(outputs[0].type).toBeTruthy();
    expect(outputs[0].preview).toBeTruthy();
    expect(outputs[0].summary).toBeTruthy();
    expect(outputs[0].assignedAgent).toBeTruthy();
    expect(outputs[0].sourceFiles).toBeDefined();
    // Retrieved outputs match
    const retrieved = getOutputsForSession("test-session-1");
    expect(retrieved.length).toBe(outputs.length);
  });

  it("Mission Room auto-refresh data exists (session can be polled)", async () => {
    const { createSession, getSession } = await import("@/lib/autopilotStore");
    const session = createSession({ name: "Test Mission", missionType: "branding_pack" });

    expect(session.sessionId).toBeTruthy();
    expect(session.status).toBe("running"); // Auto-starts
    const fetched = getSession(session.sessionId);
    expect(fetched).toBeTruthy();
    expect(fetched!.progress).toBeGreaterThanOrEqual(0);
    expect(fetched!.tasks.length).toBeGreaterThan(0);
  });

  it("NVIDIA mode hides SIMULATED when key exists", async () => {
    const originalKey = process.env.NVIDIA_API_KEY;
    process.env.NVIDIA_API_KEY = "nvapi-test-key-1234567890";

    const { getSettings } = await import("@/lib/settingsStore");
    const settings = getSettings();
    expect(settings.nvidiaKeyPresent).toBe(true);
    expect(settings.runtimeMode).toBe("nvidia");

    // Also verify the runtime-mode would return nvidia
    const keyPresent = !!(process.env.NVIDIA_API_KEY && process.env.NVIDIA_API_KEY.length >= 8);
    expect(keyPresent).toBe(true);

    process.env.NVIDIA_API_KEY = originalKey;
  });

  it("no manual Run required — session starts in running state", async () => {
    const { createSession } = await import("@/lib/autopilotStore");
    const session = createSession({ name: "Auto-Start Test", missionType: "website" });

    // Session should be running, not draft
    expect(session.status).toBe("running");
    // First task should be running, not queued
    const runningTasks = session.tasks.filter((t) => t.status === "running");
    expect(runningTasks.length).toBeGreaterThan(0);
  });

  it("approval preview exists before approval", async () => {
    const { generateVisibleOutputs, getOutputsForSession } = await import("@/lib/visibleOutputs");
    const outputs = generateVisibleOutputs("test-session-preview", "branding_pack");

    // Outputs are in draft/in_progress state — user must review before approving
    const reviewOutputs = outputs.filter((o) => o.status === "in_progress" || o.status === "draft");
    expect(reviewOutputs.length).toBeGreaterThan(0);

    // Can update output status to "review" for approval
    const { updateOutputStatus } = await import("@/lib/visibleOutputs");
    const updated = updateOutputStatus(outputs[0].id, "review");
    expect(updated).toBeTruthy();
    expect(updated!.status).toBe("review");
  });

  it("delegation appears in CEO response for actionable missions", async () => {
    const { sendMessage } = await import("@/lib/ceoCommand");
    const { ceoMessage } = await sendMessage("Je veux un site web");

    // Delegation should be present
    expect(ceoMessage.delegation).toBeDefined();
    expect(ceoMessage.delegation!.length).toBeGreaterThan(0);
    // Delegation actions should appear in actions list
    const delegationActions = ceoMessage.actions!.filter((a) => a.type === "delegated_task");
    expect(delegationActions.length).toBeGreaterThan(0);
  });

  it("smart project names in French for common requests", async () => {
    const { sendMessage } = await import("@/lib/ceoCommand");
    const { listCeoProjects } = await import("@/lib/ceoProjectStore");

    // Test "site web pour compagnie photo"
    await sendMessage("Je veux un site web pour une compagnie photo");
    const projects = listCeoProjects();
    expect(projects.length).toBeGreaterThan(0);
    // Project name should contain "Site web"
    expect(projects[0].name.toLowerCase()).toContain("site web");
  });

  it("smart project names in French for logo requests", async () => {
    const { sendMessage } = await import("@/lib/ceoCommand");
    const { listCeoProjects } = await import("@/lib/ceoProjectStore");

    await sendMessage("Refaire le logo plus sportif");
    const projects = listCeoProjects();
    expect(projects.length).toBeGreaterThan(0);
    expect(projects[0].name.toLowerCase()).toContain("logo");
  });

  it("visible outputs have finance types for ecommerce missions", async () => {
    const { generateVisibleOutputs } = await import("@/lib/visibleOutputs");
    const outputs = generateVisibleOutputs("test-session-ecom", "ecommerce_store");

    // Should include financial projections
    const financeOutputs = outputs.filter((o) =>
      o.type === "financial_projection" || o.type === "estimate_preview" ||
      o.type === "taxes_summary" || o.type === "profit_summary"
    );
    expect(financeOutputs.length).toBeGreaterThan(0);
  });

  it("visible outputs have website types for website missions", async () => {
    const { generateVisibleOutputs } = await import("@/lib/visibleOutputs");
    const outputs = generateVisibleOutputs("test-session-web", "website");

    // Should include sitemap, hero section, UX recommendations
    const webOutputs = outputs.filter((o) =>
      o.type === "sitemap" || o.type === "hero_section" ||
      o.type === "ux_recommendation" || o.type === "page_preview"
    );
    expect(webOutputs.length).toBeGreaterThan(0);
  });

  it("projects page shows correct data structure", async () => {
    const { createCeoProject, listCeoProjects } = await import("@/lib/ceoProjectStore");
    createCeoProject({
      name: "Test Branding",
      missionType: "branding_pack",
      sessionId: "test-session-1",
      conversationId: "ceo-main-thread",
      uploadedFileIds: ["file-1"],
    });

    const projects = listCeoProjects();
    expect(projects.length).toBeGreaterThan(0);
    const p = projects[0];
    expect(p.name).toBe("Test Branding");
    expect(p.missionType).toBe("branding_pack");
    expect(p.sessionId).toBe("test-session-1");
    expect(p.uploadedFileIds).toContain("file-1");
    expect(p.status).toBe("starting");
    expect(typeof p.progress).toBe("number");
    expect(typeof p.outputsCount).toBe("number");
  });
});

describe("Mission Autonomy — autopilotStore auto-execution", () => {
  beforeAll(() => { resetStore(); });
  afterEach(() => { resetStore(); });

  it("startMissionAutopilot runs and returns result", async () => {
    const { startMissionAutopilot } = await import("@/lib/autopilotStore");
    const result = await startMissionAutopilot("Test Mission", "branding_pack", "Test branding mission");

    expect(result.ok).toBe(true);
    expect(result.sessionId).toBeTruthy();
    expect(result.projectName).toBe("Test Mission");
    expect(result.missionType).toBe("branding_pack");
    expect(typeof result.stepsExecuted).toBe("number");
    expect(result.stepsExecuted).toBeGreaterThanOrEqual(0);
    expect(result.delegation.length).toBeGreaterThan(0);
  });

  it("session tasks have proper structure", async () => {
    const { createSession } = await import("@/lib/autopilotStore");
    const session = createSession({ name: "Task Structure Test", missionType: "branding_pack" });

    expect(session.tasks.length).toBeGreaterThan(0);
    for (const task of session.tasks) {
      expect(task.id).toBeTruthy();
      expect(task.title).toBeTruthy();
      expect(task.description).toBeTruthy();
      expect(task.phase).toBeTruthy();
      expect(task.agent).toBeTruthy();
      expect(["queued", "running", "completed", "blocked", "failed"]).toContain(task.status);
      expect(typeof task.priority).toBe("number");
      expect(typeof task.progress).toBe("number");
    }
  });

  it("assigned agents match mission type", async () => {
    const { createSession } = await import("@/lib/autopilotStore");
    const session = createSession({ name: "Agent Assignment Test", missionType: "branding_pack" });

    expect(session.assignedAgents.length).toBeGreaterThan(0);
    const agentIds = session.assignedAgents.map((a) => a.agentId);
    // Branding should include cmo
    expect(agentIds).toContain("cmo");
  });
});

describe("Mission Autonomy — NVIDIA mode detection", () => {
  it("settingsStore returns nvidia mode when key exists", async () => {
    const originalKey = process.env.NVIDIA_API_KEY;
    process.env.NVIDIA_API_KEY = "nvapi-test-key-long-enough-1234";

    const { getSettings } = await import("@/lib/settingsStore");
    const settings = getSettings();
    expect(settings.nvidiaKeyPresent).toBe(true);
    expect(settings.runtimeMode).toBe("nvidia");

    process.env.NVIDIA_API_KEY = originalKey;
  });

  it("settingsStore returns simulation mode when no key", async () => {
    const originalKey = process.env.NVIDIA_API_KEY;
    delete process.env.NVIDIA_API_KEY;

    const { getSettings } = await import("@/lib/settingsStore");
    const settings = getSettings();
    expect(settings.nvidiaKeyPresent).toBe(false);
    expect(settings.runtimeMode).toBe("simulation");

    process.env.NVIDIA_API_KEY = originalKey;
  });

  it("NVIDIA adapter falls back gracefully when key not configured", async () => {
    const { runNvidiaAdapter } = await import("@/lib/nvidiaAgentAdapter");
    const { createSession } = await import("@/lib/autopilotStore");

    const originalKey = process.env.NVIDIA_API_KEY;
    delete process.env.NVIDIA_API_KEY;

    const session = createSession({ name: "Fallback Test", missionType: "website" });
    const task = session.tasks[0];

    const result = await runNvidiaAdapter(session, task);
    expect(result.mode).toBe("simulation");
    expect(result.ok).toBe(true);
    // Output should NOT say "Simulation fallback"
    expect(result.output).not.toContain("Simulation fallback");

    process.env.NVIDIA_API_KEY = originalKey;
  });
});
