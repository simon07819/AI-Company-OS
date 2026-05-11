"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Crown,
  DollarSign,
  MessageSquare,
  Pause,
  RefreshCw,
  RotateCcw,
  Send,
  Sparkles,
  TrendingUp,
  Users,
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
import type { ExecutiveDiscussion, DiscussionMessage } from "@/lib/executiveDiscussion";
import type { ExecutiveId } from "@/lib/executiveTeam";

// ─── Executive definitions (client-side copy) ─────────────────────────────

interface ExecDef {
  id: ExecutiveId;
  name: string;
  title: string;
  avatar: string;
  color: string;
  shortTitle: string;
}

const EXEC_DEFS: ExecDef[] = [
  { id: "ceo",       name: "Alexandra Chen",  title: "CEO",               avatar: "👑", color: "#f59e0b", shortTitle: "CEO" },
  { id: "coo",       name: "Marcus Torres",   title: "COO",               avatar: "⚙️", color: "#3b82f6", shortTitle: "COO" },
  { id: "cfo",       name: "Diana Park",      title: "CFO",               avatar: "💰", color: "#22c55e", shortTitle: "CFO" },
  { id: "cmo",       name: "Sophie Laurent",  title: "CMO",               avatar: "📣", color: "#8b5cf6", shortTitle: "CMO" },
  { id: "cto",       name: "Raj Patel",       title: "CTO",               avatar: "🔧", color: "#06b6d4", shortTitle: "CTO" },
  { id: "logistics", name: "Emma Whitfield",  title: "Logistics Director",avatar: "📦", color: "#f97316", shortTitle: "Logistics" },
  { id: "support",   name: "Carlos Rivera",   title: "Support Director",  avatar: "🎧", color: "#ec4899", shortTitle: "Support" },
  { id: "sales",     name: "Rachel Kim",      title: "Sales Director",    avatar: "🎯", color: "#ef4444", shortTitle: "Sales" },
  { id: "hr",        name: "James Okafor",    title: "HR Director",       avatar: "👥", color: "#a78bfa", shortTitle: "HR" },
];

function getExec(id: ExecutiveId): ExecDef {
  return EXEC_DEFS.find((e) => e.id === id) ?? EXEC_DEFS[0];
}

// ─── Quick Suggestions ────────────────────────────────────────────────────

const QUICK_SUGGESTIONS = [
  { label: "Lancer une boutique dropshipping", color: "#8b5cf6" },
  { label: "Créer un site web",                color: "#06b6d4" },
  { label: "Créer un flyer",                   color: "#f59e0b" },
  { label: "Créer une facture",                color: "#22c55e" },
  { label: "Analyser mes revenus",             color: "#ef4444" },
  { label: "Vérifie l'état de la compagnie",   color: "#3b82f6" },
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
  discussionId?: string;
  timestamp: string;
}

interface AgentState {
  agentId: string;
  status: string;
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

// ─── Executive Avatar ─────────────────────────────────────────────────────

function ExecAvatar({ id, size = 28, pulse }: { id: ExecutiveId; size?: number; pulse?: boolean }) {
  const exec = getExec(id);
  return (
    <motion.div
      animate={pulse ? { boxShadow: [`0 0 0px ${exec.color}00`, `0 0 10px ${exec.color}55`, `0 0 0px ${exec.color}00`] } : {}}
      transition={pulse ? { duration: 2, repeat: Infinity } : {}}
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: `${exec.color}22`,
        border: `1.5px solid ${exec.color}55`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: size * 0.5,
        flexShrink: 0,
      }}
    >
      {exec.avatar}
    </motion.div>
  );
}

// ─── Executive Typing Indicator ───────────────────────────────────────────

function ExecTyping({ id }: { id: ExecutiveId }) {
  const exec = getExec(id);
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      style={{
        display: "flex", alignItems: "center", gap: 8,
        padding: "6px 10px",
        background: `${exec.color}08`,
        border: `1px solid ${exec.color}25`,
        borderRadius: 8, marginBottom: 4,
      }}
    >
      <ExecAvatar id={id} size={20} />
      <span style={{ fontSize: 10, fontWeight: 600, color: exec.color }}>{exec.name}</span>
      <div style={{ display: "flex", gap: 3 }}>
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            style={{ width: 4, height: 4, borderRadius: "50%", background: exec.color }}
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
          />
        ))}
      </div>
    </motion.div>
  );
}

