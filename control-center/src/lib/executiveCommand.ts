import { getAllAgentStates } from "./agentRuntime";
import { listSessions } from "./autopilotStore";
import { getBusinessOverview, getBusinessPipeline, getRecommendedActions as getBusinessActions } from "./businessOps";
import { getCrmOverview } from "./clientCrm";
import { getDistributionOverview } from "./distributionEngine";
import { listLoopStates } from "./loopScheduler";
import { getRevenueOverview } from "./revenueSystem";
import { listQueue } from "./runtimeQueue";
import { getWorkspaceOverview, type CompanyWorkspace, type WorkspaceOverview } from "./companyWorkspace";

export type CommandAlertSeverity = "critical" | "warning" | "info";
export type CommandActionPriority = "high" | "medium" | "low";

export interface CommandAlert {
  id: string;
  severity: CommandAlertSeverity;
  title: string;
  description: string;
  source: "runtime" | "revenue" | "crm" | "distribution" | "missions" | "workspaces" | "loops";
}

export interface CommandAction {
  id: string;
  priority: CommandActionPriority;
  label: string;
  description: string;
  href: string;
}

export interface ExecutiveCommandOverview {
  healthScore: number;
  healthGrade: "excellent" | "stable" | "watch" | "critical";
  workspaces: {
    total: number;
    active: number;
    top: CompanyWorkspace[];
  };
  missions: {
    total: number;
    active: number;
    clientReady: number;
    delivered: number;
    pendingApprovals: number;
    pipeline: ReturnType<typeof getBusinessPipeline>;
  };
  runtime: {
    totalAgents: number;
    activeAgents: number;
    failedAgents: number;
    queuedTasks: number;
    agents: ReturnType<typeof getAllAgentStates>;
  };
  revenue: ReturnType<typeof getRevenueOverview>;
  crm: ReturnType<typeof getCrmOverview>;
  distribution: ReturnType<typeof getDistributionOverview>;
  loops: {
    total: number;
    active: number;
    paused: number;
  };
  deliveryPackages: {
    generated: number;
    pendingApprovals: number;
  };
  alerts: CommandAlert[];
  actions: CommandAction[];
}

function workspaceOverview(): WorkspaceOverview {
  const overview = getWorkspaceOverview();
  if (!overview || !("workspaces" in overview)) {
    return {
      totalWorkspaces: 0,
      activeWorkspaces: 0,
      totalRevenue: 0,
      activeMissions: 0,
      activeCampaigns: 0,
      publishedAssets: 0,
      crmClients: 0,
      crmLeads: 0,
      workspaces: [],
    };
  }
  return overview;
}

export function getExecutiveAlerts(): CommandAlert[] {
  const sessions = listSessions();
  const agents = getAllAgentStates();
  const revenue = getRevenueOverview();
  const crm = getCrmOverview();
  const distribution = getDistributionOverview();
  const loops = listLoopStates();
  const queue = listQueue();
  const alerts: CommandAlert[] = [];

  const failedAgents = agents.filter((agent) => agent.status === "failed");
  if (failedAgents.length > 0) {
    alerts.push({
      id: "runtime-failed-agents",
      severity: "critical",
      title: "Runtime agents need attention",
      description: `${failedAgents.length} agent${failedAgents.length === 1 ? "" : "s"} failed.`,
      source: "runtime",
    });
  }

  const failedMissions = sessions.filter((session) => session.status === "failed");
  if (failedMissions.length > 0) {
    alerts.push({
      id: "missions-failed",
      severity: "critical",
      title: "Failed missions detected",
      description: `${failedMissions.length} mission${failedMissions.length === 1 ? "" : "s"} failed and may need retry.`,
      source: "missions",
    });
  }

  if (revenue.outstandingInvoices > 0) {
    alerts.push({
      id: "revenue-outstanding-invoices",
      severity: revenue.outstandingInvoiceValue > 5000 ? "critical" : "warning",
      title: "Outstanding invoices",
      description: `${revenue.outstandingInvoices} invoice${revenue.outstandingInvoices === 1 ? "" : "s"} outstanding for $${revenue.outstandingInvoiceValue.toLocaleString()}.`,
      source: "revenue",
    });
  }

  if (distribution.failedJobs > 0) {
    alerts.push({
      id: "distribution-failures",
      severity: "warning",
      title: "Distribution jobs failed",
      description: `${distribution.failedJobs} publishing job${distribution.failedJobs === 1 ? "" : "s"} failed.`,
      source: "distribution",
    });
  }

  const pausedLoops = loops.filter((loop) => loop.loop.status === "paused");
  if (pausedLoops.length > 0) {
    alerts.push({
      id: "loops-paused",
      severity: "info",
      title: "Autonomous loops paused",
      description: `${pausedLoops.length} loop${pausedLoops.length === 1 ? "" : "s"} paused.`,
      source: "loops",
    });
  }

  if (crm.activeLeads > 0 && crm.openOpportunities === 0) {
    alerts.push({
      id: "crm-leads-no-opportunities",
      severity: "info",
      title: "Leads need pipeline conversion",
      description: `${crm.activeLeads} active lead${crm.activeLeads === 1 ? "" : "s"} with no open opportunities.`,
      source: "crm",
    });
  }

  if (queue.length > 10) {
    alerts.push({
      id: "runtime-queue-high",
      severity: "warning",
      title: "Runtime queue is growing",
      description: `${queue.length} tasks are queued.`,
      source: "runtime",
    });
  }

  return alerts;
}

