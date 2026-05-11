"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Crown,
  Database,
  DollarSign,
  FileText,
  Eye,
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
  GlassPanel,
  LocalBadge,
  Panel,
  PrimaryButton,
  Row,
  SectionHeader,
  SimBadge,
  NvidiaLiveBadge,
  StatusBadge,
  TypingBubble,
  ExpertiseBadge,
} from "@/components/ui";
import { ApprovalCard, ApprovalPreviewModal } from "@/components/approvals/ApprovalCard";
import type { ApprovalItem, ApprovalPreview } from "@/lib/approvalPreview";
import type { ExecutiveDiscussion, DiscussionMessage } from "@/lib/executiveDiscussion";
import type { AgentId } from "@/lib/agentTypes";

type TeamChatId = AgentId;

// ─── Executive definitions (client-side copy) ─────────────────────────────

interface ExecDef {
  id: TeamChatId;
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
  { id: "frontend_agent", name: "Léa Moreau", title: "Designer",          avatar: "🎨", color: "#ec4899", shortTitle: "Designer" },
  { id: "qa_agent",  name: "Naomi Okafor",    title: "QA Director",       avatar: "🔍", color: "#ef4444", shortTitle: "QA" },
  { id: "ecommerce_operator", name: "Lina Marchand", title: "E-commerce Operator", avatar: "🛒", color: "#14b8a6", shortTitle: "E-commerce" },
];

function getExec(id: TeamChatId): ExecDef {
  return EXEC_DEFS.find((e) => e.id === id) ?? EXEC_DEFS[0];
}

interface ConvParticipant {
  id: TeamChatId | "custom_agent";
  name: string;
  avatar: string;
  color: string;
}

interface ConvMessage {
  id: string;
  role: "user" | TeamChatId | "custom_agent";
  text: string;
  timestamp: string;
}

