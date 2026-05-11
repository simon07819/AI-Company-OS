"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Bot,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Crown,
  DollarSign,
  Headphones,
  Layers,
  Megaphone,
  Package,
  RefreshCw,
  Send,
  Settings,
  Sparkles,
  Target,
  TestTube2,
  TrendingUp,
  XCircle,
  Zap,
} from "lucide-react";
import {
  ErrorBanner,
  GhostButton,
  LocalBadge,
  Panel,
  PrimaryButton,
  Row,
  SectionHeader,
  SimBadge,
  StatusBadge,
} from "@/components/ui";

// ─── Business Agent Definitions ───────────────────────────────────────────

interface BusinessAgent {
  id: string;
  label: string;
  icon: React.ReactNode;
  color: string;
  abbr: string;
  description: string;
}

const BUSINESS_AGENTS: BusinessAgent[] = [
  { id: "ops_agent",       label: "Operations",  icon: <Settings size={10} />,    color: "#3b82f6", abbr: "OPS", description: "Infra, logistics, processes" },
  { id: "finance_agent",   label: "Finance",     icon: <DollarSign size={10} />,  color: "#22c55e", abbr: "FIN", description: "Invoices, revenue, expenses" },
  { id: "marketing_agent", label: "Marketing",   icon: <Megaphone size={10} />,   color: "#8b5cf6", abbr: "MKT", description: "Campaigns, content, growth" },
  { id: "product_agent",   label: "Product",     icon: <Package size={10} />,     color: "#f59e0b", abbr: "PRD", description: "Roadmap, features, design" },
  { id: "dev_agent",       label: "Developer",   icon: <Zap size={10} />,         color: "#06b6d4", abbr: "DEV", description: "Code, APIs, integrations" },
  { id: "support_agent",   label: "Support",     icon: <Headphones size={10} />,  color: "#ec4899", abbr: "SUP", description: "Client comms, issues" },
  { id: "qa_agent",        label: "QA",          icon: <TestTube2 size={10} />,   color: "#f43f5e", abbr: "QA",  description: "Testing, validation, review" },
];

// ─── Intent → agents that get activated ──────────────────────────────────

const INTENT_AGENTS: Record<string, string[]> = {
  launch_mission:               ["ops_agent", "product_agent", "dev_agent"],
  create_invoice:               ["finance_agent"],
  create_flyer:                 ["marketing_agent", "product_agent"],
  create_website:               ["dev_agent", "product_agent", "qa_agent"],
  create_dropshipping_business: ["ops_agent", "finance_agent", "marketing_agent"],
  review_business:              ["finance_agent", "ops_agent"],
  delegate_tasks:               ["ops_agent"],
  status_check:                 ["ops_agent"],
};

// ─── Quick Suggestions ────────────────────────────────────────────────────

const QUICK_SUGGESTIONS = [
  { label: "Créer une boutique dropshipping", icon: <Package size={10} />, color: "#8b5cf6" },
  { label: "Créer un flyer",                  icon: <Sparkles size={10} />, color: "#f59e0b" },
  { label: "Créer un site web",               icon: <Zap size={10} />,     color: "#06b6d4" },
  { label: "Créer une facture",               icon: <DollarSign size={10} />, color: "#22c55e" },
  { label: "Lancer une campagne marketing",   icon: <Megaphone size={10} />, color: "#8b5cf6" },
  { label: "Analyser mes revenus",            icon: <TrendingUp size={10} />, color: "#f59e0b" },
  { label: "Vérifie l'état de la compagnie",  icon: <Activity size={10} />, color: "#3b82f6" },
];

// ─── Types ────────────────────────────────────────────────────────────────

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
  intent?: string;
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

// ─── Typing Indicator ─────────────────────────────────────────────────────

function TypingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      style={{
        display: "flex", alignItems: "center", gap: 8,
        padding: "8px 10px", background: "rgba(245,158,11,0.06)",
        border: "1px solid rgba(245,158,11,0.15)", borderRadius: 8, marginBottom: 6,
      }}
    >
      <Crown size={10} style={{ color: "#f59e0b" }} />
      <div style={{ display: "flex", gap: 3 }}>
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            style={{ width: 5, height: 5, borderRadius: "50%", background: "#f59e0b" }}
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
          />
        ))}
      </div>
      <span style={{ fontSize: 10, color: "var(--text-3)" }}>CEO AI is thinking...</span>
    </motion.div>
  );
}

// ─── Activity Item ────────────────────────────────────────────────────────

function ActivityItem({ msg, products }: { msg: CeoMessage; products: { icon: React.ReactNode; color: string; label: string } | null }) {
  const isUser = msg.role === "user";
  const activatedAgents = msg.intent ? (INTENT_AGENTS[msg.intent] ?? []) : [];

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      style={{
        padding: "8px 10px", borderRadius: 8, marginBottom: 6,
        background: isUser ? "rgba(59,130,246,0.06)" : "rgba(245,158,11,0.06)",
        borderLeft: `2px solid ${isUser ? "#3b82f6" : "#f59e0b"}`,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 3 }}>
        <span style={{ fontSize: 9, fontWeight: 700, color: isUser ? "#3b82f6" : "#f59e0b" }}>
          {isUser ? "YOU" : "CEO AI"}
        </span>
        <span style={{ fontSize: 9, color: "var(--text-3)" }}>
          {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </span>
        {!isUser && msg.intent && msg.intent !== "unknown" && msg.intent !== "greeting" && (
          <span style={{
            fontSize: 8, fontWeight: 600, color: "#f59e0b",
            background: "rgba(245,158,11,0.12)", padding: "1px 6px", borderRadius: 99,
          }}>
            {msg.intent.replace(/_/g, " ")}
          </span>
        )}
      </div>
      <div style={{ fontSize: 12, color: "var(--text)", lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{msg.text}</div>

      {/* Activated agents */}
      {!isUser && activatedAgents.length > 0 && (
        <div style={{ display: "flex", gap: 3, marginTop: 5, flexWrap: "wrap" }}>
          {activatedAgents.map((aid) => {
            const agent = BUSINESS_AGENTS.find((a) => a.id === aid);
            if (!agent) return null;
            return (
              <span key={aid} style={{
                fontSize: 8, fontWeight: 700, padding: "1px 6px", borderRadius: 99,
                background: `${agent.color}22`, color: agent.color,
              }}>
                {agent.abbr} activated
              </span>
            );
          })}
        </div>
      )}

      {/* Actions */}
      {msg.actions && msg.actions.length > 0 && (
        <div style={{ marginTop: 5, display: "flex", flexDirection: "column", gap: 2 }}>
          {msg.actions.map((a, i) => (
            <a key={i} href={a.href ?? "#"} style={{
              fontSize: 10, color: "#3b82f6", display: "flex", alignItems: "center", gap: 4,
            }}>
              <ChevronRight size={9} /> {a.label}
            </a>
          ))}
        </div>
      )}
    </motion.div>
  );
}

// ─── Agent Card ───────────────────────────────────────────────────────────

function AgentCard({
  agent,
  runtimeAgent,
  isActivated,
}: {
  agent: BusinessAgent;
  runtimeAgent: AgentState | undefined;
  isActivated: boolean;
}) {
  const status = runtimeAgent?.status ?? "idle";
  const isWorking = isActivated || (status !== "idle" && status !== "done");
  const progress = runtimeAgent?.progress ?? 0;

  const statusColor = isWorking ? agent.color : "var(--text-3)";

  return (
    <motion.div
      animate={isWorking ? { boxShadow: [`0 0 0px ${agent.color}00`, `0 0 8px ${agent.color}33`, `0 0 0px ${agent.color}00`] } : {}}
      transition={isWorking ? { duration: 2, repeat: Infinity } : {}}
      style={{
        padding: "8px 10px",
        background: isWorking ? `${agent.color}08` : "var(--bg-2)",
        border: `1px solid ${isWorking ? `${agent.color}30` : "var(--border)"}`,
        borderRadius: 8, cursor: "default",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
        <div style={{
          width: 22, height: 22, borderRadius: "50%",
          background: `${agent.color}22`, display: "flex", alignItems: "center", justifyContent: "center",
          color: agent.color,
        }}>
          {agent.icon}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text)", lineHeight: 1 }}>{agent.label}</div>
          <div style={{ fontSize: 9, color: "var(--text-3)" }}>{agent.description}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          {isWorking && (
            <motion.div
              style={{ width: 5, height: 5, borderRadius: "50%", background: agent.color }}
              animate={{ opacity: [1, 0.2, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
          )}
          <StatusBadge
            label={isWorking ? "working" : status}
            color={statusColor}
            size="xs"
          />
        </div>
      </div>
      {progress > 0 && (
        <div style={{ height: 2, background: "var(--border)", borderRadius: 1 }}>
          <motion.div
            style={{ height: "100%", background: agent.color, borderRadius: 1 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
      )}
    </motion.div>
  );
}

// ─── Mission Step Timeline ────────────────────────────────────────────────

function MissionTimeline({ messages }: { messages: CeoMessage[] }) {
  const missions = messages.filter((m) =>
    m.role === "ceo" && m.intent && !["greeting", "unknown", "status_check"].includes(m.intent)
  );

  if (missions.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "32px 16px", color: "var(--text-3)" }}>
        <Clock3 size={20} style={{ margin: "0 auto 8px", opacity: 0.4 }} />
        <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-2)", marginBottom: 4 }}>No missions yet</div>
        <div style={{ fontSize: 10 }}>Send a command to the CEO AI to start</div>
      </div>
    );
  }

  const STEPS = ["Received", "Planned", "Delegated", "Working", "Review", "Done"];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {missions.slice(-5).map((msg, i) => {
        const doneSteps = msg.sessionId ? 4 : msg.actions && msg.actions.length > 0 ? 3 : 2;
        return (
          <div key={msg.id} style={{
            padding: "10px 12px", background: "var(--bg-2)",
            border: "1px solid var(--border)", borderRadius: 8,
          }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: "var(--text-2)", marginBottom: 6, display: "flex", alignItems: "center", gap: 5 }}>
              <Target size={9} />
              {msg.intent?.replace(/_/g, " ")}
              <span style={{ color: "var(--text-3)", fontWeight: 400 }}>
                — {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
              {STEPS.map((step, j) => (
                <div key={step} style={{ display: "flex", alignItems: "center", flex: j < STEPS.length - 1 ? 1 : undefined }}>
                  <div style={{
                    width: 8, height: 8, borderRadius: "50%", flexShrink: 0,
                    background: j < doneSteps ? "#22c55e" : "var(--border)",
                    transition: "background 300ms",
                  }} />
                  {j < STEPS.length - 1 && (
                    <div style={{
                      flex: 1, height: 2, minWidth: 8,
                      background: j < doneSteps - 1 ? "#22c55e" : "var(--border)",
                      transition: "background 300ms",
                    }} />
                  )}
                </div>
              ))}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 3 }}>
              {STEPS.map((step, j) => (
                <span key={step} style={{
                  fontSize: 7, color: j < doneSteps ? "var(--text-2)" : "var(--text-3)",
                  textAlign: "center", flex: j < STEPS.length - 1 ? 1 : undefined,
                }}>
                  {step}
                </span>
              ))}
            </div>
            {msg.text && (
              <div style={{ fontSize: 10, color: "var(--text-3)", marginTop: 5, lineHeight: 1.4 }}>
                {msg.text.slice(0, 80)}{msg.text.length > 80 ? "…" : ""}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────

export default function CeoPage() {
  const [messages, setMessages] = useState<CeoMessage[]>([]);
  const [overview, setOverview] = useState<CeoOverview | null>(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [ceoTyping, setCeoTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activatedAgents, setActivatedAgents] = useState<string[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const loadData = useCallback(async () => {
    try {
      const [mRes, oRes] = await Promise.all([
        fetch("/api/ceo/messages"),
        fetch("/api/ceo/overview"),
      ]);
      if (mRes.ok) { const d = await mRes.json(); setMessages(d.messages ?? []); }
      if (oRes.ok) { const d = await oRes.json(); setOverview(d.overview ?? null); }
      setError(null);
    } catch {
      setError("Failed to load CEO data");
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, ceoTyping]);

  const handleSend = async (text?: string) => {
    const msg = text ?? input;
    if (!msg.trim() || sending) return;
    setInput("");
    setSending(true);
    setCeoTyping(true);

    try {
      const res = await fetch("/api/ceo/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: msg }),
      });
      if (res.ok) {
        const d = await res.json();
        // Animate typing for at least 800ms
        await new Promise((r) => setTimeout(r, 800));
        setCeoTyping(false);
        if (d.response) {
          const intent: string = d.response.intent ?? "";
          const agents = INTENT_AGENTS[intent] ?? [];
          setActivatedAgents(agents);
          setTimeout(() => setActivatedAgents([]), 4000);
          await loadData();
        }
      }
    } catch { /* */ }

    setCeoTyping(false);
    setSending(false);
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

  const runtimeAgentsMap = new Map(
    (overview?.agents ?? []).map((a) => [a.agentId, a])
  );

  // Map runtime agent IDs to business agent IDs
  const RUNTIME_TO_BUSINESS: Record<string, string> = {
    product_agent: "product_agent",
    architect_agent: "product_agent",
    frontend_agent: "dev_agent",
    backend_agent: "dev_agent",
    qa_agent: "qa_agent",
    devops_agent: "ops_agent",
  };

  const getBusinessAgentRuntime = (businessId: string): AgentState | undefined => {
    for (const [runtimeId, bizId] of Object.entries(RUNTIME_TO_BUSINESS)) {
      if (bizId === businessId) {
        const runtime = runtimeAgentsMap.get(runtimeId);
        if (runtime) return runtime;
      }
    }
    return undefined;
  };

  const metrics = [
    { label: "Missions", value: overview?.activeMissions ?? 0, color: "#3b82f6" },
    { label: "Revenue", value: `$${overview?.totalRevenue ?? 0}`, color: "#22c55e" },
    { label: "Pending", value: overview?.pendingApprovals ?? 0, color: "#f59e0b" },
    { label: "Agents", value: `${overview?.agents?.filter((a) => a.status !== "idle").length ?? 0}/${overview?.agents?.length ?? 0}`, color: "#8b5cf6" },
  ];

  return (
    <div style={{
      padding: "16px 20px",
      maxWidth: 1600,
      margin: "0 auto",
      height: "calc(100vh - 60px)",
      display: "flex",
      flexDirection: "column",
      gap: 12,
    }}>
      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: "rgba(245,158,11,0.15)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Crown size={16} style={{ color: "#f59e0b" }} />
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: "var(--text)", lineHeight: 1 }}>CEO Cockpit</div>
            <div style={{ fontSize: 10, color: "var(--text-3)" }}>AI-powered company command center</div>
          </div>
          <LocalBadge />
          <SimBadge />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {metrics.map((m) => (
            <div key={m.label} style={{
              padding: "5px 10px",
              background: "var(--bg-2)", border: "1px solid var(--border)",
              borderRadius: 6,
            }}>
              <div style={{ fontSize: 9, color: "var(--text-3)", textTransform: "uppercase" }}>{m.label}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: m.color }}>{m.value}</div>
            </div>
          ))}
          <GhostButton onClick={loadData}><RefreshCw size={11} /></GhostButton>
        </div>
      </div>

      {error && <ErrorBanner message={error} onRetry={loadData} />}

      {/* ── 3-Column Layout ── */}
      <div style={{ display: "grid", gridTemplateColumns: "360px 1fr 320px", gap: 12, flex: 1, minHeight: 0 }}>

        {/* ── LEFT: Chat Panel ── */}
        <Panel style={{ display: "flex", flexDirection: "column", minHeight: 0, gap: 0 }}>
          {/* Suggestions */}
          <div style={{ flexShrink: 0, marginBottom: 8 }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 5 }}>
              Quick Commands
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
              {QUICK_SUGGESTIONS.map((s) => (
                <button
                  key={s.label}
                  onClick={() => handleSend(s.label)}
                  disabled={sending}
                  style={{
                    display: "flex", alignItems: "center", gap: 4,
                    padding: "3px 8px", fontSize: 9, fontWeight: 600,
                    background: "var(--bg-2)", border: "1px solid var(--border)",
                    borderRadius: 99, color: s.color, cursor: "pointer",
                    transition: "all 120ms",
                  }}
                >
                  <span style={{ color: s.color }}>{s.icon}</span>
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: "auto", minHeight: 0, marginBottom: 8 }}>
            <AnimatePresence>
              {messages.length === 0 && !ceoTyping && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  style={{ textAlign: "center", padding: "40px 20px", color: "var(--text-3)" }}
                >
                  <div style={{
                    width: 48, height: 48, borderRadius: "50%",
                    background: "rgba(245,158,11,0.12)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    margin: "0 auto 12px",
                  }}>
                    <Crown size={20} style={{ color: "#f59e0b" }} />
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-2)", marginBottom: 4 }}>CEO AI Ready</div>
                  <div style={{ fontSize: 11 }}>Tell me what you need. I&apos;ll delegate to the right agents.</div>
                </motion.div>
              )}
              {messages.map((msg) => (
                <ActivityItem key={msg.id} msg={msg} products={null} />
              ))}
              {ceoTyping && <TypingIndicator />}
            </AnimatePresence>
            <div ref={chatEndRef} />
          </div>

          {/* Input */}
          <div style={{ flexShrink: 0, display: "flex", gap: 6 }}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask the CEO AI anything..."
              disabled={sending}
              style={{
                flex: 1, padding: "8px 12px", fontSize: 12,
                background: "var(--bg-2)", border: "1px solid var(--border)",
                borderRadius: 8, color: "var(--text)", outline: "none",
              }}
            />
            <PrimaryButton
              onClick={() => handleSend()}
              disabled={sending || !input.trim()}
              color="#f59e0b"
            >
              <Send size={11} />
            </PrimaryButton>
          </div>
        </Panel>

        {/* ── CENTER: Mission Timeline + Activity ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12, minHeight: 0 }}>

          {/* Org Chart Visual */}
          <Panel style={{ flexShrink: 0 }}>
            <SectionHeader title="Company Structure" icon={<Layers size={12} />} />
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
              {/* CEO node */}
              <div style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "8px 20px",
                background: "rgba(245,158,11,0.1)",
                border: "1px solid rgba(245,158,11,0.3)",
                borderRadius: 8,
              }}>
                <Crown size={14} style={{ color: "#f59e0b" }} />
                <div>
                  <div style={{ fontSize: 12, fontWeight: 800, color: "#f59e0b" }}>CEO AI</div>
                  <div style={{ fontSize: 9, color: "var(--text-3)" }}>Strategy, delegation, oversight</div>
                </div>
                <motion.div
                  style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e" }}
                  animate={{ opacity: [1, 0.3, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              </div>

              {/* Connector */}
              <div style={{ width: 1, height: 8, background: "var(--border)" }} />

              {/* Business agents grid */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6, width: "100%" }}>
                {BUSINESS_AGENTS.map((agent) => {
                  const isAct = activatedAgents.includes(agent.id);
                  const runtime = getBusinessAgentRuntime(agent.id);
                  const isWorking = isAct || (runtime && runtime.status !== "idle");
                  return (
                    <motion.div
                      key={agent.id}
                      animate={isWorking ? { boxShadow: [`0 0 0px ${agent.color}00`, `0 0 6px ${agent.color}44`, `0 0 0px ${agent.color}00`] } : {}}
                      transition={isWorking ? { duration: 1.8, repeat: Infinity } : {}}
                      style={{
                        display: "flex", flexDirection: "column", alignItems: "center",
                        padding: "6px 4px",
                        background: isWorking ? `${agent.color}0d` : "var(--bg-2)",
                        border: `1px solid ${isWorking ? `${agent.color}30` : "var(--border)"}`,
                        borderRadius: 6,
                      }}
                    >
                      <div style={{
                        width: 20, height: 20, borderRadius: "50%",
                        background: `${agent.color}22`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        color: agent.color, marginBottom: 3,
                      }}>
                        {agent.icon}
                      </div>
                      <div style={{ fontSize: 8, fontWeight: 700, color: "var(--text-2)", textAlign: "center" }}>{agent.label}</div>
                      {isWorking && (
                        <motion.div
                          style={{ width: 4, height: 4, borderRadius: "50%", background: agent.color, marginTop: 2 }}
                          animate={{ opacity: [1, 0.2, 1] }}
                          transition={{ duration: 1.2, repeat: Infinity }}
                        />
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </Panel>

          {/* Mission Timeline */}
          <Panel style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
            <SectionHeader title="Mission Timeline" icon={<Clock3 size={12} />} />
            <MissionTimeline messages={messages} />
          </Panel>
        </div>

        {/* ── RIGHT: Agents + Decisions ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12, minHeight: 0 }}>

          {/* Decisions */}
          <Panel style={{ flexShrink: 0 }}>
            <SectionHeader
              title="Decisions Required"
              icon={<AlertTriangle size={12} style={{ color: "#f59e0b" }} />}
            />
            {(!overview?.pendingDecisions || overview.pendingDecisions.length === 0) ? (
              <div style={{ textAlign: "center", padding: "12px 8px", color: "var(--text-3)", fontSize: 11 }}>
                <CheckCircle2 size={14} style={{ color: "#22c55e", margin: "0 auto 5px", display: "block" }} />
                All clear — no pending decisions
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                {overview.pendingDecisions.map((dec) => (
                  <div key={dec.id} style={{
                    padding: "8px 10px", background: "rgba(245,158,11,0.06)",
                    border: "1px solid rgba(245,158,11,0.2)", borderRadius: 6,
                  }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text)", marginBottom: 4 }}>{dec.label}</div>
                    <div style={{ display: "flex", gap: 4 }}>
                      <PrimaryButton onClick={() => handleDecision(dec.id, "approve")} color="#22c55e">
                        <CheckCircle2 size={10} /> Approve
                      </PrimaryButton>
                      <GhostButton onClick={() => handleDecision(dec.id, "reject")}>
                        <XCircle size={10} /> Reject
                      </GhostButton>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Panel>

          {/* Agent Status */}
          <Panel style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
            <SectionHeader title="Agent Team" icon={<Bot size={12} />} />
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              {BUSINESS_AGENTS.map((agent) => (
                <AgentCard
                  key={agent.id}
                  agent={agent}
                  runtimeAgent={getBusinessAgentRuntime(agent.id)}
                  isActivated={activatedAgents.includes(agent.id)}
                />
              ))}
            </div>
          </Panel>

          {/* Results */}
          {messages.some((m) => m.actions && m.actions.length > 0) && (
            <Panel style={{ flexShrink: 0 }}>
              <SectionHeader title="Generated Results" icon={<Sparkles size={12} style={{ color: "#f59e0b" }} />} />
              <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                {messages
                  .filter((m) => m.actions && m.actions.length > 0)
                  .slice(-4)
                  .map((msg) =>
                    (msg.actions ?? []).map((a, i) => (
                      <a key={`${msg.id}-${i}`} href={a.href ?? "#"} style={{
                        display: "flex", alignItems: "center", gap: 5,
                        fontSize: 11, color: "#3b82f6",
                        padding: "3px 0",
                      }}>
                        <ChevronRight size={9} /> {a.label}
                      </a>
                    ))
                  )}
              </div>
            </Panel>
          )}
        </div>
      </div>
    </div>
  );
}
