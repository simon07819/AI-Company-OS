"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Crown,
  Database,
  DollarSign,
  FileText,
  Image as ImageIcon,
  MessageSquare,
  Paperclip,
  Pause,
  RefreshCw,
  RotateCcw,
  Send,
  Sparkles,
  TrendingUp,
  Upload,
  Users,
  X,
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

// ─── File types ───────────────────────────────────────────────────────────

type FileCategory = "image" | "pdf" | "text" | "data" | "unknown";

interface ClientFile {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  category: FileCategory;
  uploadedAt: string;
  analysis?: {
    summary: string;
    delegateTo: string;
    taskType: string;
  };
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
  const isFileAnalysis = discussion?.intent === "file_analysis";

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
      {discussion && !isFileAnalysis && (
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
      {discussion && isFileAnalysis && (
        <FileUploadTimeline
          fileName={discussion.userRequest.replace("Analyse de fichier: ", "")}
          visibleCount={visibleCount}
          totalMessages={discussion.messages.length}
        />
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

const THINKING_PHASES = [
  "analyzing your request…",
  "consulting executive team…",
  "reviewing options…",
  "preparing response…",
];

function CeoTypingIndicator() {
  const [phaseIdx, setPhaseIdx] = useState(0);

  useEffect(() => {
    const t = setInterval(() => {
      setPhaseIdx((i) => (i + 1) % THINKING_PHASES.length);
    }, 900);
    return () => clearInterval(t);
  }, []);

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
      <AnimatePresence mode="wait">
        <motion.span
          key={phaseIdx}
          initial={{ opacity: 0, y: 3 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -3 }}
          transition={{ duration: 0.2 }}
          style={{ fontSize: 10, color: "var(--text-3)" }}
        >
          CEO AI — {THINKING_PHASES[phaseIdx]}
        </motion.span>
      </AnimatePresence>
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

// ─── File Icon ────────────────────────────────────────────────────────────

function FileCategoryIcon({ category, size = 14 }: { category: FileCategory; size?: number }) {
  const props = { size, style: { flexShrink: 0 } };
  if (category === "image") return <ImageIcon {...props} style={{ color: "#8b5cf6", flexShrink: 0 }} />;
  if (category === "pdf") return <FileText {...props} style={{ color: "#ef4444", flexShrink: 0 }} />;
  if (category === "data") return <Database {...props} style={{ color: "#06b6d4", flexShrink: 0 }} />;
  return <FileText {...props} style={{ color: "#6b7280", flexShrink: 0 }} />;
}

// ─── File Preview Chip ────────────────────────────────────────────────────

function FilePreviewChip({
  file,
  previewUrl,
  onRemove,
}: {
  file: File;
  previewUrl: string | null;
  onRemove: () => void;
}) {
  const isImage = file.type.startsWith("image/");
  const sizeLabel = file.size < 1024 * 1024
    ? `${(file.size / 1024).toFixed(1)} KB`
    : `${(file.size / 1024 / 1024).toFixed(1)} MB`;

  const isPdf = file.type === "application/pdf";

  return (
    <motion.div
      initial={{ opacity: 0, y: 6, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -4, scale: 0.96 }}
      style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "8px 10px",
        background: "rgba(139,92,246,0.07)",
        border: "1.5px solid rgba(139,92,246,0.28)",
        borderRadius: 10,
        marginBottom: 7,
      }}
    >
      {isImage && previewUrl ? (
        <img
          src={previewUrl}
          alt={file.name}
          style={{ width: 44, height: 44, objectFit: "cover", borderRadius: 7, flexShrink: 0, border: "1px solid rgba(139,92,246,0.2)" }}
        />
      ) : (
        <div style={{
          width: 44, height: 44, borderRadius: 7, flexShrink: 0,
          background: isPdf ? "rgba(239,68,68,0.1)" : "rgba(139,92,246,0.12)",
          border: `1px solid ${isPdf ? "rgba(239,68,68,0.25)" : "rgba(139,92,246,0.2)"}`,
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 1,
        }}>
          <FileText size={17} style={{ color: isPdf ? "#ef4444" : "#8b5cf6" }} />
          {isPdf && (
            <span style={{ fontSize: 7, fontWeight: 800, color: "#ef4444", letterSpacing: "0.5px" }}>PDF</span>
          )}
        </div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: 2 }}>
          {file.name}
        </div>
        <div style={{ fontSize: 9, color: "var(--text-3)", display: "flex", alignItems: "center", gap: 4 }}>
          <Paperclip size={8} style={{ color: "#8b5cf6" }} />
          <span>{sizeLabel} · Ready to send</span>
        </div>
      </div>
      <button
        onClick={onRemove}
        title="Remove attachment"
        style={{
          background: "rgba(107,114,128,0.12)", border: "none", padding: 5,
          cursor: "pointer", color: "var(--text-3)", display: "flex", alignItems: "center",
          borderRadius: 6,
        }}
      >
        <X size={12} />
      </button>
    </motion.div>
  );
}

// ─── Upload Progress Bar ──────────────────────────────────────────────────

function UploadProgressBar({ progress }: { progress: number }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{ marginBottom: 6 }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
        <span style={{ fontSize: 9, color: "var(--text-3)" }}>Uploading…</span>
        <span style={{ fontSize: 9, color: "#8b5cf6", fontWeight: 700 }}>{progress}%</span>
      </div>
      <div style={{ height: 3, background: "var(--border)", borderRadius: 99 }}>
        <motion.div
          style={{ height: "100%", background: "#8b5cf6", borderRadius: 99 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.2 }}
        />
      </div>
    </motion.div>
  );
}

// ─── Uploaded File Badge ──────────────────────────────────────────────────

function UploadedFileBadge({ file }: { file: ClientFile }) {
  const isImage = file.category === "image";
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        display: "flex", alignItems: "center", gap: 7,
        padding: "7px 10px", marginBottom: 8,
        background: "rgba(139,92,246,0.06)",
        border: "1px solid rgba(139,92,246,0.25)",
        borderRadius: 8,
      }}
    >
      {isImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`/api/ceo/files/${file.id}`}
          alt={file.name}
          style={{ width: 40, height: 40, objectFit: "cover", borderRadius: 6, flexShrink: 0 }}
          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
        />
      ) : (
        <div style={{
          width: 40, height: 40, borderRadius: 6, flexShrink: 0,
          background: "rgba(139,92,246,0.12)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <FileCategoryIcon category={file.category} size={18} />
        </div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <Paperclip size={9} style={{ color: "#8b5cf6" }} />
          <span style={{ fontSize: 9, fontWeight: 700, color: "#8b5cf6", textTransform: "uppercase" }}>CEO analyzed</span>
        </div>
        <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {file.name}
        </div>
        {file.analysis?.summary && (
          <div style={{ fontSize: 9, color: "var(--text-3)", marginTop: 1, lineHeight: 1.4 }}>
            {file.analysis.summary.slice(0, 80)}{file.analysis.summary.length > 80 ? "…" : ""}
          </div>
        )}
      </div>
      <CheckCircle2 size={12} style={{ color: "#22c55e", flexShrink: 0 }} />
    </motion.div>
  );
}

// ─── File Upload Timeline (Phase 4) ──────────────────────────────────────

function FileUploadTimeline({ fileName, visibleCount, totalMessages }: {
  fileName: string;
  visibleCount: number;
  totalMessages: number;
}) {
  const stages = [
    { label: "Upload", icon: "📎", done: true },
    { label: "Analyse CEO", icon: "🔍", done: visibleCount >= 1 },
    { label: "Délégation", icon: "👥", done: visibleCount >= 2 },
    { label: "Résultats", icon: "✅", done: visibleCount >= totalMessages },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        display: "flex", alignItems: "center", gap: 0,
        padding: "8px 14px",
        background: "rgba(139,92,246,0.04)",
        borderBottom: "1px solid var(--border)",
        overflowX: "auto",
      }}
    >
      <Paperclip size={9} style={{ color: "#8b5cf6", flexShrink: 0, marginRight: 6 }} />
      <span style={{ fontSize: 9, color: "#8b5cf6", fontWeight: 700, marginRight: 10, flexShrink: 0, textTransform: "uppercase" }}>
        {fileName.slice(0, 24)}{fileName.length > 24 ? "…" : ""}
      </span>
      {stages.map((stage, i) => (
        <div key={stage.label} style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
          {i > 0 && (
            <div style={{
              width: 20, height: 1,
              background: stage.done ? "#22c55e" : "var(--border)",
              margin: "0 4px",
              transition: "background 300ms",
            }} />
          )}
          <div style={{
            display: "flex", alignItems: "center", gap: 3,
            padding: "2px 6px", borderRadius: 99,
            background: stage.done ? "rgba(34,197,94,0.1)" : "var(--bg-2)",
            border: `1px solid ${stage.done ? "rgba(34,197,94,0.3)" : "var(--border)"}`,
            transition: "all 300ms",
          }}>
            <span style={{ fontSize: 9 }}>{stage.icon}</span>
            <span style={{ fontSize: 8, fontWeight: 600, color: stage.done ? "#22c55e" : "var(--text-3)" }}>
              {stage.label}
            </span>
          </div>
        </div>
      ))}
    </motion.div>
  );
}

