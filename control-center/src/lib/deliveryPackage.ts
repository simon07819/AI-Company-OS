import fs from "fs";
import path from "path";
import type { AutopilotSession } from "./autopilotStore";
import type { ReviewReport } from "./deliverableReview";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DeliveryFile {
  path: string;
  name: string;
  size: number;
}

export interface DeliveryManifest {
  sessionId: string;
  projectName: string;
  missionType: string;
  generatedAt: string;
  qualityScore: number;
  clientReady: boolean;
  deliverableCount: number;
  approvedCount: number;
  rejectedCount: number;
  pendingCount: number;
  files: string[];
  blockers: string[];
  recommendations: string[];
}

export interface DeliveryPackage {
  sessionId: string;
  generatedAt: string;
  clientReady: boolean;
  qualityScore: number;
  files: DeliveryFile[];
  manifest: DeliveryManifest;
}

// ─── Paths ────────────────────────────────────────────────────────────────────

const REPO_ROOT = path.resolve(process.cwd(), "..");
const WORKSPACES_ROOT = path.join(REPO_ROOT, "generated", "autopilot-workspaces");

function workspaceDir(sessionId: string): string {
  return path.join(WORKSPACES_ROOT, sessionId);
}

function ensureDir(dir: string): void {
  fs.mkdirSync(dir, { recursive: true });
}

