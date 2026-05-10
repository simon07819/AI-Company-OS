import { listSessions, type AutopilotSession, type BusinessStatus } from "./autopilotStore";
import { listLoopStates } from "./loopScheduler";
import { getMissionType } from "./missionTypes";

// ─── Types ────────────────────────────────────────────────────────────────

export interface BusinessOverview {
  totalMissions: number;
  activeMissions: number;
  clientReadyMissions: number;
  deliveredMissions: number;
  recurringMissions: number;
  approvedDeliverables: number;
  deliveryPackagesGenerated: number;
  activeLoops: number;
  estimatedRevenuePotential: number;
  missionsByStatus: Record<BusinessStatus, number>;
  missionsByType: Record<string, number>;
}

export interface PipelineEntry {
  sessionId: string;
  projectName: string;
  missionType: string;
  missionLabel: string;
  businessStatus: BusinessStatus;
  progress: number;
  createdAt: string;
  updatedAt: string;
}

export interface RecommendedAction {
  sessionId: string;
  projectName: string;
  action: "review" | "approve" | "package" | "deliver" | "activate_loop" | "retry";
  label: string;
  priority: "high" | "medium" | "low";
  description: string;
}

// ─── Revenue estimates per mission type (in USD) ─────────────────────────

const REVENUE_ESTIMATES: Record<string, number> = {
  saas_project: 5000,
  website: 2500,
  branding_pack: 1500,
  flyer: 500,
  business_card: 300,
  ecommerce_store: 4000,
  social_campaign: 2000,
  automation_workflow: 3500,
};

// ─── Business Status Labels ───────────────────────────────────────────────

export const BUSINESS_STATUS_LABELS: Record<BusinessStatus, { label: string; color: string }> = {
  idea:          { label: "Idea",          color: "#94a3b8" },
  in_production: { label: "In Production", color: "#3b82f6" },
  review:        { label: "Review",        color: "#f59e0b" },
  client_ready:  { label: "Client-Ready",  color: "#22c55e" },
  delivered:     { label: "Delivered",      color: "#6366f1" },
  recurring:     { label: "Recurring",     color: "#8b5cf6" },
};

// ─── Public API ───────────────────────────────────────────────────────────

/**
 * Get business overview across all missions.
 */
export function getBusinessOverview(): BusinessOverview {
  const sessions = listSessions();
  const loopStates = listLoopStates();
  const activeLoopSessionIds = new Set(loopStates.filter((s) => s.loop.status === "active").map((s) => s.sessionId));

  const byStatus: Record<BusinessStatus, number> = {
    idea: 0, in_production: 0, review: 0, client_ready: 0, delivered: 0, recurring: 0,
  };

  const byType: Record<string, number> = {};
  let approvedDeliverables = 0;
  let deliveryPackages = 0;
  let estimatedRevenue = 0;

  for (const session of sessions) {
    const bizStatus = session.businessStatus ?? "idea";
    byStatus[bizStatus]++;

    const mt = session.missionType ?? "saas_project";
    byType[mt] = (byType[mt] ?? 0) + 1;

    // Count approved deliverables from logs
    const approvedLogs = session.logs.filter((l) => l.message.includes("approved") && l.source === "review");
    approvedDeliverables += approvedLogs.length;

    // Count delivery packages from logs
    const pkgLogs = session.logs.filter((l) => l.message.includes("Delivery package") && l.source === "delivery");
    deliveryPackages += pkgLogs.length;

    // Revenue estimation: client_ready and delivered count full, review counts 50%, in_production 25%
    const baseRevenue = REVENUE_ESTIMATES[mt] ?? 2000;
    if (bizStatus === "delivered" || bizStatus === "recurring") {
      estimatedRevenue += baseRevenue;
    } else if (bizStatus === "client_ready") {
      estimatedRevenue += baseRevenue * 0.9;
    } else if (bizStatus === "review") {
      estimatedRevenue += baseRevenue * 0.5;
    } else if (bizStatus === "in_production") {
      estimatedRevenue += baseRevenue * 0.25;
    }
  }

  return {
    totalMissions: sessions.length,
    activeMissions: sessions.filter((s) => s.status === "running").length,
    clientReadyMissions: byStatus.client_ready,
    deliveredMissions: byStatus.delivered,
    recurringMissions: byStatus.recurring,
    approvedDeliverables,
    deliveryPackagesGenerated: deliveryPackages,
    activeLoops: activeLoopSessionIds.size,
    estimatedRevenuePotential: Math.round(estimatedRevenue),
    missionsByStatus: byStatus,
    missionsByType: byType,
  };
}

