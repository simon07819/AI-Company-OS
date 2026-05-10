"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Archive,
  ArrowRight,
  Bot,
  CheckCircle2,
  CircleDot,
  Clock3,
  Code2,
  Cpu,
  Eye,
  FastForward,
  FileText,
  FolderOpen,
  Hammer,
  Layers3,
  Package,
  Pause,
  Play,
  Radio,
  RefreshCw,
  Repeat,
  Rocket,
  RotateCcw,
  ShieldCheck,
  Star,
  Terminal,
  ThumbsDown,
  ThumbsUp,
  Zap,
} from "lucide-react";

type SessionStatus = "draft" | "running" | "paused" | "completed" | "failed";
type TaskStatus = "queued" | "running" | "completed" | "blocked" | "failed";
type LogLevel = "info" | "success" | "warning" | "error";

interface AutopilotTask {
  id: string;
  title: string;
  description: string;
  phase: string;
  agent: string;
  status: TaskStatus;
  priority: number;
  progress: number;
  dependencies: string[];
  createdAt: string;
  updatedAt: string;
}

interface AutopilotLog {
  id: string;
  timestamp: string;
  level: LogLevel;
  agent: string;
  message: string;
  source: string;
}

interface AutopilotAgentAssignment {
  agentId: string;
  role: string;
  status: string;
  provider: string;
}

interface AutopilotRuntime {
  status: string;
  provider: string;
  activeWorkers: number;
  lastEvent: string;
}

interface AutopilotSession {
  sessionId: string;
  projectName: string;
  projectIdea: string;
  productType: string | null;
  template: string | null;
  stack: string | null;
  missionType: string;
  loopMode: string | null;
  loopStatus: string | null;
  nextRunAt: string | null;
  lastRunAt: string | null;
  loopHistory: { ranAt: string; tasksCreated: number; result: string; message: string }[];
  status: SessionStatus;
  currentPhase: string;
  progress: number;
  assignedAgents: AutopilotAgentAssignment[];
  roadmap: string[];
  tasks: AutopilotTask[];
  logs: AutopilotLog[];
  runtime: AutopilotRuntime;
  createdAt: string;
  updatedAt: string;
}

interface ReviewReport {
  sessionId: string;
  globalScore: number;
  status: string;
  deliverables: Array<{
    path: string;
    name: string;
    score: number;
    status: string;
    checks: Array<{ name: string; passed: boolean; detail: string }>;
    warnings: string[];
    reviewedAt: string;
    approvedAt?: string;
    rejectedAt?: string;
    rejectionReason?: string;
  }>;
  clientReady: boolean;
  generatedAt: string;
  updatedAt: string;
}

interface DeliveryFile {
  path: string;
  name: string;
  size: number;
}

interface DeliveryPackage {
  sessionId: string;
  generatedAt: string;
  clientReady: boolean;
  qualityScore: number;
  files: DeliveryFile[];
  manifest: {
    projectName: string;
    missionType: string;
    qualityScore: number;
    clientReady: boolean;
    deliverableCount: number;
    approvedCount: number;
    rejectedCount: number;
    pendingCount: number;
    blockers: string[];
    recommendations: string[];
  };
}

const REVIEW_STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  draft:        { label: "DRAFT",        color: "#8b97b2", bg: "rgba(139,151,178,0.1)" },
  needs_review: { label: "NEEDS REVIEW", color: "#f59e0b", bg: "rgba(245,158,11,0.12)" },
  approved:     { label: "APPROVED",     color: "#34d399", bg: "rgba(52,211,153,0.12)" },
  rejected:     { label: "REJECTED",     color: "#f43f5e", bg: "rgba(244,63,94,0.12)" },
};

const STATUS_CONFIG: Record<SessionStatus, { label: string; color: string; bg: string }> = {
  running:   { label: "RUNNING",   color: "#34d399", bg: "rgba(16,185,129,0.12)" },
  paused:    { label: "PAUSED",    color: "#f59e0b", bg: "rgba(245,158,11,0.12)" },
  completed: { label: "COMPLETED", color: "#38bdf8", bg: "rgba(59,130,246,0.12)" },
  failed:    { label: "FAILED",    color: "#f43f5e", bg: "rgba(244,63,94,0.12)" },
  draft:     { label: "DRAFT",     color: "#8b97b2", bg: "rgba(139,151,178,0.1)" },
};

const TASK_STATUS_CONFIG: Record<TaskStatus, { label: string; color: string; bg: string }> = {
  queued:    { label: "QUEUED",    color: "#8b97b2", bg: "rgba(139,151,178,0.08)" },
  running:   { label: "RUNNING",   color: "#34d399", bg: "rgba(16,185,129,0.10)" },
  completed: { label: "DONE",      color: "#38bdf8", bg: "rgba(59,130,246,0.10)" },
  blocked:   { label: "BLOCKED",   color: "#f59e0b", bg: "rgba(245,158,11,0.10)" },
  failed:    { label: "FAILED",    color: "#f43f5e", bg: "rgba(244,63,94,0.10)" },
};

const LOG_LEVEL_CONFIG: Record<LogLevel, { color: string; label: string }> = {
  info:    { color: "#38bdf8", label: "INFO" },
  success: { color: "#34d399", label: "OK" },
  warning: { color: "#f59e0b", label: "WARN" },
  error:   { color: "#f43f5e", label: "ERR" },
};

const PHASE_ORDER = ["idea", "planning", "architecture", "frontend", "backend", "validation", "build", "runtime"];

const PHASE_LABELS: Record<string, string> = {
  idea: "Idea Analysis",
  planning: "Product Planning",
  architecture: "Architecture Design",
  frontend: "Frontend Tasks",
  backend: "Backend Tasks",
  validation: "Validation",
  build: "Build Preparation",
  runtime: "Runtime Monitoring",
};

const AGENT_COLORS: Record<string, string> = {
  product_agent: "#a78bfa",
  architect_agent: "#f59e0b",
  frontend_agent: "#3b82f6",
  backend_agent: "#22c55e",
  qa_agent: "#ef4444",
  devops_agent: "#6c63ff",
};

const MISSION_LABELS: Record<string, string> = {
  saas_project: "SaaS Project",
  website: "Website",
  branding_pack: "Branding Pack",
  flyer: "Flyer",
  business_card: "Business Card",
  ecommerce_store: "E-Commerce Store",
  social_campaign: "Social Campaign",
  automation_workflow: "Automation Workflow",
};

const MISSION_DELIVERABLES: Record<string, { name: string; path: string }[]> = {
  saas_project: [
    { name: "SaaS Application", path: "project/" },
    { name: "Product Brief", path: "product/brief.md" },
    { name: "System Design", path: "architecture/system-design.md" },
  ],
  website: [
    { name: "Website", path: "project/" },
    { name: "Site Brief", path: "product/brief.md" },
    { name: "UI Plan", path: "frontend/ui-plan.md" },
  ],
  branding_pack: [
    { name: "Brand Guidelines", path: "brand/guidelines.md" },
    { name: "Color Palette", path: "brand/colors.md" },
    { name: "Typography Guide", path: "brand/typography.md" },
  ],
  flyer: [
    { name: "Flyer Layout", path: "deliverables/flyer.md" },
    { name: "Copy Draft", path: "product/brief.md" },
  ],
  business_card: [
    { name: "Business Card", path: "deliverables/business-card.md" },
    { name: "Print Specs", path: "deliverables/print-specs.md" },
  ],
  ecommerce_store: [
    { name: "E-Commerce App", path: "project/" },
    { name: "Product Catalog", path: "product/brief.md" },
    { name: "API Plan", path: "backend/api-plan.md" },
  ],
  social_campaign: [
    { name: "Campaign Plan", path: "campaign/plan.md" },
    { name: "Content Calendar", path: "campaign/calendar.md" },
    { name: "Creative Templates", path: "deliverables/creatives.md" },
  ],
  automation_workflow: [
    { name: "Workflow Definition", path: "workflow/definition.md" },
    { name: "Integration Map", path: "architecture/system-design.md" },
    { name: "Pipeline Code", path: "backend/services.md" },
  ],
};

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString("en-CA", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });
  } catch {
    return "--:--:--";
  }
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-CA", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch {
    return iso;
  }
}

