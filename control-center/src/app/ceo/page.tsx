"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Bot,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Crown,
  DollarSign,
  MessageSquare,
  RefreshCw,
  Rocket,
  Send,
  Sparkles,
  Target,
  XCircle,
} from "lucide-react";
import {
  PageHeader,
  StatusBadge,
  MetricCard,
  Panel,
  SectionHeader,
  GhostButton,
  PrimaryButton,
  LocalBadge,
  SimBadge,
  Row,
  ErrorBanner,
} from "@/components/ui";

// ─── Types ────────────────────────────────────────────────────────────────

type CeoIntent = "launch_mission" | "create_invoice" | "create_flyer" | "create_website" | "create_dropshipping_business" | "review_business" | "delegate_tasks" | "greeting" | "status_check" | "unknown";

interface CeoAction {
  type: string;
  label: string;
  targetId?: string;
  href?: string;
}

interface CeoMessage {
  id: string;
  role: "user" | "ceo";
  text: string;
  intent?: CeoIntent;
  sessionId?: string;
  actions?: CeoAction[];
  timestamp: string;
}

interface AgentState {
  agentId: string;
  status: string;
  currentTaskId: string | null;
  progress: number;
}

interface PendingDecision {
  id: string;
  type: string;
  label: string;
  sessionId?: string;
  timestamp: string;
}

interface CeoOverview {
  activeMissions: number;
  pendingApprovals: number;
  totalRevenue: number;
  agents: AgentState[];
  recentMessages: CeoMessage[];
  pendingDecisions: PendingDecision[];
}

const QUICK_SUGGESTIONS = [
  { label: "Créer une entreprise dropshipping", intent: "create_dropshipping_business", icon: <Rocket size={12} /> },
  { label: "Créer un flyer", intent: "create_flyer", icon: <Sparkles size={12} /> },
  { label: "Créer un site web", intent: "create_website", icon: <Target size={12} /> },
  { label: "Créer une facture", intent: "create_invoice", icon: <DollarSign size={12} /> },
  { label: "Lancer une campagne marketing", intent: "launch_mission", icon: <Rocket size={12} /> },
  { label: "Vérifie l'état de ma compagnie", intent: "review_business", icon: <Bot size={12} /> },
];

const AGENT_ICONS: Record<string, string> = {
  product_agent: "PM",
  architect_agent: "AR",
  frontend_agent: "FE",
  backend_agent: "BE",
  qa_agent: "QA",
  devops_agent: "DO",
};

const AGENT_COLORS: Record<string, string> = {
  product_agent: "#3b82f6",
  architect_agent: "#8b5cf6",
  frontend_agent: "#22c55e",
  backend_agent: "#f59e0b",
  qa_agent: "#ef4444",
  devops_agent: "#06b6d4",
};

// ─── Page ─────────────────────────────────────────────────────────────────

