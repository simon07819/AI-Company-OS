// ─── Loop Types ────────────────────────────────────────────────────────────

export type LoopMode =
  | "one_shot"
  | "recurring_daily"
  | "recurring_weekly"
  | "monitoring"
  | "optimization_loop";

export type LoopStatus = "inactive" | "active" | "paused" | "error";

export interface LoopHistoryEntry {
  ranAt: string;
  tasksCreated: number;
  result: "success" | "partial" | "failed";
  message: string;
}

export interface LoopConfig {
  mode: LoopMode;
  status: LoopStatus;
  nextRunAt: string | null;
  lastRunAt: string | null;
  history: LoopHistoryEntry[];
}

// ─── Loop Definitions ────────────────────────────────────────────────────

export interface LoopTypeDef {
  id: LoopMode;
  label: string;
  description: string;
  intervalMs: number | null; // null for one_shot
  applicableMissions: string[];
  taskTemplates: { title: string; description: string; agent: string; phase: string }[];
}

export const LOOP_TYPES: LoopTypeDef[] = [
  {
    id: "one_shot",
    label: "One-Shot",
    description: "Run once, complete, stop. Standard mission execution.",
    intervalMs: null,
    applicableMissions: ["saas_project", "website", "branding_pack", "flyer", "business_card", "ecommerce_store", "social_campaign", "automation_workflow"],
    taskTemplates: [],
  },
  {
    id: "recurring_daily",
    label: "Daily Recurring",
    description: "Run new tasks every day. Ideal for monitoring, content refresh and data sync.",
    intervalMs: 24 * 60 * 60 * 1000,
    applicableMissions: ["social_campaign", "ecommerce_store", "automation_workflow"],
    taskTemplates: [
      { title: "Daily content check and refresh", description: "Review existing content, update stale posts and schedule new ones.", agent: "product_agent", phase: "planning" },
      { title: "Daily performance metrics review", description: "Check KPIs, traffic, conversions and flag anomalies.", agent: "product_agent", phase: "validation" },
      { title: "Daily system health check", description: "Verify all systems operational, check error rates and uptime.", agent: "devops_agent", phase: "runtime" },
    ],
  },
  {
    id: "recurring_weekly",
    label: "Weekly Recurring",
    description: "Run new tasks every week. Ideal for campaign cycles and SEO reviews.",
    intervalMs: 7 * 24 * 60 * 60 * 1000,
    applicableMissions: ["social_campaign", "website", "ecommerce_store"],
    taskTemplates: [
      { title: "Weekly content calendar update", description: "Plan next week's content, adjust themes and posting schedule.", agent: "product_agent", phase: "planning" },
      { title: "Weekly creative refresh", description: "Update templates, try new formats, refresh visuals.", agent: "frontend_agent", phase: "frontend" },
      { title: "Weekly analytics report", description: "Generate performance summary, identify trends and recommendations.", agent: "qa_agent", phase: "validation" },
    ],
  },
  {
    id: "monitoring",
    label: "Monitoring Loop",
    description: "Continuously monitor health, metrics and alerts. Auto-heal when possible.",
    intervalMs: 15 * 60 * 1000, // 15 minutes
    applicableMissions: ["saas_project", "ecommerce_store", "automation_workflow"],
    taskTemplates: [
      { title: "Health check and uptime verification", description: "Verify all endpoints responding, check database connectivity.", agent: "devops_agent", phase: "runtime" },
      { title: "Error rate and anomaly detection", description: "Scan logs for errors, check error rate thresholds and alert if needed.", agent: "qa_agent", phase: "validation" },
      { title: "Resource utilization review", description: "Check CPU, memory, disk usage and scaling metrics.", agent: "devops_agent", phase: "runtime" },
    ],
  },
  {
    id: "optimization_loop",
    label: "Optimization Loop",
    description: "Periodically analyze and optimize. Recommend improvements continuously.",
    intervalMs: 7 * 24 * 60 * 60 * 1000, // weekly
    applicableMissions: ["saas_project", "website", "ecommerce_store"],
    taskTemplates: [
      { title: "Performance optimization analysis", description: "Identify bottlenecks, slow queries and optimization opportunities.", agent: "architect_agent", phase: "architecture" },
      { title: "UX and conversion optimization review", description: "Analyze user flows, identify drop-off points, suggest improvements.", agent: "product_agent", phase: "planning" },
      { title: "Code quality and dependency audit", description: "Check for outdated deps, security vulnerabilities and code smells.", agent: "qa_agent", phase: "validation" },
    ],
  },
];

// ─── Lookup helpers ───────────────────────────────────────────────────────

const LOOP_MAP = new Map(LOOP_TYPES.map((l) => [l.id, l]));

export function getLoopType(id: string): LoopTypeDef | undefined {
  return LOOP_MAP.get(id as LoopMode);
}

export function getDefaultLoopConfig(): LoopConfig {
  return {
    mode: "one_shot",
    status: "inactive",
    nextRunAt: null,
    lastRunAt: null,
    history: [],
  };
}

export function computeNextRun(mode: LoopMode, from?: string): string | null {
  const loopType = LOOP_MAP.get(mode);
  if (!loopType || !loopType.intervalMs) return null;
  const base = from ? new Date(from) : new Date();
  return new Date(base.getTime() + loopType.intervalMs).toISOString();
}

export function isLoopDue(loop: LoopConfig): boolean {
  if (loop.status !== "active") return false;
  if (!loop.nextRunAt) return false;
  return new Date(loop.nextRunAt).getTime() <= Date.now();
}