export default function AutopilotSessionPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = (() => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const [id, setId] = useState("");
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useEffect(() => {
      params.then((p) => setId(p.sessionId));
    }, [params]);
    return { sessionId: id };
  })();

  const router = useRouter();
  const [session, setSession] = useState<AutopilotSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [logFilter, setLogFilter] = useState<string>("all");
  const [workspaceFiles, setWorkspaceFiles] = useState<{ path: string; name: string; size: number }[]>([]);
  const [workspaceExists, setWorkspaceExists] = useState(false);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [selectedFileContent, setSelectedFileContent] = useState<string | null>(null);
  const [projectExists, setProjectExists] = useState(false);
  const [projectFiles, setProjectFiles] = useState<{ path: string; name: string; size: number }[]>([]);
  const [generatingProject, setGeneratingProject] = useState(false);
  const [deliverableFiles, setDeliverableFiles] = useState<{ path: string; name: string; size: number }[]>([]);
  const [deliverableExists, setDeliverableExists] = useState(false);
  const [selectedDelivFile, setSelectedDelivFile] = useState<string | null>(null);
  const [selectedDelivContent, setSelectedDelivContent] = useState<string | null>(null);
  const [generatingDeliverables, setGeneratingDeliverables] = useState(false);
  const [validation, setValidation] = useState<{
    ok: boolean;
    score: number;
    checks: { name: string; path: string; passed: boolean; message: string }[];
    warnings: string[];
    generatedAt: string;
  } | null>(null);
  const [validatingProject, setValidatingProject] = useState(false);
  const [review, setReview] = useState<ReviewReport | null>(null);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewActionLoading, setReviewActionLoading] = useState<string | null>(null);
  const [deliveryPkg, setDeliveryPkg] = useState<DeliveryPackage | null>(null);
  const [generatingPkg, setGeneratingPkg] = useState(false);
  const [selectedDeliveryFile, setSelectedDeliveryFile] = useState<string | null>(null);
  const [selectedDeliveryContent, setSelectedDeliveryContent] = useState<string | null>(null);

  const loadWorkspace = async () => {
    if (!sessionId) return;
    try {
      const res = await fetch(`/api/autopilot/sessions/${sessionId}/workspace`, { cache: "no-store" });
      const payload = (await res.json()) as {
        ok: boolean;
        summary?: {
          exists: boolean;
          fileCount: number;
          totalSize: number;
          files: { path: string; name: string; size: number; modifiedAt: string }[];
        };
      };
      if (payload.ok && payload.summary) {
        setWorkspaceExists(payload.summary.exists);
        setWorkspaceFiles(payload.summary.files);
        // Detect project scaffold
        const pFiles = payload.summary.files.filter((f) => f.path.startsWith("project/"));
        setProjectExists(pFiles.some((f) => f.path === "project/package.json"));
        setProjectFiles(pFiles);
      }
    } catch {
      // ignore
    }
  };

  const loadDeliverables = async () => {
    if (!sessionId) return;
    try {
      const res = await fetch(`/api/autopilot/sessions/${sessionId}/deliverables`, { cache: "no-store" });
      const payload = (await res.json()) as { ok: boolean; exists?: boolean; files?: { path: string; name: string; size: number }[] };
      if (payload.ok) {
        setDeliverableExists(payload.exists ?? false);
        setDeliverableFiles(payload.files ?? []);
      }
    } catch {
      // ignore
    }
  };

  const loadDelivFileContent = async (filePath: string) => {
    if (!sessionId) return;
    try {
      const res = await fetch(`/api/autopilot/sessions/${sessionId}/workspace/file?path=${encodeURIComponent(filePath)}`, { cache: "no-store" });
      const payload = (await res.json()) as { ok: boolean; content?: string };
      if (payload.ok && payload.content !== undefined) {
        setSelectedDelivFile(filePath);
        setSelectedDelivContent(payload.content);
      }
    } catch {
      // ignore
    }
  };

  const handleGenerateDeliverables = async () => {
    if (!sessionId) return;
    setGeneratingDeliverables(true);
    try {
      const res = await fetch(`/api/autopilot/sessions/${sessionId}/generate-deliverables`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const payload = (await res.json()) as { ok: boolean; files?: { path: string; name: string; size: number }[] };
      if (payload.ok) {
        await loadDeliverables();
      }
    } catch {
      // ignore
    } finally {
      setGeneratingDeliverables(false);
    }
  };

  const loadFileContent = async (filePath: string) => {
    if (!sessionId) return;
    try {
      const res = await fetch(`/api/autopilot/sessions/${sessionId}/workspace/file?path=${encodeURIComponent(filePath)}`, { cache: "no-store" });
      const payload = (await res.json()) as { ok: boolean; content?: string };
      if (payload.ok && payload.content !== undefined) {
        setSelectedFile(filePath);
        setSelectedFileContent(payload.content);
      }
    } catch {
      // ignore
    }
  };

  const loadSession = async () => {
    if (!sessionId) return;
    try {
      const res = await fetch(`/api/autopilot/sessions/${sessionId}`, { cache: "no-store" });
      const payload = (await res.json()) as { ok: boolean; session?: AutopilotSession };
      if (payload.ok && payload.session) {
        setSession(payload.session);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadSession();
    void loadWorkspace();
    void loadDeliverables();
    void loadValidation();
    void loadReview();
    void loadDeliveryPkg();
    const iv = setInterval(() => { void loadSession(); void loadWorkspace(); void loadDeliverables(); void loadReview(); void loadDeliveryPkg(); }, 4000);
    return () => clearInterval(iv);
  }, [sessionId]);

  const handleAction = async (action: string) => {
    if (!sessionId) return;
    setActionLoading(action);
    try {
      const res = await fetch(`/api/autopilot/sessions/${sessionId}/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const payload = (await res.json()) as { ok: boolean; session?: AutopilotSession };
      if (payload.ok && payload.session) {
        setSession(payload.session);
      }
    } catch {
      // ignore
    } finally {
      setActionLoading(null);
    }
  };

  const handleGenerateProject = async () => {
    if (!sessionId) return;
    setGeneratingProject(true);
    try {
      const res = await fetch(`/api/autopilot/sessions/${sessionId}/generate-project`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const payload = (await res.json()) as { ok: boolean; session?: AutopilotSession; existing?: boolean };
      if (payload.ok && payload.session) {
        setSession(payload.session);
      }
      await loadWorkspace();
    } catch {
      // ignore
    } finally {
      setGeneratingProject(false);
    }
  };

  const handleValidateProject = async () => {
    if (!sessionId) return;
    setValidatingProject(true);
    try {
      const res = await fetch(`/api/autopilot/sessions/${sessionId}/validate-project`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const payload = (await res.json()) as { ok: boolean; validation?: typeof validation; session?: AutopilotSession };
      if (payload.ok && payload.validation) {
        setValidation(payload.validation);
      }
      if (payload.session) {
        setSession(payload.session);
      }
    } catch {
      // ignore
    } finally {
      setValidatingProject(false);
    }
  };

  const loadValidation = async () => {
    if (!sessionId) return;
    try {
      const res = await fetch(`/api/autopilot/sessions/${sessionId}/validate-project`, { cache: "no-store" });
      const payload = (await res.json()) as { ok: boolean; validation?: typeof validation };
      if (payload.ok && payload.validation) {
        setValidation(payload.validation);
      }
    } catch {
      // ignore
    }
  };

  const loadReview = async () => {
    if (!sessionId) return;
    try {
      const res = await fetch(`/api/autopilot/sessions/${sessionId}/reviews`, { cache: "no-store" });
      const payload = (await res.json()) as { ok: boolean; report?: ReviewReport | null };
      if (payload.ok) setReview(payload.report ?? null);
    } catch {
      // ignore
    }
  };

  const handleRunReview = async () => {
    if (!sessionId) return;
    setReviewLoading(true);
    try {
      const res = await fetch(`/api/autopilot/sessions/${sessionId}/review-deliverables`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const payload = (await res.json()) as { ok: boolean; report?: ReviewReport };
      if (payload.ok && payload.report) setReview(payload.report);
    } catch {
      // ignore
    } finally {
      setReviewLoading(false);
    }
  };

  const handleApprove = async (delivPath: string) => {
    if (!sessionId) return;
    setReviewActionLoading(delivPath);
    try {
      const res = await fetch(`/api/autopilot/sessions/${sessionId}/approve-deliverable`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: delivPath }),
      });
      const payload = (await res.json()) as { ok: boolean; report?: ReviewReport };
      if (payload.ok && payload.report) setReview(payload.report);
    } catch {
      // ignore
    } finally {
      setReviewActionLoading(null);
    }
  };

  const handleReject = async (delivPath: string) => {
    if (!sessionId) return;
    setReviewActionLoading(delivPath + ":reject");
    try {
      const res = await fetch(`/api/autopilot/sessions/${sessionId}/reject-deliverable`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: delivPath }),
      });
      const payload = (await res.json()) as { ok: boolean; report?: ReviewReport };
      if (payload.ok && payload.report) setReview(payload.report);
    } catch {
      // ignore
    } finally {
      setReviewActionLoading(null);
    }
  };

  const loadDeliveryPkg = async () => {
    if (!sessionId) return;
    try {
      const res = await fetch(`/api/autopilot/sessions/${sessionId}/delivery-package`, { cache: "no-store" });
      const payload = (await res.json()) as { ok: boolean; package?: DeliveryPackage };
      if (payload.ok && payload.package) setDeliveryPkg(payload.package);
    } catch {
      // ignore
    }
  };

  const handleGeneratePkg = async () => {
    if (!sessionId) return;
    setGeneratingPkg(true);
    try {
      const res = await fetch(`/api/autopilot/sessions/${sessionId}/generate-delivery-package`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const payload = (await res.json()) as { ok: boolean; package?: DeliveryPackage };
      if (payload.ok && payload.package) setDeliveryPkg(payload.package);
    } catch {
      // ignore
    } finally {
      setGeneratingPkg(false);
    }
  };

  const loadDeliveryFileContent = async (filePath: string) => {
    if (!sessionId) return;
    try {
      const res = await fetch(`/api/autopilot/sessions/${sessionId}/workspace/file?path=${encodeURIComponent(filePath)}`, { cache: "no-store" });
      const payload = (await res.json()) as { ok: boolean; content?: string };
      if (payload.ok && payload.content !== undefined) {
        setSelectedDeliveryFile(filePath);
        setSelectedDeliveryContent(payload.content);
      }
    } catch {
      // ignore
    }
  };

  if (loading) {
    return (
      <main className="page" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "50vh" }}>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
          style={{ fontSize: 24 }}
        >
          ⚙️
        </motion.div>
      </main>
    );
  }

  if (!session) {
    return (
      <main className="page" style={{ textAlign: "center", paddingTop: 80 }}>
        <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.3 }}>🔍</div>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--text)", marginBottom: 8 }}>Session Not Found</h2>
        <p style={{ color: "var(--text-3)", fontSize: 13, marginBottom: 20 }}>This autopilot session does not exist or has been removed.</p>
        <Link href="/autopilot" className="btn" style={{ textDecoration: "none" }}>
          Back to Sessions
        </Link>
      </main>
    );
  }

  const cfg = STATUS_CONFIG[session.status];
  const currentPhaseIndex = PHASE_ORDER.indexOf(session.currentPhase);
  const tasksByPhase = PHASE_ORDER.map((phase) => ({
    phase,
    label: PHASE_LABELS[phase],
    tasks: session.tasks.filter((t) => t.phase === phase),
  }));

  const filteredLogs = session.logs.filter((log) => {
    if (logFilter === "all") return true;
    return log.level === logFilter || log.agent === logFilter;
  });

  return (
    <main className="page" style={{ maxWidth: 1100 }}>
      {/* ── HEADER ── */}
      <div style={{ marginBottom: 24 }}>
        <Link href="/autopilot" style={{ fontSize: 13, color: "var(--text-3)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 5, marginBottom: 14 }}>
          &larr; Autopilot Sessions
        </Link>

        <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12,
            background: cfg.bg,
            border: `1px solid ${cfg.color}30`,
            display: "flex", alignItems: "center", justifyContent: "center",
            color: cfg.color,
            fontSize: 20,
          }}>
            <Rocket size={22} />
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.4px", color: "var(--text)", margin: 0 }}>
                {session.projectName}
              </h1>
              <span style={{
                fontSize: 9, fontWeight: 700, letterSpacing: "0.5px",
                padding: "3px 10px", borderRadius: 99,
                color: cfg.color, background: cfg.bg,
                display: "flex", alignItems: "center", gap: 4,
              }}>
                {cfg.label}
              </span>
              <span style={{ fontFamily: "ui-monospace, monospace", fontSize: 10, color: "var(--text-3)" }}>
                {session.sessionId.slice(0, 16)}
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 6 }}>
              <span style={{ fontSize: 12, color: "var(--text-2)" }}>
                Phase: <strong style={{ color: "var(--text)" }}>{PHASE_LABELS[session.currentPhase] ?? session.currentPhase}</strong>
              </span>
              <span style={{ fontSize: 12, color: "var(--text-2)" }}>
                Progress: <strong style={{ color: cfg.color }}>{session.progress}%</strong>
              </span>
            </div>
          </div>

          {/* Progress ring */}
          <div style={{ position: "relative", width: 56, height: 56, flexShrink: 0 }}>
            <svg width={56} height={56} style={{ transform: "rotate(-90deg)" }}>
              <circle cx={28} cy={28} r={24} fill="none" stroke="var(--border)" strokeWidth={4} />
              <circle
                cx={28} cy={28} r={24} fill="none" stroke={cfg.color}
                strokeWidth={4} strokeLinecap="round"
                strokeDasharray={`${(session.progress / 100) * 150.8} 150.8`}
              />
            </svg>
            <span style={{
              position: "absolute", inset: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 13, fontWeight: 800, color: cfg.color,
            }}>
              {session.progress}%
            </span>
          </div>
        </div>
      </div>

      {/* ── CONTROL BUTTONS ── */}
      <div style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" }}>
        {[
          { id: "run-step", label: "Run Next Step", icon: <Play size={14} />, color: "#34d399", disabled: session.status === "completed" || session.status === "failed" || actionLoading !== null },
          { id: "run-all",  label: "Run All Local",  icon: <FastForward size={14} />, color: "#6366f1", disabled: session.status === "completed" || session.status === "failed" || actionLoading !== null },
        ].map(({ id, label, icon, color, disabled }) => (
          <button
            key={id}
            onClick={() => handleAction(id)}
            disabled={disabled}
            style={{
              padding: "8px 16px", borderRadius: "var(--radius-sm)",
              background: disabled ? "var(--surface-2)" : `${color}14`,
              border: `1px solid ${disabled ? "var(--border-2)" : `${color}30`}`,
              color: disabled ? "var(--text-3)" : color,
              fontWeight: 600, fontSize: 12, cursor: disabled ? "not-allowed" : "pointer",
              fontFamily: "inherit", display: "flex", alignItems: "center", gap: 6,
              opacity: disabled ? 0.5 : 1,
              transition: "all 140ms ease",
            }}
          >
            {actionLoading === id ? <motion.span animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }} style={{ display: "inline-block" }}>⚙</motion.span> : icon}
            {label}
          </button>
        ))}

        <div style={{ width: 1, height: 28, background: "var(--border)", alignSelf: "center" }} />

        {[
          { id: "continue", label: "Resume", icon: <Play size={14} />, color: "#34d399", disabled: session.status !== "paused" },
          { id: "pause",    label: "Pause", icon: <Pause size={14} />, color: "#f59e0b", disabled: session.status !== "running" },
          { id: "retry",    label: "Retry Failed", icon: <RotateCcw size={14} />, color: "#a78bfa", disabled: !session.tasks.some((t) => t.status === "failed" || t.status === "blocked") },
        ].map(({ id, label, icon, color, disabled }) => (
          <button
            key={id}
            onClick={() => handleAction(id)}
            disabled={disabled || actionLoading === id}
            style={{
              padding: "8px 16px", borderRadius: "var(--radius-sm)",
              background: disabled ? "var(--surface-2)" : `${color}14`,
              border: `1px solid ${disabled ? "var(--border-2)" : `${color}30`}`,
              color: disabled ? "var(--text-3)" : color,
              fontWeight: 600, fontSize: 12, cursor: disabled ? "not-allowed" : "pointer",
              fontFamily: "inherit", display: "flex", alignItems: "center", gap: 6,
              opacity: disabled ? 0.5 : 1,
              transition: "all 140ms ease",
            }}
          >
            {actionLoading === id ? <motion.span animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }} style={{ display: "inline-block" }}>⚙</motion.span> : icon}
            {label}
          </button>
        ))}

        <div style={{ width: 1, height: 28, background: "var(--border)", alignSelf: "center" }} />

        {[
          { href: "/operations/live", label: "Live Ops", icon: <Activity size={14} /> },
          { href: "/logs",            label: "Logs",     icon: <FileText size={14} /> },
          { href: "/runtime",         label: "Runtime",  icon: <Cpu size={14} /> },
        ].map(({ href, label, icon }) => (
          <Link
            key={href}
            href={href}
            style={{
              padding: "8px 16px", borderRadius: "var(--radius-sm)",
              background: "var(--surface)",
              border: "1px solid var(--border)",
              color: "var(--text-2)", fontWeight: 600, fontSize: 12,
              textDecoration: "none",
              display: "flex", alignItems: "center", gap: 6,
              transition: "all 140ms ease",
            }}
          >
            {icon} {label}
          </Link>
        ))}

        <button
          className="btn btn-ghost"
          type="button"
          onClick={() => loadSession()}
          style={{ marginLeft: "auto" }}
        >
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* ── OVERVIEW ── */}
      <section style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "18px 22px", marginBottom: 20 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: 12 }}>Overview</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 14 }}>
          {[
            { label: "Idea", value: session.projectIdea },
            { label: "Mission Type", value: session.missionType ? MISSION_LABELS[session.missionType] ?? session.missionType : "SaaS Project" },
            { label: "Product Type", value: session.productType ?? "—" },
            { label: "Template", value: session.template ?? "—" },
            { label: "Stack", value: session.stack ?? "—" },
            { label: "Created", value: formatDate(session.createdAt) },
            { label: "Updated", value: formatDate(session.updatedAt) },
          ].map(({ label, value }) => (
            <div key={label}>
              <div style={{ fontSize: 10, fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 4 }}>{label}</div>
              <div style={{ fontSize: 13, color: "var(--text)", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{value}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── ROADMAP ── */}
      <section style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "18px 22px", marginBottom: 20 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: 12 }}>
          <Layers3 size={12} style={{ display: "inline", marginRight: 4 }} /> Roadmap
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {session.roadmap.map((step, i) => {
            const isActive = i <= currentPhaseIndex;
            const color = isActive ? "#6366f1" : "var(--text-3)";
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.06 }}
                style={{ display: "flex", alignItems: "center", gap: 10 }}
              >
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
                  <div style={{
                    width: 10, height: 10, borderRadius: "50%",
                    background: isActive ? "#6366f1" : "var(--border)",
                    marginTop: 2,
                  }} />
                  {i < session.roadmap.length - 1 && (
                    <div style={{ width: 1, height: 20, background: isActive ? "#6366f1" : "var(--border)", marginTop: 2 }} />
                  )}
                </div>
                <span style={{ fontSize: 13, color, fontWeight: isActive ? 600 : 400, lineHeight: 1.4 }}>
                  {step}
                </span>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* ── PHASE PROGRESS ── */}
      <section style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "18px 22px", marginBottom: 20 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: 14 }}>Phase Progress</div>
        <div style={{ display: "flex", gap: 4, marginBottom: 8 }}>
          {PHASE_ORDER.map((phase, i) => {
            const isCurrent = i === currentPhaseIndex;
            const isDone = i < currentPhaseIndex;
            const phaseTasks = session.tasks.filter((t) => t.phase === phase);
            const done = phaseTasks.filter((t) => t.status === "completed").length;
            const total = phaseTasks.length;
            return (
              <div
                key={phase}
                title={`${PHASE_LABELS[phase]}: ${done}/${total}`}
                style={{
                  flex: 1, height: 28, borderRadius: "var(--radius-sm)",
                  background: isDone ? "#6366f1" : isCurrent ? "#6366f140" : "var(--border)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 9, fontWeight: 700, color: isDone || isCurrent ? "#fff" : "var(--text-3)",
                  letterSpacing: "0.3px",
                  transition: "all 200ms ease",
                }}
              >
                {PHASE_LABELS[phase].split(" ")[0]}
              </div>
            );
          })}
        </div>
      </section>

      {/* ── AGENT TEAM ── */}
      <section style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "18px 22px", marginBottom: 20 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: 14 }}>
          <Bot size={12} style={{ display: "inline", marginRight: 4 }} /> Agent Team
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 10 }}>
          {session.assignedAgents.map((agent) => {
            const agentColor = AGENT_COLORS[agent.agentId] ?? "#8b97b2";
            const isDone = agent.status === "done";
            const isActive = agent.status === "active";
            return (
              <div key={agent.agentId} style={{
                background: "var(--bg-2)", border: `1px solid ${agentColor}20`,
                borderRadius: "var(--radius-sm)", padding: "12px 14px",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <div style={{
                    width: 8, height: 8, borderRadius: "50%",
                    background: isDone ? "#38bdf8" : isActive ? "#34d399" : "var(--text-3)",
                    boxShadow: isActive ? "0 0 8px #34d39960" : "none",
                  }} />
                  <span style={{ fontSize: 12, fontWeight: 700, color: agentColor, fontFamily: "ui-monospace, monospace" }}>
                    {agent.agentId}
                  </span>
                </div>
                <div style={{ fontSize: 11, color: "var(--text-2)", marginBottom: 4 }}>{agent.role}</div>
                <div style={{ fontSize: 10, color: "var(--text-3)" }}>
                  {agent.provider}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── TASK TIMELINE ── */}
      <section style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "18px 22px", marginBottom: 20 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: 14 }}>Task Timeline</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {tasksByPhase.filter((p) => p.tasks.length > 0).map(({ phase, label, tasks }) => {
            const phaseActive = phase === session.currentPhase;
            return (
              <div key={phase}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <span style={{
                    fontSize: 11, fontWeight: 700,
                    color: phaseActive ? "#6366f1" : "var(--text-3)",
                    textTransform: "uppercase", letterSpacing: "0.5px",
                  }}>
                    {label}
                  </span>
                  <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
                  <span style={{ fontSize: 10, color: "var(--text-3)" }}>
                    {tasks.filter((t) => t.status === "completed").length}/{tasks.length}
                  </span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {tasks.map((task) => {
                    const tc = TASK_STATUS_CONFIG[task.status];
                    const ac = AGENT_COLORS[task.agent] ?? "#8b97b2";
                    // Check if any log mentions an artifact for this task's agent
                    const hasArtifact = task.status === "completed" && session.logs.some(
                      (log) => log.agent === task.agent && log.source === "workspace" && log.message.startsWith("Artifact generated:")
                    );
                    return (
                      <div key={task.id} style={{
                        display: "flex", alignItems: "center", gap: 10,
                        padding: "8px 12px",
                        background: tc.bg,
                        borderLeft: `2px solid ${tc.color}`,
                        borderRadius: "0 var(--radius-sm) var(--radius-sm) 0",
                      }}>
                        <span style={{
                          fontSize: 9, fontWeight: 700,
                          padding: "1px 6px", borderRadius: 4,
                          background: tc.bg, color: tc.color,
                          fontFamily: "ui-monospace, monospace",
                        }}>
                          {tc.label}
                        </span>
                        <span style={{ flex: 1, fontSize: 12, fontWeight: 600, color: "var(--text)" }}>
                          {task.title}
                        </span>
                        {hasArtifact && (
                          <span style={{
                            fontSize: 9, fontWeight: 700,
                            padding: "1px 7px", borderRadius: 4,
                            background: "rgba(99,102,241,0.12)", color: "#818cf8",
                            display: "flex", alignItems: "center", gap: 3,
                            fontFamily: "ui-monospace, monospace",
                          }}>
                            <Package size={9} /> Artifact
                          </span>
                        )}
                        <span style={{ fontSize: 10, color: ac, fontFamily: "ui-monospace, monospace", flexShrink: 0 }}>
                          {task.agent.replace("_agent", "")}
                        </span>
                        <span style={{ fontSize: 10, color: "var(--text-3)", flexShrink: 0 }}>P{task.priority}</span>
                        {task.progress > 0 && task.status === "running" && (
                          <span style={{ fontSize: 10, color: "var(--text-3)" }}>{task.progress}%</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── LIVE LOGS ── */}
      <section style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "18px 22px", marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.6px" }}>
            <Radio size={12} style={{ display: "inline", marginRight: 4 }} /> Live Logs
          </div>
          <div style={{ display: "flex", gap: 4 }}>
            {["all", "info", "success", "warning", "error"].map((f) => (
              <button
                key={f}
                onClick={() => setLogFilter(f)}
                style={{
                  padding: "2px 8px", borderRadius: 4,
                  fontSize: 10, fontWeight: 600, cursor: "pointer",
                  border: "1px solid",
                  borderColor: logFilter === f ? "var(--accent)" : "var(--border)",
                  background: logFilter === f ? "var(--accent-dim)" : "transparent",
                  color: logFilter === f ? "var(--accent-light)" : "var(--text-3)",
                  transition: "all 120ms ease",
                }}
              >
                {f === "all" ? "All" : LOG_LEVEL_CONFIG[f as LogLevel].label}
              </button>
            ))}
          </div>
        </div>
        <div style={{ maxHeight: 260, overflowY: "auto", display: "flex", flexDirection: "column", gap: 3 }}>
          <AnimatePresence initial={false}>
            {filteredLogs.slice(0, 30).map((log) => {
              const lc = LOG_LEVEL_CONFIG[log.level];
              return (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.15 }}
                  style={{
                    display: "flex", alignItems: "flex-start", gap: 8,
                    padding: "5px 8px", borderRadius: 4,
                    background: "rgba(255,255,255,0.02)",
                    fontFamily: "ui-monospace, monospace", fontSize: 11,
                  }}
                >
                  <span style={{ color: "var(--text-3)", flexShrink: 0, minWidth: 60 }}>{formatTime(log.timestamp)}</span>
                  <span style={{ color: lc.color, fontWeight: 700, flexShrink: 0, width: 32 }}>{lc.label}</span>
                  <span style={{ color: AGENT_COLORS[log.agent] ?? "var(--text-3)", flexShrink: 0, minWidth: 90 }}>{log.agent.replace("_agent", "")}</span>
                  <span style={{ color: "var(--text-2)", flex: 1 }}>{log.message}</span>
                  {(log.source === "nvidia" || log.source === "simulation") && (
                    <span style={{
                      flexShrink: 0, fontSize: 9, fontWeight: 700, padding: "1px 5px", borderRadius: 3,
                      background: log.source === "nvidia" ? "rgba(34,197,94,0.12)" : "rgba(148,163,184,0.12)",
                      color: log.source === "nvidia" ? "#22c55e" : "#94a3b8",
                      border: `1px solid ${log.source === "nvidia" ? "rgba(34,197,94,0.25)" : "rgba(148,163,184,0.2)"}`,
                    }}>
                      {log.source === "nvidia" ? "NVIDIA" : "SIM"}
                    </span>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
          {filteredLogs.length === 0 && (
            <div style={{ padding: 20, textAlign: "center", color: "var(--text-3)", fontSize: 12 }}>No logs match the filter.</div>
          )}
        </div>
      </section>

      {/* ── PROJECT WORKSPACE ── */}
      <section style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "18px 22px", marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.6px" }}>
            <FolderOpen size={12} style={{ display: "inline", marginRight: 4 }} /> Project Workspace
          </div>
          <button
            onClick={() => loadWorkspace()}
            style={{
              padding: "3px 10px", borderRadius: 4,
              fontSize: 10, fontWeight: 600, cursor: "pointer",
              border: "1px solid var(--border)",
              background: "var(--surface-2)", color: "var(--text-3)",
              display: "flex", alignItems: "center", gap: 4,
              transition: "all 120ms ease",
            }}
          >
            <RefreshCw size={10} /> Refresh
          </button>
        </div>

        {!workspaceExists ? (
          <div style={{ padding: 20, textAlign: "center", color: "var(--text-3)", fontSize: 12 }}>
            Workspace not yet created. Run a step to generate project files.
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: workspaceFiles.length > 0 ? "280px 1fr" : "1fr", gap: 12 }}>
            {/* File list grouped by folder */}
            <div style={{ maxHeight: 380, overflowY: "auto" }}>
              {(() => {
                // Group files by directory
                const groups: { folder: string; label: string; color: string; files: typeof workspaceFiles }[] = [];
                const ARTIFACT_DIRS = ["product", "architecture", "frontend", "backend", "qa", "devops"];
                const DIR_COLORS: Record<string, string> = {
                  product: "#a78bfa", architecture: "#f59e0b", frontend: "#3b82f6",
                  backend: "#22c55e", qa: "#ef4444", devops: "#6c63ff",
                  phases: "#6366f1", "": "#8b97b2",
                };

                const folderMap = new Map<string, typeof workspaceFiles>();
                for (const file of workspaceFiles) {
                  const parts = file.path.split("/");
                  const folder = parts.length > 1 ? parts[0] : "";
                  if (!folderMap.has(folder)) folderMap.set(folder, []);
                  folderMap.get(folder)!.push(file);
                }

                // Artifact folders first, then other folders
                const sortedFolders = Array.from(folderMap.keys()).sort((a, b) => {
                  const aIdx = ARTIFACT_DIRS.indexOf(a);
                  const bIdx = ARTIFACT_DIRS.indexOf(b);
                  if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
                  if (aIdx !== -1) return -1;
                  if (bIdx !== -1) return 1;
                  if (a === "phases") return 1;
                  return a.localeCompare(b);
                });

                for (const folder of sortedFolders) {
                  const files = folderMap.get(folder)!;
                  const isArtifact = ARTIFACT_DIRS.includes(folder);
                  groups.push({
                    folder,
                    label: isArtifact ? `${folder}_agent` : folder || "root",
                    color: DIR_COLORS[folder] ?? "#8b97b2",
                    files,
                  });
                }

                return groups.map((group) => (
                  <div key={group.folder} style={{ marginBottom: 8 }}>
                    <div style={{
                      fontSize: 10, fontWeight: 700, color: group.color,
                      textTransform: "uppercase", letterSpacing: "0.5px",
                      padding: "4px 8px 2px",
                      display: "flex", alignItems: "center", gap: 4,
                    }}>
                      {group.folder ? <FolderOpen size={10} /> : <FileText size={10} />}
                      {group.label}
                      {ARTIFACT_DIRS.includes(group.folder) && (
                        <span style={{
                          fontSize: 8, fontWeight: 700,
                          padding: "0px 4px", borderRadius: 3,
                          background: `${group.color}20`, color: group.color,
                        }}>
                          ARTIFACT
                        </span>
                      )}
                    </div>
                    {group.files.map((file) => (
                      <button
                        key={file.path}
                        onClick={() => loadFileContent(file.path)}
                        style={{
                          display: "flex", alignItems: "center", gap: 8,
                          padding: "4px 10px", borderRadius: 4,
                          background: selectedFile === file.path ? "var(--accent-dim)" : "transparent",
                          border: `1px solid ${selectedFile === file.path ? "var(--accent)" : "transparent"}`,
                          cursor: "pointer", textAlign: "left",
                          fontFamily: "ui-monospace, monospace", fontSize: 11,
                          color: selectedFile === file.path ? "var(--accent-light)" : "var(--text-2)",
                          transition: "all 120ms ease",
                          width: "100%",
                        }}
                      >
                        <FileText size={11} style={{ flexShrink: 0, color: group.color }} />
                        <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {file.path.includes("/") ? file.path.slice(file.path.indexOf("/") + 1) : file.path}
                        </span>
                        <span style={{ fontSize: 9, color: "var(--text-3)", flexShrink: 0 }}>
                          {file.size > 1024 ? `${(file.size / 1024).toFixed(1)}KB` : `${file.size}B`}
                        </span>
                      </button>
                    ))}
                  </div>
                ));
              })()}
            </div>

            {/* File preview */}
            {selectedFile && selectedFileContent !== null && (
              <div style={{
                background: "var(--bg-2)", border: "1px solid var(--border)",
                borderRadius: "var(--radius-sm)", overflow: "hidden",
                display: "flex", flexDirection: "column",
              }}>
                <div style={{
                  padding: "6px 12px", borderBottom: "1px solid var(--border)",
                  fontSize: 10, fontWeight: 600, color: "var(--text-3)",
                  display: "flex", alignItems: "center", gap: 6,
                  textTransform: "uppercase", letterSpacing: "0.5px",
                }}>
                  <Eye size={11} /> {selectedFile}
                </div>
                <pre style={{
                  margin: 0, padding: "12px",
                  fontSize: 11, lineHeight: 1.55,
                  fontFamily: "ui-monospace, monospace",
                  color: "var(--text-2)",
                  overflow: "auto", maxHeight: 280,
                  whiteSpace: "pre-wrap", wordBreak: "break-word",
                }}>
                  {selectedFileContent}
                </pre>
              </div>
            )}

            {(!selectedFile || selectedFileContent === null) && workspaceFiles.length > 0 && (
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "var(--text-3)", fontSize: 12, textAlign: "center",
                background: "var(--bg-2)", border: "1px solid var(--border)",
                borderRadius: "var(--radius-sm)", padding: 24,
              }}>
                Select a file to preview its contents
              </div>
            )}
          </div>
        )}

        {workspaceExists && (
          <div style={{ marginTop: 10, fontSize: 11, color: "var(--text-3)" }}>
            {workspaceFiles.length} file{workspaceFiles.length !== 1 ? "s" : ""} generated
          </div>
        )}
      </section>

      {/* ── GENERATED SAAS PROJECT (only for saas_project mission) ── */}
      {session.missionType === "saas_project" && (
      <section style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "18px 22px", marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.6px" }}>
            <Hammer size={12} style={{ display: "inline", marginRight: 4 }} /> Generated SaaS Project
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {projectExists && validation?.ok && (
              <span style={{
                fontSize: 9, fontWeight: 700,
                padding: "2px 8px", borderRadius: 99,
                background: "rgba(16,185,129,0.12)", color: "#34d399",
                display: "flex", alignItems: "center", gap: 3,
              }}>
                <ShieldCheck size={10} /> Build-ready
              </span>
            )}
            {projectExists && !validation?.ok && validation && (
              <span style={{
                fontSize: 9, fontWeight: 700,
                padding: "2px 8px", borderRadius: 99,
                background: "rgba(245,158,11,0.12)", color: "#f59e0b",
                display: "flex", alignItems: "center", gap: 3,
              }}>
                <CircleDot size={10} /> Needs attention
              </span>
            )}
            {projectExists && !validation && (
              <span style={{
                fontSize: 9, fontWeight: 700,
                padding: "2px 8px", borderRadius: 99,
                background: "rgba(99,102,241,0.12)", color: "#818cf8",
                display: "flex", alignItems: "center", gap: 3,
              }}>
                <CheckCircle2 size={10} /> Ready for local preview
              </span>
            )}
          </div>
        </div>

        {!workspaceExists ? (
          <div style={{ padding: 16, textAlign: "center", color: "var(--text-3)", fontSize: 12, background: "var(--bg-2)", borderRadius: "var(--radius-sm)" }}>
            Run steps to create the workspace first.
          </div>
        ) : !projectExists ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: 16, background: "var(--bg-2)", borderRadius: "var(--radius-sm)" }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-2)", marginBottom: 4 }}>No project scaffold yet</div>
              <div style={{ fontSize: 11, color: "var(--text-3)" }}>Generated automatically when frontend_agent completes, or use the button below.</div>
            </div>
            <button
              onClick={handleGenerateProject}
              disabled={generatingProject}
              style={{
                padding: "8px 16px", borderRadius: "var(--radius-sm)",
                background: generatingProject ? "var(--surface-2)" : "rgba(99,102,241,0.14)",
                border: `1px solid ${generatingProject ? "var(--border-2)" : "rgba(99,102,241,0.3)"}`,
                color: generatingProject ? "var(--text-3)" : "#818cf8",
                fontWeight: 600, fontSize: 12, cursor: generatingProject ? "not-allowed" : "pointer",
                fontFamily: "inherit", display: "flex", alignItems: "center", gap: 6,
                transition: "all 140ms ease",
              }}
            >
              {generatingProject ? <motion.span animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }} style={{ display: "inline-block" }}>⚙</motion.span> : <Code2 size={14} />}
              Generate Project
            </button>
          </div>
        ) : (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 8, marginBottom: 12 }}>
              {projectFiles.slice(0, 9).map((file) => (
                <button
                  key={file.path}
                  onClick={() => loadFileContent(file.path)}
                  style={{
                    display: "flex", alignItems: "center", gap: 8,
                    padding: "8px 12px", borderRadius: "var(--radius-sm)",
                    background: "var(--bg-2)", border: "1px solid var(--border)",
                    cursor: "pointer", textAlign: "left",
                    transition: "all 120ms ease",
                  }}
                >
                  <Code2 size={13} style={{ flexShrink: 0, color: "#818cf8" }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {file.path.replace("project/", "")}
                    </div>
                    <div style={{ fontSize: 9, color: "var(--text-3)", marginTop: 1 }}>
                      {file.size > 1024 ? `${(file.size / 1024).toFixed(1)}KB` : `${file.size}B`}
                    </div>
                  </div>
                </button>
              ))}
            </div>
            {projectFiles.length > 9 && (
              <div style={{ fontSize: 11, color: "var(--text-3)" }}>
                +{projectFiles.length - 9} more files — view all in Project Workspace above
              </div>
            )}

            {/* Validation section */}
            <div style={{ marginTop: 12, padding: "12px 14px", background: "var(--bg-2)", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: validation ? 10 : 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <ShieldCheck size={13} style={{ color: validation?.ok ? "#34d399" : validation ? "#f59e0b" : "#818cf8" }} />
                  <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-2)" }}>Validation</span>
                  {validation && (
                    <span style={{
                      fontSize: 14, fontWeight: 800,
                      color: validation.ok ? "#34d399" : "#f59e0b",
                      fontFamily: "ui-monospace, monospace",
                    }}>
                      {validation.score}%
                    </span>
                  )}
                </div>
                <button
                  onClick={handleValidateProject}
                  disabled={validatingProject}
                  style={{
                    padding: "4px 12px", borderRadius: 4,
                    background: validatingProject ? "var(--surface-2)" : "rgba(99,102,241,0.14)",
                    border: `1px solid ${validatingProject ? "var(--border-2)" : "rgba(99,102,241,0.3)"}`,
                    color: validatingProject ? "var(--text-3)" : "#818cf8",
                    fontWeight: 600, fontSize: 10, cursor: validatingProject ? "not-allowed" : "pointer",
                    fontFamily: "inherit", display: "flex", alignItems: "center", gap: 4,
                    transition: "all 140ms ease",
                  }}
                >
                  {validatingProject ? <motion.span animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }} style={{ display: "inline-block" }}>⚙</motion.span> : <ShieldCheck size={10} />}
                  Validate Project
                </button>
              </div>
              {validation && (
                <div>
                  {/* Score bar */}
                  <div style={{ height: 4, borderRadius: 2, background: "var(--border)", marginBottom: 8, overflow: "hidden" }}>
                    <div style={{
                      height: "100%", borderRadius: 2,
                      width: `${validation.score}%`,
                      background: validation.ok ? "#34d399" : "#f59e0b",
                      transition: "width 300ms ease",
                    }} />
                  </div>
                  {/* Checks */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 2, marginBottom: 6 }}>
                    {validation.checks.slice(0, 8).map((check) => (
                      <div key={check.name} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10 }}>
                        <span style={{ color: check.passed ? "#34d399" : "#f43f5e", fontWeight: 700, flexShrink: 0 }}>
                          {check.passed ? "PASS" : "FAIL"}
                        </span>
                        <span style={{ color: "var(--text-3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {check.message}
                        </span>
                      </div>
                    ))}
                  </div>
                  {/* Warnings */}
                  {validation.warnings.length > 0 && (
                    <div style={{ borderTop: "1px solid var(--border)", paddingTop: 6 }}>
                      {validation.warnings.slice(0, 3).map((w, i) => (
                        <div key={i} style={{ fontSize: 10, color: "#f59e0b", marginBottom: 2 }}>
                          {w}
                        </div>
                      ))}
                      {validation.warnings.length > 3 && (
                        <div style={{ fontSize: 9, color: "var(--text-3)" }}>
                          +{validation.warnings.length - 3} more warnings
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
              {!validation && (
                <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 4 }}>
                  Click Validate to check project integrity.
                </div>
              )}
            </div>

            <div style={{ marginTop: 8, display: "flex", gap: 8, alignItems: "center" }}>
              <span style={{ fontSize: 11, color: "var(--text-3)" }}>
                {projectFiles.length} file{projectFiles.length !== 1 ? "s" : ""} in <code style={{ fontSize: 10, color: "var(--accent-light)" }}>project/</code>
              </span>
              <code style={{ fontSize: 10, color: "var(--text-3)", background: "var(--bg-2)", padding: "2px 6px", borderRadius: 4 }}>
                cd project && npm install && npm run dev
              </code>
            </div>
          </div>
        )}
      </section>
      )}

      {/* ── MISSION DELIVERABLES (non-SaaS missions) ── */}
      {session.missionType !== "saas_project" && (
        <section data-testid="mission-deliverables-section" style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "18px 22px", marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.6px" }}>
              <Package size={12} style={{ display: "inline", marginRight: 4 }} /> Mission Deliverables
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 8px", borderRadius: 99, background: "rgba(99,102,241,0.12)", color: "#818cf8" }}>
                {MISSION_LABELS[session.missionType] ?? session.missionType}
              </span>
              {deliverableExists && (
                <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 8px", borderRadius: 99, background: "rgba(52,211,153,0.12)", color: "#34d399" }}>
                  {deliverableFiles.length} files
                </span>
              )}
              <button
                onClick={handleGenerateDeliverables}
                disabled={generatingDeliverables}
                style={{
                  padding: "4px 12px", borderRadius: 4,
                  background: generatingDeliverables ? "var(--surface-2)" : "rgba(99,102,241,0.14)",
                  border: `1px solid ${generatingDeliverables ? "var(--border-2)" : "rgba(99,102,241,0.3)"}`,
                  color: generatingDeliverables ? "var(--text-3)" : "#818cf8",
                  fontWeight: 600, fontSize: 10, cursor: generatingDeliverables ? "not-allowed" : "pointer",
                  fontFamily: "inherit", display: "flex", alignItems: "center", gap: 4,
                  transition: "all 140ms ease",
                }}
              >
                {generatingDeliverables
                  ? <motion.span animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }} style={{ display: "inline-block" }}>⚙</motion.span>
                  : <Package size={10} />
                }
                {deliverableExists ? "Regenerate" : "Generate Deliverables"}
              </button>
            </div>
          </div>

          {!workspaceExists ? (
            <div style={{ padding: 16, textAlign: "center", color: "var(--text-3)", fontSize: 12, background: "var(--bg-2)", borderRadius: "var(--radius-sm)" }}>
              Run steps to create the workspace first.
            </div>
          ) : !deliverableExists ? (
            <div style={{ padding: "12px 16px", background: "var(--bg-2)", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)" }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-2)", marginBottom: 4 }}>No deliverables generated yet</div>
              <div style={{ fontSize: 11, color: "var(--text-3)" }}>Click Generate Deliverables or run mission steps to produce files.</div>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: 12 }}>
              {/* File list */}
              <div style={{ maxHeight: 320, overflowY: "auto", display: "flex", flexDirection: "column", gap: 2 }}>
                {deliverableFiles.map((file) => (
                  <button
                    key={file.path}
                    onClick={() => loadDelivFileContent(file.path)}
                    style={{
                      display: "flex", alignItems: "center", gap: 8,
                      padding: "5px 10px", borderRadius: 4,
                      background: selectedDelivFile === file.path ? "var(--accent-dim)" : "transparent",
                      border: `1px solid ${selectedDelivFile === file.path ? "var(--accent)" : "transparent"}`,
                      cursor: "pointer", textAlign: "left",
                      fontFamily: "ui-monospace, monospace", fontSize: 11,
                      color: selectedDelivFile === file.path ? "var(--accent-light)" : "var(--text-2)",
                      transition: "all 120ms ease", width: "100%",
                    }}
                  >
                    <FileText size={11} style={{ flexShrink: 0, color: "#818cf8" }} />
                    <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {file.name}
                    </span>
                    <span style={{ fontSize: 9, color: "var(--text-3)", flexShrink: 0 }}>
                      {file.size > 1024 ? `${(file.size / 1024).toFixed(1)}KB` : `${file.size}B`}
                    </span>
                  </button>
                ))}
              </div>

              {/* File preview */}
              {selectedDelivFile && selectedDelivContent !== null ? (
                <div style={{ background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", overflow: "hidden", display: "flex", flexDirection: "column" }}>
                  <div style={{ padding: "6px 12px", borderBottom: "1px solid var(--border)", fontSize: 10, fontWeight: 600, color: "var(--text-3)", display: "flex", alignItems: "center", gap: 6, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    <Eye size={11} /> {selectedDelivFile.split("/").pop()}
                  </div>
                  <pre style={{ margin: 0, padding: "12px", fontSize: 11, lineHeight: 1.55, fontFamily: "ui-monospace, monospace", color: "var(--text-2)", overflow: "auto", maxHeight: 260, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                    {selectedDelivContent}
                  </pre>
                </div>
              ) : (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-3)", fontSize: 12, textAlign: "center", background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", padding: 24 }}>
                  Select a file to preview its contents
                </div>
              )}
            </div>
          )}

          {deliverableExists && (
            <div style={{ marginTop: 10, fontSize: 11, color: "var(--text-3)" }}>
              {deliverableFiles.length} file{deliverableFiles.length !== 1 ? "s" : ""} generated in <code style={{ fontSize: 10, color: "var(--accent-light)" }}>deliverables/</code>
            </div>
          )}
        </section>
      )}

      {/* ── QUALITY REVIEW ── */}
      <section data-testid="quality-review-section" style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "18px 22px", marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.6px" }}>
              <Star size={12} style={{ display: "inline", marginRight: 4 }} /> Quality Review
            </div>
            {review?.clientReady && (
              <span style={{
                fontSize: 9, fontWeight: 700, padding: "2px 8px", borderRadius: 99,
                background: "rgba(52,211,153,0.15)", color: "#34d399",
                border: "1px solid rgba(52,211,153,0.3)",
              }}>
                Client-ready ✓
              </span>
            )}
            {review && !review.clientReady && (
              <span style={{
                fontSize: 10, fontWeight: 700, fontFamily: "ui-monospace, monospace",
                color: review.globalScore >= 80 ? "#f59e0b" : review.globalScore >= 40 ? "#fb923c" : "#f43f5e",
              }}>
                {review.globalScore}/100
              </span>
            )}
          </div>
          <button
            onClick={handleRunReview}
            disabled={reviewLoading}
            style={{
              padding: "4px 12px", borderRadius: 4,
              background: reviewLoading ? "var(--surface-2)" : "rgba(99,102,241,0.14)",
              border: `1px solid ${reviewLoading ? "var(--border-2)" : "rgba(99,102,241,0.3)"}`,
              color: reviewLoading ? "var(--text-3)" : "#818cf8",
              fontWeight: 600, fontSize: 10, cursor: reviewLoading ? "not-allowed" : "pointer",
              fontFamily: "inherit", display: "flex", alignItems: "center", gap: 4,
              transition: "all 140ms ease",
            }}
          >
            {reviewLoading
              ? <motion.span animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }} style={{ display: "inline-block" }}>⚙</motion.span>
              : <Star size={10} />
            }
            {review ? "Re-review" : "Run Review"}
          </button>
        </div>

        {!review ? (
          <div style={{ padding: 16, textAlign: "center", color: "var(--text-3)", fontSize: 12, background: "var(--bg-2)", borderRadius: "var(--radius-sm)" }}>
            No review yet. Run a step or click Run Review to score deliverable quality.
          </div>
        ) : (
          <div>
            {/* Global score bar */}
            <div style={{ marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontSize: 10, color: "var(--text-3)" }}>Global score</span>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  {(() => {
                    const sc = REVIEW_STATUS_CONFIG[review.status] ?? REVIEW_STATUS_CONFIG.draft;
                    return (
                      <span style={{ fontSize: 9, fontWeight: 700, padding: "1px 6px", borderRadius: 99, background: sc.bg, color: sc.color }}>
                        {sc.label}
                      </span>
                    );
                  })()}
                  <span style={{ fontSize: 13, fontWeight: 800, fontFamily: "ui-monospace, monospace", color: "var(--text)" }}>
                    {review.globalScore}/100
                  </span>
                </div>
              </div>
              <div style={{ height: 5, borderRadius: 3, background: "var(--border)", overflow: "hidden" }}>
                <div style={{
                  height: "100%", borderRadius: 3,
                  width: `${review.globalScore}%`,
                  background: review.globalScore >= 80 ? "#34d399" : review.globalScore >= 40 ? "#f59e0b" : "#f43f5e",
                  transition: "width 400ms ease",
                }} />
              </div>
            </div>

            {/* Deliverables list */}
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {review.deliverables.map((d) => {
                const sc = REVIEW_STATUS_CONFIG[d.status] ?? REVIEW_STATUS_CONFIG.draft;
                const isActioning = reviewActionLoading === d.path || reviewActionLoading === d.path + ":reject";
                return (
                  <div
                    key={d.path}
                    style={{
                      display: "flex", alignItems: "center", gap: 8,
                      padding: "6px 10px", borderRadius: 4,
                      background: "var(--bg-2)", border: "1px solid var(--border)",
                    }}
                  >
                    <FileText size={11} style={{ flexShrink: 0, color: sc.color, opacity: 0.8 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {d.name}
                        </span>
                        <span style={{ fontSize: 8, fontWeight: 700, padding: "1px 5px", borderRadius: 3, background: sc.bg, color: sc.color, flexShrink: 0 }}>
                          {sc.label}
                        </span>
                        <span style={{ fontSize: 10, fontWeight: 700, fontFamily: "ui-monospace, monospace", color: "var(--text-3)", flexShrink: 0 }}>
                          {d.score}/100
                        </span>
                      </div>
                      {d.warnings.length > 0 && (
                        <div style={{ fontSize: 9, color: "#f59e0b", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          <AlertTriangle size={8} style={{ display: "inline", marginRight: 2 }} />
                          {d.warnings.slice(0, 2).join(" · ")}
                          {d.warnings.length > 2 && ` +${d.warnings.length - 2}`}
                        </div>
                      )}
                    </div>
                    <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                      <button
                        onClick={() => void handleApprove(d.path)}
                        disabled={isActioning || d.status === "approved"}
                        title="Approve"
                        style={{
                          padding: "3px 6px", borderRadius: 3, fontSize: 9, fontWeight: 700,
                          cursor: isActioning || d.status === "approved" ? "not-allowed" : "pointer",
                          border: "1px solid rgba(52,211,153,0.3)",
                          background: d.status === "approved" ? "rgba(52,211,153,0.15)" : "transparent",
                          color: d.status === "approved" ? "#34d399" : "var(--text-3)",
                          display: "flex", alignItems: "center", gap: 3,
                          fontFamily: "inherit", transition: "all 120ms ease",
                          opacity: isActioning ? 0.5 : 1,
                        }}
                      >
                        <ThumbsUp size={9} />
                      </button>
                      <button
                        onClick={() => void handleReject(d.path)}
                        disabled={isActioning || d.status === "rejected"}
                        title="Reject"
                        style={{
                          padding: "3px 6px", borderRadius: 3, fontSize: 9, fontWeight: 700,
                          cursor: isActioning || d.status === "rejected" ? "not-allowed" : "pointer",
                          border: "1px solid rgba(244,63,94,0.3)",
                          background: d.status === "rejected" ? "rgba(244,63,94,0.15)" : "transparent",
                          color: d.status === "rejected" ? "#f43f5e" : "var(--text-3)",
                          display: "flex", alignItems: "center", gap: 3,
                          fontFamily: "inherit", transition: "all 120ms ease",
                          opacity: isActioning ? 0.5 : 1,
                        }}
                      >
                        <ThumbsDown size={9} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ marginTop: 8, fontSize: 10, color: "var(--text-3)" }}>
              {review.deliverables.length} deliverable{review.deliverables.length !== 1 ? "s" : ""} ·
              {" "}{review.deliverables.filter((d) => d.status === "approved").length} approved ·
              {" "}{review.deliverables.filter((d) => d.status === "rejected").length} rejected ·
              {" "}last updated {new Date(review.updatedAt).toLocaleTimeString("en-CA", { hour12: false, hour: "2-digit", minute: "2-digit" })}
            </div>
          </div>
        )}
      </section>

      {/* ── CLIENT DELIVERY PACKAGE ── */}
      <section data-testid="delivery-package-section" style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "18px 22px", marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.6px" }}>
              <Archive size={12} style={{ display: "inline", marginRight: 4 }} /> Client Delivery Package
            </div>
            {deliveryPkg?.clientReady && (
              <span style={{
                fontSize: 9, fontWeight: 700, padding: "2px 8px", borderRadius: 99,
                background: "rgba(52,211,153,0.15)", color: "#34d399",
                border: "1px solid rgba(52,211,153,0.3)",
                display: "flex", alignItems: "center", gap: 3,
              }}>
                <CheckCircle2 size={9} /> Ready
              </span>
            )}
            {deliveryPkg && !deliveryPkg.clientReady && (
              <span style={{
                fontSize: 9, fontWeight: 700, padding: "2px 8px", borderRadius: 99,
                background: "rgba(245,158,11,0.12)", color: "#f59e0b",
                border: "1px solid rgba(245,158,11,0.25)",
                display: "flex", alignItems: "center", gap: 3,
              }}>
                <AlertTriangle size={9} /> Not Ready
              </span>
            )}
          </div>
          <button
            onClick={() => void handleGeneratePkg()}
            disabled={generatingPkg}
            style={{
              padding: "4px 12px", borderRadius: 4,
              background: generatingPkg ? "var(--surface-2)" : "rgba(99,102,241,0.14)",
              border: `1px solid ${generatingPkg ? "var(--border-2)" : "rgba(99,102,241,0.3)"}`,
              color: generatingPkg ? "var(--text-3)" : "#818cf8",
              fontWeight: 600, fontSize: 10, cursor: generatingPkg ? "not-allowed" : "pointer",
              fontFamily: "inherit", display: "flex", alignItems: "center", gap: 4,
              transition: "all 140ms ease",
            }}
          >
            {generatingPkg
              ? <motion.span animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }} style={{ display: "inline-block" }}>⚙</motion.span>
              : <Archive size={10} />
            }
            {deliveryPkg ? "Regenerate" : "Generate Package"}
          </button>
        </div>

        {!deliveryPkg ? (
          <div style={{ padding: 16, textAlign: "center", color: "var(--text-3)", fontSize: 12, background: "var(--bg-2)", borderRadius: "var(--radius-sm)" }}>
            No delivery package yet. Run a quality review and approve deliverables, then generate the package.
          </div>
        ) : (
          <div>
            {/* Stats row */}
            <div style={{ display: "flex", gap: 16, marginBottom: 12, flexWrap: "wrap" }}>
              {[
                { label: "Quality Score", value: `${deliveryPkg.qualityScore}/100`, color: deliveryPkg.qualityScore >= 80 ? "#34d399" : deliveryPkg.qualityScore >= 60 ? "#f59e0b" : "#f43f5e" },
                { label: "Approved", value: String(deliveryPkg.manifest.approvedCount), color: "#34d399" },
                { label: "Pending", value: String(deliveryPkg.manifest.pendingCount), color: "#f59e0b" },
                { label: "Rejected", value: String(deliveryPkg.manifest.rejectedCount), color: "#f43f5e" },
              ].map(({ label, value, color }) => (
                <div key={label} style={{ display: "flex", flex: 1, minWidth: 80, flexDirection: "column", gap: 2, padding: "8px 12px", background: "var(--bg-2)", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)" }}>
                  <span style={{ fontSize: 9, fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.4px" }}>{label}</span>
                  <span style={{ fontSize: 18, fontWeight: 800, color, fontFamily: "ui-monospace, monospace" }}>{value}</span>
                </div>
              ))}
            </div>

            {/* Blockers */}
            {deliveryPkg.manifest.blockers.length > 0 && (
              <div style={{ marginBottom: 10, padding: "8px 12px", background: "rgba(244,63,94,0.06)", border: "1px solid rgba(244,63,94,0.2)", borderRadius: "var(--radius-sm)" }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#f43f5e", marginBottom: 4, display: "flex", alignItems: "center", gap: 4 }}>
                  <AlertTriangle size={10} /> Blockers
                </div>
                {deliveryPkg.manifest.blockers.map((b, i) => (
                  <div key={i} style={{ fontSize: 11, color: "#f43f5e", opacity: 0.85, marginBottom: 2 }}>⚠ {b}</div>
                ))}
              </div>
            )}

            {/* Recommendations */}
            {deliveryPkg.manifest.recommendations.length > 0 && (
              <div style={{ marginBottom: 10, padding: "8px 12px", background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)" }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-2)", marginBottom: 4 }}>Recommendations</div>
                {deliveryPkg.manifest.recommendations.slice(0, 4).map((r, i) => (
                  <div key={i} style={{ fontSize: 11, color: "var(--text-2)", marginBottom: 2 }}>· {r}</div>
                ))}
              </div>
            )}

            {/* File list + preview */}
            <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: 12 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {deliveryPkg.files.map((file) => (
                  <button
                    key={file.path}
                    onClick={() => void loadDeliveryFileContent(file.path)}
                    style={{
                      display: "flex", alignItems: "center", gap: 8,
                      padding: "5px 10px", borderRadius: 4,
                      background: selectedDeliveryFile === file.path ? "var(--accent-dim)" : "transparent",
                      border: `1px solid ${selectedDeliveryFile === file.path ? "var(--accent)" : "transparent"}`,
                      cursor: "pointer", textAlign: "left",
                      fontFamily: "ui-monospace, monospace", fontSize: 11,
                      color: selectedDeliveryFile === file.path ? "var(--accent-light)" : "var(--text-2)",
                      transition: "all 120ms ease", width: "100%",
                    }}
                  >
                    <FileText size={11} style={{ flexShrink: 0, color: "#6366f1" }} />
                    <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {file.name}
                    </span>
                    <span style={{ fontSize: 9, color: "var(--text-3)", flexShrink: 0 }}>
                      {file.size > 1024 ? `${(file.size / 1024).toFixed(1)}KB` : `${file.size}B`}
                    </span>
                  </button>
                ))}
              </div>

              {selectedDeliveryFile && selectedDeliveryContent !== null ? (
                <div style={{ background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", overflow: "hidden", display: "flex", flexDirection: "column" }}>
                  <div style={{ padding: "6px 12px", borderBottom: "1px solid var(--border)", fontSize: 10, fontWeight: 600, color: "var(--text-3)", display: "flex", alignItems: "center", gap: 6, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    <Eye size={11} /> {selectedDeliveryFile.split("/").pop()}
                  </div>
                  <pre style={{ margin: 0, padding: "12px", fontSize: 11, lineHeight: 1.55, fontFamily: "ui-monospace, monospace", color: "var(--text-2)", overflow: "auto", maxHeight: 280, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                    {selectedDeliveryContent}
                  </pre>
                </div>
              ) : (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-3)", fontSize: 12, textAlign: "center", background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", padding: 24 }}>
                  Select a file to preview its contents
                </div>
              )}
            </div>

            <div style={{ marginTop: 8, fontSize: 10, color: "var(--text-3)" }}>
              {deliveryPkg.files.length} files in <code style={{ fontSize: 9, color: "var(--accent-light)" }}>delivery/</code> ·
              {" "}generated {new Date(deliveryPkg.generatedAt).toLocaleTimeString("en-CA", { hour12: false, hour: "2-digit", minute: "2-digit" })}
            </div>
          </div>
        )}
      </section>

      {/* ── AUTONOMOUS LOOPS ── */}
      <section style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "18px 22px", marginBottom: 40 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.6px" }}>
            <Repeat size={12} style={{ display: "inline", marginRight: 4 }} /> Autonomous Loops
          </div>
          {!session.loopMode && (
            <button
              onClick={async () => {
                const applicable = { saas_project: "optimization_loop", website: "optimization_loop", ecommerce_store: "recurring_weekly", social_campaign: "recurring_weekly", automation_workflow: "monitoring" } as Record<string, string>;
                const mode = applicable[session.missionType] ?? "recurring_weekly";
                await fetch(`/api/autopilot/sessions/${session.sessionId}/loop/activate`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode }) });
                loadSession();
              }}
              style={{ fontSize: 11, background: "#6366f1", color: "#fff", border: "none", borderRadius: "var(--radius-sm)", padding: "4px 10px", cursor: "pointer" }}
            >
              Activate Loop
            </button>
          )}
          {session.loopStatus === "active" && (
            <button
              onClick={async () => {
                await fetch(`/api/autopilot/sessions/${session.sessionId}/loop/pause`, { method: "POST" });
                loadSession();
              }}
              style={{ fontSize: 11, background: "var(--bg-2)", color: "var(--text)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", padding: "4px 10px", cursor: "pointer" }}
            >
              Pause
            </button>
          )}
          {session.loopStatus === "paused" && (
            <div style={{ display: "flex", gap: 6 }}>
              <button
                onClick={async () => {
                  await fetch(`/api/autopilot/sessions/${session.sessionId}/loop/resume`, { method: "POST" });
                  loadSession();
                }}
                style={{ fontSize: 11, background: "#34d399", color: "#fff", border: "none", borderRadius: "var(--radius-sm)", padding: "4px 10px", cursor: "pointer" }}
              >
                Resume
              </button>
            </div>
          )}
        </div>

        {!session.loopMode ? (
          <div style={{ color: "var(--text-3)", fontSize: 12, padding: "8px 0" }}>
            No loop active. Activate a loop to enable recurring autonomous execution.
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 10 }}>
            <div style={{ background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", padding: "12px 14px" }}>
              <div style={{ fontSize: 10, color: "var(--text-3)", marginBottom: 4 }}>Loop Mode</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#6366f1" }}>
                {session.loopMode.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
              </div>
            </div>
            <div style={{ background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", padding: "12px 14px" }}>
              <div style={{ fontSize: 10, color: "var(--text-3)", marginBottom: 4 }}>Status</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: session.loopStatus === "active" ? "#34d399" : session.loopStatus === "paused" ? "#f59e0b" : "#f43f5e" }}>
                {session.loopStatus?.charAt(0).toUpperCase()}{session.loopStatus?.slice(1) ?? "Inactive"}
              </div>
            </div>
            <div style={{ background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", padding: "12px 14px" }}>
              <div style={{ fontSize: 10, color: "var(--text-3)", marginBottom: 4 }}>Next Run</div>
              <div style={{ fontSize: 13, color: "var(--text-2)" }}>
                {session.nextRunAt ? new Date(session.nextRunAt).toLocaleString() : "—"}
              </div>
            </div>
            <div style={{ background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", padding: "12px 14px" }}>
              <div style={{ fontSize: 10, color: "var(--text-3)", marginBottom: 4 }}>Last Run</div>
              <div style={{ fontSize: 13, color: "var(--text-2)" }}>
                {session.lastRunAt ? new Date(session.lastRunAt).toLocaleString() : "—"}
              </div>
            </div>
            <div style={{ background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", padding: "12px 14px" }}>
              <div style={{ fontSize: 10, color: "var(--text-3)", marginBottom: 4 }}>Iterations</div>
              <div style={{ fontSize: 13, color: "var(--text-2)" }}>
                {session.loopHistory?.length ?? 0}
              </div>
            </div>
          </div>
        )}

        {session.loopHistory && session.loopHistory.length > 0 && (
          <div style={{ marginTop: 14 }}>
            <div style={{ fontSize: 10, color: "var(--text-3)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.5px" }}>Loop History</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {session.loopHistory.slice(0, 5).map((h, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, padding: "4px 8px", background: "var(--bg-2)", borderRadius: "var(--radius-sm)" }}>
                  <span style={{ color: h.result === "success" ? "#34d399" : h.result === "failed" ? "#f43f5e" : "#f59e0b" }}>
                    {h.result === "success" ? "✓" : h.result === "failed" ? "✗" : "~"}
                  </span>
                  <span style={{ color: "var(--text-2)" }}>{new Date(h.ranAt).toLocaleString()}</span>
                  <span style={{ color: "var(--text-3)" }}>— {h.tasksCreated} task(s)</span>
                  <span style={{ color: "var(--text-3)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{h.message}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* ── RUNTIME HEALTH ── */}
      <section style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "18px 22px", marginBottom: 40 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: 14 }}>
          <Terminal size={12} style={{ display: "inline", marginRight: 4 }} /> Runtime Health
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 10 }}>
          {[
            {
              label: "Status",
              value: session.runtime.status === "online" ? "Online" : session.runtime.status === "offline" ? "Offline" : "Unknown",
              color: session.runtime.status === "online" ? "#34d399" : "#f43f5e",
              icon: <Zap size={14} />,
            },
            { label: "Provider", value: session.runtime.provider, color: "#a78bfa", icon: <Cpu size={14} /> },
            { label: "Active Workers", value: String(session.runtime.activeWorkers), color: "#38bdf8", icon: <Bot size={14} /> },
            {
              label: "Last Event",
              value: session.runtime.lastEvent.length > 40 ? session.runtime.lastEvent.slice(0, 40) + "..." : session.runtime.lastEvent,
              color: "var(--text-2)",
              icon: <Radio size={14} />,
            },
          ].map(({ label, value, color, icon }) => (
            <div key={label} style={{
              background: "var(--bg-2)", border: "1px solid var(--border)",
              borderRadius: "var(--radius-sm)", padding: "12px 14px",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                <span style={{ color: color, display: "flex" }}>{icon}</span>
                <span style={{ fontSize: 10, fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.5px" }}>{label}</span>
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", lineHeight: 1.3 }}>{value}</div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