// ─── Drag & Drop Overlay ──────────────────────────────────────────────────

function DragOverlay({ active }: { active: boolean }) {
  if (!active) return null;
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: "absolute", inset: 0, zIndex: 50,
        background: "rgba(139,92,246,0.12)",
        border: "2px dashed #8b5cf6",
        borderRadius: 10,
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        pointerEvents: "none",
      }}
    >
      <Upload size={24} style={{ color: "#8b5cf6", marginBottom: 8 }} />
      <span style={{ fontSize: 13, fontWeight: 700, color: "#8b5cf6" }}>Drop to upload</span>
      <span style={{ fontSize: 10, color: "var(--text-3)", marginTop: 2 }}>Image, PDF, TXT, MD, JSON</span>
    </motion.div>
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

  // ── Upload state ──
  const [isDragging, setIsDragging] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingPreviewUrl, setPendingPreviewUrl] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<ClientFile[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [clipHovered, setClipHovered] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const selectPendingFile = (file: File) => {
    setPendingFile(file);
    if (file.type.startsWith("image/")) {
      const url = URL.createObjectURL(file);
      setPendingPreviewUrl(url);
    } else {
      setPendingPreviewUrl(null);
    }
  };

  const clearPendingFile = () => {
    if (pendingPreviewUrl) URL.revokeObjectURL(pendingPreviewUrl);
    setPendingFile(null);
    setPendingPreviewUrl(null);
  };

  const handleFileUpload = async (file: File) => {
    setDiscussion(null);
    setUploadProgress(10);
    setCeoTyping(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      setUploadProgress(40);
      const res = await fetch("/api/ceo/upload", { method: "POST", body: formData });
      setUploadProgress(80);

      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "Upload failed" }));
        setUploadError(err.message ?? "Upload failed");
        setTimeout(() => setUploadError(null), 5000);
        return;
      }

      const data = await res.json();
      setUploadProgress(100);

      setUploadedFiles((prev) => [data.file, ...prev].slice(0, 20));
      if (data.discussion) setDiscussion(data.discussion);
      clearPendingFile();
      await loadData();
    } catch {
      setUploadError("Upload failed — check your connection.");
      setTimeout(() => setUploadError(null), 5000);
    } finally {
      setCeoTyping(false);
      setTimeout(() => setUploadProgress(null), 800);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) selectPendingFile(file);
    e.target.value = "";
  };

  const handleSendWithFile = async () => {
    if (pendingFile) {
      await handleFileUpload(pendingFile);
    } else {
      handleSend();
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const handleDragLeave = (e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragging(false);
    }
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) selectPendingFile(file);
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
        <div
          style={{ position: "relative", minHeight: 0 }}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <AnimatePresence>
            {isDragging && <DragOverlay active={isDragging} />}
          </AnimatePresence>
        <Panel
          style={{ display: "flex", flexDirection: "column", minHeight: 0, gap: 0, height: "100%" }}
        >

          <div style={{ flexShrink: 0, marginBottom: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 6 }}>
              <MessageSquare size={10} style={{ color: "#f59e0b" }} />
              <span style={{ fontSize: 9, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                CEO Direct Line
              </span>
              <div style={{ flex: 1 }} />
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
              {messages.length === 0 && uploadedFiles.length === 0 && !ceoTyping && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  style={{ textAlign: "center", padding: "30px 16px", color: "var(--text-3)" }}
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
                  <div style={{ fontSize: 10, lineHeight: 1.5, marginBottom: 10 }}>
                    Ready to lead. Tell me your vision or drop a file to analyze.
                  </div>
                  <div style={{
                    display: "flex", alignItems: "center", gap: 6, justifyContent: "center",
                    padding: "8px 12px",
                    background: "rgba(139,92,246,0.06)",
                    border: "1px dashed rgba(139,92,246,0.3)",
                    borderRadius: 8,
                  }}>
                    <Upload size={12} style={{ color: "#8b5cf6" }} />
                    <span style={{ fontSize: 10, color: "#8b5cf6" }}>Drag & drop a file here</span>
                  </div>
                </motion.div>
              )}
              {uploadedFiles.map((f) => (
                <UploadedFileBadge key={f.id} file={f} />
              ))}
              {messages.map((msg) => (
                <CeoMessageBubble key={msg.id} msg={msg} />
              ))}
              {ceoTyping && <CeoTypingIndicator />}
            </AnimatePresence>
            <div ref={chatEndRef} />
          </div>

          <div style={{ flexShrink: 0 }}>

            {/* Upload error toast */}
            <AnimatePresence>
              {uploadError && (
                <motion.div
                  initial={{ opacity: 0, y: 6, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 6, scale: 0.97 }}
                  style={{
                    display: "flex", alignItems: "center", gap: 7,
                    padding: "8px 10px", marginBottom: 8,
                    background: "rgba(239,68,68,0.09)",
                    border: "1px solid rgba(239,68,68,0.35)",
                    borderRadius: 9,
                  }}
                >
                  <XCircle size={13} style={{ color: "#ef4444", flexShrink: 0 }} />
                  <span style={{ fontSize: 11, color: "#ef4444", flex: 1, lineHeight: 1.4 }}>{uploadError}</span>
                  <button
                    onClick={() => setUploadError(null)}
                    style={{ background: "none", border: "none", padding: 2, cursor: "pointer", color: "#ef4444", display: "flex", alignItems: "center" }}
                  >
                    <X size={11} />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* File preview chip */}
            <AnimatePresence>
              {pendingFile && (
                <FilePreviewChip
                  file={pendingFile}
                  previewUrl={pendingPreviewUrl}
                  onRemove={clearPendingFile}
                />
              )}
              {uploadProgress !== null && (
                <UploadProgressBar progress={uploadProgress} />
              )}
            </AnimatePresence>

            {/* ChatGPT-style input bar */}
            <div style={{
              display: "flex", alignItems: "center",
              background: "var(--bg-2)",
              border: `1.5px solid ${clipHovered ? "rgba(139,92,246,0.55)" : "var(--border)"}`,
              borderRadius: 12,
              transition: "border-color 0.18s",
              overflow: "hidden",
            }}>
              {/* Paperclip — inside the bar */}
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={sending || !!uploadProgress}
                title="Attach file (image, PDF, TXT, MD, JSON)"
                onMouseEnter={() => setClipHovered(true)}
                onMouseLeave={() => setClipHovered(false)}
                style={{
                  padding: "0 11px",
                  alignSelf: "stretch",
                  background: "none",
                  border: "none",
                  borderRight: "1px solid var(--border)",
                  cursor: sending || !!uploadProgress ? "not-allowed" : "pointer",
                  color: clipHovered && !(sending || !!uploadProgress) ? "#8b5cf6" : "var(--text-3)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "color 0.15s",
                  flexShrink: 0,
                }}
              >
                <Paperclip size={14} />
              </button>

              {/* Text input */}
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={pendingFile ? `Send "${pendingFile.name}" to CEO…` : "Message CEO…"}
                disabled={sending || !!uploadProgress}
                style={{
                  flex: 1,
                  padding: "10px 10px",
                  fontSize: 12,
                  background: "none",
                  border: "none",
                  color: "var(--text)",
                  outline: "none",
                }}
              />

              {/* Send button */}
              <div style={{ padding: "5px 5px 5px 0", flexShrink: 0 }}>
                <button
                  onClick={handleSendWithFile}
                  disabled={sending || !!uploadProgress || (!input.trim() && !pendingFile)}
                  style={{
                    padding: "5px 10px",
                    minHeight: 30,
                    minWidth: 34,
                    background: (sending || !!uploadProgress || (!input.trim() && !pendingFile))
                      ? "rgba(107,114,128,0.2)"
                      : pendingFile ? "#8b5cf6" : "#f59e0b",
                    border: "none",
                    borderRadius: 8,
                    cursor: (sending || !!uploadProgress || (!input.trim() && !pendingFile)) ? "not-allowed" : "pointer",
                    color: "white",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    transition: "background 0.15s",
                  }}
                >
                  {sending ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      style={{ display: "flex" }}
                    >
                      <RefreshCw size={12} />
                    </motion.div>
                  ) : pendingFile ? (
                    <Upload size={12} />
                  ) : (
                    <Send size={12} />
                  )}
                </button>
              </div>
            </div>

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf,.txt,.md,.json"
              style={{ display: "none" }}
              onChange={handleFileInputChange}
            />
          </div>
        </Panel>
        </div>

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
