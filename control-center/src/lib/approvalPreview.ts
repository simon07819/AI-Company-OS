import fs from "fs";
import path from "path";
import { getProfile } from "./agentProfiles";
import { getOutputById, getOutputsForSession, hasRealVisualPreview, buildVisualPreview, type OutputVisualPreview } from "./visibleOutputs";
import { getSession } from "./autopilotStore";
import { loadReviewReport } from "./deliverableReview";

// ─── Paths ────────────────────────────────────────────────────────────────

const REPO_ROOT = process.cwd();
const DATA_DIR = path.join(REPO_ROOT, "data");
const APPROVALS_PATH = path.join(DATA_DIR, "approvals.json");

// ─── Types ─────────────────────────────────────────────────────────────────

export type ApprovalType = "invoice" | "deliverable" | "logo" | "flyer" | "website" | "strategy" | "mission" | "document" | "file";

export type ApprovalStatus = "pending" | "approved" | "rejected";

export interface ApprovalItem {
  id: string;
  title: string;
  type: ApprovalType;
  status: ApprovalStatus;
  agentId: string;
  agentName: string;
  sessionId?: string;
  missionType?: string;
  createdAt: string;
  qualityScore?: number;
  summary: string;
  hasPreviewContent: boolean;
  previewType: "invoice" | "markdown" | "file_list" | "output_list" | "mission_summary" | "none";
  rejectionReason?: string;
  approvedAt?: string;
  rejectedAt?: string;
}

export interface ApprovalPreview {
  id: string;
  title: string;
  type: ApprovalType;
  agentName: string;
  createdAt: string;
  qualityScore?: number;
  content: string;            // Renderable markdown/text content
  invoice?: {                 // Populated for invoice type
    subtotal: number;
    tpsAmount: number;
    tvqAmount: number;
    total: number;
    currency: string;
    client: string;
    items: { description: string; quantity: number; unitPrice: number; total: number }[];
  };
  files?: {                   // Populated for deliverable/file types
    name: string;
    path: string;
    score?: number;
    status: string;
    preview?: string;         // First 500 chars of file content
    imageUrl?: string;
    mimeType?: string;
  }[];
  outputs?: {                 // Populated for logo/design/output types
    id: string;
    title: string;
    type: string;
    status: string;
    preview: string;
    visualKind?: "image" | "website" | "invoice" | "document" | "brand";
    colors?: string[];
    visualPreview?: OutputVisualPreview | null;
  }[];
  mission?: {                 // Populated for mission type
    name: string;
    missionType: string;
    status: string;
    progress: number;
    completedTasks: number;
    totalTasks: number;
  };
  warnings: string[];
}

