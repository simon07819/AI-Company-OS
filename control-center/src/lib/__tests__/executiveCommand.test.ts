import { beforeEach, describe, expect, it, vi } from "vitest";

let agents: Array<{ agentId: string; status: string; progress: number; currentMissionId: string | null; currentTaskId: string | null; lastActivity: string; retryCount: number; startedAt: string | null; estimatedCompletion: string | null }> = [];
let sessions: Array<{ sessionId: string; status: string; businessStatus: string; projectName: string; missionType: string; progress: number; createdAt: string; updatedAt: string }> = [];
let queue: Array<{ taskId: string }> = [];
let loops: Array<{ sessionId: string; loop: { status: string } }> = [];
let crmOverview = { totalLeads: 0, activeLeads: 0, totalClients: 0, activeClients: 0, openOpportunities: 0, pipelineValue: 0 };
let revenueOverview = { monthlyRevenue: 0, pipelineValue: 0, outstandingInvoices: 0, outstandingInvoiceValue: 0, proposalConversionRate: 0 };
let distributionOverview = { publishedAssets: 0, activeCampaigns: 0, failedJobs: 0, distributionSuccessRate: 0 };
let workspaceOverview = { totalWorkspaces: 1, activeWorkspaces: 1, totalRevenue: 0, activeMissions: 0, activeCampaigns: 0, publishedAssets: 0, crmClients: 0, crmLeads: 0, workspaces: [] as unknown[] };
let businessOverview = { totalMissions: 0, activeMissions: 0, clientReadyMissions: 0, deliveredMissions: 0, deliveryPackagesGenerated: 0 };
let businessActions: Array<{ sessionId: string; action: string; priority: "high" | "medium" | "low"; label: string; description: string }> = [];

vi.mock("@/lib/agentRuntime", () => ({
  getAllAgentStates: vi.fn(() => agents),
}));

vi.mock("@/lib/autopilotStore", () => ({
  listSessions: vi.fn(() => sessions),
}));

vi.mock("@/lib/runtimeQueue", () => ({
  listQueue: vi.fn(() => queue),
}));

vi.mock("@/lib/loopScheduler", () => ({
  listLoopStates: vi.fn(() => loops),
}));

vi.mock("@/lib/clientCrm", () => ({
  getCrmOverview: vi.fn(() => crmOverview),
}));

vi.mock("@/lib/revenueSystem", () => ({
  getRevenueOverview: vi.fn(() => revenueOverview),
}));

vi.mock("@/lib/distributionEngine", () => ({
  getDistributionOverview: vi.fn(() => distributionOverview),
}));

vi.mock("@/lib/companyWorkspace", () => ({
  getWorkspaceOverview: vi.fn(() => workspaceOverview),
}));

vi.mock("@/lib/businessOps", () => ({
  getBusinessOverview: vi.fn(() => businessOverview),
  getBusinessPipeline: vi.fn(() => sessions.map((session) => ({
    sessionId: session.sessionId,
    projectName: session.projectName,
    missionType: session.missionType,
    missionLabel: session.missionType,
    businessStatus: session.businessStatus,
    progress: session.progress,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
  }))),
  getRecommendedActions: vi.fn(() => businessActions),
}));

