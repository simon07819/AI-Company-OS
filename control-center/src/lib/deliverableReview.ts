import fs from "fs";
import path from "path";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ReviewStatus = "draft" | "needs_review" | "approved" | "rejected";

export interface ReviewCheck {
  name: string;
  passed: boolean;
  detail: string;
}

export interface DeliverableReview {
  path: string;
  name: string;
  score: number;
  status: ReviewStatus;
  checks: ReviewCheck[];
  warnings: string[];
  reviewedAt: string;
  approvedAt?: string;
  rejectedAt?: string;
  rejectionReason?: string;
}

export interface ReviewReport {
  sessionId: string;
  globalScore: number;
  status: ReviewStatus;
  deliverables: DeliverableReview[];
  clientReady: boolean;
  generatedAt: string;
  updatedAt: string;
}

// ─── Paths ────────────────────────────────────────────────────────────────────

const REPO_ROOT = path.resolve(process.cwd(), "..");
const WORKSPACES_ROOT = path.join(REPO_ROOT, "generated", "autopilot-workspaces");
export const REVIEWS_SUBDIR = "reviews";
export const REPORT_JSON_NAME = "review-report.json";

function workspaceDir(sessionId: string): string {
  return path.join(WORKSPACES_ROOT, sessionId);
}

function reviewsDir(sessionId: string): string {
  return path.join(workspaceDir(sessionId), REVIEWS_SUBDIR);
}

function reportJsonPath(sessionId: string): string {
  return path.join(reviewsDir(sessionId), REPORT_JSON_NAME);
}

function reportMdPath(sessionId: string): string {
  return path.join(reviewsDir(sessionId), "review-report.md");
}

function ensureDir(dir: string): void {
  fs.mkdirSync(dir, { recursive: true });
}

// ─── Reviewable directories ───────────────────────────────────────────────────

const REVIEWABLE_DIRS = [
  "phases",
  "product",
  "architecture",
  "frontend",
  "backend",
  "qa",
  "devops",
  "deliverables",
  "agent-runs",
];

function getReviewableFiles(sessionId: string): string[] {
  const wsDir = workspaceDir(sessionId);
  if (!fs.existsSync(wsDir)) return [];

  const files: string[] = [];

  for (const subdir of REVIEWABLE_DIRS) {
    const subdirPath = path.join(wsDir, subdir);
    if (!fs.existsSync(subdirPath)) continue;

    try {
      const entries = fs.readdirSync(subdirPath, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isFile() && entry.name.endsWith(".md")) {
          files.push(`${subdir}/${entry.name}`);
        }
      }
    } catch {
      // skip unreadable dirs
    }
  }

  return files;
}

// ─── Scoring ──────────────────────────────────────────────────────────────────

function scoreFile(
  content: string,
  projectName: string,
  missionType: string
): Pick<DeliverableReview, "score" | "status" | "checks" | "warnings"> {
  const checks: ReviewCheck[] = [];
  const warnings: string[] = [];

  // Check 1: content exists (20 pts)
  const contentExists = content.trim().length > 0;
  checks.push({
    name: "content_exists",
    passed: contentExists,
    detail: contentExists ? "File has content" : "File is empty or whitespace-only",
  });
  if (!contentExists) warnings.push("File is empty");

  // Check 2: length sufficient — min 200 chars (20 pts)
  const lengthSufficient = content.length >= 200;
  checks.push({
    name: "length_sufficient",
    passed: lengthSufficient,
    detail: lengthSufficient
      ? `${content.length} chars`
      : `Only ${content.length} chars (minimum 200)`,
  });
  if (!lengthSufficient) warnings.push(`Content too short: ${content.length} chars`);

  // Check 3: contains mission context (20 pts)
  const lower = content.toLowerCase();
  const hasMissionContext =
    (projectName.length > 0 && lower.includes(projectName.toLowerCase())) ||
    (missionType.length > 0 && lower.includes(missionType.toLowerCase().replace(/_/g, " ")));
  checks.push({
    name: "mission_context",
    passed: hasMissionContext,
    detail: hasMissionContext
      ? "Contains project or mission references"
      : "No project name or mission type found",
  });
  if (!hasMissionContext) warnings.push("Missing project or mission context");

  // Check 4: contains next actions (20 pts)
  const hasNextActions = /next actions|next steps|\[ \]|## todo/i.test(content);
  checks.push({
    name: "next_actions",
    passed: hasNextActions,
    detail: hasNextActions
      ? "Contains next actions or TODO items"
      : "No next actions or TODO items",
  });

  // Check 5: contains agent/task metadata (20 pts)
  const hasMetadata =
    /\*\*agent:\*\*|\*\*task:\*\*|\*\*session:\*\*|\*\*phase:\*\*|\*\*date:\*\*/i.test(content);
  checks.push({
    name: "agent_metadata",
    passed: hasMetadata,
    detail: hasMetadata
      ? "Contains agent/task/session metadata"
      : "No agent or task metadata",
  });
  if (!hasMetadata) warnings.push("Missing agent or task metadata");

  const score = checks.filter((c) => c.passed).length * 20;
  const status: ReviewStatus = score >= 80 ? "needs_review" : "draft";

  return { score, status, checks, warnings };
}