interface ConvThread {
  id: string;
  title: string;
  participants: ConvParticipant[];
  messages: ConvMessage[];
  archived: boolean;
  updatedAt: string;
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

function ExecAvatar({ id, size = 28, pulse }: { id: TeamChatId; size?: number; pulse?: boolean }) {
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

function ExecTyping({ id }: { id: TeamChatId }) {
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
            → {getExec(msg.to as TeamChatId).name}
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
  onOpen,
}: {
  exec: ExecDef;
  isActive: boolean;
  isTyping: boolean;
  onOpen: (id: TeamChatId) => void;
}) {
  return (
    <motion.div
      role="button"
      data-testid={`team-chat-${exec.id}`}
      tabIndex={0}
      onClick={() => onOpen(exec.id)}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onOpen(exec.id); }}
      animate={isActive ? { boxShadow: [`0 0 0px ${exec.color}00`, `0 0 8px ${exec.color}44`, `0 0 0px ${exec.color}00`] } : {}}
      transition={isActive ? { duration: 2, repeat: Infinity } : {}}
      style={{
        padding: "7px 9px",
        background: isActive ? `${exec.color}08` : "var(--bg-2)",
        border: `1px solid ${isActive ? `${exec.color}35` : "var(--border)"}`,
        borderRadius: 8, display: "flex", alignItems: "center", gap: 7,
        cursor: "pointer",
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

function CeoMessageBubble({ msg, participant }: { msg: CeoMessage; participant: ExecDef }) {
  const isUser = msg.role === "user";
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      style={{ marginBottom: 8 }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
        <span style={{ fontSize: 9, fontWeight: 700, color: isUser ? "#3b82f6" : "#f59e0b" }}>
          {isUser ? "YOU" : `${participant.avatar} ${participant.shortTitle}`}
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
        background: isUser ? "rgba(59,130,246,0.06)" : `${participant.color}10`,
        border: `1px solid ${isUser ? "rgba(59,130,246,0.2)" : `${participant.color}30`}`,
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
  approvals,
  onPreview,
  onApprove,
  onReject,
}: {
  approvals: ApprovalItem[];
  onPreview: (id: string) => void;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}) {
  if (approvals.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "16px 8px", color: "var(--text-3)" }}>
        <CheckCircle2 size={14} style={{ color: "#22c55e", display: "block", margin: "0 auto 6px" }} />
        <div style={{ fontSize: 10 }}>No pending decisions</div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {approvals.map((item) => (
        <ApprovalCard
          key={item.id}
          item={item}
          onPreview={onPreview}
          onApprove={onApprove}
          onReject={onReject}
        />
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

// ─── Agent Questions Section ─────────────────────────────────────────────

interface AgentQOption { id: string; label: string; }
interface AgentQ { id: string; agentId: string; agentName: string; agentAvatar: string; agentColor: string; question: string; options: AgentQOption[]; status: string; answer: { optionId: string | null; freeText: string | null } | null; createdAt: string; }

function AgentQuestionsSection() {
  const [questions, setQuestions] = useState<AgentQ[]>([]);
  const [autreText, setAutreText] = useState<Record<string, string>>({});
  const [showAutre, setShowAutre] = useState<Record<string, boolean>>({});

  const loadQuestions = async () => {
    try {
      const res = await fetch("/api/agent-questions");
      if (res.ok) { const d = await res.json(); setQuestions((d.questions ?? []).filter((q: AgentQ) => q.status === "pending")); }
    } catch { /* */ }
  };

  useEffect(() => { loadQuestions(); const t = setInterval(loadQuestions, 15000); return () => clearInterval(t); }, []);

  const handleAnswer = async (questionId: string, optionId: string) => {
    const freeText = optionId === "autre" ? (autreText[questionId] ?? "") : undefined;
    try {
      const res = await fetch(`/api/agent-questions/${questionId}/answer`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ optionId, freeText }),
      });
      if (res.ok) loadQuestions();
    } catch { /* */ }
  };

  if (questions.length === 0) return null;

  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ fontSize: 9, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6 }}>
        Agent Questions
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {questions.slice(0, 4).map((q) => (
          <div key={q.id} style={{ padding: "8px 10px", borderRadius: 6, background: `${q.agentColor}08`, border: `1px solid ${q.agentColor}30` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 4 }}>
              <span style={{ fontSize: 10 }}>{q.agentAvatar}</span>
              <span style={{ fontSize: 9, fontWeight: 700, color: q.agentColor }}>{q.agentName}</span>
            </div>
            <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text)", marginBottom: 6 }}>{q.question}</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
              {q.options.map((opt) => (
                <button key={opt.id} onClick={() => opt.id === "autre" ? setShowAutre((p) => ({ ...p, [q.id]: true })) : handleAnswer(q.id, opt.id)} style={{ padding: "3px 8px", fontSize: 9, fontWeight: 600, background: "var(--bg-2)", border: `1px solid ${q.agentColor}30`, borderRadius: 4, color: "var(--text)", cursor: "pointer" }}>
                  {opt.label}
                </button>
              ))}
            </div>
            {showAutre[q.id] && (
              <div style={{ display: "flex", gap: 4, marginTop: 4 }}>
                <input value={autreText[q.id] ?? ""} onChange={(e) => setAutreText((p) => ({ ...p, [q.id]: e.target.value }))} placeholder="Votre réponse…" style={{ flex: 1, padding: "4px 8px", fontSize: 9, background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: 4, color: "var(--text)", outline: "none" }} onKeyDown={(e) => { if (e.key === "Enter" && autreText[q.id]?.trim()) handleAnswer(q.id, "autre"); }} />
                <button onClick={() => handleAnswer(q.id, "autre")} disabled={!(autreText[q.id]?.trim())} style={{ padding: "4px 8px", fontSize: 9, fontWeight: 600, background: q.agentColor, color: "#fff", border: "none", borderRadius: 4, cursor: autreText[q.id]?.trim() ? "pointer" : "not-allowed", opacity: autreText[q.id]?.trim() ? 1 : 0.5 }}>
                  OK
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────

export default function CeoPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<CeoMessage[]>([]);
  const [overview, setOverview] = useState<CeoOverview | null>(null);
  const [discussion, setDiscussion] = useState<ExecutiveDiscussion | null>(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [ceoTyping, setCeoTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [runtimeMode, setRuntimeMode] = useState<"nvidia" | "simulation">("simulation");
  const [pendingApprovals, setPendingApprovals] = useState<ApprovalItem[]>([]);
  const [approvalPreview, setApprovalPreview] = useState<ApprovalPreview | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [activeExecs, setActiveExecs] = useState<Set<TeamChatId>>(new Set());
  const [typingExecs, setTypingExecs] = useState<Set<TeamChatId>>(new Set());
  const [activeThread, setActiveThread] = useState<ConvThread | null>(null);
  const [activeParticipant, setActiveParticipant] = useState<TeamChatId>("ceo");
  const chatEndRef = useRef<HTMLDivElement>(null);

  // ── Upload state ──
  const [isDragging, setIsDragging] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingPreviewUrl, setPendingPreviewUrl] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<ClientFile[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [createdMission, setCreatedMission] = useState<CeoAction | null>(null);
  const [clipHovered, setClipHovered] = useState(false);
  const [recentOutputs, setRecentOutputs] = useState<{ id: string; title: string; type: string; status: string; assignedAgent: string; preview: string; updatedAt: string }[]>([]);
  const [activeRevisions, setActiveRevisions] = useState<{ id: string; comment: string; direction: string; agentId: string; status: string; createdAt: string }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const conversationMessages: CeoMessage[] = activeThread
    ? activeThread.messages.map((msg) => ({
      id: msg.id,
      role: msg.role === "user" ? "user" : "ceo",
      text: msg.text,
      timestamp: msg.timestamp,
    }))
    : messages;

  const currentParticipant = getExec(activeParticipant);
  const currentThreadTitle = activeThread?.title ?? "CEO Cockpit";
  const isCeoThread = activeParticipant === "ceo";

  const loadData = useCallback(async () => {
    try {
      const [mRes, oRes] = await Promise.all([
        fetch("/api/ceo/messages"),
        fetch("/api/ceo/overview"),
      ]);
      if (mRes.ok) { const d = await mRes.json(); setMessages(d.messages ?? []); }
      if (oRes.ok) { const d = await oRes.json(); setOverview(d.overview ?? null); }
      if (!activeThread) {
        const tRes = await fetch("/api/conversations/threads", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ directParticipant: "ceo" }),
        });
        if (tRes.ok) {
          const td = await tRes.json();
          if (td.ok && td.thread) setActiveThread(td.thread);
        }
      }
      setError(null);
    } catch {
      setError("Failed to load CEO data");
    }
  }, [activeThread]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    fetch("/api/runtime-mode").then((r) => r.json()).then((d) => {
      if (d.ok) setRuntimeMode(d.mode === "nvidia" ? "nvidia" : "simulation");
    }).catch(() => {});
    fetch("/api/approvals").then((r) => r.json()).then((d) => {
      if (d.ok) setPendingApprovals(d.pending ?? []);
    }).catch(() => {});
    fetch("/api/visible-outputs").then((r) => r.json()).then((d) => {
      if (d.ok) setRecentOutputs((d.outputs ?? []).slice(0, 5));
    }).catch(() => {});
    fetch("/api/revisions?pending=true").then((r) => r.json()).then((d) => {
      if (d.ok) setActiveRevisions((d.revisions ?? []).slice(0, 5));
    }).catch(() => {});
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversationMessages, ceoTyping]);

  // Animate active/typing exec indicators when discussion changes
  useEffect(() => {
    if (!discussion) return;
    const involved = new Set(discussion.involvedExecutives as TeamChatId[]);
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

  const openDirectThread = async (participant: TeamChatId, forceNew = false) => {
    setActiveParticipant(participant);
    setDiscussion(null);
    const participantDef = getExec(participant);
    const res = await fetch("/api/conversations/threads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(forceNew
        ? { title: `Conversation avec ${participantDef.title}`, participants: [participant] }
        : { directParticipant: participant }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.ok && data.thread) {
        setActiveThread(data.thread);
        return data.thread as ConvThread;
      }
    }
    return null;
  };

  const handleNewChat = async () => {
    await openDirectThread(activeParticipant, true);
    setInput("");
    setUploadedFiles([]);
  };

  const handleArchiveChat = async () => {
    if (!activeThread) return;
    await fetch(`/api/conversations/threads/${activeThread.id}/archive`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ archived: true }),
    });
    setActiveThread(null);
    await openDirectThread(activeParticipant, true);
  };

  const refreshActiveThread = async () => {
    if (!activeThread) return;
    const res = await fetch(`/api/conversations/threads/${activeThread.id}`);
    if (res.ok) {
      const data = await res.json();
      if (data.ok && data.thread) setActiveThread(data.thread);
    }
  };

  const handleSend = async (text?: string) => {
    const msg = text ?? input;
    if (!msg.trim() || sending) return;
    setInput("");
    setSending(true);
    setCeoTyping(true);
    setDiscussion(null);

    try {
      const threadForSend = !isCeoThread && !activeThread ? await openDirectThread(activeParticipant) : activeThread;
      const res = isCeoThread ? await fetch("/api/ceo/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: msg }),
      }) : await fetch(`/api/conversations/threads/${threadForSend?.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: msg }),
      });
      if (res.ok) {
        const d = await res.json();
        await new Promise((r) => setTimeout(r, 600));
        setCeoTyping(false);
        if (d.discussion) setDiscussion(d.discussion);
        if (d.thread) setActiveThread(d.thread);
        await loadData();
        if (isCeoThread) await refreshActiveThread();
        const missionAction = d.response?.actions?.find((action: CeoAction) => action.type === "created_session" && action.href);
        if (missionAction) {
          setCreatedMission(missionAction);
          window.setTimeout(() => {
            router.push(missionAction.href!);
          }, 900);
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

  const handleApprovalPreview = async (approvalId: string) => {
    try {
      const res = await fetch(`/api/approvals/${approvalId}/preview`);
      if (res.ok) {
        const d = await res.json();
        if (d.ok && d.preview) {
          setApprovalPreview(d.preview);
          setShowPreviewModal(true);
        }
      }
    } catch { /* */ }
  };

  const handleApprovalApprove = async (approvalId: string) => {
    try {
      await fetch(`/api/approvals/${approvalId}/approve`, { method: "POST" });
      setShowPreviewModal(false);
      setApprovalPreview(null);
      fetch("/api/approvals").then((r) => r.json()).then((d) => {
        if (d.ok) setPendingApprovals(d.pending ?? []);
      }).catch(() => {});
    } catch { /* */ }
  };

  const handleApprovalReject = async (approvalId: string) => {
    try {
      await fetch(`/api/approvals/${approvalId}/reject`, { method: "POST" });
      setShowPreviewModal(false);
      setApprovalPreview(null);
      fetch("/api/approvals").then((r) => r.json()).then((d) => {
        if (d.ok) setPendingApprovals(d.pending ?? []);
      }).catch(() => {});
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

      {/* ── Premium Header ── */}
      <div style={{
        flexShrink: 0,
        background: "linear-gradient(135deg, rgba(245,158,11,0.06), rgba(139,92,246,0.04), transparent)",
        border: "1px solid rgba(245,158,11,0.15)",
        borderRadius: 14,
        padding: "14px 18px",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 38, height: 38, borderRadius: 10,
              background: "linear-gradient(135deg, rgba(245,158,11,0.2), rgba(245,158,11,0.08))",
              border: "1px solid rgba(245,158,11,0.35)",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 2px 8px rgba(245,158,11,0.15)",
            }}>
              <Crown size={18} style={{ color: "#f59e0b" }} />
            </div>
            <div>
              <div style={{ fontSize: 17, fontWeight: 800, color: "var(--text)", lineHeight: 1.1 }}>CEO Cockpit</div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
                <span style={{ fontSize: 10, color: "var(--text-3)" }}>Premium AI Agency</span>
                <LocalBadge />
                {runtimeMode === "nvidia" ? <NvidiaLiveBadge /> : <SimBadge />}
              </div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            {createdMission?.href && (
              <a
                href={createdMission.href}
                style={{
                  padding: "6px 10px", borderRadius: 8,
                  background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.35)",
                  color: "#34d399", fontSize: 11, fontWeight: 800,
                  display: "flex", alignItems: "center", gap: 5, textDecoration: "none",
                }}
              >
                <CheckCircle2 size={12} /> Mission créée
              </a>
            )}
            {metrics.map((m) => (
              <div key={m.label} style={{
                padding: "5px 10px",
                background: `${m.color}08`, border: `1px solid ${m.color}20`, borderRadius: 8,
                display: "flex", alignItems: "center", gap: 6,
              }}>
                <span style={{ color: m.color }}>{m.icon}</span>
                <div>
                  <div style={{ fontSize: 8, color: "var(--text-3)", textTransform: "uppercase", fontWeight: 600 }}>{m.label}</div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: m.color }}>{m.value}</div>
                </div>
              </div>
            ))}
            <GhostButton onClick={loadData}><RefreshCw size={11} /></GhostButton>
          </div>
        </div>

        {/* Navigation Cards */}
        <div style={{ display: "flex", gap: 8, overflowX: "auto" }}>
          {[
            { href: "/team", icon: <Users size={12} />, label: "Team", color: "#8b5cf6", desc: "Agent profiles" },
            { href: "/outputs", icon: <Eye size={12} />, label: "Outputs", color: "#a78bfa", desc: `${recentOutputs.length} recent` },
            { href: "/command", icon: <Crown size={12} />, label: "Command", color: "#f59e0b", desc: "Overview" },
            { href: "/conversations", icon: <MessageSquare size={12} />, label: "Conversations", color: "#3b82f6", desc: "All threads" },
            { href: "/operations/live", icon: <Zap size={12} />, label: "Live Ops", color: "#34d399", desc: "Realtime" },
          ].map((nav) => (
            <a key={nav.href} href={nav.href} style={{ textDecoration: "none", flex: "0 0 auto" }}>
              <div style={{
                padding: "7px 12px", borderRadius: 8,
                background: `${nav.color}06`, border: `1px solid ${nav.color}18`,
                display: "flex", alignItems: "center", gap: 6,
                transition: "border-color 0.15s, background 0.15s",
              }}>
                <div style={{
                  width: 22, height: 22, borderRadius: 5,
                  background: `${nav.color}14`, border: `1px solid ${nav.color}25`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <span style={{ color: nav.color }}>{nav.icon}</span>
                </div>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text)" }}>{nav.label}</div>
                  <div style={{ fontSize: 8, color: "var(--text-3)" }}>{nav.desc}</div>
                </div>
                <ChevronRight size={10} style={{ color: nav.color, opacity: 0.5 }} />
              </div>
            </a>
          ))}
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
                {isCeoThread ? "CEO Direct Line" : `Conversation avec ${currentParticipant.shortTitle}`}
              </span>
              <div style={{ flex: 1 }} />
              <span style={{ fontSize: 9, color: currentParticipant.color, fontWeight: 800 }}>
                {currentParticipant.title}
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 7 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {currentThreadTitle}
                </div>
                <div style={{ fontSize: 9, color: "var(--text-3)" }}>
                  Participant actuel: {currentParticipant.shortTitle}
                </div>
              </div>
              <button onClick={handleNewChat} style={chatHeaderButton("#22c55e")}>New Chat</button>
              <button onClick={handleArchiveChat} disabled={!activeThread} style={chatHeaderButton("#f59e0b", !activeThread)}>Archive Chat</button>
              <a href="/conversations" style={{ ...chatHeaderButton("#3b82f6"), textDecoration: "none" }}>Open Conversations</a>
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
              {conversationMessages.length === 0 && uploadedFiles.length === 0 && !ceoTyping && (
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
                    {currentParticipant.name} — {currentParticipant.title}
                  </div>
                  <div style={{ fontSize: 10, lineHeight: 1.5, marginBottom: 10 }}>
                    {isCeoThread ? "Ready to lead. Tell me your vision or drop a file to analyze." : `Chat direct avec ${currentParticipant.shortTitle}. Les messages sont persistants.`}
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
              {conversationMessages.map((msg) => (
                <CeoMessageBubble key={msg.id} msg={msg} participant={currentParticipant} />
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
                placeholder={pendingFile ? `Send "${pendingFile.name}" to ${currentParticipant.shortTitle}...` : `Message ${currentParticipant.shortTitle}...`}
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

            {/* Conversation link */}
            <div style={{ marginTop: 8, padding: "6px 8px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "center" }}>
              <a href="/conversations" style={{ fontSize: 10, color: "#3b82f6", textDecoration: "none", fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
                <MessageSquare size={10} /> View All Conversations
              </a>
            </div>
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

        {/* ── RIGHT: Executive Team + Supervision + Outputs ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8, minHeight: 0, overflowY: "auto" }}>

          {/* Org hierarchy — Premium */}
          <div style={{
            background: "linear-gradient(180deg, rgba(245,158,11,0.04), transparent)",
            border: "1px solid rgba(245,158,11,0.12)",
            borderRadius: 10, padding: 12,
          }}>
            <SectionHeader title="Executive Team" icon={<Crown size={11} style={{ color: "#f59e0b" }} />} />

            {/* CEO node */}
            <div style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "8px 10px", marginBottom: 8,
              background: "linear-gradient(135deg, rgba(245,158,11,0.1), rgba(245,158,11,0.04))",
              border: "1px solid rgba(245,158,11,0.25)",
              borderRadius: 10, cursor: "pointer",
            }} role="button" tabIndex={0} onClick={() => { void openDirectThread("ceo"); }} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") void openDirectThread("ceo"); }}>
              <ExecAvatar id="ceo" size={30} pulse={ceoTyping} />
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <span style={{ fontSize: 11, fontWeight: 800, color: "#f59e0b", lineHeight: 1 }}>Alexandra Chen</span>
                  <ExpertiseBadge label="CEO" color="#f59e0b" size="xs" />
                </div>
                <div style={{ fontSize: 8, color: "var(--text-3)" }}>Strategy & Oversight</div>
              </div>
              <motion.div
                style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e" }}
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            </div>

            {/* Directors */}
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {EXEC_DEFS.filter((e) => e.id !== "ceo").map((exec) => (
                <OrgCard
                  key={exec.id}
                  exec={exec}
                  isActive={activeExecs.has(exec.id)}
                  isTyping={typingExecs.has(exec.id)}
                  onOpen={(id) => { void openDirectThread(id); }}
                />
              ))}
            </div>
          </div>

          {/* Supervision — Approvals */}
          <div style={{
            background: "linear-gradient(180deg, rgba(245,158,11,0.04), transparent)",
            border: "1px solid rgba(245,158,11,0.12)",
            borderRadius: 10, padding: 12,
          }}>
            <SectionHeader title="Approvals" icon={<CheckCircle2 size={11} style={{ color: "#f59e0b" }} />} />
            <SupervisionPanel approvals={pendingApprovals} onPreview={handleApprovalPreview} onApprove={handleApprovalApprove} onReject={handleApprovalReject} />
          </div>

          {/* Recent Outputs */}
          {recentOutputs.length > 0 && (
            <div style={{
              background: "linear-gradient(180deg, rgba(139,92,246,0.04), transparent)",
              border: "1px solid rgba(139,92,246,0.12)",
              borderRadius: 10, padding: 12,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                <Eye size={11} style={{ color: "#a78bfa" }} />
                <span style={{ fontSize: 10, fontWeight: 700, color: "var(--text-2)" }}>Latest Outputs</span>
                <a href="/outputs" style={{ fontSize: 9, color: "#a78bfa", fontWeight: 600, marginLeft: "auto", textDecoration: "none" }}>View all →</a>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {recentOutputs.map((out) => {
                  const typeColor: Record<string, string> = { creative_brief: "#a78bfa", logo_direction: "#8b5cf6", color_palette: "#f472b6", architecture_doc: "#38bdf8", invoice_preview: "#22c55e", hero_section: "#818cf8" };
                  const color = typeColor[out.type] ?? "#64748b";
                  return (
                    <a key={out.id} href={`/outputs/${out.id}`} style={{ textDecoration: "none" }}>
                      <div style={{
                        padding: "8px 10px", borderRadius: 7,
                        border: `1px solid ${color}18`, borderLeft: `3px solid ${color}`,
                        background: `${color}04`,
                      }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
                          <span style={{ fontSize: 10, fontWeight: 700, color: "var(--text)" }}>{out.title}</span>
                          <span style={{ fontSize: 7, padding: "1px 4px", borderRadius: 3, background: `${color}12`, color, fontWeight: 600 }}>{out.type.replace(/_/g, " ")}</span>
                        </div>
                        <p style={{ fontSize: 9, color: "var(--text-3)", margin: 0, lineHeight: 1.3, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                          {out.preview || out.status}
                        </p>
                      </div>
                    </a>
                  );
                })}
              </div>
            </div>
          )}

          {/* Active Revisions */}
          {activeRevisions.length > 0 && (
            <div style={{
              background: "linear-gradient(180deg, rgba(245,158,11,0.04), transparent)",
              border: "1px solid rgba(245,158,11,0.12)",
              borderRadius: 10, padding: 12,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                <RefreshCw size={11} style={{ color: "#f59e0b" }} />
                <span style={{ fontSize: 10, fontWeight: 700, color: "var(--text-2)" }}>Active Revisions</span>
                <span style={{ fontSize: 9, color: "#f59e0b", fontWeight: 700 }}>{activeRevisions.length}</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {activeRevisions.map((rev) => (
                  <div key={rev.id} style={{
                    padding: "7px 10px", borderRadius: 7,
                    border: "1px solid rgba(245,158,11,0.15)", borderLeft: "3px solid #f59e0b",
                    background: "rgba(245,158,11,0.03)",
                  }}>
                    <div style={{ fontSize: 10, fontWeight: 600, color: "var(--text)", marginBottom: 2 }}>{rev.comment}</div>
                    {rev.direction && <div style={{ fontSize: 8, color: "#f59e0b", marginBottom: 2 }}>→ {rev.direction}</div>}
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ fontSize: 8, color: "var(--text-3)" }}>{rev.agentId.replace(/_/g, " ")}</span>
                      <span style={{ fontSize: 8, color: "var(--text-3)" }}>{new Date(rev.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Agent Questions */}
          <AgentQuestionsSection />

        </div>
      </div>

      {/* Approval Preview Modal */}
      <ApprovalPreviewModal
        preview={approvalPreview}
        open={showPreviewModal}
        onClose={() => { setShowPreviewModal(false); setApprovalPreview(null); }}
        onApprove={handleApprovalApprove}
        onReject={handleApprovalReject}
      />
    </div>
  );
}

function chatHeaderButton(color: string, disabled = false): CSSProperties {
  return {
    padding: "4px 7px",
    borderRadius: 6,
    border: `1px solid ${color}35`,
    background: disabled ? "transparent" : `${color}12`,
    color: disabled ? "#64748b" : color,
    fontSize: 9,
    fontWeight: 800,
    cursor: disabled ? "not-allowed" : "pointer",
    whiteSpace: "nowrap",
  };
}