// ─── Discussion Message Bubble ────────────────────────────────────────────

function DiscussionBubble({ msg }: { msg: DiscussionMessage }) {
  const exec = getExec(msg.from);
  const isCeo = msg.from === "ceo";

  const typeColors: Record<string, string> = {
    opening:       "#f59e0b",
    delegation:    "#f59e0b",
    analysis:      exec.color,
    debate:        "#ef4444",
    agreement:     "#22c55e",
    synthesis:     "#f59e0b",
    proposal:      "#8b5cf6",
    question:      "#06b6d4",
    clarification: exec.color,
  };

  const typeLabels: Record<string, string> = {
    opening:       "opening",
    delegation:    "briefing",
    analysis:      "analysis",
    debate:        "debate",
    agreement:     "agreed",
    synthesis:     "synthesis",
    proposal:      "proposal",
    question:      "question",
    clarification: "clarification",
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: isCeo ? -6 : 6, y: 4 }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      style={{
        display: "flex", gap: 8, marginBottom: 8,
        flexDirection: isCeo ? "row" : "row",
      }}
    >
      <ExecAvatar id={msg.from} size={26} />
      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: exec.color }}>{exec.name}</span>
          <span style={{ fontSize: 9, color: "var(--text-3)", fontWeight: 500 }}>{exec.shortTitle}</span>
          <span style={{
            fontSize: 8, fontWeight: 700, color: typeColors[msg.type] ?? exec.color,
            background: `${typeColors[msg.type] ?? exec.color}18`,
            padding: "1px 5px", borderRadius: 99, textTransform: "uppercase",
          }}>
            {typeLabels[msg.type] ?? msg.type}
          </span>
          <span style={{ fontSize: 9, color: "var(--text-3)", marginLeft: "auto" }}>
            {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>
        </div>
        <div style={{
          fontSize: 12, color: "var(--text)", lineHeight: 1.55,
          background: isCeo ? "rgba(245,158,11,0.06)" : `${exec.color}06`,
          border: `1px solid ${isCeo ? "rgba(245,158,11,0.2)" : `${exec.color}22`}`,
          borderRadius: "0 8px 8px 8px",
          padding: "7px 10px",
        }}>
          {msg.text}
        </div>
        {msg.to && msg.to !== "all" && (
          <div style={{ fontSize: 9, color: "var(--text-3)", marginTop: 2 }}>
            → {getExec(msg.to as ExecutiveId).name}
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ─── Proposal Card ────────────────────────────────────────────────────────

function ProposalCard({
  discussion,
  onAction,
}: {
  discussion: ExecutiveDiscussion;
  onAction: (action: string) => void;
}) {
  const p = discussion.proposal;
  if (!p) return null;

  const difficultyColor = p.difficulty === "low" ? "#22c55e" : p.difficulty === "medium" ? "#f59e0b" : "#ef4444";

  const actionButtons = [
    { action: "approve",          label: "Approve",        icon: <CheckCircle2 size={11} />, color: "#22c55e" },
    { action: "reject",           label: "Reject",         icon: <XCircle size={11} />,      color: "#ef4444" },
    { action: "request_revision", label: "Revise",         icon: <RotateCcw size={11} />,    color: "#f59e0b" },
    { action: "pause",            label: "Pause",          icon: <Pause size={11} />,         color: "#6b7280" },
  ];

  const statusLabel = discussion.status === "approved"
    ? "✅ Approved"
    : discussion.status === "rejected"
      ? "❌ Rejected"
      : discussion.status === "revision_requested"
        ? "↻ Revision Requested"
        : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        background: "rgba(139,92,246,0.05)",
        border: "1px solid rgba(139,92,246,0.3)",
        borderRadius: 10, padding: "12px 14px", marginTop: 8,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
        <Sparkles size={12} style={{ color: "#8b5cf6" }} />
        <span style={{ fontSize: 11, fontWeight: 800, color: "#8b5cf6", textTransform: "uppercase", letterSpacing: "0.5px" }}>
          Executive Proposal
        </span>
        {statusLabel && (
          <span style={{ fontSize: 10, color: "var(--text-2)", marginLeft: "auto" }}>{statusLabel}</span>
        )}
      </div>

      <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", marginBottom: 8 }}>{p.headline}</div>
      <div style={{ fontSize: 11, color: "var(--text-2)", lineHeight: 1.5, marginBottom: 10 }}>{p.strategy}</div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 6, marginBottom: 10 }}>
        {[
          { label: "Coût estimé",   value: p.estimatedCost,  color: "#22c55e" },
          { label: "Délai",          value: p.estimatedTime,  color: "#3b82f6" },
          { label: "Difficulté",     value: p.difficulty,     color: difficultyColor },
          { label: "ROI estimé",     value: p.roi,            color: "#f59e0b" },
        ].map((m) => (
          <div key={m.label} style={{
            background: "var(--bg-2)", border: "1px solid var(--border)",
            borderRadius: 6, padding: "6px 8px",
          }}>
            <div style={{ fontSize: 8, color: "var(--text-3)", textTransform: "uppercase", marginBottom: 2 }}>{m.label}</div>
            <div style={{ fontSize: 10, fontWeight: 700, color: m.color }}>{m.value}</div>
          </div>
        ))}
      </div>

      {p.risks.length > 0 && (
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: "#ef4444", textTransform: "uppercase", marginBottom: 4 }}>
            Risques identifiés
          </div>
          {p.risks.map((r, i) => (
            <div key={i} style={{
              display: "flex", alignItems: "flex-start", gap: 5,
              fontSize: 10, color: "var(--text-2)", marginBottom: 2,
            }}>
              <span style={{ color: "#ef4444", marginTop: 1 }}>•</span> {r}
            </div>
          ))}
        </div>
      )}

      {p.alternatives.length > 0 && (
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", marginBottom: 4 }}>
            Alternatives
          </div>
          {p.alternatives.map((alt, i) => (
            <div key={i} style={{
              background: "var(--bg-2)", border: "1px solid var(--border)",
              borderRadius: 6, padding: "5px 8px", marginBottom: 4,
            }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: "var(--text-2)" }}>{alt.label}</div>
              <div style={{ fontSize: 9, color: "var(--text-3)" }}>{alt.tradeoff}</div>
            </div>
          ))}
        </div>
      )}

      {discussion.status === "awaiting_approval" && (
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
          {actionButtons.map((btn) => (
            <button
              key={btn.action}
              onClick={() => onAction(btn.action)}
              style={{
                display: "flex", alignItems: "center", gap: 4,
                padding: "5px 10px", fontSize: 10, fontWeight: 700,
                background: `${btn.color}18`,
                border: `1px solid ${btn.color}44`,
                borderRadius: 6, color: btn.color, cursor: "pointer",
                transition: "all 120ms",
              }}
            >
              {btn.icon} {btn.label}
            </button>
          ))}
        </div>
      )}
    </motion.div>
  );
}

