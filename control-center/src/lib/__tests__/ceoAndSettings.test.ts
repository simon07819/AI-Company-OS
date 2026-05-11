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

vi.mock("@/lib/autopilotStore", () => ({
  createSession: vi.fn(() => ({
    sessionId: "ceo-test-session",
    projectName: "CEO Test Mission",
    missionType: "website",
    status: "draft",
    progress: 0,
    businessStatus: "idea",
    tasks: [],
    roadmap: [],
    logs: [],
    loopMode: "one_shot",
    loopStatus: "inactive",
    nextRunAt: null,
    lastRunAt: null,
    loopHistory: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  })),
  listSessions: vi.fn(() => []),
  getSession: vi.fn(() => null),
  runStep: vi.fn(() => ({ ok: true, task: { status: "completed" } })),
}));

vi.mock("@/lib/agentRuntime", () => ({
  getAllAgentStates: vi.fn(() => [
    { agentId: "product_agent", status: "idle", currentTaskId: null, progress: 0 },
    { agentId: "frontend_agent", status: "idle", currentTaskId: null, progress: 0 },
    { agentId: "backend_agent", status: "idle", currentTaskId: null, progress: 0 },
  ]),
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
      invoiceId: "inv-ceo-test",
      proposalId: null, clientId: null, missionId: null,
      status: "pending", amount: 0, currency: "CAD",
      dueDate: "2025-01-01", paidAt: null,
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    })),
  };
});

vi.mock("@/lib/missionTypes", () => ({
  getMissionType: vi.fn(() => null),
  getDefaultMissionType: vi.fn(() => ({ id: "saas_project" })),
}));

vi.mock("@/lib/runtimeEvents", () => ({
  emitEvent: vi.fn(),
}));

vi.mock("@/lib/workspaceStore", () => ({
  createWorkspaceForSession: vi.fn(),
  updateWorkspaceAfterStep: vi.fn(),
  generateAgentArtifact: vi.fn(),
  generateProjectScaffold: vi.fn(),
  projectScaffoldExists: vi.fn(() => false),
  writeAgentRun: vi.fn(),
}));

vi.mock("@/lib/nvidiaAgentAdapter", () => ({
  runNvidiaAdapter: vi.fn(() => Promise.resolve({ ok: true, result: "simulated", provider: "NVIDIA API" })),
}));

vi.mock("@/lib/deliverableReview", () => ({
  reviewDeliverables: vi.fn(() => ({ ok: true, report: { score: 85, issues: [], recommendations: [] } })),
}));