describe("executiveCommand", () => {
  beforeEach(() => {
    agents = [
      { agentId: "product_agent", status: "idle", progress: 0, currentMissionId: null, currentTaskId: null, lastActivity: new Date().toISOString(), retryCount: 0, startedAt: null, estimatedCompletion: null },
      { agentId: "qa_agent", status: "executing", progress: 40, currentMissionId: "ap-1", currentTaskId: "AP-1", lastActivity: new Date().toISOString(), retryCount: 0, startedAt: null, estimatedCompletion: null },
    ];
    sessions = [
      { sessionId: "ap-1", status: "running", businessStatus: "review", projectName: "Launch", missionType: "website", progress: 75, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    ];
    queue = [];
    loops = [{ sessionId: "ap-1", loop: { status: "active" } }];
    crmOverview = { totalLeads: 2, activeLeads: 1, totalClients: 1, activeClients: 1, openOpportunities: 1, pipelineValue: 3000 };
    revenueOverview = { monthlyRevenue: 5000, pipelineValue: 8000, outstandingInvoices: 0, outstandingInvoiceValue: 0, proposalConversionRate: 50 };
    distributionOverview = { publishedAssets: 3, activeCampaigns: 1, failedJobs: 0, distributionSuccessRate: 100 };
    workspaceOverview = {
      totalWorkspaces: 1,
      activeWorkspaces: 1,
      totalRevenue: 5000,
      activeMissions: 1,
      activeCampaigns: 1,
      publishedAssets: 3,
      crmClients: 1,
      crmLeads: 1,
      workspaces: [{ id: "workspace-default", name: "AI Company OS", metrics: { revenue: 5000, activeMissions: 1, activeCampaigns: 1 } }],
    };
    businessOverview = { totalMissions: 1, activeMissions: 1, clientReadyMissions: 0, deliveredMissions: 0, deliveryPackagesGenerated: 1 };
    businessActions = [];
  });

  it("overview aggregates modules", async () => {
    const { getExecutiveCommandOverview } = await import("@/lib/executiveCommand");

    const overview = getExecutiveCommandOverview();

    expect(overview.workspaces.total).toBe(1);
    expect(overview.missions.total).toBe(1);
    expect(overview.runtime.totalAgents).toBe(2);
    expect(overview.revenue.monthlyRevenue).toBe(5000);
    expect(overview.crm.activeLeads).toBe(1);
    expect(overview.distribution.publishedAssets).toBe(3);
    expect(overview.loops.active).toBe(1);
    expect(overview.deliveryPackages.generated).toBe(1);
  });

  it("health score drops when critical issues exist", async () => {
    agents[0] = { ...agents[0], status: "failed" };
    revenueOverview = { ...revenueOverview, outstandingInvoices: 2, outstandingInvoiceValue: 10000 };
    distributionOverview = { ...distributionOverview, failedJobs: 2, distributionSuccessRate: 50 };
    const { calculateCompanyHealthScore } = await import("@/lib/executiveCommand");

    const score = calculateCompanyHealthScore();

    expect(score).toBeLessThan(85);
  });

  it("alerts detect runtime, revenue and distribution problems", async () => {
    agents[0] = { ...agents[0], status: "failed" };
    revenueOverview = { ...revenueOverview, outstandingInvoices: 1, outstandingInvoiceValue: 7000 };
    distributionOverview = { ...distributionOverview, failedJobs: 1 };
    const { getExecutiveAlerts } = await import("@/lib/executiveCommand");

    const alerts = getExecutiveAlerts();

    expect(alerts.some((alert) => alert.source === "runtime")).toBe(true);
    expect(alerts.some((alert) => alert.source === "revenue")).toBe(true);
    expect(alerts.some((alert) => alert.source === "distribution")).toBe(true);
  });

  it("recommends CEO actions", async () => {
    revenueOverview = { ...revenueOverview, outstandingInvoices: 1, outstandingInvoiceValue: 2500 };
    crmOverview = { ...crmOverview, activeLeads: 4 };
    businessActions = [{ sessionId: "ap-1", action: "review", priority: "high", label: "Review mission", description: "Approve deliverables" }];
    const { getExecutiveActions } = await import("@/lib/executiveCommand");

    const actions = getExecutiveActions();

    expect(actions.some((action) => action.id === "collect-invoices")).toBe(true);
    expect(actions.some((action) => action.id === "advance-leads")).toBe(true);
    expect(actions.some((action) => action.href === "/autopilot/ap-1")).toBe(true);
  });

  it("command API works", async () => {
    const overviewRoute = await import("@/app/api/command/overview/route");
    const alertsRoute = await import("@/app/api/command/alerts/route");
    const actionsRoute = await import("@/app/api/command/actions/route");

    const overviewPayload = await (await overviewRoute.GET()).json();
    const alertsPayload = await (await alertsRoute.GET()).json();
    const actionsPayload = await (await actionsRoute.GET()).json();

    expect(overviewPayload.ok).toBe(true);
    expect(overviewPayload.overview.healthScore).toBeGreaterThan(0);
    expect(alertsPayload.ok).toBe(true);
    expect(Array.isArray(alertsPayload.alerts)).toBe(true);
    expect(actionsPayload.ok).toBe(true);
    expect(Array.isArray(actionsPayload.actions)).toBe(true);
  });
});
