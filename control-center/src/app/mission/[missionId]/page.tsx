"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Bot,
  CheckCircle2,
  Clock3,
  FileText,
  Image as ImageIcon,
  Info,
  Monitor,
  Play,
  Radio,
  HelpCircle,
  Palette,
  RefreshCw,
  RotateCcw,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  Users,
  XCircle,
  Activity,
} from "lucide-react";
import { GhostButton, PrimaryButton, SectionHeader, StatusBadge, TypingBubble, ExpertiseBadge } from "@/components/ui";
import { ApprovalCard, ApprovalPreviewModal } from "@/components/approvals/ApprovalCard";
import { VisualOutputPreview } from "@/components/previews/VisualOutputPreview";
import type { ApprovalItem, ApprovalPreview } from "@/lib/approvalPreview";
import type { OutputVisualPreview } from "@/lib/visibleOutputs";

type SessionStatus = "draft" | "running" | "paused" | "waiting_approval" | "completed" | "failed";
type TaskStatus = "queued" | "running" | "completed" | "blocked" | "failed";
type LogLevel = "info" | "success" | "warning" | "error";

interface MissionTask {
  id: string;
  title: string;
  description: string;
  phase: string;
  agent: string;
  status: TaskStatus;
  priority: number;
  progress: number;
  updatedAt: string;
}

interface MissionLog {
  id: string;
  timestamp: string;
  level: LogLevel;
  agent: string;
  message: string;
  source: string;
}

interface MissionSession {
  sessionId: string;
  projectName: string;
  projectIdea: string;
  missionType: string;
  businessStatus: string;
  status: SessionStatus;
  currentPhase: string;
  progress: number;
  assignedAgents: { agentId: string; role: string; status: string; provider: string }[];
  roadmap: string[];
  tasks: MissionTask[];
  logs: MissionLog[];
  runtime: { status: string; provider: string; activeWorkers: number; lastEvent: string };
  createdAt: string;
  updatedAt: string;
}

interface WorkspaceFile {
  path: string;
  name: string;
  size: number;
}

interface MissionVisibleOutput {
  id: string;
  title: string;
  type: string;
  preview: string;
  status: string;
  assignedAgent: string;
  summary?: string;
  visualPreview?: OutputVisualPreview | null;
}

const STATUS: Record<SessionStatus, { label: string; color: string; bg: string }> = {
  draft: { label: "En preparation", color: "#8a9099", bg: "rgba(138,144,153,0.1)" },
  running: { label: "Agents au travail", color: "#2f8f61", bg: "rgba(47,143,97,0.12)" },
  paused: { label: "En pause", color: "#b7791f", bg: "rgba(183,121,31,0.12)" },
  waiting_approval: { label: "Resultat pret - approbation requise", color: "#b7791f", bg: "rgba(183,121,31,0.12)" },
  completed: { label: "Termine", color: "#2f6fed", bg: "rgba(47,111,237,0.12)" },
  failed: { label: "A verifier", color: "#c84a52", bg: "rgba(200,74,82,0.12)" },
};

const AGENT_LABELS: Record<string, string> = {
  product_agent: "Strategie produit",
  architect_agent: "Structure projet",
  frontend_agent: "Designer",
  backend_agent: "Execution technique",
  qa_agent: "Verification",
  devops_agent: "Livraison",
};

const AGENT_COLORS: Record<string, string> = {
  product_agent: "#2f6fed",
  architect_agent: "#b7791f",
  frontend_agent: "#2f6fed",
  backend_agent: "#2f8f61",
  qa_agent: "#c84a52",
  devops_agent: "#172033",
};

function formatTime(value: string) {
  try {
    return new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "--:--";
  }
}

function executiveLabel(agent: string) {
  return AGENT_LABELS[agent] ?? agent.replace(/_/g, " ");
}

function generatedKind(file: WorkspaceFile) {
  const lower = file.path.toLowerCase();
  if (/\.(png|jpg|jpeg|webp|gif)$/.test(lower)) return { label: "Image", icon: <ImageIcon size={13} /> };
  if (lower.startsWith("project/")) return { label: "Apercu web", icon: <Monitor size={13} /> };
  if (lower.includes("invoice")) return { label: "Facture", icon: <FileText size={13} /> };
  if (lower.includes("proposal")) return { label: "Proposition", icon: <FileText size={13} /> };
  return { label: "Document", icon: <FileText size={13} /> };
}

// ─── Mission Questions Component ──────────────────────────────────────────

interface MQOption { id: string; label: string; }
interface MQ { id: string; agentName: string; agentAvatar: string; agentColor: string; question: string; options: MQOption[]; status: string; answer: { optionId: string | null; freeText: string | null; answeredAt: string } | null; createdAt: string; }