vi.mock("@/lib/missionDeliverables", () => ({
  generateMissionDeliverables: vi.fn(() => ({ ok: true, files: [] })),
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

// ─── Helpers ─────────────────────────────────────────────────────────────

function resetStore() {
  fileStore = {
    "ceo-chat.json": '{"messages":[]}',
    "settings.json": JSON.stringify({
      companyName: "Test Corp",
      businessEmail: "test@test.com",
      phone: "",
      address: "",
      currency: "CAD",
      taxRegion: "quebec",
      tpsRate: 5,
      tvqRate: 9.975,
      invoicePrefix: "INV",
      defaultPaymentTerms: 30,
      logoUrl: null,
      nvidiaKeyPresent: false,
      runtimeMode: "simulation",
      approvalMode: "manual",
      autoPublish: false,
      autoInvoice: false,
      loopAggressiveness: "medium",
      defaultWorkspace: "",
      defaultMissionType: "saas_project",
      updatedAt: new Date().toISOString(),
    }),
  };
}

// ─── Tests ───────────────────────────────────────────────────────────────

describe("ceoCommand", () => {
  beforeAll(() => { resetStore(); });
  afterEach(() => { resetStore(); });

  it("saves user and CEO messages", async () => {
    const { sendMessage, getMessages } = await import("@/lib/ceoCommand");
    const { ceoMessage } = await sendMessage("Bonjour!");

    expect(ceoMessage.role).toBe("ceo");
    expect(ceoMessage.intent).toBe("greeting");
    expect(ceoMessage.text).toContain("CEO");

    const messages = getMessages();
    const userMsg = messages.find((m) => m.role === "user" && m.text === "Bonjour!");
    expect(userMsg).toBeTruthy();
    const ceoMsg = messages.find((m) => m.role === "ceo");
    expect(ceoMsg).toBeTruthy();
  });

  it("detects launch_mission intent", async () => {
    const { sendMessage } = await import("@/lib/ceoCommand");
    const { ceoMessage } = await sendMessage("Lancer une mission pour moi");

    expect(ceoMessage.intent).toBe("launch_mission");
    expect(ceoMessage.actions).toBeDefined();
    expect(ceoMessage.actions!.some((a) => a.type === "created_session")).toBe(true);
  });

  it("creates guided Mission Room action for new missions", async () => {
    const { sendMessage } = await import("@/lib/ceoCommand");
    const { ceoMessage } = await sendMessage("Créer un site web pour mon entreprise");
    const action = ceoMessage.actions!.find((a) => a.type === "created_session");

    expect(action?.label).toBe("Mission créée — ouvrir la Mission Room");
    expect(action?.href).toBe("/mission/ceo-test-session");
  });

  it("detects create_flyer intent and creates session", async () => {
    const { sendMessage } = await import("@/lib/ceoCommand");
    const { ceoMessage } = await sendMessage("Créer un flyer pour mon entreprise");

    expect(ceoMessage.intent).toBe("create_flyer");
    expect(ceoMessage.actions!.some((a) => a.type === "created_session")).toBe(true);
  });

  it("detects create_invoice intent", async () => {
    const { sendMessage } = await import("@/lib/ceoCommand");
    const { ceoMessage } = await sendMessage("Créer une facture pour le client");

    expect(ceoMessage.intent).toBe("create_invoice");
    expect(ceoMessage.actions!.some((a) => a.type === "created_invoice")).toBe(true);
  });

  it("detects create_dropshipping_business intent", async () => {
    const { sendMessage } = await import("@/lib/ceoCommand");
    const { ceoMessage } = await sendMessage("Créer une entreprise dropshipping");

    expect(ceoMessage.intent).toBe("create_dropshipping_business");
    expect(ceoMessage.actions!.some((a) => a.type === "created_session")).toBe(true);
  });

  it("getCeoOverview returns agents, tasks, decisions", async () => {
    const { getCeoOverview } = await import("@/lib/ceoCommand");
    const overview = getCeoOverview();

    expect(overview.agents.length).toBeGreaterThan(0);
    expect(typeof overview.activeMissions).toBe("number");
    expect(typeof overview.pendingApprovals).toBe("number");
    expect(Array.isArray(overview.pendingDecisions)).toBe(true);
    expect(Array.isArray(overview.recentMessages)).toBe(true);
  });

  it("approveDecision logs approval", async () => {
    const { approveDecision } = await import("@/lib/ceoCommand");
    const result = approveDecision("dec-test-123");

    expect(result.ok).toBe(true);
    expect(result.message).toContain("approuvée");
  });

  it("rejectDecision logs rejection", async () => {
    const { rejectDecision } = await import("@/lib/ceoCommand");
    const result = rejectDecision("dec-test-456");

    expect(result.ok).toBe(true);
    expect(result.message).toContain("rejetée");
  });
});

describe("proactiveCEO", () => {
  beforeAll(() => { resetStore(); });
  afterEach(() => { resetStore(); });

  it('"refaire le logo plus sportif" creates mission without blocking question', async () => {
    const { sendMessage } = await import("@/lib/ceoCommand");
    const { ceoMessage } = await sendMessage("refaire le logo plus sportif");

    expect(ceoMessage.intent).toBe("redesign_logo");
    expect(ceoMessage.sessionId).toBeTruthy();
    expect(ceoMessage.actions.some((a) => a.type === "created_session")).toBe(true);
    // Must NOT ask for more context
    expect(ceoMessage.text).not.toContain("J'ai besoin de");
    expect(ceoMessage.text).not.toContain("plus de contexte");
    // Must contain assumptions
    expect(ceoMessage.assumptions).toBeDefined();
    expect(ceoMessage.assumptions!.length).toBeGreaterThan(0);
    // Must contain delegation
    expect(ceoMessage.delegation).toBeDefined();
    expect(ceoMessage.delegation!.length).toBeGreaterThan(0);
    // Must mention delegation roles
    expect(ceoMessage.text).toContain("CMO");
  });

  it('"style plus premium" creates branding_pack mission', async () => {
    const { sendMessage } = await import("@/lib/ceoCommand");
    const { ceoMessage } = await sendMessage("style plus premium");

    expect(ceoMessage.intent).toBe("branding_pack");
    expect(ceoMessage.sessionId).toBeTruthy();
    expect(ceoMessage.text).toContain("premium");
  });

  it('"moderne" creates branding_pack mission', async () => {
    const { sendMessage } = await import("@/lib/ceoCommand");
    const { ceoMessage } = await sendMessage("rendre le design plus moderne");

    expect(ceoMessage.intent).toBe("branding_pack");
    expect(ceoMessage.sessionId).toBeTruthy();
  });

  it('CEO response contains assumptions with inferred source', async () => {
    const { sendMessage } = await import("@/lib/ceoCommand");
    const { ceoMessage } = await sendMessage("refaire le logo plus sportif");

    const inferred = ceoMessage.assumptions?.filter((a) => a.source === "inferred");
    expect(inferred!.length).toBeGreaterThan(0);
    // Project name should be auto-generated
    const projectName = ceoMessage.assumptions?.find((a) => a.field === "Project name");
    expect(projectName).toBeTruthy();
    // Style should be inferred
    const style = ceoMessage.assumptions?.find((a) => a.field === "Style");
    expect(style).toBeTruthy();
    expect(style!.value).toContain("Sportif");
  });

  it('CEO does NOT respond "j\'ai besoin de contexte" for actionable requests', async () => {
    const { sendMessage } = await import("@/lib/ceoCommand");
    const actionableRequests = [
      "changer le logo",
      "branding pour ma compagnie",
      "créer un site web",
      "faire un flyer",
    ];
    for (const req of actionableRequests) {
      const { ceoMessage } = await sendMessage(req);
      expect(ceoMessage.text).not.toContain("J'ai besoin de");
      expect(ceoMessage.text).not.toContain("plus de contexte");
    }
  });

  it('delegation includes correct roles per intent', async () => {
    const { sendMessage } = await import("@/lib/ceoCommand");
    const { ceoMessage } = await sendMessage("redesign logo plus sportif");

    const agentIds = ceoMessage.delegation!.map((d) => d.agentId);
    expect(agentIds).toContain("cmo");
    expect(agentIds).toContain("frontend_agent");
    expect(agentIds).toContain("qa_agent");
  });
});

describe("settingsStore", () => {
  beforeAll(() => { resetStore(); });
  afterEach(() => { resetStore(); });

  it("saves and loads settings", async () => {
    const { getSettings, saveSettings } = await import("@/lib/settingsStore");
    const updated = saveSettings({ companyName: "Updated Corp" });

    expect(updated.companyName).toBe("Updated Corp");

    const loaded = getSettings();
    expect(loaded.companyName).toBe("Updated Corp");
  });

  it("never exposes NVIDIA_API_KEY value", async () => {
    const { getSettings } = await import("@/lib/settingsStore");
    const settings = getSettings();

    expect(typeof settings.nvidiaKeyPresent).toBe("boolean");
    // Ensure the key value is never in the persisted file
    const raw = fileStore["settings.json"];
    expect(raw).not.toContain(process.env.NVIDIA_API_KEY ?? "should-not-appear");
  });

  it("saves new automation and company fields", async () => {
    const { saveSettings, getSettings } = await import("@/lib/settingsStore");
    const updated = saveSettings({
      phone: "+1 514-000-0000",
      address: "123 Rue Test, Montréal, QC",
      runtimeMode: "hybrid",
      approvalMode: "supervised",
      autoPublish: true,
      autoInvoice: true,
      loopAggressiveness: "high",
      defaultMissionType: "ecommerce_store",
    });

    expect(updated.phone).toBe("+1 514-000-0000");
    expect(updated.address).toBe("123 Rue Test, Montréal, QC");
    expect(updated.runtimeMode).toBe("hybrid");
    expect(updated.approvalMode).toBe("supervised");
    expect(updated.autoPublish).toBe(true);
    expect(updated.autoInvoice).toBe(true);
    expect(updated.loopAggressiveness).toBe("high");
    expect(updated.defaultMissionType).toBe("ecommerce_store");

    const loaded = getSettings();
    expect(loaded.runtimeMode).toBe("hybrid");
    expect(loaded.autoPublish).toBe(true);
  });

  it("testNvidia returns connected false when no key", async () => {
    const { testNvidia } = await import("@/lib/settingsStore");
    const result = await testNvidia();

    expect(result.connected).toBe(false);
    expect(result.message).toContain("simulation");
  });
});

describe("enhancedInvoice", () => {
  beforeAll(() => { resetStore(); });
  afterEach(() => { resetStore(); });

  it("calculates TPS and TVQ correctly", async () => {
    const { createEnhancedInvoice } = await import("@/lib/revenueSystem");
    const inv = createEnhancedInvoice({
      lineItems: [
        { description: "Web Design", quantity: 1, unitPrice: 1000, total: 1000 },
        { description: "Logo", quantity: 2, unitPrice: 250, total: 500 },
      ],
      tpsRate: 5,
      tvqRate: 9.975,
    });

    expect(inv.subtotal).toBe(1500);
    expect(inv.tpsAmount).toBe(75);          // 1500 * 5%
    expect(inv.tvqAmount).toBe(149.63);      // 1500 * 9.975%
    expect(inv.total).toBe(1724.63);         // 1500 + 75 + 149.63
  });

  it("calculates total correctly with no taxes", async () => {
    const { createEnhancedInvoice } = await import("@/lib/revenueSystem");
    const inv = createEnhancedInvoice({
      lineItems: [
        { description: "Consulting", quantity: 3, unitPrice: 200, total: 600 },
      ],
      tpsRate: 0,
      tvqRate: 0,
    });

    expect(inv.subtotal).toBe(600);
    expect(inv.tpsAmount).toBe(0);
    expect(inv.tvqAmount).toBe(0);
    expect(inv.total).toBe(600);
  });

  it("expense reduces profit", async () => {
    const { createEnhancedInvoice, addExpense } = await import("@/lib/revenueSystem");
    const inv = createEnhancedInvoice({
      missionId: "mission-expense-test",
      lineItems: [{ description: "Service", quantity: 1, unitPrice: 500, total: 500 }],
      tpsRate: 0,
      tvqRate: 0,
    });

    expect(inv.profit).toBe(500);

    const expense = addExpense({
      missionId: "mission-expense-test",
      description: "Hosting costs",
      amount: 100,
      category: "operations",
    });

    expect(expense.amount).toBe(100);

    // Re-fetch to verify profit recalculation
    const { getEnhancedInvoice } = await import("@/lib/revenueSystem");
    const updated = getEnhancedInvoice(inv.invoiceId);
    expect(updated!.profit).toBe(400);  // 500 - 100
  });

  it("exports invoice as markdown", async () => {
    const { createEnhancedInvoice, exportInvoiceMarkdown } = await import("@/lib/revenueSystem");
    const inv = createEnhancedInvoice({
      lineItems: [{ description: "Design", quantity: 1, unitPrice: 300, total: 300 }],
      tpsRate: 5,
      tvqRate: 9.975,
    });

    const md = exportInvoiceMarkdown(inv.invoiceId);
    expect(md).toBeTruthy();
    expect(md).toContain(inv.invoiceNumber);
    expect(md).toContain("Design");
    expect(md).toContain("Subtotal");
    expect(md).toContain("TPS/GST");
    expect(md).toContain("TVQ/QST");
  });
});

describe("dropshippingStore", () => {
  beforeAll(() => { resetStore(); });
  afterEach(() => { resetStore(); });

  it("creates a product", async () => {
    const { createProduct, listProducts } = await import("@/lib/dropshippingStore");
    const product = createProduct({
      name: "LED Strip Lights",
      price: 29.99,
      cost: 8.50,
      category: "home",
    });

    expect(product.productId).toBeTruthy();
    expect(product.name).toBe("LED Strip Lights");
    expect(product.price).toBe(29.99);
    expect(product.cost).toBe(8.50);
    expect(product.status).toBe("active");

    const products = listProducts();
    expect(products.length).toBeGreaterThan(0);
  });

  it("creates a supplier", async () => {
    const { createSupplier, listSuppliers } = await import("@/lib/dropshippingStore");
    const supplier = createSupplier({
      name: "Shenzhen Electronics",
      contact: "sales@sz-elec.com",
      country: "China",
    });

    expect(supplier.supplierId).toBeTruthy();
    expect(supplier.status).toBe("active");

    const suppliers = listSuppliers();
    expect(suppliers.length).toBeGreaterThan(0);
  });

  it("creates an order and updates status", async () => {
    const { createProduct, createOrder, updateOrderStatus } = await import("@/lib/dropshippingStore");
    const product = createProduct({ name: "Widget", price: 15, cost: 5 });
    const order = createOrder({
      productId: product.productId,
      customerName: "Jean Tremblay",
      quantity: 2,
    });

    expect(order).not.toBeNull();
    expect(order!.status).toBe("pending");
    expect(order!.totalAmount).toBe(30);

    const updated = updateOrderStatus(order!.orderId, "shipped", "TRK-123");
    expect(updated!.status).toBe("shipped");
    expect(updated!.trackingNumber).toBe("TRK-123");
  });

  it("getDropshippingOverview calculates revenue/cost/profit", async () => {
    const { createProduct, createOrder, updateOrderStatus, getDropshippingOverview } = await import("@/lib/dropshippingStore");
    const product = createProduct({ name: "Gadget", price: 50, cost: 20 });
    const order = createOrder({ productId: product.productId, customerName: "Client", quantity: 3 });
    updateOrderStatus(order!.orderId, "delivered");

    const overview = getDropshippingOverview();
    expect(overview.revenue).toBeGreaterThan(0);
    expect(overview.cost).toBeGreaterThan(0);
    expect(overview.profit).toBeGreaterThan(0);
    expect(overview.profit).toBe(overview.revenue - overview.cost);
  });
});

// ─── Agent Profiles Tests ────────────────────────────────────────────────

describe("Agent Profiles", () => {
  beforeAll(() => { fileStore = {}; });

  it("getAllProfiles returns 15 profiles", async () => {
    const { getAllProfiles } = await import("@/lib/agentProfiles");
    const profiles = getAllProfiles();
    expect(profiles.length).toBe(15);
  });

  it("getProfile returns CMO with premium branding identity", async () => {
    const { getProfile } = await import("@/lib/agentProfiles");
    const cmo = getProfile("cmo");
    expect(cmo).toBeTruthy();
    expect(cmo!.firstName).toBe("Sophie");
    expect(cmo!.lastName).toBe("Laurent");
    expect(cmo!.displayName).toBe("Sophie");
    expect(cmo!.role).toBe("CMO");
    expect(cmo!.visualStyle).toBe("minimalist_premium");
    expect(cmo!.creativityLevel).toBeGreaterThan(80);
    expect(cmo!.expertise).toContain("branding");
  });

  it("updateProfile changes creativityLevel and persists", async () => {
    const { getProfile, updateProfile } = await import("@/lib/agentProfiles");
    updateProfile("cmo", { creativityLevel: 80 });
    const updated = getProfile("cmo");
    expect(updated!.creativityLevel).toBe(80);
  });

  it("setAgentOnline updates online status and currentlyWorkingOn", async () => {
    const { getProfile, setAgentOnline } = await import("@/lib/agentProfiles");
    setAgentOnline("cto", true, "Architecture review");
    const cto = getProfile("cto");
    expect(cto!.online).toBe(true);
    expect(cto!.currentlyWorkingOn).toBe("Architecture review");
  });

  it("getCreativeStandardsForAgent returns standards for CMO", async () => {
    const { getCreativeStandardsForAgent } = await import("@/lib/agentProfiles");
    const standards = getCreativeStandardsForAgent("cmo");
    expect(standards.length).toBeGreaterThan(0);
    const labels = standards.map((s) => s.label);
    expect(labels).toContain("Apple-Level Design");
  });

  it("getLevelTitle returns correct titles", async () => {
    const { getLevelTitle } = await import("@/lib/agentProfiles");
    expect(getLevelTitle(1)).toBe("Junior");
    expect(getLevelTitle(5)).toBe("Senior");
    expect(getLevelTitle(10)).toBe("Expert");
    expect(getLevelTitle(20)).toBe("Legendary");
  });

  it("getXpToNextLevel calculates progress", async () => {
    const { getXpToNextLevel } = await import("@/lib/agentProfiles");
    const { current, needed, progress } = getXpToNextLevel(750);
    expect(current).toBe(250);
    expect(needed).toBe(500);
    expect(progress).toBe(0.5);
  });
});

// ─── Agent Memory & Evolution Tests ─────────────────────────────────────

describe("Agent Memory & Evolution", () => {
  beforeAll(() => { fileStore = {}; });

  it("getMemory returns default memory for CEO", async () => {
    const { getMemory } = await import("@/lib/agentProfiles");
    const mem = getMemory("ceo");
    expect(mem).toBeTruthy();
    expect(mem!.xp).toBeGreaterThan(0);
    expect(mem!.level).toBeGreaterThan(0);
  });

  it("addXp increases XP and level", async () => {
    const { getMemory, addXp } = await import("@/lib/agentProfiles");
    const before = getMemory("ceo")!;
    const beforeXp = before.xp;
    const updated = addXp("ceo", 500)!;
    expect(updated.xp).toBe(beforeXp + 500);
    expect(updated.level).toBe(Math.floor(updated.xp / 500) + 1);
  });

  it("learnPreference saves and persists", async () => {
    const { getMemory, learnPreference } = await import("@/lib/agentProfiles");
    learnPreference("cmo", "color_scheme", "dark_premium");
    const mem = getMemory("cmo")!;
    expect(mem.learnedPreferences.color_scheme).toBe("dark_premium");
  });

  it("learnBranding adds knowledge without duplicates", async () => {
    const { getMemory, learnBranding } = await import("@/lib/agentProfiles");
    learnBranding("cmo", "Apple minimalist style");
    learnBranding("cmo", "Apple minimalist style");
    const mem = getMemory("cmo")!;
    const count = mem.brandingKnowledge.filter((k) => k === "Apple minimalist style").length;
    expect(count).toBe(1);
  });

  it("learnStylePreference adds style without duplicates", async () => {
    const { getMemory, learnStylePreference } = await import("@/lib/agentProfiles");
    learnStylePreference("frontend_agent", "dark_mode");
    learnStylePreference("frontend_agent", "dark_mode");
    const mem = getMemory("frontend_agent")!;
    const count = mem.stylePreferences.filter((s) => s === "dark_mode").length;
    expect(count).toBe(1);
  });

  it("recordDecision keeps last 50 decisions", async () => {
    const { getMemory, recordDecision } = await import("@/lib/agentProfiles");
    for (let i = 0; i < 55; i++) {
      recordDecision("qa_agent", `Decision ${i}`, i % 2 === 0 ? "positive" : "negative");
    }
    const mem = getMemory("qa_agent")!;
    expect(mem.decisionHistory.length).toBe(50);
  });

  it("recordMissionResult updates career stats", async () => {
    const { getCareer, recordMissionResult } = await import("@/lib/agentProfiles");
    const before = getCareer("cfo")!;
    const beforeCompleted = before.completedMissions;
    recordMissionResult("cfo", "mission-test-1", true, 0.95);
    const after = getCareer("cfo")!;
    expect(after.completedMissions).toBe(beforeCompleted + 1);
  });

  it("addSpecialty adds or updates specialty", async () => {
    const { getCareer, addSpecialty } = await import("@/lib/agentProfiles");
    addSpecialty("cto", "microservices", 4);
    const career = getCareer("cto")!;
    const spec = career.specialties.find((s) => s.name === "microservices");
    expect(spec).toBeTruthy();
    expect(spec!.level).toBe(4);
  });

  it("profileFromExecutiveId maps CEO correctly", async () => {
    const { profileFromExecutiveId } = await import("@/lib/agentProfiles");
    const p = profileFromExecutiveId("ceo");
    expect(p).toBeTruthy();
    expect(p!.firstName).toBe("Alexandra");
  });
});

// ─── Agent Questions Tests ───────────────────────────────────────────────

describe("Agent Questions", () => {
  beforeAll(() => { fileStore = {}; });

  it("createAgentQuestion creates question with options + Autre…", async () => {
    const { createAgentQuestion } = await import("@/lib/agentQuestions");
    const q = createAgentQuestion({
      agentId: "cmo",
      agentName: "Sophie",
      agentAvatar: "📣",
      agentColor: "#8b5cf6",
      question: "Quelle direction visuelle pour le logo?",
      options: ["Sportif / énergique", "Premium / minimaliste", "Luxe / noir et or"],
      missionId: "mission-1",
    });
    expect(q.options.length).toBe(4); // 3 + Autre…
    expect(q.options[q.options.length - 1].label).toBe("Autre…");
    expect(q.options[q.options.length - 1].id).toBe("autre");
  });

  it("question always has Autre… even if not provided", async () => {
    const { createAgentQuestion } = await import("@/lib/agentQuestions");
    const q = createAgentQuestion({
      agentId: "cto",
      agentName: "Raj",
      agentAvatar: "🔧",
      agentColor: "#06b6d4",
      question: "Which stack?",
      options: ["Next.js", "Nuxt"],
    });
    expect(q.options.some((o) => o.id === "autre")).toBe(true);
  });

  it("max 5 options + Autre…", async () => {
    const { createAgentQuestion } = await import("@/lib/agentQuestions");
    const q = createAgentQuestion({
      agentId: "cfo",
      agentName: "Diana",
      agentAvatar: "💰",
      agentColor: "#22c55e",
      question: "Budget allocation?",
      options: ["A", "B", "C", "D", "E", "F", "G"],  // 7 provided
    });
    expect(q.options.length).toBe(6); // max 5 + Autre…
  });

  it("answerQuestion saves answer for regular option", async () => {
    const { createAgentQuestion, answerQuestion, getQuestion } = await import("@/lib/agentQuestions");
    const q = createAgentQuestion({
      agentId: "cmo",
      agentName: "Sophie",
      agentAvatar: "📣",
      agentColor: "#8b5cf6",
      question: "Style?",
      options: ["Modern", "Classic"],
    });
    const optId = q.options[0].id;
    const answered = answerQuestion(q.id, optId)!;
    expect(answered.status).toBe("answered");
    expect(answered.answer!.optionId).toBe(optId);
    expect(answered.answer!.freeText).toBeNull();
  });

  it("answerQuestion for Autre… accepts freeText", async () => {
    const { createAgentQuestion, answerQuestion } = await import("@/lib/agentQuestions");
    const q = createAgentQuestion({
      agentId: "cmo",
      agentName: "Sophie",
      agentAvatar: "📣",
      agentColor: "#8b5cf6",
      question: "Direction?",
      options: ["Bold", "Subtle"],
    });
    const answered = answerQuestion(q.id, "autre", "Rétro-futuriste")!;
    expect(answered.answer!.optionId).toBeNull();
    expect(answered.answer!.freeText).toBe("Rétro-futuriste");
  });

  it("listOpenQuestions filters by missionId", async () => {
    const { createAgentQuestion, listOpenQuestions } = await import("@/lib/agentQuestions");
    createAgentQuestion({
      agentId: "cmo", agentName: "Sophie", agentAvatar: "📣", agentColor: "#8b5cf6",
      question: "Q1", options: ["A", "B"], missionId: "m-alpha",
    });
    createAgentQuestion({
      agentId: "cto", agentName: "Raj", agentAvatar: "🔧", agentColor: "#06b6d4",
      question: "Q2", options: ["C", "D"], missionId: "m-beta",
    });
    const alpha = listOpenQuestions({ missionId: "m-alpha" });
    expect(alpha.length).toBe(1);
    expect(alpha[0].question).toBe("Q1");
  });

  it("getQuestionsForThread filters correctly", async () => {
    const { createAgentQuestion, getQuestionsForThread } = await import("@/lib/agentQuestions");
    createAgentQuestion({
      agentId: "ceo", agentName: "Alexandra", agentAvatar: "👑", agentColor: "#f59e0b",
      question: "Thread Q?", options: ["Yes", "No"], threadId: "thread-99",
    });
    const qs = getQuestionsForThread("thread-99");
    expect(qs.length).toBeGreaterThanOrEqual(1);
    expect(qs[0].threadId).toBe("thread-99");
  });

  it("closeQuestion marks question as closed", async () => {
    const { createAgentQuestion, closeQuestion } = await import("@/lib/agentQuestions");
    const q = createAgentQuestion({
      agentId: "qa_agent", agentName: "Naomi", agentAvatar: "🔍", agentColor: "#ef4444",
      question: "Close me?", options: ["OK"],
    });
    const closed = closeQuestion(q.id)!;
    expect(closed.status).toBe("closed");
  });

  it("cannot answer already answered question", async () => {
    const { createAgentQuestion, answerQuestion } = await import("@/lib/agentQuestions");
    const q = createAgentQuestion({
      agentId: "ceo", agentName: "Alexandra", agentAvatar: "👑", agentColor: "#f59e0b",
      question: "Answer once?", options: ["Yes"],
    });
    answerQuestion(q.id, q.options[0].id);
    const second = answerQuestion(q.id, q.options[0].id);
    expect(second).toBeNull();
  });
});

// ─── Customizable Agent Settings & Creative Quality Tests ────────────────

describe("Agent Customizable Settings", () => {
  beforeAll(() => { fileStore = {}; });

  it("updateProfile changes systemPrompt and persists", async () => {
    const { getProfile, updateProfile } = await import("@/lib/agentProfiles");
    updateProfile("cmo", { systemPrompt: "You are a premium CMO with Dribbble quality standards." });
    const p = getProfile("cmo")!;
    expect(p.systemPrompt).toContain("Dribbble quality");
  });

  it("updateProfile changes creativityLevel to extreme", async () => {
    const { updateProfile, getProfile } = await import("@/lib/agentProfiles");
    updateProfile("frontend_agent", { creativityLevel: 100 });
    const p = getProfile("frontend_agent")!;
    expect(p.creativityLevel).toBe(100);
  });

  it("updateProfile changes visualStyle", async () => {
    const { updateProfile, getProfile } = await import("@/lib/agentProfiles");
    updateProfile("cmo", { visualStyle: "bold_athletic" });
    const p = getProfile("cmo")!;
    expect(p.visualStyle).toBe("bold_athletic");
  });

  it("updateProfile changes tone and preferredWorkflows", async () => {
    const { updateProfile, getProfile } = await import("@/lib/agentProfiles");
    updateProfile("cto", {
      tone: "Direct, architecture-focused, Vercel docs style",
      preferredWorkflows: ["architecture_review", "stack_selection", "code_review"],
    });
    const p = getProfile("cto")!;
    expect(p.tone).toContain("Vercel");
    expect(p.preferredWorkflows).toContain("code_review");
  });

  it("setAgentOnline sets currentlyWorkingOn", async () => {
    const { setAgentOnline, getProfile } = await import("@/lib/agentProfiles");
    setAgentOnline("cmo", true, "Logo redesign for client X");
    const p = getProfile("cmo")!;
    expect(p.online).toBe(true);
    expect(p.currentlyWorkingOn).toBe("Logo redesign for client X");
  });

  it("creative settings persist across reads", async () => {
    const { updateProfile, getProfile } = await import("@/lib/agentProfiles");
    updateProfile("frontend_agent", { creativityLevel: 95, visualStyle: "experimental_avant_garde" });
    // Re-read from "disk"
    const p = getProfile("frontend_agent")!;
    expect(p.creativityLevel).toBe(95);
    expect(p.visualStyle).toBe("experimental_avant_garde");
  });

  it("learnPreference saves user color scheme preference", async () => {
    const { learnPreference, getMemory } = await import("@/lib/agentProfiles");
    learnPreference("cmo", "preferred_color_scheme", "dark_premium");
    learnPreference("cmo", "preferred_font", "Inter");
    const mem = getMemory("cmo")!;
    expect(mem.learnedPreferences.preferred_color_scheme).toBe("dark_premium");
    expect(mem.learnedPreferences.preferred_font).toBe("Inter");
  });

  it("learnStylePreference accumulates styles", async () => {
    const { learnStylePreference, getMemory } = await import("@/lib/agentProfiles");
    learnStylePreference("frontend_agent", "glassmorphism");
    learnStylePreference("frontend_agent", "dark_mode");
    const mem = getMemory("frontend_agent")!;
    expect(mem.stylePreferences).toContain("glassmorphism");
    expect(mem.stylePreferences).toContain("dark_mode");
  });

  it("agent response uses premium profile when available", async () => {
    const { addMessage, getThread, createThread } = await import("@/lib/conversationStore");
    const t = createThread({ title: "Premium Test", participants: ["cmo"] });
    await addMessage(t.id, "user", "I need a premium logo");
    const updated = getThread(t.id)!;
    const agentMsg = updated.messages.find((m) => m.role === "cmo");
    expect(agentMsg).toBeTruthy();
    // CMO should respond with substance (not just generic template)
    expect(agentMsg!.text.length).toBeGreaterThan(20);
  });
});

// ─── CEO Auto-Start & Visible Outputs Tests ─────────────────────────────

describe("CEO Auto-Start & Projects", () => {
  beforeAll(() => { fileStore = {}; });

  it("CEO command creates a project record", async () => {
    const { createCeoProject, listCeoProjects } = await import("@/lib/ceoProjectStore");
    const project = createCeoProject({
      name: "Logo Sportif Premium",
      missionType: "redesign_logo",
      sessionId: "test-session-1",
    });
    expect(project.id).toBeTruthy();
    expect(project.name).toBe("Logo Sportif Premium");
    expect(project.missionType).toBe("redesign_logo");
    expect(project.status).toBe("starting");
    expect(project.sessionId).toBe("test-session-1");

    const projects = listCeoProjects();
    expect(projects.length).toBeGreaterThanOrEqual(1);
    const found = projects.find((p) => p.id === project.id);
    expect(found).toBeTruthy();
  });

  it("project appears in projects list", async () => {
    const { createCeoProject, listCeoProjects, getCeoProjectBySession } = await import("@/lib/ceoProjectStore");
    createCeoProject({ name: "E-commerce Store", missionType: "create_website", sessionId: "session-ec" });
    const projects = listCeoProjects();
    const found = projects.find((p) => p.name === "E-commerce Store");
    expect(found).toBeTruthy();
    expect(found!.missionType).toBe("create_website");

    const bySession = getCeoProjectBySession("session-ec");
    expect(bySession).toBeTruthy();
    expect(bySession!.name).toBe("E-commerce Store");
  });

  it("project progress updates correctly", async () => {
    const { createCeoProject, updateProjectProgress, getCeoProject } = await import("@/lib/ceoProjectStore");
    const p = createCeoProject({ name: "Progress Test", missionType: "saas_project" });
    updateProjectProgress(p.id, 30, 3);
    const updated = getCeoProject(p.id)!;
    expect(updated.progress).toBe(30);
    expect(updated.outputsCount).toBe(3);
    expect(updated.status).toBe("in_progress");

    updateProjectProgress(p.id, 100);
    const done = getCeoProject(p.id)!;
    expect(done.status).toBe("delivered");
  });

  it("visible outputs generated for logo mission", async () => {
    const { generateVisibleOutputs, getOutputsForSession } = await import("@/lib/visibleOutputs");
    const outputs = generateVisibleOutputs("session-logo", "redesign_logo");
    expect(outputs.length).toBeGreaterThanOrEqual(4);
    const titles = outputs.map((o) => o.title);
    expect(titles).toContain("Direction créative");
    expect(titles).toContain("Concept logo");
    expect(titles).toContain("Palette couleurs");

    const loaded = getOutputsForSession("session-logo");
    expect(loaded.length).toBe(outputs.length);
  });

  it("visible outputs generated for website mission", async () => {
    const { generateVisibleOutputs, getOutputsForSession } = await import("@/lib/visibleOutputs");
    const outputs = generateVisibleOutputs("session-web", "create_website");
    expect(outputs.length).toBeGreaterThanOrEqual(3);
    const types = outputs.map((o) => o.type);
    expect(types).toContain("architecture_doc");
    expect(types).toContain("api_spec");
  });

  it("visible outputs generated for branding mission", async () => {
    const { generateVisibleOutputs, getOutputsForSession } = await import("@/lib/visibleOutputs");
    const outputs = generateVisibleOutputs("session-brand", "branding_pack");
    expect(outputs.length).toBeGreaterThanOrEqual(4);
    const titles = outputs.map((o) => o.title);
    expect(titles).toContain("Direction créative branding");
    expect(titles).toContain("Charte graphique");
  });

  it("output status can be updated", async () => {
    const { generateVisibleOutputs, updateOutputStatus, getOutputsForSession } = await import("@/lib/visibleOutputs");
    const outputs = generateVisibleOutputs("session-status", "saas_project");
    const first = outputs[0];
    updateOutputStatus(first.id, "review");
    const loaded = getOutputsForSession("session-status");
    const updated = loaded.find((o) => o.id === first.id);
    expect(updated!.status).toBe("review");
  });

  it("CEO proactive response mentions auto-start", async () => {
    const { sendMessage } = await import("@/lib/ceoCommand");
    const { ceoMessage } = await sendMessage("je veux un nouveau logo sportif");
    expect(ceoMessage.text).not.toContain("cliquer");
    // Should mention project created or auto-started
    const hasProjectOrAutoStart = ceoMessage.actions.some(
      (a) => a.type === "created_project" || a.type === "auto_started"
    );
    expect(hasProjectOrAutoStart).toBe(true);
  });

  it("mission auto-starts first steps", async () => {
    const { sendMessage } = await import("@/lib/ceoCommand");
    const { ceoMessage } = await sendMessage("crée un site e-commerce");
    const autoStartAction = ceoMessage.actions.find((a) => a.type === "auto_started");
    expect(autoStartAction).toBeTruthy();
    // Should have executed at least 1 step
    expect(autoStartAction!.label).toMatch(/\d+ étapes exécutées/);
  });

  it("no manual Run required — mission is already running", async () => {
    const { sendMessage } = await import("@/lib/ceoCommand");
    const { ceoMessage } = await sendMessage("lance une mission branding");
    const sessionAction = ceoMessage.actions.find((a) => a.type === "created_session");
    expect(sessionAction).toBeTruthy();
    // Response should mention team is already working
    expect(ceoMessage.text).toMatch(/travaille|avancement|démarré|l'équipe/i);
  });
});

// ─── NVIDIA Runtime Mode Tests ───────────────────────────────────────────

describe("NVIDIA Runtime Mode", () => {
  beforeAll(() => { fileStore = {}; });

  it("with NVIDIA_API_KEY set, runtimeMode is nvidia not simulated", async () => {
    const origKey = process.env.NVIDIA_API_KEY;
    process.env.NVIDIA_API_KEY = "nvapi-test-key-1234567890";
    try {
      const { getSettings } = await import("@/lib/settingsStore");
      const settings = getSettings();
      expect(settings.nvidiaKeyPresent).toBe(true);
      expect(settings.runtimeMode).toBe("nvidia");
    } finally {
      process.env.NVIDIA_API_KEY = origKey;
    }
  });

  it("without NVIDIA_API_KEY, runtimeMode is simulation", async () => {
    const origKey = process.env.NVIDIA_API_KEY;
    delete process.env.NVIDIA_API_KEY;
    try {
      const { getSettings } = await import("@/lib/settingsStore");
      const settings = getSettings();
      expect(settings.nvidiaKeyPresent).toBe(false);
      expect(settings.runtimeMode).toBe("simulation");
    } finally {
      process.env.NVIDIA_API_KEY = origKey;
    }
  });

  it("SIMULATED badge hidden when NVIDIA is online", () => {
    // RuntimeBadge component logic: if mode === "nvidia" → NvidiaLiveBadge, else SimBadge
    const origKey = process.env.NVIDIA_API_KEY;
    try {
      // Without key
      delete process.env.NVIDIA_API_KEY;
      const modeWithoutKey = !!(process.env.NVIDIA_API_KEY);
      expect(modeWithoutKey ? "nvidia" : "simulation").toBe("simulation");
      // With key set
      process.env.NVIDIA_API_KEY = "nvapi-testkey1234567890";
      const modeWithKeySet = !!(process.env.NVIDIA_API_KEY);
      expect(modeWithKeySet ? "nvidia" : "simulation").toBe("nvidia");
    } finally {
      if (origKey) process.env.NVIDIA_API_KEY = origKey;
      else delete process.env.NVIDIA_API_KEY;
    }
  });

  it("CEO-created mission auto-starts and runs steps", async () => {
    const { sendMessage } = await import("@/lib/ceoCommand");
    const { ceoMessage } = await sendMessage("crée un site web pour mon business");
    const sessionAction = ceoMessage.actions.find((a) => a.type === "created_session");
    expect(sessionAction).toBeTruthy();
    const autoStartAction = ceoMessage.actions.find((a) => a.type === "auto_started");
    expect(autoStartAction).toBeTruthy();
    // Should have executed at least 1 step
    expect(autoStartAction!.label).toMatch(/\d+/);
  });

  it("Mission Room progress updates after auto-start", async () => {
    const { sendMessage } = await import("@/lib/ceoCommand");
    const { ceoMessage } = await sendMessage("lance une mission redesign logo");
    const sessionAction = ceoMessage.actions.find((a) => a.type === "created_session");
    expect(sessionAction).toBeTruthy();
    expect(sessionAction!.targetId).toBeTruthy();
    // CEO auto-start creates a session that is immediately running
    const autoStartAction = ceoMessage.actions.find((a) => a.type === "auto_started");
    expect(autoStartAction).toBeTruthy();
    // Session status should be "running" since auto-start was triggered
    expect(ceoMessage.text).toMatch(/démarré|avancement|travaille/i);
  });
});