/**
 * Get the mission pipeline grouped by business status.
 */
export function getBusinessPipeline(): PipelineEntry[] {
  const sessions = listSessions();

  return sessions
    .map((session) => {
      const mt = getMissionType(session.missionType);
      return {
        sessionId: session.sessionId,
        projectName: session.projectName,
        missionType: session.missionType,
        missionLabel: mt?.label ?? session.missionType,
        businessStatus: session.businessStatus ?? "idea",
        progress: session.progress,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
      };
    })
    .sort((a, b) => {
      const statusOrder: BusinessStatus[] = ["in_production", "review", "client_ready", "recurring", "delivered", "idea"];
      return statusOrder.indexOf(a.businessStatus) - statusOrder.indexOf(b.businessStatus);
    });
}

/**
 * Get recommended next actions based on mission states.
 */
export function getRecommendedActions(): RecommendedAction[] {
  const sessions = listSessions();
  const loopStates = listLoopStates();
  const loopSessionIds = new Set(loopStates.map((s) => s.sessionId));
  const actions: RecommendedAction[] = [];

  for (const session of sessions) {
    const bizStatus = session.businessStatus ?? "idea";
    const mt = getMissionType(session.missionType);

    // Review: missions that are in "review" status
    if (bizStatus === "review") {
      actions.push({
        sessionId: session.sessionId,
        projectName: session.projectName,
        action: "review",
        label: `Review ${mt?.label ?? session.missionType}`,
        priority: "high",
        description: `${session.projectName} is ready for quality review. Approve deliverables to move to client-ready.`,
      });
    }

    // Approve: missions with pending reviews
    const hasReviewLog = session.logs.some((l) => l.source === "review" && l.level === "warning");
    if (hasReviewLog && bizStatus === "review") {
      actions.push({
        sessionId: session.sessionId,
        projectName: session.projectName,
        action: "approve",
        label: `Approve ${session.projectName}`,
        priority: "high",
        description: `Deliverables reviewed but pending approval.`,
      });
    }

    // Package: missions that are client_ready but no package generated yet
    if (bizStatus === "client_ready") {
      const hasPackage = session.logs.some((l) => l.source === "delivery");
      if (!hasPackage) {
        actions.push({
          sessionId: session.sessionId,
          projectName: session.projectName,
          action: "package",
          label: `Generate delivery package for ${session.projectName}`,
          priority: "medium",
          description: `Mission is client-ready. Generate a delivery package for handoff.`,
        });
      }
    }

    // Deliver: client_ready with package ready
    if (bizStatus === "client_ready") {
      const hasPackage = session.logs.some((l) => l.source === "delivery");
      if (hasPackage) {
        actions.push({
          sessionId: session.sessionId,
          projectName: session.projectName,
          action: "deliver",
          label: `Deliver ${session.projectName}`,
          priority: "medium",
          description: `Package generated. Mark as delivered to client.`,
        });
      }
    }

    // Activate loop: completed/delivered missions without active loop
    if ((bizStatus === "delivered" || bizStatus === "recurring" || (session.status === "completed" && bizStatus !== "idea")) && !loopSessionIds.has(session.sessionId)) {
      const applicableLoops = ["saas_project", "website", "ecommerce_store", "social_campaign", "automation_workflow"];
      if (applicableLoops.includes(session.missionType)) {
        actions.push({
          sessionId: session.sessionId,
          projectName: session.projectName,
          action: "activate_loop",
          label: `Activate loop for ${session.projectName}`,
          priority: "low",
          description: `Enable autonomous recurring execution for this mission.`,
        });
      }
    }

    // Retry: failed missions
    if (session.status === "failed") {
      actions.push({
        sessionId: session.sessionId,
        projectName: session.projectName,
        action: "retry",
        label: `Retry ${session.projectName}`,
        priority: "high",
        description: `Mission failed. Retry execution.`,
      });
    }
  }

  // Sort by priority
  const priorityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
  actions.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  return actions;
}