function safeWrite(p: string, content: string): void {
  ensureDir(path.dirname(p));
  fs.writeFileSync(p, content, "utf-8");
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MISSION_LABELS: Record<string, string> = {
  saas_project:       "SaaS Project",
  website:            "Website",
  branding_pack:      "Branding Pack",
  flyer:              "Flyer",
  business_card:      "Business Card",
  ecommerce_store:    "E-Commerce Store",
  social_campaign:    "Social Campaign",
  automation_workflow: "Automation Workflow",
};

const DELIVERY_FILES = [
  "delivery/client-summary.md",
  "delivery/deliverables-index.md",
  "delivery/approval-status.md",
  "delivery/next-steps.md",
  "delivery/handoff-checklist.md",
  "delivery/delivery-manifest.json",
] as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTimestamp(iso: string): string {
  try {
    return new Date(iso).toISOString().replace("T", " ").slice(0, 19);
  } catch {
    return iso;
  }
}

function computeBlockers(review: ReviewReport | null): string[] {
  if (!review) return ["No quality review found — run Review Deliverables first"];
  if (review.clientReady) return [];

  const blockers: string[] = [];
  const rejected = review.deliverables.filter((d) => d.status === "rejected");
  const pending = review.deliverables.filter(
    (d) => d.status === "draft" || d.status === "needs_review"
  );

  if (rejected.length > 0) {
    blockers.push(
      `${rejected.length} deliverable${rejected.length > 1 ? "s" : ""} rejected: ${rejected.map((d) => d.name).join(", ")}`
    );
  }
  if (pending.length > 0) {
    blockers.push(
      `${pending.length} deliverable${pending.length > 1 ? "s" : ""} pending approval: ${pending.map((d) => d.name).join(", ")}`
    );
  }
  return blockers;
}

function computeRecommendations(review: ReviewReport | null): string[] {
  if (!review) return ["Run quality review before generating the delivery package."];

  const recs: string[] = [];
  if (review.clientReady) {
    recs.push("All deliverables approved — package is ready for client handoff.");
  } else {
    if (review.globalScore < 60) {
      recs.push("Quality score below 60% — improve deliverable content before delivery.");
    } else if (review.globalScore < 80) {
      recs.push("Quality score below 80% — review flagged items before handoff.");
    }
    const rejected = review.deliverables.filter((d) => d.status === "rejected");
    if (rejected.length > 0) {
      recs.push(
        `Address ${rejected.length} rejected deliverable${rejected.length > 1 ? "s" : ""} before client presentation.`
      );
    }
  }
  const topWarnings = review.deliverables.flatMap((d) => d.warnings).slice(0, 3);
  for (const w of topWarnings) recs.push(w);
  return recs;
}

// ─── File content builders ────────────────────────────────────────────────────

function buildClientSummary(
  session: AutopilotSession,
  review: ReviewReport | null,
  manifest: DeliveryManifest
): string {
  const missionLabel = MISSION_LABELS[session.missionType] ?? session.missionType;
  const ts = formatTimestamp(manifest.generatedAt);
  const statusLine = manifest.clientReady ? "✓ Ready for Client Handoff" : "⚠ Pending Approval";

  return [
    `# Client Summary — ${session.projectName}`,
    "",
    `**Mission:** ${missionLabel}`,
    `**Session:** ${session.sessionId}`,
    `**Generated:** ${ts}`,
    `**Quality Score:** ${manifest.qualityScore}/100`,
    `**Status:** ${statusLine}`,
    "",
    "## Project Overview",
    "",
    session.projectIdea,
    "",
    "## Deliverables Summary",
    "",
    `${manifest.deliverableCount} deliverables reviewed:`,
    `- ✓ ${manifest.approvedCount} approved`,
    `- ⏳ ${manifest.pendingCount} pending review`,
    `- ✗ ${manifest.rejectedCount} rejected`,
    "",
    "## Quality Assessment",
    "",
    manifest.qualityScore >= 80
      ? "Deliverables meet quality standards. Content is structured, contextual, and actionable."
      : manifest.qualityScore >= 60
      ? "Most deliverables meet baseline quality. Some items need additional detail."
      : "Quality score below threshold. Significant improvements needed before client presentation.",
    "",
    "## Recommendations",
    "",
    ...manifest.recommendations.map((r) => `- ${r}`),
    "",
    ...(manifest.blockers.length > 0
      ? ["## Blockers", "", ...manifest.blockers.map((b) => `- ⚠ ${b}`), ""]
      : []),
    "## Project Roadmap",
    "",
    ...session.roadmap.map((step, i) => `${i + 1}. ${step}`),
    "",
    `_Prepared by AI Company OS — Powered by NVIDIA API_`,
    `_${ts}_`,
    "",
  ].join("\n");
}

function buildDeliverablesIndex(
  session: AutopilotSession,
  review: ReviewReport | null
): string {
  const lines = [
    `# Deliverables Index — ${session.projectName}`,
    "",
    `**Session:** ${session.sessionId}`,
    `**Mission:** ${MISSION_LABELS[session.missionType] ?? session.missionType}`,
    "",
  ];

  if (!review || review.deliverables.length === 0) {
    lines.push("_No deliverables reviewed yet._", "");
    return lines.join("\n");
  }

  lines.push("| Deliverable | Score | Status | Warnings |");
  lines.push("|-------------|-------|--------|----------|");

  for (const d of review.deliverables) {
    const warnings = d.warnings.length > 0 ? d.warnings.slice(0, 2).join("; ") : "—";
    lines.push(`| \`${d.path}\` | ${d.score}/100 | ${d.status.toUpperCase()} | ${warnings} |`);
  }

  lines.push("", `_Total: ${review.deliverables.length} deliverables_`, "");
  return lines.join("\n");
}

function buildApprovalStatus(
  session: AutopilotSession,
  review: ReviewReport | null
): string {
  const lines = [
    `# Approval Status — ${session.projectName}`,
    "",
    `**Session:** ${session.sessionId}`,
    `**Global Score:** ${review?.globalScore ?? "N/A"}/100`,
    `**Client Ready:** ${review?.clientReady ? "Yes ✓" : "No"}`,
    "",
  ];

  if (!review || review.deliverables.length === 0) {
    lines.push("_No review data available._", "");
    return lines.join("\n");
  }

  const approved = review.deliverables.filter((d) => d.status === "approved");
  const rejected = review.deliverables.filter((d) => d.status === "rejected");
  const pending = review.deliverables.filter(
    (d) => d.status === "draft" || d.status === "needs_review"
  );

  if (approved.length > 0) {
    lines.push("## Approved", "");
    for (const d of approved) {
      lines.push(
        `- ✓ \`${d.path}\` — score: ${d.score}/100${d.approvedAt ? ` (${formatTimestamp(d.approvedAt)})` : ""}`
      );
    }
    lines.push("");
  }

  if (pending.length > 0) {
    lines.push("## Pending Review", "");
    for (const d of pending) {
      lines.push(`- ⏳ \`${d.path}\` — score: ${d.score}/100 — status: ${d.status}`);
    }
    lines.push("");
  }

  if (rejected.length > 0) {
    lines.push("## Rejected", "");
    for (const d of rejected) {
      lines.push(`- ✗ \`${d.path}\` — ${d.rejectionReason ?? "No reason provided"}`);
    }
    lines.push("");
  }

  return lines.join("\n");
}

const NEXT_STEPS_BY_MISSION: Record<string, string[]> = {
  saas_project: [
    "Schedule a product walkthrough with the client team",
    "Set up staging environment for demo access",
    "Collect feedback on MVP features and prioritize v1.1",
    "Define SLA, support channels, and onboarding timeline",
    "Confirm deployment environment and infrastructure costs",
  ],
  website: [
    "Review final copy and imagery with client",
    "Confirm domain, DNS, and hosting configuration",
    "Test on all target devices and browsers",
    "Schedule go-live and communicate launch plan",
    "Set up analytics and performance monitoring",
  ],
  branding_pack: [
    "Present brand guidelines in a walkthrough session",
    "Deliver source files (Figma, SVG, PNG) to client",
    "Define brand usage rules and approval process",
    "Schedule brand launch communications",
  ],
  flyer: [
    "Review final copy and design with client",
    "Confirm print specifications and bleed settings",
    "Order a physical proof before mass print",
    "Confirm distribution channels and quantities",
  ],
  business_card: [
    "Review final design and contact information",
    "Confirm card dimensions and paper stock",
    "Order samples before full print run",
    "Confirm delivery address and turnaround time",
  ],
  ecommerce_store: [
    "Review product catalog and checkout flow with client",
    "Configure payment gateway in live mode",
    "Test end-to-end purchase flow",
    "Set up order fulfillment and shipping notifications",
    "Define return and refund policy",
  ],
  social_campaign: [
    "Review content calendar and post schedule",
    "Get client approval on all copy and creatives",
    "Schedule posts in social media management tool",
    "Define KPIs and reporting cadence",
    "Set up monitoring for engagement and reach",
  ],
  automation_workflow: [
    "Run full end-to-end test with real data",
    "Configure monitoring and alerting",
    "Train client team on workflow management",
    "Define escalation and incident response process",
    "Schedule 30-day post-launch review",
  ],
};

function buildNextSteps(
  session: AutopilotSession,
  review: ReviewReport | null
): string {
  const steps =
    NEXT_STEPS_BY_MISSION[session.missionType] ?? NEXT_STEPS_BY_MISSION.saas_project;

  const qualityItems = review
    ? review.deliverables
        .filter((d) => d.warnings.length > 0 && d.status !== "approved")
        .slice(0, 5)
        .map((d) => `- **${d.name}**: ${d.warnings[0]}`)
    : ["- Run quality review to identify improvement areas."];

  return [
    `# Next Steps — ${session.projectName}`,
    "",
    `**Mission:** ${MISSION_LABELS[session.missionType] ?? session.missionType}`,
    `**Session:** ${session.sessionId}`,
    "",
    "## Immediate Actions",
    "",
    ...steps.map((step, i) => `${i + 1}. ${step}`),
    "",
    "## Quality Improvements",
    "",
    ...qualityItems,
    "",
    "## Long-Term Recommendations",
    "",
    "- Schedule quarterly review sessions",
    "- Define success metrics and review cadence",
    "- Collect user feedback and iterate on v2 scope",
    "",
    `_Generated by AI Company OS — ${session.projectName}_`,
    "",
  ].join("\n");
}

function buildHandoffChecklist(
  session: AutopilotSession,
  review: ReviewReport | null
): string {
  const clientReady = review?.clientReady ?? false;
  const allReviewed = review
    ? review.deliverables.every((d) => d.status !== "draft")
    : false;

  return [
    `# Handoff Checklist — ${session.projectName}`,
    "",
    `**Session:** ${session.sessionId}`,
    `**Mission:** ${MISSION_LABELS[session.missionType] ?? session.missionType}`,
    `**Status:** ${clientReady ? "Ready for handoff ✓" : "Not yet ready"}`,
    "",
    "## Pre-Delivery Checklist",
    "",
    `- [${review ? "x" : " "}] Quality review completed`,
    `- [${allReviewed ? "x" : " "}] All deliverables reviewed (no drafts)`,
    `- [${clientReady ? "x" : " "}] All deliverables approved`,
    "- [ ] Client briefed on scope and deliverables",
    "- [ ] Delivery package sent to client",
    "- [ ] Client acknowledgement received",
    "",
    "## Files Included in Package",
    "",
    "- `delivery/client-summary.md` — Executive summary",
    "- `delivery/deliverables-index.md` — Full deliverables list",
    "- `delivery/approval-status.md` — Approval status report",
    "- `delivery/next-steps.md` — Recommended next actions",
    "- `delivery/handoff-checklist.md` — This document",
    "- `delivery/delivery-manifest.json` — Machine-readable manifest",
    "",
    "## Delivery Notes",
    "",
    ...(clientReady
      ? [
          "✓ All deliverables have been reviewed and approved.",
          "✓ Quality score meets delivery threshold.",
          "✓ Package is ready for client presentation.",
        ]
      : [
          "⚠ Some deliverables are pending approval.",
          "⚠ Complete the review workflow before client handoff.",
        ]),
    "",
    `_Generated by AI Company OS Autopilot_`,
    "",
  ].join("\n");
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Generate the full client delivery package for a session.
 * Writes all delivery files to delivery/ in the workspace.
 */
export function generateDeliveryPackage(
  session: AutopilotSession,
  review: ReviewReport | null
): DeliveryPackage {
  const wsDir = workspaceDir(session.sessionId);
  const now = new Date().toISOString();

  const qualityScore = review?.globalScore ?? 0;
  const clientReady = review?.clientReady ?? false;
  const deliverableCount = review?.deliverables.length ?? 0;
  const approvedCount =
    review?.deliverables.filter((d) => d.status === "approved").length ?? 0;
  const rejectedCount =
    review?.deliverables.filter((d) => d.status === "rejected").length ?? 0;
  const pendingCount = deliverableCount - approvedCount - rejectedCount;

  const blockers = computeBlockers(review);
  const recommendations = computeRecommendations(review);

  const manifest: DeliveryManifest = {
    sessionId: session.sessionId,
    projectName: session.projectName,
    missionType: session.missionType,
    generatedAt: now,
    qualityScore,
    clientReady,
    deliverableCount,
    approvedCount,
    rejectedCount,
    pendingCount,
    files: [...DELIVERY_FILES],
    blockers,
    recommendations,
  };

  // Write all delivery files
  safeWrite(
    path.join(wsDir, "delivery/client-summary.md"),
    buildClientSummary(session, review, manifest)
  );
  safeWrite(
    path.join(wsDir, "delivery/deliverables-index.md"),
    buildDeliverablesIndex(session, review)
  );
  safeWrite(
    path.join(wsDir, "delivery/approval-status.md"),
    buildApprovalStatus(session, review)
  );
  safeWrite(
    path.join(wsDir, "delivery/next-steps.md"),
    buildNextSteps(session, review)
  );
  safeWrite(
    path.join(wsDir, "delivery/handoff-checklist.md"),
    buildHandoffChecklist(session, review)
  );
  safeWrite(
    path.join(wsDir, "delivery/delivery-manifest.json"),
    JSON.stringify(manifest, null, 2) + "\n"
  );

  const files: DeliveryFile[] = [...DELIVERY_FILES].map((relPath) => {
    let size = 0;
    try {
      size = fs.statSync(path.join(wsDir, relPath)).size;
    } catch {
      // ignore
    }
    return { path: relPath, name: path.basename(relPath), size };
  });

  return { sessionId: session.sessionId, generatedAt: now, clientReady, qualityScore, files, manifest };
}

/**
 * Load an existing delivery package manifest. Returns null if not generated yet.
 */
export function loadDeliveryPackage(sessionId: string): DeliveryPackage | null {
  const manifestPath = path.join(workspaceDir(sessionId), "delivery", "delivery-manifest.json");
  if (!fs.existsSync(manifestPath)) return null;

  let manifest: DeliveryManifest;
  try {
    manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8")) as DeliveryManifest;
  } catch {
    return null;
  }

  const wsDir = workspaceDir(sessionId);
  const files: DeliveryFile[] = manifest.files.map((relPath) => {
    let size = 0;
    try {
      size = fs.statSync(path.join(wsDir, relPath)).size;
    } catch {
      // ignore
    }
    return { path: relPath, name: path.basename(relPath), size };
  });

  return {
    sessionId,
    generatedAt: manifest.generatedAt,
    clientReady: manifest.clientReady,
    qualityScore: manifest.qualityScore,
    files,
    manifest,
  };
}