export function getExecutiveActions(): CommandAction[] {
  const revenue = getRevenueOverview();
  const crm = getCrmOverview();
  const distribution = getDistributionOverview();
  const businessActions = getBusinessActions();
  const workspaces = workspaceOverview();
  const actions: CommandAction[] = [];

  if (revenue.outstandingInvoices > 0) {
    actions.push({
      id: "collect-invoices",
      priority: "high",
      label: "Collect outstanding invoices",
      description: `$${revenue.outstandingInvoiceValue.toLocaleString()} is waiting in invoices.`,
      href: "/revenue",
    });
  }

  if (crm.activeLeads > 0) {
    actions.push({
      id: "advance-leads",
      priority: "medium",
      label: "Advance active leads",
      description: `${crm.activeLeads} active lead${crm.activeLeads === 1 ? "" : "s"} in CRM.`,
      href: "/crm",
    });
  }

  if (distribution.failedJobs > 0) {
    actions.push({
      id: "retry-distribution",
      priority: "medium",
      label: "Retry failed distribution jobs",
      description: `${distribution.failedJobs} failed publishing job${distribution.failedJobs === 1 ? "" : "s"}.`,
      href: "/distribution",
    });
  }

  if (workspaces.totalWorkspaces <= 1 && workspaces.activeMissions > 3) {
    actions.push({
      id: "segment-workspaces",
      priority: "low",
      label: "Segment brands into workspaces",
      description: "Multiple missions are still operating in the default workspace.",
      href: "/workspaces",
    });
  }

  for (const action of businessActions.slice(0, 4)) {
    actions.push({
      id: `business-${action.sessionId}-${action.action}`,
      priority: action.priority,
      label: action.label,
      description: action.description,
      href: `/autopilot/${action.sessionId}`,
    });
  }

  const order: Record<CommandActionPriority, number> = { high: 0, medium: 1, low: 2 };
  return actions.sort((a, b) => order[a.priority] - order[b.priority]).slice(0, 8);
}

export function calculateCompanyHealthScore(): number {
  const business = getBusinessOverview();
  const revenue = getRevenueOverview();
  const crm = getCrmOverview();
  const distribution = getDistributionOverview();
  const agents = getAllAgentStates();
  const alerts = getExecutiveAlerts();

  let score = 100;
  score -= alerts.filter((alert) => alert.severity === "critical").length * 15;
  score -= alerts.filter((alert) => alert.severity === "warning").length * 8;
  score -= agents.filter((agent) => agent.status === "failed" || agent.status === "blocked").length * 10;
  score -= Math.min(revenue.outstandingInvoices * 4, 16);
  score -= Math.min(distribution.failedJobs * 5, 15);

  if (business.totalMissions > 0 && business.activeMissions === 0) score -= 6;
  if (crm.totalLeads > 0 && crm.activeLeads === crm.totalLeads) score -= 5;
  if (revenue.monthlyRevenue > 0) score += 5;
  if (distribution.publishedAssets > 0) score += 3;

  return Math.max(0, Math.min(100, Math.round(score)));
}

function grade(score: number): ExecutiveCommandOverview["healthGrade"] {
  if (score >= 85) return "excellent";
  if (score >= 70) return "stable";
  if (score >= 50) return "watch";
  return "critical";
}

export function getExecutiveCommandOverview(): ExecutiveCommandOverview {
  const workspaces = workspaceOverview();
  const business = getBusinessOverview();
  const sessions = listSessions();
  const agents = getAllAgentStates();
  const loops = listLoopStates();
  const alerts = getExecutiveAlerts();
  const actions = getExecutiveActions();
  const healthScore = calculateCompanyHealthScore();
  const pendingApprovals = sessions.filter((session) => session.businessStatus === "review" || session.businessStatus === "client_ready").length;

  return {
    healthScore,
    healthGrade: grade(healthScore),
    workspaces: {
      total: workspaces.totalWorkspaces,
      active: workspaces.activeWorkspaces,
      top: workspaces.workspaces.slice(0, 5),
    },
    missions: {
      total: business.totalMissions,
      active: business.activeMissions,
      clientReady: business.clientReadyMissions,
      delivered: business.deliveredMissions,
      pendingApprovals,
      pipeline: getBusinessPipeline().slice(0, 8),
    },
    runtime: {
      totalAgents: agents.length,
      activeAgents: agents.filter((agent) => !["idle", "completed"].includes(agent.status)).length,
      failedAgents: agents.filter((agent) => agent.status === "failed").length,
      queuedTasks: listQueue().length,
      agents,
    },
    revenue: getRevenueOverview(),
    crm: getCrmOverview(),
    distribution: getDistributionOverview(),
    loops: {
      total: loops.length,
      active: loops.filter((loop) => loop.loop.status === "active").length,
      paused: loops.filter((loop) => loop.loop.status === "paused").length,
    },
    deliveryPackages: {
      generated: business.deliveryPackagesGenerated,
      pendingApprovals,
    },
    alerts,
    actions,
  };
}