export default function CeoPage() {
  const [messages, setMessages] = useState<CeoMessage[]>([]);
  const [overview, setOverview] = useState<CeoOverview | null>(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const loadData = async () => {
    try {
      const [mRes, oRes] = await Promise.all([
        fetch("/api/ceo/messages"),
        fetch("/api/ceo/overview"),
      ]);
      if (mRes.ok) { const d = await mRes.json(); setMessages(d.messages ?? []); }
      if (oRes.ok) { const d = await oRes.json(); setOverview(d.overview ?? null); }
      setError(null);
    } catch (e) {
      setError("Failed to load CEO data");
    }
  };

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (text?: string) => {
    const msg = text ?? input;
    if (!msg.trim()) return;
    setInput("");
    setSending(true);
    try {
      const res = await fetch("/api/ceo/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: msg }),
      });
      if (res.ok) {
        const d = await res.json();
        if (d.response) {
          // Reload messages
          const mRes = await fetch("/api/ceo/messages");
          if (mRes.ok) { const md = await mRes.json(); setMessages(md.messages ?? []); }
        }
      }
    } catch { /* */ }
    setSending(false);
    // Refresh overview
    try {
      const oRes = await fetch("/api/ceo/overview");
      if (oRes.ok) { const d = await oRes.json(); setOverview(d.overview ?? null); }
    } catch { /* */ }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleDecision = async (decisionId: string, action: "approve" | "reject") => {
    try {
      await fetch(`/api/ceo/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decisionId }),
      });
      loadData();
    } catch { /* */ }
  };

  const AGENT_STATUS_COLOR = (s: string) => s === "idle" ? "#94a3b8" : s === "executing" || s === "planning" ? "#22c55e" : "#f59e0b";

  return (
    <div style={{ padding: "20px 24px", maxWidth: 1600, margin: "0 auto", height: "calc(100vh - 60px)", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Crown size={20} style={{ color: "#f59e0b" }} />
          <h1 style={{ fontSize: 18, fontWeight: 700, color: "var(--text)" }}>CEO Cockpit</h1>
          <LocalBadge />
          <SimBadge />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {overview && (
            <>
              <MetricCard label="Missions" value={overview.activeMissions} color="#3b82f6" />
              <MetricCard label="Revenue" value={`$${overview.totalRevenue}`} color="#22c55e" />
              <MetricCard label="Pending" value={overview.pendingApprovals} color="#f59e0b" />
            </>
          )}
          <GhostButton onClick={loadData}><RefreshCw size={11} /> Refresh</GhostButton>
        </div>
      </div>

      {error && <ErrorBanner message={error} onRetry={loadData} />}

      {/* 3-Column Layout */}
      <div style={{ display: "grid", gridTemplateColumns: "320px 1fr 300px", gap: 16, flex: 1, minHeight: 0 }}>

        {/* ── LEFT: Chat ── */}
        <Panel style={{ display: "flex", flexDirection: "column", minHeight: 0 }}>
          <SectionHeader title="CEO AI Chat" icon={<MessageSquare size={12} />} />

          {/* Quick Suggestions */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 8 }}>
            {QUICK_SUGGESTIONS.map((s) => (
              <button
                key={s.intent}
                onClick={() => handleSend(s.label)}
                style={{
                  display: "flex", alignItems: "center", gap: 4,
                  padding: "4px 8px", fontSize: 10, fontWeight: 600,
                  background: "var(--bg-2)", border: "1px solid var(--border)",
                  borderRadius: 6, color: "var(--text-2)", cursor: "pointer",
                }}
              >
                {s.icon} {s.label}
              </button>
            ))}
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: "auto", padding: "4px 0", marginBottom: 8 }}>
            <AnimatePresence mode="popLayout">
              {messages.length === 0 && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ textAlign: "center", padding: 40, color: "var(--text-3)", fontSize: 12 }}>
                  <Crown size={32} style={{ color: "#f59e0b", margin: "0 auto 12px" }} />
                  <div style={{ fontWeight: 600, color: "var(--text-2)", marginBottom: 4 }}>CEO AI Ready</div>
                  Envoyez un message ou utilisez une suggestion rapide pour commencer.
                </motion.div>
              )}
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{
                    marginBottom: 8, padding: "8px 10px",
                    borderRadius: 8, fontSize: 12, lineHeight: 1.5,
                    background: msg.role === "user" ? "rgba(59,130,246,0.08)" : "rgba(245,158,11,0.08)",
                    borderLeft: msg.role === "user" ? "2px solid #3b82f6" : "2px solid #f59e0b",
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: 10, marginBottom: 2, color: msg.role === "user" ? "#3b82f6" : "#f59e0b" }}>
                    {msg.role === "user" ? "You" : "CEO AI"}
                  </div>
                  <div style={{ whiteSpace: "pre-wrap", color: "var(--text)" }}>{msg.text}</div>
                  {msg.actions && msg.actions.length > 0 && (
                    <div style={{ marginTop: 6, display: "flex", flexDirection: "column", gap: 3 }}>
                      {msg.actions.map((a, i) => (
                        <a key={i} href={a.href ?? "#"} style={{ fontSize: 10, color: "#3b82f6", textDecoration: "underline", display: "flex", alignItems: "center", gap: 4 }}>
                          <ChevronRight size={10} /> {a.label}
                        </a>
                      ))}
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
            <div ref={chatEndRef} />
          </div>

          {/* Input */}
          <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask the CEO AI..."
              style={{
                flex: 1, padding: "8px 12px", fontSize: 12,
                background: "var(--bg-2)", border: "1px solid var(--border)",
                borderRadius: 8, color: "var(--text)", outline: "none",
              }}
            />
            <PrimaryButton onClick={() => handleSend()} disabled={sending || !input.trim()} color="#f59e0b">
              <Send size={11} />
            </PrimaryButton>
          </div>
        </Panel>

        {/* ── CENTER: Mission Timeline + Org Chart ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16, minHeight: 0 }}>
          {/* Org Chart */}
          <Panel style={{ flexShrink: 0 }}>
            <SectionHeader title="Organization" icon={<Crown size={12} />} />
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
              {/* CEO */}
              <div style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "8px 16px", background: "rgba(245,158,11,0.1)",
                border: "1px solid rgba(245,158,11,0.3)", borderRadius: 8,
              }}>
                <Crown size={14} style={{ color: "#f59e0b" }} />
                <span style={{ fontSize: 12, fontWeight: 700, color: "#f59e0b" }}>CEO AI</span>
              </div>
              {/* Connector line */}
              <div style={{ width: 1, height: 12, background: "var(--border)" }} />
              {/* Agents */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "center" }}>
                {overview?.agents.map((agent) => (
                  <div key={agent.agentId} style={{
                    display: "flex", flexDirection: "column", alignItems: "center",
                    padding: "6px 10px", background: "var(--bg-2)",
                    border: `1px solid ${AGENT_COLORS[agent.agentId] ?? "var(--border)"}33`,
                    borderRadius: 6, minWidth: 70,
                  }}>
                    <div style={{
                      width: 22, height: 22, borderRadius: "50%",
                      background: `${AGENT_COLORS[agent.agentId] ?? "#94a3b8"}22`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 8, fontWeight: 700, color: AGENT_COLORS[agent.agentId] ?? "#94a3b8",
                      marginBottom: 3,
                    }}>
                      {AGENT_ICONS[agent.agentId] ?? "??"}
                    </div>
                    <div style={{ fontSize: 8, fontWeight: 600, color: "var(--text-2)", textAlign: "center" }}>
                      {agent.agentId.replace("_agent", "")}
                    </div>
                    <StatusBadge
                      label={agent.status}
                      color={AGENT_STATUS_COLOR(agent.status)}
                      size="xs"
                    />
                  </div>
                )) ?? (
                  <div style={{ fontSize: 11, color: "var(--text-3)" }}>Loading agents...</div>
                )}
              </div>
            </div>
          </Panel>

          {/* Mission Timeline */}
          <Panel style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
            <SectionHeader title="Mission Timeline" icon={<Clock3 size={12} />} />
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {messages.filter((m) => m.intent && m.intent !== "greeting" && m.intent !== "unknown").length === 0 ? (
                <div style={{ textAlign: "center", padding: 24, color: "var(--text-3)", fontSize: 11 }}>
                  <Clock3 size={20} style={{ margin: "0 auto 8px", opacity: 0.5 }} />
                  No mission activity yet. Send a message to start!
                </div>
              ) : (
                messages
                  .filter((m) => m.intent && m.intent !== "greeting" && m.intent !== "unknown")
                  .slice(-8)
                  .map((msg, i) => {
                    const steps = [
                      { label: "Message reçu", done: true },
                      { label: "Plan créé", done: msg.intent !== "unknown" },
                      { label: "Tâches assignées", done: !!msg.sessionId || msg.intent === "create_invoice" },
                      { label: "Agent travaille", done: !!msg.sessionId && msg.intent !== "create_invoice" },
                      { label: "Résultat généré", done: false },
                      { label: "Approbation requise", done: false },
                    ];
                    return (
                      <div key={msg.id} style={{ padding: "8px 10px", background: "var(--bg-2)", borderRadius: 6, border: "1px solid var(--border)" }}>
                        <div style={{ fontSize: 10, fontWeight: 600, color: "var(--text-2)", marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}>
                          <Target size={10} /> {msg.intent?.replace(/_/g, " ")} — {new Date(msg.timestamp).toLocaleTimeString()}
                        </div>
                        <div style={{ display: "flex", gap: 2, alignItems: "center" }}>
                          {steps.map((step, j) => (
                            <div key={j} style={{ display: "flex", alignItems: "center", gap: 2 }}>
                              <div style={{
                                width: 8, height: 8, borderRadius: "50%",
                                background: step.done ? "#22c55e" : "var(--border)",
                              }} />
                              {j < steps.length - 1 && (
                                <div style={{ width: 12, height: 2, background: step.done ? "#22c55e" : "var(--border)" }} />
                              )}
                            </div>
                          ))}
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                          {steps.map((step, j) => (
                            <span key={j} style={{ fontSize: 7, color: step.done ? "var(--text-2)" : "var(--text-3)" }}>{step.label}</span>
                          ))}
                        </div>
                      </div>
                    );
                  })
              )}
            </div>
          </Panel>
        </div>

        {/* ── RIGHT: Agents + Decisions ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16, minHeight: 0 }}>
          {/* Pending Decisions */}
          <Panel style={{ flexShrink: 0 }}>
            <SectionHeader title="Decisions Required" icon={<AlertTriangle size={12} style={{ color: "#f59e0b" }} />} />
            {(!overview?.pendingDecisions || overview.pendingDecisions.length === 0) ? (
              <div style={{ textAlign: "center", padding: 16, color: "var(--text-3)", fontSize: 11 }}>
                <CheckCircle2 size={16} style={{ color: "#22c55e", margin: "0 auto 6px" }} />
                No pending decisions
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {overview.pendingDecisions.map((dec) => (
                  <Row key={dec.id}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text)" }}>{dec.label}</div>
                      <div style={{ fontSize: 9, color: "var(--text-3)" }}>{dec.type.replace(/_/g, " ")}</div>
                    </div>
                    <div style={{ display: "flex", gap: 3 }}>
                      <PrimaryButton onClick={() => handleDecision(dec.id, "approve")} color="#22c55e" >
                        <CheckCircle2 size={10} />
                      </PrimaryButton>
                      <GhostButton onClick={() => handleDecision(dec.id, "reject")}>
                        <XCircle size={10} />
                      </GhostButton>
                    </div>
                  </Row>
                ))}
              </div>
            )}
          </Panel>

          {/* Agent Tasks */}
          <Panel style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
            <SectionHeader title="Agent Tasks" icon={<Bot size={12} />} />
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {overview?.agents.map((agent) => (
                <div key={agent.agentId} style={{
                  padding: "6px 8px", background: "var(--bg-2)",
                  borderLeft: `2px solid ${AGENT_COLORS[agent.agentId] ?? "#94a3b8"}`,
                  borderRadius: 4,
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: "var(--text)" }}>
                      {AGENT_ICONS[agent.agentId] ?? "??"} {agent.agentId.replace("_agent", "")}
                    </span>
                    <StatusBadge label={agent.status} color={AGENT_STATUS_COLOR(agent.status)} size="xs" />
                  </div>
                  {agent.currentTaskId && (
                    <div style={{ fontSize: 9, color: "var(--text-3)", marginTop: 2 }}>Task: {agent.currentTaskId}</div>
                  )}
                  {agent.progress > 0 && (
                    <div style={{ marginTop: 3, height: 3, background: "var(--border)", borderRadius: 2 }}>
                      <div style={{ width: `${agent.progress}%`, height: "100%", background: AGENT_COLORS[agent.agentId] ?? "#3b82f6", borderRadius: 2 }} />
                    </div>
                  )}
                </div>
              )) ?? (
                <div style={{ fontSize: 11, color: "var(--text-3)" }}>Loading agents...</div>
              )}
            </div>
          </Panel>

          {/* Results to See */}
          <Panel style={{ flexShrink: 0 }}>
            <SectionHeader title="Results" icon={<ArrowRight size={12} />} />
            {messages.filter((m) => m.actions && m.actions.some((a) => a.type === "created_session" || a.type === "created_invoice")).length === 0 ? (
              <div style={{ textAlign: "center", padding: 12, color: "var(--text-3)", fontSize: 11 }}>
                No results yet
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                {messages
                  .filter((m) => m.actions && m.actions.length > 0)
                  .slice(-5)
                  .map((msg) => (
                    <div key={msg.id}>
                      {msg.actions!.map((a, i) => (
                        <a key={i} href={a.href ?? "#"} style={{
                          display: "flex", alignItems: "center", gap: 4,
                          fontSize: 10, color: "#3b82f6", textDecoration: "none",
                          padding: "3px 0",
                        }}>
                          <ArrowRight size={9} /> {a.label}
                        </a>
                      ))}
                    </div>
                  ))}
              </div>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}
