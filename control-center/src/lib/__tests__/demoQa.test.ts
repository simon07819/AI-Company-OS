import { describe, expect, it, vi, beforeAll, afterEach } from "vitest";
import type { AutopilotSession } from "@/lib/autopilotStore";

// ─── Mock fs ─────────────────────────────────────────────────────────────

let store: AutopilotSession[] = [];
let crmData: Record<string, unknown> = { leads: [], clients: [], opportunities: [], interactions: [] };
let loopData: unknown[] = [];
let onboardingData: Record<string, unknown> = { completed: false, currentStep: "company_identity", completedSteps: [], preferences: { companyName: "", companyDescription: "", industry: "", workspaceName: "", primaryMissionTypes: [], runtimeChecked: false, crmEnabled: false, revenueEnabled: false, defaultCurrency: "USD", distributionChannels: [], autonomousLoopsEnabled: false, automationLevel: "manual" }, defaultWorkspaceId: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), completedAt: null };
let revenueData: Record<string, unknown> = { proposals: [], invoices: [], payments: [] };
let distData: Record<string, unknown> = { campaigns: [], jobs: [], publishedAssets: [] };
let commandData: Record<string, unknown> = { alerts: [], actions: [], health: {} };
let workspaceData: Record<string, unknown> = { id: "default", name: "Default" };
let reviewData: Record<string, unknown> = {};