// ─── War Room (Executive Discussion Feed) ────────────────────────────────

function WarRoom({
  discussion,
  isConsulting,
  onAction,
}: {
  discussion: ExecutiveDiscussion | null;
  isConsulting: boolean;
  onAction: (action: string) => void;
}) {
  const [visibleCount, setVisibleCount] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Reveal discussion messages progressively based on their delayMs
  useEffect(() => {
    if (!discussion) { setVisibleCount(0); return; }
    setVisibleCount(0);
    const timers: ReturnType<typeof setTimeout>[] = [];

    discussion.messages.forEach((msg, idx) => {
      const t = setTimeout(() => {
        setVisibleCount(idx + 1);
      }, msg.delayMs);
      timers.push(t);
    });

    return () => timers.forEach(clearTimeout);
  }, [discussion?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [visibleCount]);

  if (!discussion && !isConsulting) {
    return (
      <div style={{
        display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center", height: "100%", color: "var(--text-3)",
        textAlign: "center", padding: "40px 20px",
      }}>
        <div style={{
          width: 56, height: 56, borderRadius: "50%",
          background: "rgba(139,92,246,0.1)",
          display: "flex", alignItems: "center", justifyContent: "center",
          marginBottom: 14,
        }}>
          <Users size={22} style={{ color: "#8b5cf6" }} />
        </div>
        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-2)", marginBottom: 6 }}>
          Executive War Room
        </div>
        <div style={{ fontSize: 11, lineHeight: 1.5 }}>
          When you send a message to the CEO, the executive team convenes here to discuss strategy and deliver a recommendation.
        </div>
      </div>
    );
  }

  const visibleMessages = discussion ? discussion.messages.slice(0, visibleCount) : [];
  const typingNext = discussion && visibleCount < discussion.messages.length
    ? discussion.messages[visibleCount]
    : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
      {discussion && (
        <div style={{
          flexShrink: 0, padding: "8px 12px",
          background: "rgba(245,158,11,0.05)",
          borderBottom: "1px solid var(--border)",
          display: "flex", alignItems: "center", gap: 8,
        }}>
          <Crown size={10} style={{ color: "#f59e0b" }} />
          <span style={{ fontSize: 10, fontWeight: 700, color: "#f59e0b" }}>Session #{discussion.id.slice(-6)}</span>
          <span style={{ fontSize: 9, color: "var(--text-3)", flex: 1 }}>
            — {discussion.userRequest.slice(0, 60)}{discussion.userRequest.length > 60 ? "…" : ""}
          </span>
          <StatusBadge
            label={discussion.status.replace("_", " ")}
            color={
              discussion.status === "approved" ? "#22c55e"
                : discussion.status === "rejected" ? "#ef4444"
                  : discussion.status === "awaiting_approval" ? "#f59e0b"
                    : "#6b7280"
            }
            size="xs"
          />
        </div>
      )}

      <div style={{ flex: 1, overflowY: "auto", padding: "12px 14px" }}>
        <AnimatePresence>
          {visibleMessages.map((msg) => (
            <DiscussionBubble key={msg.id} msg={msg} />
          ))}
          {typingNext && <ExecTyping key="typing" id={typingNext.from} />}
        </AnimatePresence>

        {/* Proposal card appears after all messages */}
        {discussion?.proposal && visibleCount >= discussion.messages.length && (
          <ProposalCard discussion={discussion} onAction={onAction} />
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  );
}

// ─── Executive Org Card ───────────────────────────────────────────────────

function OrgCard({
  exec,
  isActive,
  isTyping,
}: {
  exec: ExecDef;
  isActive: boolean;
  isTyping: boolean;
}) {
  return (
    <motion.div
      animate={isActive ? { boxShadow: [`0 0 0px ${exec.color}00`, `0 0 8px ${exec.color}44`, `0 0 0px ${exec.color}00`] } : {}}
      transition={isActive ? { duration: 2, repeat: Infinity } : {}}
      style={{
        padding: "7px 9px",
        background: isActive ? `${exec.color}08` : "var(--bg-2)",
        border: `1px solid ${isActive ? `${exec.color}35` : "var(--border)"}`,
        borderRadius: 8, display: "flex", alignItems: "center", gap: 7,
      }}
    >
      <ExecAvatar id={exec.id} size={24} pulse={isTyping} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text)", lineHeight: 1 }}>{exec.name}</div>
        <div style={{ fontSize: 8, color: "var(--text-3)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{exec.shortTitle}</div>
      </div>
      {isTyping && (
        <div style={{ display: "flex", gap: 2 }}>
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              style={{ width: 3, height: 3, borderRadius: "50%", background: exec.color }}
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.2 }}
            />
          ))}
        </div>
      )}
      {isActive && !isTyping && (
        <motion.div
          style={{ width: 5, height: 5, borderRadius: "50%", background: exec.color }}
          animate={{ opacity: [1, 0.3, 1] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
      )}
    </motion.div>
  );
}