function MissionQuestions({ missionId }: { missionId: string }) {
  const [questions, setQuestions] = useState<MQ[]>([]);
  const [autreText, setAutreText] = useState<Record<string, string>>({});
  const [showAutre, setShowAutre] = useState<Record<string, boolean>>({});

  const loadQs = async () => {
    try {
      const res = await fetch(`/api/agent-questions?missionId=${missionId}`);
      if (res.ok) { const d = await res.json(); setQuestions(d.questions ?? []); }
    } catch { /* */ }
  };

  useEffect(() => { loadQs(); }, [missionId]);

  const handleAnswer = async (qId: string, optId: string) => {
    const freeText = optId === "autre" ? (autreText[qId] ?? "") : undefined;
    try {
      const res = await fetch(`/api/agent-questions/${qId}/answer`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ optionId: optId, freeText }),
      });
      if (res.ok) loadQs();
    } catch { /* */ }
  };

  const pending = questions.filter((q) => q.status === "pending");
  const answered = questions.filter((q) => q.status === "answered");
  if (pending.length === 0 && answered.length === 0) return null;

  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, padding: 16 }}>
      <SectionHeader title="Questions et decisions" icon={<HelpCircle size={12} style={{ color: "#2f6fed" }} />} />
      <div style={{ display: "grid", gap: 8 }}>
        {pending.map((q) => (
          <div key={q.id} style={{ padding: 10, borderRadius: 6, background: `${q.agentColor}08`, border: `1px solid ${q.agentColor}30` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
              <span style={{ fontSize: 12 }}>{q.agentAvatar}</span>
              <span style={{ fontSize: 10, fontWeight: 700, color: q.agentColor }}>{q.agentName}</span>
              <span style={{ fontSize: 9, color: "var(--text-3)" }}>{new Date(q.createdAt).toLocaleTimeString()}</span>
              <span style={{ marginLeft: "auto", fontSize: 8, fontWeight: 600, color: "#b7791f", textTransform: "uppercase" }}>En attente</span>
            </div>
            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text)", marginBottom: 8 }}>{q.question}</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
              {q.options.map((opt) => (
                <button key={opt.id} onClick={() => opt.id === "autre" ? setShowAutre((p) => ({ ...p, [q.id]: true })) : handleAnswer(q.id, opt.id)} style={{ padding: "5px 10px", fontSize: 10, fontWeight: 600, background: "var(--bg-2)", border: `1px solid ${q.agentColor}30`, borderRadius: 5, color: "var(--text)", cursor: "pointer" }}>
                  {opt.label}
                </button>
              ))}
            </div>
            {showAutre[q.id] && (
              <div style={{ display: "flex", gap: 4, marginTop: 6 }}>
                <input value={autreText[q.id] ?? ""} onChange={(e) => setAutreText((p) => ({ ...p, [q.id]: e.target.value }))} placeholder="Votre réponse…" style={{ flex: 1, padding: "4px 8px", fontSize: 10, background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: 4, color: "var(--text)", outline: "none" }} onKeyDown={(e) => { if (e.key === "Enter" && autreText[q.id]?.trim()) handleAnswer(q.id, "autre"); }} />
                <button onClick={() => handleAnswer(q.id, "autre")} disabled={!(autreText[q.id]?.trim())} style={{ padding: "4px 8px", fontSize: 10, fontWeight: 600, background: q.agentColor, color: "#fff", border: "none", borderRadius: 4, cursor: autreText[q.id]?.trim() ? "pointer" : "not-allowed", opacity: autreText[q.id]?.trim() ? 1 : 0.5 }}>OK</button>
              </div>
            )}
          </div>
        ))}
        {answered.map((q) => (
          <div key={q.id} style={{ padding: 8, borderRadius: 6, background: "var(--bg-2)", border: "1px solid var(--border)", opacity: 0.7 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
              <span style={{ fontSize: 10 }}>{q.agentAvatar}</span>
              <span style={{ fontSize: 9, fontWeight: 600, color: q.agentColor }}>{q.agentName}</span>
              <span style={{ marginLeft: "auto", fontSize: 8, fontWeight: 600, color: "#2f8f61", textTransform: "uppercase" }}>Repondu</span>
            </div>
            <div style={{ fontSize: 11, color: "var(--text-3)" }}>{q.question}</div>
            {q.answer && (
              <div style={{ fontSize: 10, fontWeight: 600, color: "var(--text)", marginTop: 2 }}>
                {q.answer.freeText ? q.answer.freeText : q.options.find((o) => o.id === q.answer?.optionId)?.label ?? "—"}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function MissionRoomPage() {
  const params = useParams<{ missionId: string }>();
  const missionId = params.missionId;
  const router = useRouter();
  const [session, setSession] = useState<MissionSession | null>(null);
  const [recent, setRecent] = useState<MissionSession[]>([]);
  const [files, setFiles] = useState<WorkspaceFile[]>([]);
  const [missionApprovals, setMissionApprovals] = useState<ApprovalItem[]>([]);
  const [approvalPreview, setApprovalPreview] = useState<ApprovalPreview | null>(null);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [visibleOutputs, setVisibleOutputs] = useState<MissionVisibleOutput[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadMission = useCallback(async () => {
    try {
      const [missionRes, sessionsRes, workspaceRes, outputsRes] = await Promise.all([
        fetch(`/api/autopilot/sessions/${missionId}`, { cache: "no-store" }),
        fetch("/api/autopilot/sessions", { cache: "no-store" }),
        fetch(`/api/autopilot/sessions/${missionId}/workspace`, { cache: "no-store" }),
        fetch(`/api/visible-outputs?sessionId=${missionId}`, { cache: "no-store" }),
      ]);
      const missionPayload = await missionRes.json();
      const sessionsPayload = await sessionsRes.json();
      const workspacePayload = await workspaceRes.json();
      const outputsPayload = await outputsRes.json();
      setSession(missionPayload.session ?? null);
      setRecent((sessionsPayload.sessions ?? []).slice(0, 5));
      setFiles(workspacePayload.summary?.files ?? []);
      setVisibleOutputs(outputsPayload.outputs ?? []);
    } finally {
      setLoading(false);
    }
  }, [missionId]);

  useEffect(() => {
    void loadMission();
    fetch("/api/approvals").then((r) => r.json()).then((d) => {
      if (d.ok) {
        const all: ApprovalItem[] = d.pending ?? [];
        setMissionApprovals(all.filter((a: ApprovalItem) => a.sessionId === missionId));
      }
    }).catch(() => {});
    const timer = window.setInterval(() => void loadMission(), 2000);
    return () => window.clearInterval(timer);
  }, [loadMission]);

  const runMissionAction = async (action: string) => {
    setActionLoading(action);
    try {
      const res = await fetch(`/api/autopilot/sessions/${missionId}/${action}`, { method: "POST" });
      const payload = await res.json();
      if (payload.session) setSession(payload.session);
      await loadMission();
    } finally {
      setActionLoading(null);
    }
  };

  const recordDecision = async (decision: "approve" | "reject" | "revision" | "direction") => {
    setActionLoading(decision);
    try {
      if (decision === "approve" || decision === "reject") {
        await fetch(`/api/ceo/${decision}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ decisionId: `mission-${missionId}` }),
        });
      }
      if (decision === "revision") await runMissionAction("retry");
      if (decision === "direction") router.push(`/ceo?mission=${missionId}`);
    } finally {
      setActionLoading(null);
    }
  };

  const outputs = useMemo(() => files.filter((file) => !file.path.includes("/reviews/")).slice(0, 8), [files]);

  if (loading) {
    return (
      <main className="page" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>
          <RefreshCw size={24} />
        </motion.div>
      </main>
    );
  }

  if (!session) {
    return (
      <main className="page" style={{ textAlign: "center", paddingTop: 80 }}>
        <AlertTriangle size={32} style={{ color: "#f59e0b", marginBottom: 12 }} />
        <h1>Mission introuvable</h1>
        <Link href="/mission">Missions recentes</Link>
      </main>
    );
  }

  const cfg = STATUS[session.status];
  const runningTask = session.tasks.find((task) => task.status === "running");
  const blockedTasks = session.tasks.filter((task) => task.status === "blocked" || task.status === "failed");
  const completedTasks = session.tasks.filter((task) => task.status === "completed").length;
  const latestVisibleOutput = visibleOutputs[0] ?? null;
  const nextExpectedOutput = visibleOutputs.find((output) => output.status === "draft" || output.status === "in_progress") ?? null;

  return (
    <main className="page" style={{ maxWidth: 1500, paddingTop: 22 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, marginBottom: 16 }}>
        <div>
          <Link href="/ceo" style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, color: "var(--text-3)", marginBottom: 8 }}>
            <ArrowLeft size={13} /> Retour au CEO
          </Link>
          <h1 style={{ margin: 0, display: "flex", alignItems: "center", gap: 10 }}>
            Mission: {session.projectName}
            <StatusBadge label={cfg.label} color={cfg.color} bg={cfg.bg} />
          </h1>
          <p style={{ color: "var(--text-2)", fontSize: 13, marginTop: 5 }}>{session.projectIdea}</p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", justifyContent: "flex-end" }}>
          <span style={{ fontSize: 10, fontWeight: 750, color: "#2f8f61", background: "rgba(47,143,97,0.1)", padding: "4px 9px", borderRadius: 999, border: "1px solid rgba(47,143,97,0.24)" }}>
            Agence active
          </span>
          {session.status === "running" && (
            <span style={{ fontSize: 10, fontWeight: 600, color: "#2f8f61", background: "rgba(47,143,97,0.1)", padding: "3px 8px", borderRadius: 6, border: "1px solid rgba(47,143,97,0.25)" }}>
              Auto-exécution en cours
            </span>
          )}
          {session.status !== "running" && session.status !== "completed" && (
            <PrimaryButton onClick={() => runMissionAction("run-step")} disabled={!!actionLoading} color="#2f8f61">
              <Play size={13} /> {actionLoading === "run-step" ? "Reprise..." : "Reprendre"}
            </PrimaryButton>
          )}
          <GhostButton onClick={loadMission}>
            <RefreshCw size={13} /> Actualiser
          </GhostButton>
        </div>
      </div>

      <div style={{
        display: "grid",
        gridTemplateColumns: "minmax(260px, 0.82fr) minmax(420px, 1.5fr) minmax(280px, 0.9fr)",
        gap: 12,
        alignItems: "start",
      }}>
        <section style={{ display: "grid", gap: 12 }}>
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, padding: 16 }}>
            <SectionHeader title="Conversation CEO" icon={<Sparkles size={12} style={{ color: "#b7791f" }} />} />
            <div style={{ display: "grid", gap: 10 }}>
              <div style={{ padding: 12, background: "rgba(245,158,11,0.07)", border: "1px solid rgba(245,158,11,0.22)", borderRadius: 8 }}>
                <div style={{ fontSize: 11, color: "#b7791f", fontWeight: 800, marginBottom: 4 }}>Delegation CEO</div>
                <div style={{ fontSize: 13, color: "var(--text-2)" }}>La mission est creee et les agents savent quoi produire. Cette page suit les decisions, resultats et prochaines actions.</div>
              </div>
              <div style={{ padding: 12, background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: 8 }}>
                <div style={{ fontSize: 11, color: "var(--text-3)", textTransform: "uppercase", marginBottom: 5 }}>Prochaine decision</div>
                <div style={{ fontSize: 13, color: "var(--text)" }}>{runningTask ? runningTask.title : "Verifier le resultat prepare et choisir la suite."}</div>
              </div>
            </div>
          </div>

          {/* Assumptions section */}
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, padding: 16 }}>
            <SectionHeader title="Contexte compris" icon={<Info size={12} style={{ color: "#2f6fed" }} />} />
            <div style={{ display: "grid", gap: 6 }}>
              {[
                { field: "Projet", value: session.projectName },
                { field: "Type", value: session.missionType.replace(/_/g, " ") || "Projet" },
                { field: "Statut", value: cfg.label },
                { field: "Client", value: "A definir" },
                { field: "Objectif", value: session.tasks[0]?.title || session.projectName },
              ].map((item) => (
                <div key={item.field} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", background: "var(--bg-2)", borderRadius: 6, border: "1px solid var(--border)" }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: "var(--text-3)", minWidth: 90 }}>{item.field}</span>
                  <span style={{ fontSize: 12, color: "var(--text)", flex: 1 }}>{item.value}</span>
                  <span style={{ fontSize: 8, color: "#2f6fed", textTransform: "uppercase", fontWeight: 600 }}>compris</span>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 8, fontSize: 10, color: "var(--text-3)" }}>
              Ce contexte vient de la conversation CEO et sert a guider les agents.
            </div>
          </div>

          {/* Agent Questions for this mission */}
          <MissionQuestions missionId={session.sessionId} />

          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, padding: 16 }}>
            <SectionHeader title="Decisions requises" icon={<AlertTriangle size={12} style={{ color: "#b7791f" }} />} />
            {missionApprovals.length > 0 ? (
              <div style={{ display: "grid", gap: 8 }}>
                {missionApprovals.map((item) => (
                  <ApprovalCard
                    key={item.id}
                    item={item}
                    onPreview={async (id) => {
                      const res = await fetch(`/api/approvals/${id}/preview`);
                      if (res.ok) { const d = await res.json(); if (d.ok && d.preview) { setApprovalPreview(d.preview); setShowApprovalModal(true); } }
                    }}
                    onApprove={async (id) => {
                      await fetch(`/api/approvals/${id}/approve`, { method: "POST" });
                      setShowApprovalModal(false);
                      fetch("/api/approvals").then((r) => r.json()).then((d) => {
                        if (d.ok) setMissionApprovals((d.pending ?? []).filter((a: ApprovalItem) => a.sessionId === missionId));
                      }).catch(() => {});
                    }}
                    onReject={async (id) => {
                      await fetch(`/api/approvals/${id}/reject`, { method: "POST" });
                      setShowApprovalModal(false);
                      fetch("/api/approvals").then((r) => r.json()).then((d) => {
                        if (d.ok) setMissionApprovals((d.pending ?? []).filter((a: ApprovalItem) => a.sessionId === missionId));
                      }).catch(() => {});
                    }}
                  />
                ))}
              </div>
            ) : (
              <div style={{ display: "grid", gap: 8 }}>
                {/* Show preview section before allow approve/reject */}
                {visibleOutputs.length > 0 && (
                  <div style={{ padding: "8px 10px", borderRadius: 6, background: "rgba(139,92,246,0.06)", border: "1px solid rgba(139,92,246,0.2)", fontSize: 10, color: "var(--text-2)" }}>
                    Verifiez les resultats visuels avant de prendre une decision.
                  </div>
                )}
                <button onClick={() => recordDecision("approve")} style={decisionButton("#22c55e")} disabled={visibleOutputs.length === 0 && session.progress < 20}>
                  <ThumbsUp size={13} /> Approuver
                </button>
                <button onClick={() => recordDecision("reject")} style={decisionButton("#ef4444")} disabled={visibleOutputs.length === 0 && session.progress < 20}>
                  <ThumbsDown size={13} /> Refuser
                </button>
                <button onClick={() => recordDecision("revision")} style={decisionButton("#f59e0b")}>
                  <RotateCcw size={13} /> Demander une revision
                </button>
                <button onClick={() => recordDecision("direction")} style={decisionButton("#38bdf8")}>
                  <Sparkles size={13} /> Changer la direction
                </button>
              </div>
            )}
          </div>
        </section>

        <section style={{ display: "grid", gap: 12 }}>
          {/* What is happening now? */}
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, padding: 16 }}>
            <SectionHeader title="Ce qui se passe maintenant" icon={<Activity size={12} style={{ color: "#2f6fed" }} />} />
            <div style={{ display: "grid", gap: 8, marginBottom: 10 }}>
              <div style={{ padding: "8px 10px", borderRadius: 7, background: "var(--bg-2)", border: "1px solid var(--border)" }}>
                <div style={{ fontSize: 9, color: "var(--text-3)", fontWeight: 800, textTransform: "uppercase", marginBottom: 3 }}>Travail en cours</div>
                <div style={{ fontSize: 12, color: "var(--text)", fontWeight: 700 }}>{runningTask ? runningTask.title : session.runtime.lastEvent}</div>
              </div>
              <div style={{ padding: "8px 10px", borderRadius: 7, background: "rgba(47,111,237,0.06)", border: "1px solid rgba(47,111,237,0.18)" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 9, color: "#2f6fed", fontWeight: 800, textTransform: "uppercase", marginBottom: 3 }}>Dernier resultat</div>
                    <div style={{ fontSize: 12, color: "var(--text)", fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{latestVisibleOutput ? latestVisibleOutput.title : "Aucun resultat visible pour le moment"}</div>
                  </div>
                  {latestVisibleOutput && (
                    <Link href={`/outputs/${latestVisibleOutput.id}`} style={{ fontSize: 10, color: "#2f6fed", fontWeight: 800, whiteSpace: "nowrap" }}>Ouvrir la preview</Link>
                  )}
                </div>
                {latestVisibleOutput && (
                  <div style={{ marginTop: 8 }}>
                    <VisualOutputPreview visualPreview={latestVisibleOutput.visualPreview} title={latestVisibleOutput.title} summary={latestVisibleOutput.summary ?? latestVisibleOutput.preview} compact />
                    <div style={{ fontSize: 10, color: "var(--text-3)", lineHeight: 1.5, marginTop: latestVisibleOutput.visualPreview ? 7 : 0, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{latestVisibleOutput.preview}</div>
                  </div>
                )}
              </div>
              <div style={{ padding: "8px 10px", borderRadius: 7, background: "var(--bg-2)", border: "1px solid var(--border)" }}>
                <div style={{ fontSize: 9, color: "var(--text-3)", fontWeight: 800, textTransform: "uppercase", marginBottom: 3 }}>Prochaine livraison</div>
                <div style={{ fontSize: 12, color: "var(--text)", fontWeight: 700 }}>{nextExpectedOutput ? nextExpectedOutput.title : "Revision finale ou approbation"}</div>
              </div>
            </div>
            {session.status === "running" && (() => {
              const runningTask = session.tasks.find((t: { status: string }) => t.status === "running");
              const nextTask = session.tasks.find((t: { status: string }) => t.status === "queued");
              const activeAgent = session.assignedAgents.find((a: { status: string }) => a.status === "active");
              const completedCount = session.tasks.filter((t: { status: string }) => t.status === "completed").length;
              const agentColorMap: Record<string, string> = {
                ceo: "#b7791f", cfo: "#2f8f61", cmo: "#2f6fed", cto: "#2f6fed", coo: "#2f6fed",
                frontend_agent: "#2f8f61", backend_agent: "#2f8f61", qa_agent: "#c84a52",
                devops_agent: "#172033", logistics: "#b7791f", sales: "#c84a52", hr: "#2f6fed",
                support: "#2f6fed", product_agent: "#2f6fed", architect_agent: "#172033",
                ecommerce_operator: "#14b8a6",
              };
              const agentNameMap: Record<string, string> = {
                ceo: "CEO Alexandra", cfo: "CFO Diana", cmo: "CMO Sophie", cto: "CTO Raj", coo: "COO Marcus",
                frontend_agent: "Designer Léa", backend_agent: "Olivier API", qa_agent: "QA Naomi",
                devops_agent: "DevOps Kenji", logistics: "Emma Logistics", sales: "Rachel Sales", hr: "James HR",
                support: "Carlos Support", product_agent: "Mia Product", architect_agent: "Architecte",
              };
              const activeColor = activeAgent ? (agentColorMap[activeAgent.agentId] ?? "#2f6fed") : "#2f6fed";

              // Build delegation timeline from logs
              const delegationLogs = session.logs.filter((l: { source: string; message: string }) =>
                l.source === "control" && (l.message.includes("assignée") || l.message.includes("délégué") || l.message.includes("Délégation"))
              ).slice(0, 3);

              return (
                <div>
                  {/* Active agent indicator */}
                  {activeAgent && (
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, padding: "8px 10px", borderRadius: 7, background: `${activeColor}0a`, border: `1px solid ${activeColor}20` }}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: activeColor, animation: "pulse 2s infinite" }} />
                      <span style={{ fontSize: 11, fontWeight: 600, color: activeColor }}>{agentNameMap[activeAgent.agentId] ?? activeAgent.agentId}</span>
                      <span style={{ fontSize: 10, color: "var(--text-3)" }}>travaille sur:</span>
                    </div>
                  )}
                  {/* Current task */}
                  {runningTask && (
                    <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text)", lineHeight: 1.4, marginBottom: 6 }}>
                      {runningTask.title}
                    </div>
                  )}
                  {/* Next task preview */}
                  {nextTask && (
                    <div style={{ fontSize: 10, color: "var(--text-3)", marginBottom: 6, padding: "4px 8px", background: "var(--bg-2)", borderRadius: 5, border: "1px solid var(--border)" }}>
                      Prochaine tache: {nextTask.title} ({agentNameMap[nextTask.agent] ?? nextTask.agent})
                    </div>
                  )}
                  {/* Progress bar */}
                  <div style={{ marginBottom: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: "var(--text-3)", marginBottom: 3 }}>
                      <span>Progression</span>
                      <span>{completedCount}/{session.tasks.length} taches</span>
                    </div>
                    <div style={{ height: 6, background: "var(--border)", borderRadius: 99, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${session.progress}%`, background: "linear-gradient(90deg, #1f5eff, #2f8f61)", borderRadius: 99, transition: "width 0.5s ease" }} />
                    </div>
                  </div>
                  {/* Delegation timeline events */}
                  {delegationLogs.length > 0 && (
                    <div style={{ marginTop: 8 }}>
                      <div style={{ fontSize: 9, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", marginBottom: 4 }}>Délégations</div>
                      {delegationLogs.map((log: MissionLog) => (
                        <div key={log.id} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10, color: "var(--text-2)", marginBottom: 3 }}>
                          <span style={{ color: "#f59e0b" }}>→</span> {log.message}
                        </div>
                      ))}
                    </div>
                  )}
                  {/* Phase info */}
                  {runningTask && (
                    <div style={{ fontSize: 10, color: "var(--text-3)", marginTop: 4 }}>
                      Phase: {runningTask.phase} · Auto-exécution en cours
                    </div>
                  )}
                  {!runningTask && !activeAgent && completedCount > 0 && (
                    <div style={{ fontSize: 11, color: "var(--text-2)" }}>En attente de la prochaine tâche...</div>
                  )}
                  {completedCount === 0 && !runningTask && (
                    <div style={{ fontSize: 11, color: "var(--text-3)" }}>Démarrage de la mission...</div>
                  )}
                  {/* Live typing indicator for active agent */}
                  {runningTask && activeAgent && (
                    <div style={{ marginTop: 8 }}>
                      <TypingBubble
                        firstName={activeAgent.role?.split(" ").slice(0, 1).join(" ") ?? runningTask.agent}
                        avatarEmoji={runningTask.agent === "cmo" ? "📣" : runningTask.agent === "frontend_agent" ? "🎨" : runningTask.agent === "cto" ? "🔧" : runningTask.agent === "qa_agent" ? "🔍" : runningTask.agent === "cfo" ? "💰" : runningTask.agent === "coo" ? "⚙️" : runningTask.agent === "backend_agent" ? "🗄️" : "🤖"}
                        avatarColor={activeColor}
                        message={`Travaille sur: ${runningTask.title}`}
                        size="sm"
                      />
                    </div>
                  )}
                </div>
              );
            })()}
            {session.status === "completed" && (
              <div style={{ fontSize: 11, color: "#2f8f61", fontWeight: 600 }}>Mission terminee - tous les resultats sont prets.</div>
            )}
            {session.status === "paused" && (
              <div style={{ fontSize: 11, color: "#b7791f" }}>Mission en pause - cliquez Reprendre pour continuer.</div>
            )}
            {session.status === "draft" && (
              <div style={{ fontSize: 11, color: "var(--text-3)" }}>Mission en préparation...</div>
            )}
          </div>

          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, padding: 16 }}>
            <SectionHeader title="Activite recente" icon={<Radio size={12} style={{ color: "#2f8f61" }} />} />
            <div style={{ display: "grid", gap: 12 }}>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--text-3)", marginBottom: 5 }}>
                  <span>Progression</span>
                  <strong style={{ color: cfg.color }}>{session.progress}%</strong>
                </div>
                <div style={{ height: 8, background: "var(--border)", borderRadius: 99, overflow: "hidden" }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${session.progress}%` }}
                    transition={{ duration: 0.6 }}
                    style={{ height: "100%", background: `linear-gradient(90deg, ${cfg.color}99, ${cfg.color})`, borderRadius: 99 }}
                  />
                </div>
              </div>
              <div style={{ display: "grid", gap: 7 }}>
                <AnimatePresence initial={false}>
                  {session.logs.slice(0, 7).map((log, index) => (
                    <motion.div
                      key={log.id}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.04 }}
                      style={{ display: "grid", gridTemplateColumns: "58px 1fr", gap: 9, padding: "8px 10px", background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: 8 }}
                    >
                      <span style={{ fontSize: 10, color: "var(--text-3)", fontFamily: "ui-monospace, monospace" }}>{formatTime(log.timestamp)}</span>
                      <div>
                        <div style={{ fontSize: 11, color: AGENT_COLORS[log.agent] ?? "#8b97b2", fontWeight: 800 }}>
                          {executiveLabel(log.agent)}
                        </div>
                        <div style={{ fontSize: 12, color: "var(--text-2)" }}>{log.message}</div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
                {runningTask && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", border: "1px solid rgba(52,211,153,0.28)", background: "rgba(52,211,153,0.08)", borderRadius: 8 }}>
                    <TypingDots />
                    <span style={{ fontSize: 12, color: "#2f8f61" }}>{executiveLabel(runningTask.agent)} travaille sur: {runningTask.title}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, padding: 16 }}>
            <SectionHeader title="Resultats" icon={<FileText size={12} style={{ color: "#2f6fed" }} />} />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: 10 }}>
              {outputs.length === 0 ? (
                <div style={{ gridColumn: "1 / -1", padding: 16, textAlign: "center", color: "var(--text-3)", border: "1px dashed var(--border)", borderRadius: 8 }}>
                  Les fichiers, previews, propositions et documents apparaitront ici.
                </div>
              ) : outputs.map((file) => {
                const kind = generatedKind(file);
                return (
                  <div key={file.path} style={{ minHeight: 112, padding: 12, background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#38bdf8", fontSize: 11, fontWeight: 800, marginBottom: 16 }}>
                      {kind.icon} {kind.label}
                    </div>
                    <div style={{ fontSize: 13, color: "var(--text)", fontWeight: 700, overflowWrap: "anywhere" }}>{file.name}</div>
                    <div style={{ fontSize: 10, color: "var(--text-3)", marginTop: 4 }}>{Math.max(1, Math.round(file.size / 1024))} KB</div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section style={{ display: "grid", gap: 12 }}>
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, padding: 16 }}>
            <SectionHeader title="Equipe AI" icon={<Users size={12} style={{ color: "#2f6fed" }} />} />
            <div style={{ display: "grid", gap: 8 }}>
              {session.assignedAgents.map((agent) => {
                const running = session.tasks.some((task) => task.agent === agent.agentId && task.status === "running");
                const agentColor = AGENT_COLORS[agent.agentId] ?? "#8b97b2";
                const agentEmojiMap: Record<string, string> = { cmo: "📣", cto: "🔧", cfo: "💰", coo: "⚙️", frontend_agent: "🎨", backend_agent: "🗄️", qa_agent: "🔍", devops_agent: "🚀", logistics: "📦", sales: "🎯", hr: "👥", support: "🎧", product_agent: "📋", architect_agent: "🏗️", ecommerce_operator: "🛒" };
                return (
                  <div key={agent.agentId} style={{ display: "flex", alignItems: "center", gap: 10, padding: 10, border: `1px solid ${agentColor}30`, background: running ? "rgba(52,211,153,0.07)" : "var(--bg-2)", borderRadius: 8 }}>
                    <div style={{ fontSize: 16, lineHeight: 1 }}>{agentEmojiMap[agent.agentId] ?? "🤖"}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                        <span style={{ fontSize: 12, color: "var(--text)", fontWeight: 800 }}>{executiveLabel(agent.agentId)}</span>
                        {running && <ExpertiseBadge label="Travaille" color="#2f8f61" size="xs" />}
                      </div>
                      <div style={{ fontSize: 10, color: "var(--text-3)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{agent.role}</div>
                    </div>
                    <StatusBadge label={running ? "Actif" : agent.status.replace(/_/g, " ")} color={running ? "#2f8f61" : "#8a9099"} size="xs" />
                  </div>
                );
              })}
              {/* Direct Employee Chat buttons */}
              <div style={{ marginTop: 6, padding: "8px 0", borderTop: "1px solid var(--border)" }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", marginBottom: 6 }}>Message direct</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                  {[
                    { id: "cfo", label: "CFO", emoji: "💰" },
                    { id: "cmo", label: "Marketing", emoji: "📣" },
                    { id: "logistics", label: "Logistics", emoji: "📦" },
                    { id: "ceo", label: "CEO", emoji: "👑" },
                  ].map((p) => (
                    <a
                      key={p.id}
                      href={`/conversations?newThread=true&participant=${p.id}&missionId=${session.sessionId}&title=Mission ${session.projectName} - Message ${p.label}`}
                      style={{
                        padding: "3px 8px", fontSize: 9, fontWeight: 600,
                        background: "var(--bg-2)", border: "1px solid var(--border)",
                        borderRadius: 6, color: "var(--text-2)", textDecoration: "none",
                        display: "flex", alignItems: "center", gap: 3,
                      }}
                    >
                      {p.emoji} Message {p.label}
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Visual Outputs — Design/Branding deliverables */}
          {visibleOutputs.length > 0 && (
            <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, padding: 16 }}>
              <SectionHeader title="Previews visuelles" icon={<Palette size={12} style={{ color: "#2f6fed" }} />} />
              <div style={{ display: "grid", gap: 8 }}>
                {visibleOutputs.map((vo) => {
                  const typeLabel: Record<string, string> = {
                    creative_brief: "Direction créative",
                    logo_direction: "Concept logo",
                    style_direction: "Direction style",
                    color_palette: "Palette couleurs",
                    typography: "Typographie",
                    moodboard: "Moodboard",
                    concept_card: "Concept",
                    architecture_doc: "Architecture",
                    api_spec: "API Spec",
                    sitemap: "Sitemap",
                    wireframe: "Wireframe",
                    copywriting: "Copywriting",
                    marketing_plan: "Plan marketing",
                    financial_projection: "Projections",
                    task_list: "Plan d'exécution",
                    progress_report: "Rapport",
                    validation_report: "Validation",
                    before_after: "Avant/Après",
                    hero_section: "Hero Section",
                    page_preview: "Page Preview",
                    ux_recommendation: "UX Notes",
                  };
                  const statusColors: Record<string, string> = { draft: "#8a9099", in_progress: "#2f6fed", review: "#b7791f", approved: "#2f8f61", delivered: "#2f6fed" };
                  const statusLabels: Record<string, string> = { draft: "En preparation", in_progress: "En cours", review: "A approuver", approved: "Approuve", delivered: "Livre" };
                  const statusColor = statusColors[vo.status] ?? "#94a3b8";
                  return (
                    <Link key={vo.id} href={`/outputs/${vo.id}`} style={{ textDecoration: "none" }}>
                      <div style={{ padding: 10, borderRadius: 8, background: "var(--bg-2)", border: `1px solid ${statusColor}20`, borderLeft: `3px solid ${statusColor}`, cursor: "pointer" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text)" }}>{vo.title}</div>
                          <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                            <span style={{ fontSize: 8, padding: "2px 6px", borderRadius: 4, background: `${statusColor}22`, color: statusColor, fontWeight: 600 }}>{typeLabel[vo.type] ?? vo.type}</span>
                            <span style={{ fontSize: 8, padding: "2px 6px", borderRadius: 4, background: `${statusColor}22`, color: statusColor, fontWeight: 600 }}>{statusLabels[vo.status] ?? vo.status.replace(/_/g, " ")}</span>
                          </div>
                        </div>
                        <VisualOutputPreview visualPreview={vo.visualPreview} title={vo.title} summary={vo.summary ?? vo.preview} compact />
                        <div style={{ fontSize: 10, color: "var(--text-3)", lineHeight: 1.5, whiteSpace: "pre-wrap", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden", marginTop: vo.visualPreview ? 8 : 0 }}>{vo.preview}</div>
                        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
                          <span style={{ fontSize: 9, color: "#2f6fed" }}>→ {executiveLabel(vo.assignedAgent)}</span>
                          <span style={{ fontSize: 8, color: "var(--text-3)" }}>Voir details →</span>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, padding: 16 }}>
            <SectionHeader title="Taches actives" icon={<Clock3 size={12} style={{ color: "#b7791f" }} />} />
            <div style={{ display: "grid", gap: 8 }}>
              <div style={{ fontSize: 12, color: "var(--text-2)" }}>{completedTasks}/{session.tasks.length} taches terminees</div>
              {session.tasks.slice(0, 6).map((task) => (
                <div key={task.id} style={{ padding: 9, borderRadius: 8, background: "var(--bg-2)", border: "1px solid var(--border)" }}>
                  <div style={{ display: "flex", gap: 6, justifyContent: "space-between" }}>
                    <span style={{ fontSize: 11, color: "var(--text)", fontWeight: 700 }}>{task.title}</span>
                    <span style={{ fontSize: 10, color: task.status === "running" ? "#2f8f61" : "var(--text-3)" }}>{task.status.replace(/_/g, " ")}</span>
                  </div>
                  {task.status === "running" && (
                    <div style={{ height: 4, background: "var(--border)", borderRadius: 99, marginTop: 7, overflow: "hidden" }}>
                      <motion.div animate={{ width: `${Math.max(task.progress, 10)}%` }} style={{ height: "100%", background: "#2f8f61" }} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, padding: 16 }}>
            <SectionHeader title="Points a verifier" icon={<XCircle size={12} style={{ color: "#c84a52" }} />} />
            {blockedTasks.length === 0 ? (
              <div style={{ display: "flex", alignItems: "center", gap: 7, color: "#2f8f61", fontSize: 12 }}>
                <CheckCircle2 size={13} /> Aucun blocage
              </div>
            ) : blockedTasks.map((task) => (
              <div key={task.id} style={{ fontSize: 12, color: "#ef4444", marginBottom: 6 }}>{task.title}</div>
            ))}
          </div>

          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, padding: 16 }}>
            <SectionHeader title="Missions recentes" icon={<Clock3 size={12} style={{ color: "#2f6fed" }} />} />
            <div style={{ display: "grid", gap: 6 }}>
              {recent.map((item) => (
                <Link key={item.sessionId} href={`/mission/${item.sessionId}`} style={{ fontSize: 12, color: item.sessionId === missionId ? "#2f8f61" : "var(--text-2)", padding: "7px 8px", border: "1px solid var(--border)", borderRadius: 8 }}>
                  {item.sessionId === missionId ? "Mission ouverte" : "Reprendre"}: {item.projectName}
                </Link>
              ))}
            </div>
          </div>
        </section>
      </div>

      {/* Approval Preview Modal */}
      <ApprovalPreviewModal
        preview={approvalPreview}
        open={showApprovalModal}
        onClose={() => { setShowApprovalModal(false); setApprovalPreview(null); }}
        onApprove={async (id) => {
          await fetch(`/api/approvals/${id}/approve`, { method: "POST" });
          setShowApprovalModal(false);
          setApprovalPreview(null);
          fetch("/api/approvals").then((r) => r.json()).then((d) => {
            if (d.ok) setMissionApprovals((d.pending ?? []).filter((a: ApprovalItem) => a.sessionId === missionId));
          }).catch(() => {});
        }}
        onReject={async (id) => {
          await fetch(`/api/approvals/${id}/reject`, { method: "POST" });
          setShowApprovalModal(false);
          setApprovalPreview(null);
          fetch("/api/approvals").then((r) => r.json()).then((d) => {
            if (d.ok) setMissionApprovals((d.pending ?? []).filter((a: ApprovalItem) => a.sessionId === missionId));
          }).catch(() => {});
        }}
      />
    </main>
  );
}

function decisionButton(color: string, disabled = false): CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    gap: 7,
    width: "100%",
    padding: "9px 10px",
    borderRadius: 8,
    border: `1px solid ${color}45`,
    background: `${color}14`,
    color: disabled ? "#64748b" : color,
    fontSize: 12,
    fontWeight: 800,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.5 : 1,
  };
}

function TypingDots() {
  return (
    <span style={{ display: "inline-flex", gap: 3 }}>
      {[0, 1, 2].map((dot) => (
        <motion.span
          key={dot}
          animate={{ opacity: [0.25, 1, 0.25] }}
          transition={{ duration: 0.9, repeat: Infinity, delay: dot * 0.16 }}
          style={{ width: 5, height: 5, borderRadius: 99, background: "#34d399" }}
        />
      ))}
    </span>
  );
}
