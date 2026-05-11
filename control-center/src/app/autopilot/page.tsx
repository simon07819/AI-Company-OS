"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Cpu,
  PlusCircle,
  RefreshCw,
  Rocket,
  Search,
} from "lucide-react";
import {
  PageHeader,
  MetricCard,
  Panel,
  SectionHeader,
  StatusBadge,
  EmptyState,
  GhostButton,
  PrimaryButton,
  LocalBadge,
  SimBadge,
  Row,
  ErrorBanner,
} from "@/components/ui";

type SessionStatus = "draft" | "running" | "paused" | "completed" | "failed";

interface AutopilotSession {
  sessionId: string;
  projectName: string;
  projectIdea: string;
  productType: string | null;
  template: string | null;
  stack: string | null;
  status: SessionStatus;
  currentPhase: string;
  progress: number;
  assignedAgents: { agentId: string; role: string; status: string }[];
  createdAt: string;
  updatedAt: string;
}

const STATUS_CONFIG: Record<SessionStatus, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  running:   { label: "RUNNING",   color: "#34d399", bg: "rgba(16,185,129,0.12)",  icon: <Rocket size={12} /> },
  paused:    { label: "PAUSED",    color: "#f59e0b", bg: "rgba(245,158,11,0.12)",  icon: <Clock3 size={12} /> },
  completed: { label: "COMPLETED", color: "#38bdf8", bg: "rgba(59,130,246,0.12)",  icon: <CheckCircle2 size={12} /> },
  failed:    { label: "FAILED",    color: "#f43f5e", bg: "rgba(244,63,94,0.12)",   icon: <AlertTriangle size={12} /> },
  draft:     { label: "DRAFT",     color: "#8b97b2", bg: "rgba(139,151,178,0.1)",  icon: <Clock3 size={12} /> },
};

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

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-CA", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function shortId(sessionId: string): string {
  return sessionId.length > 16 ? sessionId.slice(0, 16) + "..." : sessionId;
}