// ─── Global status ────────────────────────────────────────────────────────────

function computeGlobalStatus(deliverables: DeliverableReview[]): ReviewStatus {
  if (deliverables.length === 0) return "draft";
  if (deliverables.every((d) => d.status === "approved")) return "approved";
  if (deliverables.some((d) => d.status === "rejected")) return "rejected";
  if (deliverables.every((d) => d.status === "approved" || d.status === "needs_review")) {
    return "needs_review";
  }
  return "draft";
}

// ─── Persistence ──────────────────────────────────────────────────────────────

export function loadReviewReport(sessionId: string): ReviewReport | null {
  const jsonPath = reportJsonPath(sessionId);
  if (!fs.existsSync(jsonPath)) return null;
  try {
    const raw = fs.readFileSync(jsonPath, "utf-8");
    return JSON.parse(raw) as ReviewReport;
  } catch {
    return null;
  }
}

function saveReviewReport(report: ReviewReport): void {
  ensureDir(reviewsDir(report.sessionId));
  fs.writeFileSync(
    reportJsonPath(report.sessionId),
    JSON.stringify(report, null, 2) + "\n",
    "utf-8"
  );
  fs.writeFileSync(reportMdPath(report.sessionId), buildReportMarkdown(report), "utf-8");
}

function buildReportMarkdown(report: ReviewReport): string {
  const lines: string[] = [
    `# Quality Review Report`,
    "",
    `**Session:** ${report.sessionId}`,
    `**Global Score:** ${report.globalScore}/100`,
    `**Status:** ${report.status.toUpperCase()}`,
    `**Client Ready:** ${report.clientReady ? "Yes ✓" : "No"}`,
    `**Generated:** ${report.generatedAt}`,
    `**Updated:** ${report.updatedAt}`,
    "",
    "## Deliverables",
    "",
  ];

  for (const d of report.deliverables) {
    lines.push(`### ${d.name}`);
    lines.push("");
    lines.push(`- **Path:** \`${d.path}\``);
    lines.push(`- **Score:** ${d.score}/100`);
    lines.push(`- **Status:** ${d.status.toUpperCase()}`);
    if (d.approvedAt) lines.push(`- **Approved:** ${d.approvedAt}`);
    if (d.rejectedAt) lines.push(`- **Rejected:** ${d.rejectedAt}`);
    if (d.rejectionReason) lines.push(`- **Reason:** ${d.rejectionReason}`);
    lines.push("");
    lines.push("#### Checks");
    lines.push("");
    for (const check of d.checks) {
      lines.push(`- [${check.passed ? "x" : " "}] **${check.name}**: ${check.detail}`);
    }
    if (d.warnings.length > 0) {
      lines.push("");
      lines.push("#### Warnings");
      lines.push("");
      for (const w of d.warnings) {
        lines.push(`- ⚠ ${w}`);
      }
    }
    lines.push("");
  }

  lines.push(`_Generated by AI Company OS Quality Review Engine_`);
  lines.push("");

  return lines.join("\n");
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Run quality review on all deliverable files in the session workspace.
 * Preserves existing approved/rejected status. Returns null if no workspace.
 */
export function reviewDeliverables(
  sessionId: string,
  projectName: string,
  missionType: string
): ReviewReport | null {
  const wsDir = workspaceDir(sessionId);
  if (!fs.existsSync(wsDir)) return null;

  const now = new Date().toISOString();
  const existing = loadReviewReport(sessionId);

  const existingMap = new Map<string, DeliverableReview>();
  if (existing) {
    for (const d of existing.deliverables) {
      existingMap.set(d.path, d);
    }
  }

  const files = getReviewableFiles(sessionId);
  const deliverables: DeliverableReview[] = [];

  for (const relPath of files) {
    const fullPath = path.join(wsDir, relPath);
    let content = "";
    try {
      content = fs.readFileSync(fullPath, "utf-8");
    } catch {
      // unreadable → score as empty
    }

    const scored = scoreFile(content, projectName, missionType);
    const prev = existingMap.get(relPath);

    let status: ReviewStatus = scored.status;
    let approvedAt: string | undefined;
    let rejectedAt: string | undefined;
    let rejectionReason: string | undefined;

    if (prev?.status === "approved") {
      status = "approved";
      approvedAt = prev.approvedAt;
    } else if (prev?.status === "rejected") {
      status = "rejected";
      rejectedAt = prev.rejectedAt;
      rejectionReason = prev.rejectionReason;
    }

    deliverables.push({
      path: relPath,
      name: path.basename(relPath),
      score: scored.score,
      status,
      checks: scored.checks,
      warnings: scored.warnings,
      reviewedAt: now,
      approvedAt,
      rejectedAt,
      rejectionReason,
    });
  }

  const scores = deliverables.map((d) => d.score);
  const globalScore =
    scores.length > 0
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      : 0;

  const status = computeGlobalStatus(deliverables);
  const clientReady =
    deliverables.length > 0 && deliverables.every((d) => d.status === "approved");

  const report: ReviewReport = {
    sessionId,
    globalScore,
    status,
    deliverables,
    clientReady,
    generatedAt: existing?.generatedAt ?? now,
    updatedAt: now,
  };

  saveReviewReport(report);
  return report;
}

/**
 * Approve a specific deliverable by path. Returns the updated report.
 */
export function approveDeliverable(
  sessionId: string,
  deliverablePath: string
): ReviewReport | null {
  const report = loadReviewReport(sessionId);
  if (!report) return null;

  const now = new Date().toISOString();
  const idx = report.deliverables.findIndex((d) => d.path === deliverablePath);
  if (idx === -1) return report;

  report.deliverables[idx] = {
    ...report.deliverables[idx],
    status: "approved",
    approvedAt: now,
    rejectedAt: undefined,
    rejectionReason: undefined,
  };

  const status = computeGlobalStatus(report.deliverables);
  const clientReady = report.deliverables.every((d) => d.status === "approved");
  const updated: ReviewReport = { ...report, status, clientReady, updatedAt: now };

  saveReviewReport(updated);
  return updated;
}

/**
 * Reject a specific deliverable by path. Returns the updated report.
 */
export function rejectDeliverable(
  sessionId: string,
  deliverablePath: string,
  reason?: string
): ReviewReport | null {
  const report = loadReviewReport(sessionId);
  if (!report) return null;

  const now = new Date().toISOString();
  const idx = report.deliverables.findIndex((d) => d.path === deliverablePath);
  if (idx === -1) return report;

  report.deliverables[idx] = {
    ...report.deliverables[idx],
    status: "rejected",
    rejectedAt: now,
    rejectionReason: reason,
    approvedAt: undefined,
  };

  const status = computeGlobalStatus(report.deliverables);
  const updated: ReviewReport = { ...report, status, clientReady: false, updatedAt: now };

  saveReviewReport(updated);
  return updated;
}