// ─── CEO Message Bubble ───────────────────────────────────────────────────

function CeoMessageBubble({ msg }: { msg: CeoMessage }) {
  const isUser = msg.role === "user";
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      style={{ marginBottom: 8 }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
        <span style={{ fontSize: 9, fontWeight: 700, color: isUser ? "#3b82f6" : "#f59e0b" }}>
          {isUser ? "YOU" : "👑 CEO"}
        </span>
        <span style={{ fontSize: 9, color: "var(--text-3)" }}>
          {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </span>
        {!isUser && msg.intent && !["unknown", "greeting"].includes(msg.intent) && (
          <span style={{
            fontSize: 8, fontWeight: 700, color: "#f59e0b",
            background: "rgba(245,158,11,0.12)", padding: "1px 5px", borderRadius: 99,
          }}>
            {msg.intent.replace(/_/g, " ")}
          </span>
        )}
      </div>
      <div style={{
        fontSize: 12, color: "var(--text)", lineHeight: 1.55,
        padding: "7px 10px", borderRadius: isUser ? "8px 8px 8px 0" : "0 8px 8px 8px",
        background: isUser ? "rgba(59,130,246,0.06)" : "rgba(245,158,11,0.06)",
        border: `1px solid ${isUser ? "rgba(59,130,246,0.2)" : "rgba(245,158,11,0.2)"}`,
        whiteSpace: "pre-wrap",
      }}>
        {msg.text}
      </div>
      {!isUser && msg.actions && msg.actions.length > 0 && (
        <div style={{ marginTop: 5, display: "flex", flexDirection: "column", gap: 2 }}>
          {msg.actions.map((a, i) => (
            <a key={i} href={a.href ?? "#"} style={{
              display: "flex", alignItems: "center", gap: 4,
              fontSize: 10, color: "#3b82f6",
            }}>
              <ChevronRight size={9} /> {a.label}
            </a>
          ))}
        </div>
      )}
    </motion.div>
  );
}

// ─── CEO Typing ───────────────────────────────────────────────────────────

function CeoTypingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      style={{
        display: "flex", alignItems: "center", gap: 7,
        padding: "6px 10px",
        background: "rgba(245,158,11,0.06)",
        border: "1px solid rgba(245,158,11,0.2)",
        borderRadius: 8, marginBottom: 6,
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
      <span style={{ fontSize: 10, color: "var(--text-3)" }}>CEO AI consulting executive team…</span>
    </motion.div>
  );
}

// ─── Supervision Panel ────────────────────────────────────────────────────

function SupervisionPanel({
  overview,
  onDecision,
}: {
  overview: CeoOverview | null;
  onDecision: (id: string, action: "approve" | "reject") => void;
}) {
  if (!overview?.pendingDecisions || overview.pendingDecisions.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "16px 8px", color: "var(--text-3)" }}>
        <CheckCircle2 size={14} style={{ color: "#22c55e", display: "block", margin: "0 auto 6px" }} />
        <div style={{ fontSize: 10 }}>No pending decisions</div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      {overview.pendingDecisions.map((dec) => (
        <div key={dec.id} style={{
          padding: "8px 10px",
          background: "rgba(245,158,11,0.06)",
          border: "1px solid rgba(245,158,11,0.2)",
          borderRadius: 6,
        }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: "var(--text)", marginBottom: 5, lineHeight: 1.3 }}>{dec.label}</div>
          <div style={{ display: "flex", gap: 4 }}>
            <PrimaryButton onClick={() => onDecision(dec.id, "approve")} color="#22c55e">
              <CheckCircle2 size={10} /> Approve
            </PrimaryButton>
            <GhostButton onClick={() => onDecision(dec.id, "reject")}>
              <XCircle size={10} /> Reject
            </GhostButton>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────

export default function CeoPage() {
  const [messages, setMessages] = useState<CeoMessage[]>([]);
  const [overview, setOverview] = useState<CeoOverview | null>(null);
  const [discussion, setDiscussion] = useState<ExecutiveDiscussion | null>(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [ceoTyping, setCeoTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeExecs, setActiveExecs] = useState<Set<ExecutiveId>>(new Set());
  const [typingExecs, setTypingExecs] = useState<Set<ExecutiveId>>(new Set());
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

  // Animate active/typing exec indicators when discussion changes
  useEffect(() => {
    if (!discussion) return;
    const involved = new Set(discussion.involvedExecutives);
    setActiveExecs(involved);

    // Simulate progressive typing: stagger which execs show as "typing"
    const timers: ReturnType<typeof setTimeout>[] = [];
    discussion.messages.forEach((msg, i) => {
      const t1 = setTimeout(() => {
        setTypingExecs(new Set([msg.from]));
      }, msg.delayMs - 1500);
      const t2 = setTimeout(() => {
        setTypingExecs(new Set());
      }, msg.delayMs);
      timers.push(t1, t2);
    });

    const clear = setTimeout(() => {
      setActiveExecs(new Set());
      setTypingExecs(new Set());
    }, (discussion.messages[discussion.messages.length - 1]?.delayMs ?? 0) + 3000);
    timers.push(clear);

    return () => timers.forEach(clearTimeout);
  }, [discussion?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSend = async (text?: string) => {
    const msg = text ?? input;
    if (!msg.trim() || sending) return;
    setInput("");
    setSending(true);
    setCeoTyping(true);
    setDiscussion(null);

    try {
      const res = await fetch("/api/ceo/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: msg }),
      });
      if (res.ok) {
        const d = await res.json();
        await new Promise((r) => setTimeout(r, 600));
        setCeoTyping(false);
        if (d.discussion) setDiscussion(d.discussion);
        await loadData();
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

  const handleDiscussionAction = async (action: string) => {
    if (!discussion) return;
    try {
      const res = await fetch("/api/ceo/discussion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ discussionId: discussion.id, action }),
      });
      if (res.ok) {
        setDiscussion((prev) => prev ? {
          ...prev,
          status: action === "approve" ? "approved"
            : action === "reject" ? "rejected"
              : action === "request_revision" ? "revision_requested"
                : prev.status,
        } : null);
      }
    } catch { /* */ }
  };

  const metrics = [
    { label: "Missions",  value: overview?.activeMissions ?? 0,    color: "#3b82f6", icon: <Zap size={10} /> },
    { label: "Revenue",   value: `$${overview?.totalRevenue ?? 0}`, color: "#22c55e", icon: <TrendingUp size={10} /> },
    { label: "Pending",   value: overview?.pendingApprovals ?? 0,   color: "#f59e0b", icon: <AlertTriangle size={10} /> },
  ];

  return (
    <div style={{
      padding: "14px 18px",
      maxWidth: 1700,
      margin: "0 auto",
      height: "calc(100vh - 60px)",
      display: "flex",
      flexDirection: "column",
      gap: 10,
    }}>

      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 9,
            background: "rgba(245,158,11,0.15)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Crown size={17} style={{ color: "#f59e0b" }} />
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: "var(--text)", lineHeight: 1 }}>CEO Cockpit</div>
            <div style={{ fontSize: 10, color: "var(--text-3)" }}>Executive Team · Real-time strategy simulation</div>
          </div>
          <LocalBadge />
          <SimBadge />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          {metrics.map((m) => (
            <div key={m.label} style={{
              padding: "4px 10px", background: "var(--bg-2)",
              border: "1px solid var(--border)", borderRadius: 6,
              display: "flex", alignItems: "center", gap: 5,
            }}>
              <span style={{ color: m.color }}>{m.icon}</span>
              <div>
                <div style={{ fontSize: 8, color: "var(--text-3)", textTransform: "uppercase" }}>{m.label}</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: m.color }}>{m.value}</div>
              </div>
            </div>
          ))}
          <GhostButton onClick={loadData}><RefreshCw size={11} /></GhostButton>
        </div>
      </div>

      {error && <ErrorBanner message={error} onRetry={loadData} />}

      {/* ── 3-Column Layout ── */}
      <div style={{ display: "grid", gridTemplateColumns: "320px 1fr 300px", gap: 10, flex: 1, minHeight: 0 }}>

        {/* ── LEFT: CEO Chat ── */}
        <Panel style={{ display: "flex", flexDirection: "column", minHeight: 0, gap: 0 }}>
          <div style={{ flexShrink: 0, marginBottom: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 6 }}>
              <MessageSquare size={10} style={{ color: "#f59e0b" }} />
              <span style={{ fontSize: 9, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                CEO Direct Line
              </span>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
              {QUICK_SUGGESTIONS.map((s) => (
                <button
                  key={s.label}
                  onClick={() => handleSend(s.label)}
                  disabled={sending}
                  style={{
                    padding: "3px 8px", fontSize: 9, fontWeight: 600,
                    background: "var(--bg-2)", border: "1px solid var(--border)",
                    borderRadius: 99, color: s.color, cursor: "pointer",
                  }}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ flex: 1, overflowY: "auto", minHeight: 0, marginBottom: 8 }}>
            <AnimatePresence>
              {messages.length === 0 && !ceoTyping && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  style={{ textAlign: "center", padding: "40px 16px", color: "var(--text-3)" }}
                >
                  <div style={{
                    width: 48, height: 48, borderRadius: "50%",
                    background: "rgba(245,158,11,0.12)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    margin: "0 auto 10px", fontSize: 22,
                  }}>
                    👑
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-2)", marginBottom: 4 }}>
                    Alexandra Chen — CEO AI
                  </div>
                  <div style={{ fontSize: 10, lineHeight: 1.5 }}>
                    Ready to lead. Tell me your vision and I&apos;ll mobilize the executive team.
                  </div>
                </motion.div>
              )}
              {messages.map((msg) => (
                <CeoMessageBubble key={msg.id} msg={msg} />
              ))}
              {ceoTyping && <CeoTypingIndicator />}
            </AnimatePresence>
            <div ref={chatEndRef} />
          </div>

          <div style={{ flexShrink: 0, display: "flex", gap: 6 }}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Talk to the CEO…"
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

        {/* ── CENTER: Executive War Room ── */}
        <Panel style={{ display: "flex", flexDirection: "column", minHeight: 0, gap: 0, padding: 0, overflow: "hidden" }}>
          <div style={{
            flexShrink: 0, padding: "10px 14px",
            borderBottom: "1px solid var(--border)",
            display: "flex", alignItems: "center", gap: 6,
          }}>
            <Users size={11} style={{ color: "#8b5cf6" }} />
            <span style={{ fontSize: 10, fontWeight: 700, color: "var(--text-2)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Executive War Room
            </span>
            {discussion && (
              <div style={{ display: "flex", gap: 4, marginLeft: 6, flexWrap: "wrap" }}>
                {discussion.involvedExecutives.slice(0, 6).map((id) => {
                  const e = getExec(id);
                  return (
                    <span key={id} title={e.name} style={{
                      fontSize: 14, cursor: "default",
                      opacity: activeExecs.has(id) ? 1 : 0.35,
                      transition: "opacity 300ms",
                    }}>
                      {e.avatar}
                    </span>
                  );
                })}
              </div>
            )}
          </div>
          <div style={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
            <WarRoom
              discussion={discussion}
              isConsulting={ceoTyping}
              onAction={handleDiscussionAction}
            />
          </div>
        </Panel>

        {/* ── RIGHT: Executive Team + Supervision ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10, minHeight: 0 }}>

          {/* Org hierarchy */}
          <Panel style={{ flexShrink: 0 }}>
            <SectionHeader title="Executive Team" icon={<Crown size={11} style={{ color: "#f59e0b" }} />} />

            {/* CEO node */}
            <div style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "7px 10px", marginBottom: 8,
              background: "rgba(245,158,11,0.08)",
              border: "1px solid rgba(245,158,11,0.3)",
              borderRadius: 8,
            }}>
              <ExecAvatar id="ceo" size={28} pulse={ceoTyping} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: "#f59e0b", lineHeight: 1 }}>Alexandra Chen</div>
                <div style={{ fontSize: 8, color: "var(--text-3)" }}>CEO · Strategy & Oversight</div>
              </div>
              <motion.div
                style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e" }}
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            </div>

            {/* Connector */}
            <div style={{
              width: 1, height: 8, background: "var(--border)",
              margin: "0 auto", marginBottom: 4,
            }} />

            {/* Directors */}
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {EXEC_DEFS.filter((e) => e.id !== "ceo").map((exec) => (
                <OrgCard
                  key={exec.id}
                  exec={exec}
                  isActive={activeExecs.has(exec.id)}
                  isTyping={typingExecs.has(exec.id)}
                />
              ))}
            </div>
          </Panel>

          {/* Supervision Controls */}
          <Panel style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
            <SectionHeader title="Supervision" icon={<AlertTriangle size={11} style={{ color: "#f59e0b" }} />} />
            <SupervisionPanel overview={overview} onDecision={handleDecision} />
          </Panel>

        </div>
      </div>
    </div>
  );
}