interface ApprovalsData {
  approvals: ApprovalItem[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function ensureDataDir() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readApprovals(): ApprovalsData {
  ensureDataDir();
  if (!fs.existsSync(APPROVALS_PATH)) return { approvals: [] };
  try {
    return JSON.parse(fs.readFileSync(APPROVALS_PATH, "utf-8")) as ApprovalsData;
  } catch {
    return { approvals: [] };
  }
}

function writeApprovals(data: ApprovalsData) {
  ensureDataDir();
  fs.writeFileSync(APPROVALS_PATH, JSON.stringify(data, null, 2) + "\n", "utf-8");
}

const TYPE_LABELS: Record<ApprovalType, string> = {
  invoice: "Invoice",
  deliverable: "Deliverable",
  logo: "Logo / Design",
  flyer: "Flyer",
  website: "Website",
  strategy: "Strategy",
  mission: "Mission",
  document: "Document",
  file: "File",
};

export function getTypeLabel(type: ApprovalType): string {
  return TYPE_LABELS[type] ?? type;
}

// ─── Collect Pending Approvals from all sources ───────────────────────────

export function collectPendingApprovals(): ApprovalItem[] {
  const storedApprovals = readApprovals().approvals;
  const existing = storedApprovals.filter((a) => a.status === "pending");
  const collected: ApprovalItem[] = [...existing];
  const existingIds = new Set(storedApprovals.map((a) => a.id));

  // 1. Collect from visible outputs in "review" status
  try {
    const outputsDataPath = path.join(DATA_DIR, "visible-outputs.json");
    if (fs.existsSync(outputsDataPath)) {
      const outputsData = JSON.parse(fs.readFileSync(outputsDataPath, "utf-8"));
      const outputs = Array.isArray(outputsData.outputs) ? outputsData.outputs : [];
      for (const out of outputs) {
        if (out.status === "review") {
          const id = `output-${out.id}`;
          if (!existingIds.has(id)) {
            const agent = out.assignedAgent ? getProfile(out.assignedAgent as Parameters<typeof getProfile>[0]) : null;
            const typeMap: Record<string, ApprovalType> = {
              creative_brief: "document", logo_direction: "logo", style_direction: "logo",
              color_palette: "logo", typography: "logo", moodboard: "logo",
              concept_card: "strategy", architecture_doc: "document", api_spec: "document",
              sitemap: "website", wireframe: "website", copywriting: "document",
              marketing_plan: "strategy", financial_projection: "strategy",
              task_list: "mission", progress_report: "mission", validation_report: "deliverable",
              before_after: "logo",
            };
            collected.push({
              id,
              title: out.title ?? "Untitled Output",
              type: typeMap[out.type] ?? "deliverable",
              status: "pending",
              agentId: out.assignedAgent ?? "unknown",
              agentName: agent?.displayName ?? out.assignedAgent ?? "Agent",
              sessionId: out.sessionId,
              missionType: out.missionType,
              createdAt: out.createdAt ?? new Date().toISOString(),
              qualityScore: out.qualityScore,
              summary: out.preview ?? "Awaiting review",
              hasPreviewContent: hasRealVisualPreview(out),
              previewType: "output_list",
            });
          }
        }
      }
    }
  } catch { /* ignore parse errors */ }

  // 2. Collect from deliverable review reports
  try {
    const reviewPath = path.join(DATA_DIR, "review-reports.json");
    if (fs.existsSync(reviewPath)) {
      const reportsData = JSON.parse(fs.readFileSync(reviewPath, "utf-8"));
      const reports = Array.isArray(reportsData) ? reportsData : [];
      for (const report of reports) {
        if (!report.sessionId) continue;
        const pendingDeliverables = (report.deliverables ?? []).filter((d: { status: string }) => d.status === "needs_review");
        for (const deliv of pendingDeliverables) {
          const id = `deliverable-${report.sessionId}-${deliv.path}`;
          if (!existingIds.has(id)) {
            const session = getSession(report.sessionId);
            const agent = session?.assignedAgents?.[0] ? getProfile(session.assignedAgents[0].agentId as Parameters<typeof getProfile>[0]) : null;
            collected.push({
              id,
              title: deliv.name ?? deliv.path ?? "Untitled Deliverable",
              type: "deliverable",
              status: "pending",
              agentId: session?.assignedAgents?.[0]?.agentId ?? "unknown",
              agentName: agent?.displayName ?? "Agent",
              sessionId: report.sessionId,
              createdAt: deliv.reviewedAt ?? new Date().toISOString(),
              qualityScore: deliv.score,
              summary: `Score: ${deliv.score ?? "?"}/100. ${deliv.warnings?.length ?? 0} warnings.`,
              hasPreviewContent: !!(deliv.path),
              previewType: "file_list",
            });
          }
        }
      }
    }
  } catch { /* ignore */ }

  // 3. Collect pending proposals/invoices
  try {
    const revenuePath = path.join(DATA_DIR, "revenue.json");
    if (fs.existsSync(revenuePath)) {
      const revenueData = JSON.parse(fs.readFileSync(revenuePath, "utf-8"));
      const proposals = Array.isArray(revenueData.proposals) ? revenueData.proposals : [];
      for (const prop of proposals) {
        if (prop.status === "sent" || prop.status === "viewed") {
          const id = `proposal-${prop.proposalId}`;
          if (!existingIds.has(id)) {
            collected.push({
              id,
              title: `Proposal: ${prop.title ?? "Untitled"}`,
              type: "invoice",
              status: "pending",
              agentId: "cfo",
              agentName: "Diana",
              createdAt: prop.createdAt ?? new Date().toISOString(),
              summary: `Amount: $${(prop.amount ?? 0).toLocaleString()}. ${prop.missionType ?? ""} mission.`,
              hasPreviewContent: !!(prop.amount),
              previewType: "invoice",
            });
          }
        }
      }
    }
  } catch { /* ignore */ }

  return collected;
}

// ─── Get Preview for an Approval ──────────────────────────────────────────

export function getApprovalPreview(approvalId: string): ApprovalPreview | null {
  const approvals = readApprovals().approvals;
  const pendingFromCollect = collectPendingApprovals();
  let item = approvals.find((a) => a.id === approvalId) ?? pendingFromCollect.find((a) => a.id === approvalId);
  if (!item && approvalId.startsWith("output-")) {
    try {
      const output = getOutputById(approvalId.replace(/^output-/, ""));
      if (output) {
        const agent = output.assignedAgent ? getProfile(output.assignedAgent as Parameters<typeof getProfile>[0]) : null;
        item = {
          id: approvalId,
          title: output.title,
          type: ["page_preview", "hero_section", "sitemap", "wireframe"].includes(output.type) ? "website"
            : ["invoice_preview", "estimate_preview", "taxes_summary"].includes(output.type) ? "invoice"
              : ["creative_brief", "logo_direction", "style_direction", "color_palette", "typography", "moodboard", "before_after"].includes(output.type) ? "logo"
                : "document",
          status: "pending",
          agentId: output.assignedAgent,
          agentName: agent?.displayName ?? output.assignedAgent,
          sessionId: output.sessionId,
          createdAt: output.createdAt,
          summary: output.preview || output.summary,
          hasPreviewContent: true,
          previewType: "output_list",
        };
      }
    } catch { /* ignore */ }
  }
  if (!item) return null;

  const preview: ApprovalPreview = {
    id: item.id,
    title: item.title,
    type: item.type,
    agentName: item.agentName,
    createdAt: item.createdAt,
    qualityScore: item.qualityScore,
    content: item.summary,
    warnings: [],
  };

  try {
    if (item.id.startsWith("output-")) {
      const outputId = item.id.replace(/^output-/, "");
      const output = getOutputById(outputId);
      if (output) {
        const colorMatches = (output.preview ?? "").match(/#[0-9a-fA-F]{6}/g) ?? [];
        const websiteTypes = new Set(["page_preview", "hero_section", "sitemap", "wireframe"]);
        const invoiceTypes = new Set(["invoice_preview", "estimate_preview", "taxes_summary"]);
        const brandTypes = new Set(["creative_brief", "logo_direction", "style_direction", "color_palette", "typography", "moodboard", "before_after"]);
        preview.outputs = [{
          id: output.id,
          title: output.title,
          type: output.type,
          status: output.status,
          preview: output.preview ?? output.summary ?? "",
          visualKind: websiteTypes.has(output.type) ? "website"
            : invoiceTypes.has(output.type) ? "invoice"
              : brandTypes.has(output.type) ? "brand"
                : "document",
          colors: colorMatches.slice(0, 8),
          visualPreview: output.visualPreview ?? buildVisualPreview(output),
        }];
        const visual = output.visualPreview ?? buildVisualPreview(output);
        if (visual?.kind === "image" && visual.imageUrl) {
          preview.files = [{
            name: visual.imageAlt ?? output.title,
            path: visual.imageUrl,
            status: "available",
            imageUrl: visual.imageUrl,
            mimeType: "image/*",
          }];
        }
        preview.content = output.preview || output.summary || item.summary;
      }
    }
  } catch { /* ignore */ }

  // Enrich based on type
  if (item.type === "invoice" && item.id.startsWith("proposal-")) {
    try {
      const revenuePath = path.join(DATA_DIR, "revenue.json");
      if (fs.existsSync(revenuePath)) {
        const revenueData = JSON.parse(fs.readFileSync(revenuePath, "utf-8"));
        const proposals = Array.isArray(revenueData.proposals) ? revenueData.proposals : [];
        const prop = proposals.find((p: { proposalId: string }) => p.proposalId === item.id.replace("proposal-", ""));
        if (prop) {
          const invoices = Array.isArray(revenueData.invoices) ? revenueData.invoices : [];
          const inv = invoices.find((i: { proposalId: string }) => i.proposalId === prop.proposalId);
          if (inv) {
            preview.invoice = {
              subtotal: inv.subtotal ?? inv.amount ?? 0,
              tpsAmount: inv.tpsAmount ?? 0,
              tvqAmount: inv.tvqAmount ?? 0,
              total: inv.total ?? inv.amount ?? 0,
              currency: inv.currency ?? "CAD",
              client: inv.clientName ?? "Client",
              items: (inv.lineItems ?? []).map((li: { description: string; quantity: number; unitPrice: number; total: number }) => ({
                description: li.description ?? "",
                quantity: li.quantity ?? 1,
                unitPrice: li.unitPrice ?? 0,
                total: li.total ?? 0,
              })),
            };
          } else {
            preview.invoice = {
              subtotal: prop.amount ?? 0,
              tpsAmount: Math.round((prop.amount ?? 0) * 0.05 * 100) / 100,
              tvqAmount: Math.round((prop.amount ?? 0) * 0.09975 * 100) / 100,
              total: Math.round(((prop.amount ?? 0) * 1.14975) * 100) / 100,
              currency: "CAD",
              client: prop.clientName ?? "Client",
              items: [{ description: prop.title ?? prop.missionType ?? "Service", quantity: 1, unitPrice: prop.amount ?? 0, total: prop.amount ?? 0 }],
            };
          }
        }
      }
    } catch { /* ignore */ }
  }

  if (item.type === "mission" && item.sessionId) {
    const session = getSession(item.sessionId);
    if (session) {
      const completedTasks = session.tasks.filter((t: { status: string }) => t.status === "completed").length;
      preview.mission = {
        name: session.projectName,
        missionType: session.missionType ?? "",
        status: session.status,
        progress: Math.round((completedTasks / Math.max(session.tasks.length, 1)) * 100),
        completedTasks,
        totalTasks: session.tasks.length,
      };
    }
  }

  if ((item.type === "logo" || item.type === "flyer" || item.type === "deliverable") && item.sessionId) {
    try {
      const outputs = getOutputsForSession(item.sessionId);
      if (outputs.length > 0) {
        preview.outputs = outputs.map((o) => ({
          id: o.id,
          title: o.title,
          type: o.type,
          status: o.status,
          preview: o.preview ?? "",
          visualKind: ["page_preview", "hero_section", "sitemap", "wireframe"].includes(o.type) ? "website"
            : ["creative_brief", "logo_direction", "style_direction", "color_palette", "typography", "moodboard", "before_after"].includes(o.type) ? "brand"
              : "document",
          colors: (o.preview ?? "").match(/#[0-9a-fA-F]{6}/g)?.slice(0, 8) ?? [],
          visualPreview: o.visualPreview ?? buildVisualPreview(o),
        }));
      }
    } catch { /* ignore */ }
  }

  if (item.sessionId) {
    try {
      const outputs = getOutputsForSession(item.sessionId);
      const imageFileIds = Array.from(new Set(outputs.flatMap((o) => o.sourceFiles ?? [])));
      if (imageFileIds.length > 0) {
        const { getFileById } = require("./ceoUploads") as typeof import("./ceoUploads");
        const imageFiles = imageFileIds
          .map((id) => getFileById(id))
          .filter((file): file is NonNullable<ReturnType<typeof getFileById>> => !!file && file.category === "image");
        if (imageFiles.length > 0) {
          preview.files = [
            ...(preview.files ?? []),
            ...imageFiles.map((file) => ({
              name: file.name,
              path: file.storagePath,
              status: "available",
              preview: file.analysis?.summary,
              imageUrl: `/api/ceo/files/${file.id}`,
              mimeType: file.mimeType,
            })),
          ];
        }
      }
    } catch { /* uploads optional */ }
  }

  if (item.type === "deliverable" && item.sessionId) {
    try {
      const report = loadReviewReport(item.sessionId);
      if (report) {
        preview.files = report.deliverables.map((d: { path: string; name: string; score: number; status: string; warnings: string[] }) => ({
          name: d.name ?? d.path,
          path: d.path,
          score: d.score,
          status: d.status,
          preview: d.warnings?.length ? `Warnings: ${d.warnings.join(", ")}` : undefined,
        }));
      }
    } catch { /* ignore */ }
  }

  // Check for workspace file content for document/file types
  if ((item.type === "document" || item.type === "file" || item.type === "strategy") && item.sessionId) {
    try {
      const wsPath = path.join(DATA_DIR, "workspaces", item.sessionId);
      if (fs.existsSync(wsPath)) {
        const files: { name: string; path: string; score?: number; status: string; preview?: string }[] = [];
        const entries = fs.readdirSync(wsPath, { recursive: true }) as string[];
        for (const entry of entries.slice(0, 10)) {
          const fullPath = path.join(wsPath, entry);
          if (fs.statSync(fullPath).isFile()) {
            const ext = path.extname(entry).toLowerCase();
            if ([".md", ".txt", ".json", ".yaml", ".yml", ".ts", ".tsx", ".js"].includes(ext)) {
              const content = fs.readFileSync(fullPath, "utf-8");
              files.push({
                name: path.basename(entry),
                path: entry,
                status: "available",
                preview: content.slice(0, 500),
              });
            }
          }
        }
        if (files.length > 0) preview.files = files;
      }
    } catch { /* ignore */ }
  }

  // Warnings
  const hasRealPreview = !!(
    preview.invoice ||
    preview.mission ||
    preview.files?.some((file) => !!file.imageUrl || !!file.preview) ||
    preview.outputs?.some((output) => !!output.visualPreview)
  );
  if (!hasRealPreview) {
    preview.warnings.push("Aucun aperçu disponible");
  }

  return preview;
}

// ─── Approve / Reject ──────────────────────────────────────────────────────

export function approveApproval(approvalId: string): ApprovalItem | null {
  const data = readApprovals();
  const idx = data.approvals.findIndex((a) => a.id === approvalId);
  if (approvalId.startsWith("output-")) {
    try {
      const { updateOutputStatus } = require("./visibleOutputs") as typeof import("./visibleOutputs");
      updateOutputStatus(approvalId.replace(/^output-/, ""), "approved");
    } catch { /* output approval is best-effort */ }
  }
  if (idx === -1) {
    // Create entry from collected
    const collected = collectPendingApprovals();
    const item = collected.find((a) => a.id === approvalId);
    if (!item) return null;
    data.approvals.push({
      ...item,
      status: "approved",
      approvedAt: new Date().toISOString(),
    });
  } else {
    data.approvals[idx].status = "approved";
    data.approvals[idx].approvedAt = new Date().toISOString();
  }
  writeApprovals(data);
  return data.approvals.find((a) => a.id === approvalId) ?? null;
}

export function rejectApproval(approvalId: string, reason: string): ApprovalItem | null {
  const data = readApprovals();
  const idx = data.approvals.findIndex((a) => a.id === approvalId);
  if (approvalId.startsWith("output-")) {
    try {
      const { updateOutputMetadata } = require("./visibleOutputs") as typeof import("./visibleOutputs");
      updateOutputMetadata(approvalId.replace(/^output-/, ""), { status: "draft" });
    } catch { /* output rejection is best-effort */ }
  }
  if (idx === -1) {
    const collected = collectPendingApprovals();
    const item = collected.find((a) => a.id === approvalId);
    if (!item) return null;
    data.approvals.push({
      ...item,
      status: "rejected",
      rejectedAt: new Date().toISOString(),
      rejectionReason: reason,
    });
  } else {
    data.approvals[idx].status = "rejected";
    data.approvals[idx].rejectedAt = new Date().toISOString();
    data.approvals[idx].rejectionReason = reason;
  }
  writeApprovals(data);
  return data.approvals.find((a) => a.id === approvalId) ?? null;
}

export function getPendingApprovals(): ApprovalItem[] {
  return collectPendingApprovals().filter((a) => a.status === "pending");
}

export function getAllApprovals(): ApprovalItem[] {
  return readApprovals().approvals;
}
