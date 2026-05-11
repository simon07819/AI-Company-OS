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
    const { ceoMessage } = sendMessage("Bonjour!");

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
    const { ceoMessage } = sendMessage("Lancer une mission pour moi");

    expect(ceoMessage.intent).toBe("launch_mission");
    expect(ceoMessage.actions).toBeDefined();
    expect(ceoMessage.actions!.some((a) => a.type === "created_session")).toBe(true);
  });

  it("detects create_flyer intent and creates session", async () => {
    const { sendMessage } = await import("@/lib/ceoCommand");
    const { ceoMessage } = sendMessage("Créer un flyer pour mon entreprise");

    expect(ceoMessage.intent).toBe("create_flyer");
    expect(ceoMessage.actions!.some((a) => a.type === "created_session")).toBe(true);
  });

  it("detects create_invoice intent", async () => {
    const { sendMessage } = await import("@/lib/ceoCommand");
    const { ceoMessage } = sendMessage("Créer une facture pour le client");

    expect(ceoMessage.intent).toBe("create_invoice");
    expect(ceoMessage.actions!.some((a) => a.type === "created_invoice")).toBe(true);
  });

  it("detects create_dropshipping_business intent", async () => {
    const { sendMessage } = await import("@/lib/ceoCommand");
    const { ceoMessage } = sendMessage("Créer une entreprise dropshipping");

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