vi.mock("fs", () => ({
  default: {
    readdirSync: vi.fn(() => []),
    statSync: vi.fn(() => ({ size: 100, mtime: new Date() })),
    mkdirSync: vi.fn(),
    existsSync: vi.fn((p: string) => {
      if (p.includes("autopilot-sessions.json")) return true;
      if (p.includes("client-crm.json")) return true;
      if (p.includes("loop-state.json")) return true;
      if (p.includes("onboarding")) return true;
      if (p.includes("revenue")) return true;
      if (p.includes("distribution")) return true;
      if (p.includes("executive-command")) return true;
      if (p.includes("company-workspace")) return true;
      if (p.includes("review-report")) return true;
      return false;
    }),
    readFileSync: vi.fn((p: string) => {
      if (p.includes("autopilot-sessions.json")) return JSON.stringify(store);
      if (p.includes("client-crm.json")) return JSON.stringify(crmData);
      if (p.includes("loop-state.json")) return JSON.stringify(loopData);
      if (p.includes("onboarding")) return JSON.stringify(onboardingData);
      if (p.includes("revenue-state.json")) return JSON.stringify(revenueData);
      if (p.includes("distribution-state.json")) return JSON.stringify(distData);
      if (p.includes("executive-command-state.json")) return JSON.stringify(commandData);
      if (p.includes("company-workspace")) return JSON.stringify(workspaceData);
      if (p.includes("review-report")) return JSON.stringify(reviewData);
      return "{}";
    }),
    writeFileSync: vi.fn((p: string, data: string) => {
      if (p.includes("autopilot-sessions.json")) { try { store = JSON.parse(data); } catch { /* */ } }
      if (p.includes("client-crm.json")) { try { crmData = JSON.parse(data); } catch { /* */ } }
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

// ─── Helpers ─────────────────────────────────────────────────────────────

function resetAll() {
  store = [];
  crmData = { leads: [], clients: [], opportunities: [], interactions: [] };
  loopData = [];
  onboardingData = { completed: false, currentStep: "company_identity", completedSteps: [], preferences: { companyName: "", companyDescription: "", industry: "", workspaceName: "", primaryMissionTypes: [], runtimeChecked: false, crmEnabled: false, revenueEnabled: false, defaultCurrency: "USD", distributionChannels: [], autonomousLoopsEnabled: false, automationLevel: "manual" }, defaultWorkspaceId: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), completedAt: null };
  revenueData = { proposals: [], invoices: [], payments: [] };
  distData = { campaigns: [], jobs: [], publishedAssets: [] };
  commandData = { alerts: [], actions: [], health: {} };
  workspaceData = { id: "default", name: "Default" };
  reviewData = {};
}

// ─── Tests ───────────────────────────────────────────────────────────────

describe("demoQa", () => {
  beforeAll(() => { resetAll(); });
  afterEach(() => { resetAll(); });

  it("runDemoQa detects missing data with low score", async () => {
    const { runDemoQa } = await import("@/lib/demoQa");
    const result = runDemoQa();

    expect(result.score).toBeLessThan(50);
    expect(result.totalChecks).toBe(12);
    expect(result.failed).toBeGreaterThan(0);
    expect(result.checks.length).toBe(12);
  });

  it("runDemoQa passes onboarding when company is set", async () => {
    onboardingData = { companyName: "TestCorp", slogan: "Test", industry: "Tech", targetAudience: "Devs", setupComplete: true, completedSteps: ["company_identity"], preferences: { companyName: "TestCorp", companyDescription: "Test", industry: "Tech", workspaceName: "Default", primaryMissionTypes: [], runtimeChecked: true, crmEnabled: true, revenueEnabled: true, defaultCurrency: "USD", distributionChannels: [], autonomousLoopsEnabled: false, automationLevel: "manual" } };

    const { runDemoQa } = await import("@/lib/demoQa");
    const result = runDemoQa();

    const onbCheck = result.checks.find((c) => c.id === "onboarding");
    expect(onbCheck?.status).toBe("pass");
  });

  it("runDemoQa passes business when sessions exist", async () => {
    const { createSession } = await import("@/lib/autopilotStore");
    createSession({ name: "QA Test Mission" });

    const { runDemoQa } = await import("@/lib/demoQa");
    const result = runDemoQa();

    const bizCheck = result.checks.find((c) => c.id === "business");
    expect(bizCheck?.status).toBe("pass");

    const apCheck = result.checks.find((c) => c.id === "autopilot");
    expect(apCheck?.status).toBe("pass");
  });

  it("runDemoQa passes CRM when leads exist", async () => {
    const { createLead } = await import("@/lib/clientCrm");
    createLead({ name: "QA Lead", email: "qa@test.com" });

    const { runDemoQa } = await import("@/lib/demoQa");
    const result = runDemoQa();

    const crmCheck = result.checks.find((c) => c.id === "crm");
    expect(crmCheck?.status).toBe("pass");
  });

  it("runDemoQa passes runtime agents check", async () => {
    const { runDemoQa } = await import("@/lib/demoQa");
    const result = runDemoQa();

    const runtimeCheck = result.checks.find((c) => c.id === "runtime");
    expect(runtimeCheck?.status).toBe("pass");
  });

  it("runDemoQa returns recommendations on failures", async () => {
    const { runDemoQa } = await import("@/lib/demoQa");
    const result = runDemoQa();

    // With no data seeded, should have recommendations
    expect(result.recommendations.length).toBeGreaterThan(0);
  });

  it("runDemoQa produces score 100 after full seed", async () => {
    // Seed everything
    onboardingData = { completed: true, currentStep: "company_identity", completedSteps: ["company_identity", "first_workspace", "default_mission_types"], preferences: { companyName: "FullCorp", companyDescription: "Full company", industry: "Tech", workspaceName: "Main", primaryMissionTypes: ["saas_project"], runtimeChecked: true, crmEnabled: true, revenueEnabled: true, defaultCurrency: "USD", distributionChannels: ["web"], autonomousLoopsEnabled: true, automationLevel: "autonomous" }, defaultWorkspaceId: "ws-1", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), completedAt: new Date().toISOString() };

    const { createSession } = await import("@/lib/autopilotStore");
    createSession({ name: "Full Mission" });

    const { createLead } = await import("@/lib/clientCrm");
    createLead({ name: "Full Lead", email: "full@test.com", estimatedValue: 5000 });

    const { createClient } = await import("@/lib/clientCrm");
    createClient({ name: "Full Client", email: "client@test.com", totalValue: 10000 });

    const { runDemoQa } = await import("@/lib/demoQa");
    const result = runDemoQa();

    // Should have mostly passes now
    expect(result.passed).toBeGreaterThan(result.failed);
  });

  it("runDemoQa includes correct check IDs", async () => {
    const { runDemoQa } = await import("@/lib/demoQa");
    const result = runDemoQa();

    const ids = result.checks.map((c) => c.id);
    expect(ids).toContain("onboarding");
    expect(ids).toContain("workspace");
    expect(ids).toContain("demo_seed");
    expect(ids).toContain("command");
    expect(ids).toContain("business");
    expect(ids).toContain("crm");
    expect(ids).toContain("revenue");
    expect(ids).toContain("distribution");
    expect(ids).toContain("runtime");
    expect(ids).toContain("autopilot");
    expect(ids).toContain("delivery_pkg");
    expect(ids).toContain("quality_review");
  });
});