export default function AutopilotPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<AutopilotSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("Loading sessions...");
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);

  const loadSessions = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/autopilot/sessions", { cache: "no-store" });
      const payload = (await res.json()) as { ok: boolean; message?: string; sessions?: AutopilotSession[] };
      setSessions(payload.sessions ?? []);
      setMessage(payload.message ?? "Sessions loaded.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      setMessage(`Failed to load sessions: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadSessions();
  }, []);

  const filtered = sessions.filter((s) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      s.projectName.toLowerCase().includes(q) ||
      s.projectIdea.toLowerCase().includes(q) ||
      s.sessionId.toLowerCase().includes(q) ||
      s.status.includes(q)
    );
  });

  const running = sessions.filter((s) => s.status === "running").length;
  const completed = sessions.filter((s) => s.status === "completed").length;
  const totalProgress = sessions.length > 0
    ? Math.round(sessions.reduce((sum, s) => sum + s.progress, 0) / sessions.length)
    : 0;

  return (
    <main className="page" style={{ maxWidth: 960 }}>
      {/* Header */}
      <PageHeader
        icon={
          <div style={{
            width: 40, height: 40, borderRadius: 12,
            background: "linear-gradient(135deg, #6366f1, #a78bfa)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 18, boxShadow: "0 0 20px rgba(99,102,241,0.35)",
          }}>
            <Cpu size={20} color="#fff" />
          </div>
        }
        title="Autopilot Sessions"
        description="AI agents execute missions autonomously. Simulation mode active when NVIDIA_API_KEY not set."
        badge={
          <>
            <LocalBadge />
            <SimBadge />
          </>
        }
        actions={
          <PrimaryButton onClick={() => router.push("/projects/new")}>
            <PlusCircle size={14} /> New Project
          </PrimaryButton>
        }
      />

      {/* Error banner */}
      {error && <ErrorBanner message={error} onRetry={loadSessions} />}

      {/* Stats */}
      <Panel style={{ marginBottom: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 10 }}>
          <MetricCard label="Total Sessions" value={sessions.length} icon={<Cpu size={12} />} color="#6366f1" />
          <MetricCard label="Running" value={running} icon={<Rocket size={12} />} color="#34d399" />
          <MetricCard label="Completed" value={completed} icon={<CheckCircle2 size={12} />} color="#38bdf8" />
          <MetricCard label="Avg Progress" value={`${totalProgress}%`} icon={<Clock3 size={12} />} color="#a78bfa" />
        </div>
      </Panel>

      {/* Toolbar */}
      <Row style={{ marginBottom: 20, background: "var(--surface)" }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 200,
          background: "transparent",
        }}>
          <Search size={14} color="var(--text-3)" />
          <input
            type="text"
            placeholder="Search sessions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              border: "none", background: "transparent", color: "var(--text)",
              fontSize: 13, outline: "none", width: "100%",
            }}
          />
        </div>
        <GhostButton onClick={loadSessions} disabled={loading}>
          <RefreshCw size={14} /> {loading ? "Loading..." : "Refresh"}
        </GhostButton>
      </Row>

      {/* Info bar */}
      <div style={{ marginBottom: 16, color: "var(--text-3)", fontSize: 11 }}>{message}</div>

      {/* Session list */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={<span>🤖</span>}
          title="No autopilot sessions"
          description="Launch a new mission to start autonomous execution."
          action={
            <Link href="/projects/new" style={{ textDecoration: "none" }}>
              <PrimaryButton color="#6366f1">
                <Rocket size={14} /> Launch AI Agency
              </PrimaryButton>
            </Link>
          }
        />
      ) : (
        <Panel style={{ padding: 0 }}>
          <SectionHeader
            icon={<Rocket size={12} />}
            title="Sessions"
            action={
              <span style={{ fontSize: 11, color: "var(--text-3)" }}>
                {filtered.length} session{filtered.length !== 1 ? "s" : ""}
              </span>
            }
          />
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <AnimatePresence initial={false}>
              {filtered.map((session, index) => {
                const cfg = STATUS_CONFIG[session.status];
                return (
                  <motion.div
                    key={session.sessionId}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ delay: index * 0.04 }}
                    style={{
                      background: "var(--surface)",
                      border: `1px solid ${session.status === "running" ? "rgba(16,185,129,0.25)" : "var(--border)"}`,
                      borderRadius: "var(--radius)",
                      padding: "18px 22px",
                      cursor: "pointer",
                      transition: "border-color 140ms ease, box-shadow 140ms ease",
                      boxShadow: session.status === "running" ? "0 0 24px rgba(16,185,129,0.08)" : "none",
                    }}
                    onClick={() => router.push(`/mission/${session.sessionId}`)}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 12 }}>
                      {/* Avatar */}
                      <div style={{
                        width: 42, height: 42, borderRadius: 10, flexShrink: 0,
                        background: cfg.bg,
                        border: `1px solid ${cfg.color}30`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        color: cfg.color,
                      }}>
                        {cfg.icon}
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                          <span style={{ fontSize: 15, fontWeight: 700, color: "var(--text)" }}>{session.projectName}</span>
                          <StatusBadge label={cfg.label} color={cfg.color} bg={cfg.bg} icon={cfg.icon} />
                        </div>
                        <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {session.projectIdea}
                        </div>
                      </div>

                      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0 }}>
                        <div style={{ fontFamily: "ui-monospace, monospace", fontSize: 10, color: "var(--text-3)" }}>
                          {shortId(session.sessionId)}
                        </div>
                        <div style={{ fontSize: 11, color: "var(--text-3)" }}>
                          {formatDate(session.createdAt)}
                        </div>
                      </div>
                    </div>

                    {/* Progress + phase + agents */}
                    <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
                      {/* Progress bar */}
                      <div style={{ flex: 1, minWidth: 120 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--text-3)", marginBottom: 4 }}>
                          <span>{PHASE_LABELS[session.currentPhase] ?? session.currentPhase}</span>
                          <span>{session.progress}%</span>
                        </div>
                        <div style={{ height: 4, borderRadius: 99, background: "var(--border)", overflow: "hidden" }}>
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${session.progress}%` }}
                            transition={{ duration: 0.8, ease: "easeOut" }}
                            style={{
                              height: "100%", borderRadius: 99,
                              background: `linear-gradient(90deg, ${cfg.color}88, ${cfg.color})`,
                            }}
                          />
                        </div>
                      </div>

                      {/* Agent chips */}
                      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                        {session.assignedAgents.slice(0, 4).map((a) => (
                          <span key={a.agentId} style={{
                            fontSize: 10, padding: "2px 8px", borderRadius: 99,
                            background: "var(--surface-2)", color: "var(--text-3)",
                            border: "1px solid var(--border-2)",
                            fontFamily: "ui-monospace, monospace",
                          }}>
                            {a.agentId.replace("_agent", "")}
                          </span>
                        ))}
                        {session.assignedAgents.length > 4 && (
                          <span style={{ fontSize: 10, color: "var(--text-3)", padding: "2px 4px" }}>
                            +{session.assignedAgents.length - 4}
                          </span>
                        )}
                      </div>

                      {/* Open button */}
                      <span style={{
                        fontSize: 12, fontWeight: 600, color: "var(--accent-light)",
                        display: "flex", alignItems: "center", gap: 4,
                      }}>
                        Open Mission &rarr;
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </Panel>
      )}
    </main>
  );
}
