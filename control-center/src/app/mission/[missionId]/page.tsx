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
} from "lucide-react";
import { GhostButton, LocalBadge, NvidiaLiveBadge, PrimaryButton, SectionHeader, SimBadge, StatusBadge } from "@/components/ui";

type SessionStatus = "draft" | "running" | "paused" | "completed" | "failed";
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

const STATUS: Record<SessionStatus, { label: string; color: string; bg: string }> = {
  draft: { label: "Draft", color: "#8b97b2", bg: "rgba(139,151,178,0.1)" },
  running: { label: "Running", color: "#34d399", bg: "rgba(16,185,129,0.12)" },
  paused: { label: "Paused", color: "#f59e0b", bg: "rgba(245,158,11,0.12)" },
  completed: { label: "Completed", color: "#38bdf8", bg: "rgba(59,130,246,0.12)" },
  failed: { label: "Failed", color: "#f43f5e", bg: "rgba(244,63,94,0.12)" },
};

const AGENT_LABELS: Record<string, string> = {
  product_agent: "CEO delegation",
  architect_agent: "Architecture Director",
  frontend_agent: "Designer",
  backend_agent: "Engineering Director",
  qa_agent: "QA Director",
  devops_agent: "Runtime Director",
};

const AGENT_COLORS: Record<string, string> = {
  product_agent: "#a78bfa",
  architect_agent: "#f59e0b",
  frontend_agent: "#3b82f6",
  backend_agent: "#22c55e",
  qa_agent: "#ef4444",
  devops_agent: "#6c63ff",
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
  if (/\.(png|jpg|jpeg|webp|gif)$/.test(lower)) return { label: "Image preview", icon: <ImageIcon size={13} /> };
  if (lower.startsWith("project/")) return { label: "Website preview", icon: <Monitor size={13} /> };
  if (lower.includes("invoice")) return { label: "Invoice", icon: <FileText size={13} /> };
  if (lower.includes("proposal")) return { label: "Proposal", icon: <FileText size={13} /> };
  return { label: "Strategy doc", icon: <FileText size={13} /> };
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
      <SectionHeader title="Questions / Decisions Needed" icon={<HelpCircle size={12} style={{ color: "#8b5cf6" }} />} />
      <div style={{ display: "grid", gap: 8 }}>
        {pending.map((q) => (
          <div key={q.id} style={{ padding: 10, borderRadius: 6, background: `${q.agentColor}08`, border: `1px solid ${q.agentColor}30` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
              <span style={{ fontSize: 12 }}>{q.agentAvatar}</span>
              <span style={{ fontSize: 10, fontWeight: 700, color: q.agentColor }}>{q.agentName}</span>
              <span style={{ fontSize: 9, color: "var(--text-3)" }}>{new Date(q.createdAt).toLocaleTimeString()}</span>
              <span style={{ marginLeft: "auto", fontSize: 8, fontWeight: 600, color: "#f59e0b", textTransform: "uppercase" }}>Pending</span>
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
              <span style={{ marginLeft: "auto", fontSize: 8, fontWeight: 600, color: "#22c55e", textTransform: "uppercase" }}>Answered</span>
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
  const [runtimeMode, setRuntimeMode] = useState<"nvidia" | "simulation">("simulation");
  const [visibleOutputs, setVisibleOutputs] = useState<{ id: string; title: string; type: string; preview: string; status: string; assignedAgent: string }[]>([]);
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
    fetch("/api/runtime-mode").then((r) => r.json()).then((d) => {
      if (d.ok) setRuntimeMode(d.mode === "nvidia" ? "nvidia" : "simulation");
    }).catch(() => {});
    const timer = window.setInterval(() => void loadMission(), 4000);
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
        <h1>Mission Room introuvable</h1>
        <Link href="/mission">Recent Missions</Link>
      </main>
    );
  }

  const cfg = STATUS[session.status];
  const runningTask = session.tasks.find((task) => task.status === "running");
  const blockedTasks = session.tasks.filter((task) => task.status === "blocked" || task.status === "failed");
  const completedTasks = session.tasks.filter((task) => task.status === "completed").length;

  return (
    <main className="page" style={{ maxWidth: 1500, paddingTop: 22 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, marginBottom: 16 }}>
        <div>
          <Link href="/ceo" style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, color: "var(--text-3)", marginBottom: 8 }}>
            <ArrowLeft size={13} /> CEO Cockpit
          </Link>
          <h1 style={{ margin: 0, display: "flex", alignItems: "center", gap: 10 }}>
            Mission Room: {session.projectName}
            <StatusBadge label={cfg.label} color={cfg.color} bg={cfg.bg} />
          </h1>
          <p style={{ color: "var(--text-2)", fontSize: 13, marginTop: 5 }}>{session.projectIdea}</p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", justifyContent: "flex-end" }}>
          <LocalBadge />
          {runtimeMode === "nvidia" ? <NvidiaLiveBadge /> : <SimBadge />}
          <PrimaryButton onClick={() => runMissionAction("run-step")} disabled={!!actionLoading || session.status === "completed"} color="#34d399">
            <Play size={13} /> {actionLoading === "run-step" ? "Running..." : "Resume Mission"}
          </PrimaryButton>
          <GhostButton onClick={loadMission}>
            <RefreshCw size={13} /> Refresh
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
            <SectionHeader title="CEO Conversation" icon={<Sparkles size={12} style={{ color: "#f59e0b" }} />} />
            <div style={{ display: "grid", gap: 10 }}>
              <div style={{ padding: 12, background: "rgba(245,158,11,0.07)", border: "1px solid rgba(245,158,11,0.22)", borderRadius: 8 }}>
                <div style={{ fontSize: 11, color: "#f59e0b", fontWeight: 800, marginBottom: 4 }}>CEO delegation</div>
                <div style={{ fontSize: 13, color: "var(--text-2)" }}>Mission created and delegated to the executive team. The room now guides supervision, decisions, and results.</div>
              </div>
              <div style={{ padding: 12, background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: 8 }}>
                <div style={{ fontSize: 11, color: "var(--text-3)", textTransform: "uppercase", marginBottom: 5 }}>Current decision</div>
                <div style={{ fontSize: 13, color: "var(--text)" }}>{runningTask ? runningTask.title : "Review generated results and approve the next direction."}</div>
              </div>
            </div>
          </div>

          {/* Assumptions section */}
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, padding: 16 }}>
            <SectionHeader title="Assumptions" icon={<Info size={12} style={{ color: "#3b82f6" }} />} />
            <div style={{ display: "grid", gap: 6 }}>
              {[
                { field: "Project name", value: session.projectName },
                { field: "Mission type", value: session.missionType || "saas_project" },
                { field: "Status", value: session.status },
                { field: "Client", value: "(auto — modifiable)" },
                { field: "Objective", value: session.tasks[0]?.title || session.projectName },
              ].map((item) => (
                <div key={item.field} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", background: "var(--bg-2)", borderRadius: 6, border: "1px solid var(--border)" }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: "var(--text-3)", minWidth: 90 }}>{item.field}</span>
                  <span style={{ fontSize: 12, color: "var(--text)", flex: 1 }}>{item.value}</span>
                  <span style={{ fontSize: 8, color: "#3b82f6", textTransform: "uppercase", fontWeight: 600 }}>inferred</span>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 8, fontSize: 10, color: "var(--text-3)" }}>
              These assumptions were auto-inferred from your CEO chat. You can modify them in the Mission Room settings.
            </div>
          </div>

          {/* Agent Questions for this mission */}
          <MissionQuestions missionId={session.sessionId} />

          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, padding: 16 }}>
            <SectionHeader title="Decisions Required" icon={<AlertTriangle size={12} style={{ color: "#f59e0b" }} />} />
            <div style={{ display: "grid", gap: 8 }}>
              <button onClick={() => recordDecision("approve")} style={decisionButton("#22c55e")}>
                <ThumbsUp size={13} /> Approve
              </button>
              <button onClick={() => recordDecision("reject")} style={decisionButton("#ef4444")}>
                <ThumbsDown size={13} /> Reject
              </button>
              <button onClick={() => recordDecision("revision")} style={decisionButton("#f59e0b")}>
                <RotateCcw size={13} /> Ask Revision
              </button>
              <button onClick={() => recordDecision("direction")} style={decisionButton("#38bdf8")}>
                <Sparkles size={13} /> Change Direction
              </button>
            </div>
          </div>
        </section>

        <section style={{ display: "grid", gap: 12 }}>
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, padding: 16 }}>
            <SectionHeader title="Live Timeline" icon={<Radio size={12} style={{ color: "#34d399" }} />} />
            <div style={{ display: "grid", gap: 12 }}>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--text-3)", marginBottom: 5 }}>
                  <span>Mission progression</span>
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
                    <span style={{ fontSize: 12, color: "#34d399" }}>{executiveLabel(runningTask.agent)} travaille sur: {runningTask.title}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, padding: 16 }}>
            <SectionHeader title="Results" icon={<FileText size={12} style={{ color: "#38bdf8" }} />} />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: 10 }}>
              {outputs.length === 0 ? (
                <div style={{ gridColumn: "1 / -1", padding: 16, textAlign: "center", color: "var(--text-3)", border: "1px dashed var(--border)", borderRadius: 8 }}>
                  Generated files, previews, proposals, invoices, and strategy docs will appear here.
                </div>
              ) : outputs.map((file) => {
                const kind = generatedKind(file);
                return (
                  <div key={file.path} style={{ minHeight: 112, padding: 12, background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#38bdf8", fontSize: 11, fontWeight: 800, marginBottom: 16 }}>
                      {kind.icon} {kind.label}
                    </div>
                    <div style={{ fontSize: 13, color: "var(--text)", fontWeight: 700, overflowWrap: "anywhere" }}>{file.name}</div>
                    <div style={{ fontSize: 10, color: "var(--text-3)", marginTop: 4 }}>{file.path}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section style={{ display: "grid", gap: 12 }}>
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, padding: 16 }}>
            <SectionHeader title="Executive Team" icon={<Users size={12} style={{ color: "#a78bfa" }} />} />
            <div style={{ display: "grid", gap: 8 }}>
              {session.assignedAgents.map((agent) => {
                const running = session.tasks.some((task) => task.agent === agent.agentId && task.status === "running");
                return (
                  <div key={agent.agentId} style={{ display: "flex", alignItems: "center", gap: 10, padding: 10, border: `1px solid ${AGENT_COLORS[agent.agentId] ?? "#8b97b2"}30`, background: running ? "rgba(52,211,153,0.07)" : "var(--bg-2)", borderRadius: 8 }}>
                    <Bot size={14} style={{ color: AGENT_COLORS[agent.agentId] ?? "#8b97b2" }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, color: "var(--text)", fontWeight: 800 }}>{executiveLabel(agent.agentId)}</div>
                      <div style={{ fontSize: 10, color: "var(--text-3)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{agent.role}</div>
                    </div>
                    <StatusBadge label={running ? "active" : agent.status} color={running ? "#34d399" : "#8b97b2"} size="xs" />
                  </div>
                );
              })}
              {/* Direct Employee Chat buttons */}
              <div style={{ marginTop: 6, padding: "8px 0", borderTop: "1px solid var(--border)" }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", marginBottom: 6 }}>Direct Chat</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                  {[
                    { id: "cfo", label: "CFO", emoji: "💰" },
                    { id: "cmo", label: "Marketing", emoji: "📣" },
                    { id: "logistics", label: "Logistics", emoji: "📦" },
                    { id: "ceo", label: "CEO", emoji: "👑" },
                  ].map((p) => (
                    <a
                      key={p.id}
                      href={`/conversations?newThread=true&participant=${p.id}&missionId=${session.sessionId}&title=Mission ${session.projectName} - Chat with ${p.label}`}
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
              <SectionHeader title="Visual Deliverables" icon={<Palette size={12} style={{ color: "#8b5cf6" }} />} />
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
                  };
                  const statusColors: Record<string, string> = { draft: "#94a3b8", in_progress: "#3b82f6", review: "#f59e0b", approved: "#22c55e", delivered: "#8b5cf6" };
                  return (
                    <div key={vo.id} style={{ padding: 10, borderRadius: 8, background: "var(--bg-2)", border: "1px solid var(--border)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text)" }}>{vo.title}</div>
                        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                          <span style={{ fontSize: 8, padding: "2px 6px", borderRadius: 4, background: `${statusColors[vo.status] ?? "#94a3b8"}22`, color: statusColors[vo.status] ?? "#94a3b8", fontWeight: 600 }}>{typeLabel[vo.type] ?? vo.type}</span>
                          <span style={{ fontSize: 8, padding: "2px 6px", borderRadius: 4, background: `${statusColors[vo.status] ?? "#94a3b8"}22`, color: statusColors[vo.status] ?? "#94a3b8", fontWeight: 600 }}>{vo.status}</span>
                        </div>
                      </div>
                      <div style={{ fontSize: 10, color: "var(--text-3)", lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{vo.preview}</div>
                      <div style={{ fontSize: 9, color: "#8b5cf6", marginTop: 4 }}>→ {vo.assignedAgent}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, padding: 16 }}>
            <SectionHeader title="Active Tasks" icon={<Clock3 size={12} style={{ color: "#f59e0b" }} />} />
            <div style={{ display: "grid", gap: 8 }}>
              <div style={{ fontSize: 12, color: "var(--text-2)" }}>{completedTasks}/{session.tasks.length} tasks completed</div>
              {session.tasks.slice(0, 6).map((task) => (
                <div key={task.id} style={{ padding: 9, borderRadius: 8, background: "var(--bg-2)", border: "1px solid var(--border)" }}>
                  <div style={{ display: "flex", gap: 6, justifyContent: "space-between" }}>
                    <span style={{ fontSize: 11, color: "var(--text)", fontWeight: 700 }}>{task.title}</span>
                    <span style={{ fontSize: 10, color: task.status === "running" ? "#34d399" : "var(--text-3)" }}>{task.status}</span>
                  </div>
                  {task.status === "running" && (
                    <div style={{ height: 4, background: "var(--border)", borderRadius: 99, marginTop: 7, overflow: "hidden" }}>
                      <motion.div animate={{ width: `${Math.max(task.progress, 10)}%` }} style={{ height: "100%", background: "#34d399" }} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, padding: 16 }}>
            <SectionHeader title="Blockers" icon={<XCircle size={12} style={{ color: "#ef4444" }} />} />
            {blockedTasks.length === 0 ? (
              <div style={{ display: "flex", alignItems: "center", gap: 7, color: "#34d399", fontSize: 12 }}>
                <CheckCircle2 size={13} /> No blockers
              </div>
            ) : blockedTasks.map((task) => (
              <div key={task.id} style={{ fontSize: 12, color: "#ef4444", marginBottom: 6 }}>{task.title}</div>
            ))}
          </div>

          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, padding: 16 }}>
            <SectionHeader title="Recent Missions" icon={<Clock3 size={12} style={{ color: "#38bdf8" }} />} />
            <div style={{ display: "grid", gap: 6 }}>
              {recent.map((item) => (
                <Link key={item.sessionId} href={`/mission/${item.sessionId}`} style={{ fontSize: 12, color: item.sessionId === missionId ? "#34d399" : "var(--text-2)", padding: "7px 8px", border: "1px solid var(--border)", borderRadius: 8 }}>
                  {item.sessionId === missionId ? "Open Mission" : "Resume Mission"}: {item.projectName}
                </Link>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function decisionButton(color: string): CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    gap: 7,
    width: "100%",
    padding: "9px 10px",
    borderRadius: 8,
    border: `1px solid ${color}45`,
    background: `${color}14`,
    color,
    fontSize: 12,
    fontWeight: 800,
    cursor: "pointer",
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
