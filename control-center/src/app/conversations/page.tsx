"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState, useCallback } from "react";
import {
  Archive,
  ChevronRight,
  Edit3,
  FolderPlus,
  Hash,
  MessageSquare,
  Pin,
  PlusCircle,
  RefreshCw,
  Search,
  Send,
  Star,
  Trash2,
  X,
} from "lucide-react";
import {
  Panel,
  SectionHeader,
  GhostButton,
  PrimaryButton,
  LocalBadge,
  SimBadge,
  NvidiaLiveBadge,
  ErrorBanner,
} from "@/components/ui";
import { EXECUTIVES, type ExecutiveId } from "@/lib/executiveTeam";

// ─── Types ────────────────────────────────────────────────────────────────

type ParticipantRole = ExecutiveId | "custom_agent";

interface ConvParticipant { id: ParticipantRole; name: string; avatar: string; color: string; }
interface ConvMessage { id: string; role: "user" | ParticipantRole; text: string; timestamp: string; metadata?: Record<string, string>; }
interface ConvThread { id: string; title: string; folderId: string | null; participants: ConvParticipant[]; messages: ConvMessage[]; linkedMissionId: string | null; pinned: boolean; archived: boolean; unread: number; typing: ParticipantRole[]; favorite: boolean; createdAt: string; updatedAt: string; }
interface ConvFolder { id: string; name: string; color: string; order: number; }

interface AgentQOption { id: string; label: string; }
interface AgentQ { id: string; agentId: string; agentName: string; agentAvatar: string; agentColor: string; question: string; options: AgentQOption[]; missionId: string | null; threadId: string | null; status: string; answer: { optionId: string | null; freeText: string | null; answeredAt: string } | null; context: string; createdAt: string; }

const AGENT_LIST: { id: ParticipantRole; label: string; avatar: string; color: string }[] = [
  { id: "ceo", label: "Alexandra", avatar: "👑", color: "#f59e0b" },
  { id: "cfo", label: "Diana", avatar: "💰", color: "#22c55e" },
  { id: "coo", label: "Marcus", avatar: "⚙️", color: "#3b82f6" },
  { id: "cmo", label: "Sophie", avatar: "📣", color: "#8b5cf6" },
  { id: "cto", label: "Raj", avatar: "🔧", color: "#06b6d4" },
  { id: "logistics", label: "Emma", avatar: "📦", color: "#f97316" },
  { id: "support", label: "Carlos", avatar: "🎧", color: "#ec4899" },
  { id: "sales", label: "Rachel", avatar: "🎯", color: "#ef4444" },
  { id: "hr", label: "James", avatar: "👥", color: "#a78bfa" },
];

function formatTime(ts: string) {
  const d = new Date(ts);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  if (isToday) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString([], { month: "short", day: "numeric" }) + " " + d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

// ─── Page ─────────────────────────────────────────────────────────────────

export default function ConversationsPage() {
  const [folders, setFolders] = useState<ConvFolder[]>([]);
  const [threads, setThreads] = useState<ConvThread[]>([]);
  const [activeThread, setActiveThread] = useState<ConvThread | null>(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [showNewThread, setShowNewThread] = useState(false);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newThreadTitle, setNewThreadTitle] = useState("");
  const [newThreadParticipant, setNewThreadParticipant] = useState<ParticipantRole>("ceo");
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderColor, setNewFolderColor] = useState("#3b82f6");
  const [error, setError] = useState<string | null>(null);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [agentQuestions, setAgentQuestions] = useState<AgentQ[]>([]);
  const [autreText, setAutreText] = useState<Record<string, string>>({});
  const [showAutre, setShowAutre] = useState<Record<string, boolean>>({});
  const [runtimeMode, setRuntimeMode] = useState<"nvidia" | "simulation">("simulation");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<ConvThread[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [renameThreadId, setRenameThreadId] = useState<string | null>(null);
  const [renameTitle, setRenameTitle] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const loadData = useCallback(async () => {
    try {
      const [fRes, tRes, qRes] = await Promise.all([
        fetch("/api/conversations/folders"),
        fetch(`/api/conversations/threads${selectedFolder ? `?folderId=${selectedFolder}&` : "?"}includeArchived=${showArchived}`),
        fetch("/api/agent-questions"),
      ]);
      if (fRes.ok) { const d = await fRes.json(); setFolders(d.folders ?? []); }
      if (tRes.ok) { const d = await tRes.json(); setThreads(d.threads ?? []); }
      if (qRes.ok) { const d = await qRes.json(); setAgentQuestions(d.questions ?? []); }
      setError(null);
    } catch { setError("Failed to load conversations"); }
  }, [selectedFolder, showArchived]);

  useEffect(() => { loadData(); fetch("/api/runtime-mode").then((r) => r.json()).then((d) => { if (d.ok) setRuntimeMode(d.mode === "nvidia" ? "nvidia" : "simulation"); }).catch(() => {}); }, [loadData]);

  // Auto-poll for new messages every 8s
  useEffect(() => {
    const t = setInterval(() => { loadData(); }, 8000);
    return () => clearInterval(t);
  }, [loadData]);

  // Smooth scroll on new messages
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [activeThread?.messages?.length]);

  // Mark thread as read when selected
  useEffect(() => {
    if (activeThread?.id && (activeThread.unread ?? 0) > 0) {
      fetch(`/api/conversations/threads/${activeThread.id}/mark-read`, { method: "POST" }).catch(() => {});
      setActiveThread((prev) => prev ? { ...prev, unread: 0 } : prev);
    }
  }, [activeThread?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Search
  useEffect(() => {
    if (!searchQuery.trim()) { setSearchResults([]); setIsSearching(false); return; }
    setIsSearching(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/conversations/search?q=${encodeURIComponent(searchQuery)}`);
        if (res.ok) { const d = await res.json(); setSearchResults(d.threads ?? []); }
      } catch { /* */ }
      setIsSearching(false);
    }, 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const handleSend = async () => {
    if (!input.trim() || !activeThread) return;
    setInput("");
    setSending(true);
    try {
      const res = await fetch(`/api/conversations/threads/${activeThread.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: input }),
      });
      if (res.ok) {
        const d = await res.json();
        setActiveThread(d.thread);
        const tRes = await fetch("/api/conversations/threads");
        if (tRes.ok) { const td = await tRes.json(); setThreads(td.threads ?? []); }
      }
    } catch { /* */ }
    setSending(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleSelectThread = async (threadId: string) => {
    try {
      const res = await fetch(`/api/conversations/threads/${threadId}`);
      if (res.ok) { const d = await res.json(); setActiveThread(d.thread); }
    } catch { /* */ }
  };

  const handleCreateThread = async () => {
    if (!newThreadTitle.trim()) return;
    try {
      const res = await fetch("/api/conversations/threads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newThreadTitle, participants: [newThreadParticipant], folderId: selectedFolder }),
      });
      if (res.ok) {
        const d = await res.json();
        setActiveThread(d.thread);
        setShowNewThread(false);
        setNewThreadTitle("");
        loadData();
      }
    } catch { /* */ }
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    try {
      const res = await fetch("/api/conversations/folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newFolderName, color: newFolderColor }),
      });
      if (res.ok) { setShowNewFolder(false); setNewFolderName(""); loadData(); }
    } catch { /* */ }
  };

  const handleArchive = async (threadId: string, archive = true) => {
    try {
      const res = await fetch(`/api/conversations/threads/${threadId}/archive`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ archived: archive }),
      });
      if (res.ok) { if (activeThread?.id === threadId && archive) setActiveThread(null); loadData(); }
    } catch { /* */ }
  };

  const handleDelete = async (threadId: string) => {
    if (!confirm("Delete this conversation? It will be soft deleted and visible in Archive.")) return;
    await fetch(`/api/conversations/threads/${threadId}`, { method: "DELETE" });
    if (activeThread?.id === threadId) setActiveThread(null);
    loadData();
  };

  const handleRename = async () => {
    if (!renameThreadId || !renameTitle.trim()) return;
    await fetch(`/api/conversations/threads/${renameThreadId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: renameTitle }),
    });
    setRenameThreadId(null);
    setRenameTitle("");
    loadData();
  };

  const handleMove = async (threadId: string, folderId: string | null) => {
    await fetch(`/api/conversations/threads/${threadId}/move`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ folderId }),
    });
    loadData();
  };

  const handlePin = async (threadId: string, pin = true) => {
    try {
      await fetch(`/api/conversations/threads/${threadId}/pin`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pinned: pin }),
      });
      loadData();
    } catch { /* */ }
  };

  const handleFavorite = async (threadId: string) => {
    try {
      await fetch(`/api/conversations/threads/${threadId}/favorite`, { method: "POST" });
      loadData();
    } catch { /* */ }
  };

  const handleAnswerQuestion = async (questionId: string, optionId: string) => {
    try {
      const freeText = optionId === "autre" ? (autreText[questionId] ?? "") : undefined;
      const res = await fetch(`/api/agent-questions/${questionId}/answer`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ optionId, freeText }),
      });
      if (res.ok) loadData();
    } catch { /* */ }
  };

  const threadQuestions = activeThread
    ? agentQuestions.filter((q) => q.status === "pending" && (!q.threadId || q.threadId === activeThread.id))
    : agentQuestions.filter((q) => q.status === "pending");

  const displayThreads = searchQuery.trim() ? searchResults : threads;
  const favorites = displayThreads.filter((t) => t.favorite);
  const pinned = displayThreads.filter((t) => t.pinned && !t.favorite);
  const recent = displayThreads.filter((t) => !t.pinned && !t.favorite);
  const totalUnread = threads.reduce((s, t) => s + (t.unread ?? 0), 0);

  const inputStyle = { padding: "6px 10px", fontSize: 12, background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: 6, color: "var(--text)", outline: "none", width: "100%" };

  // ─── Thread List Item ──────────────────────────────────────────────
  const ThreadItem = ({ t }: { t: ConvThread }) => {
    const lastMsg = t.messages[t.messages.length - 1];
    const isActive = activeThread?.id === t.id;
    const unread = t.unread ?? 0;
    const primaryP = t.participants[0];
    return (
      <button onClick={() => handleSelectThread(t.id)} style={{
        padding: "8px 10px", borderRadius: 8, width: "100%", border: "none",
        background: isActive ? "rgba(59,130,246,0.12)" : "transparent",
        cursor: "pointer", display: "flex", gap: 8, alignItems: "flex-start",
        transition: "background 0.15s", position: "relative",
      }}
      onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = "var(--bg-2)"; }}
      onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
      >
        {/* Avatar */}
        <div style={{
          width: 32, height: 32, borderRadius: "50%",
          background: primaryP ? `${primaryP.color}22` : "var(--bg-2)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 14, flexShrink: 0,
        }}>
          {primaryP?.avatar ?? "💬"}
        </div>
        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 11, fontWeight: unread > 0 ? 700 : 500, color: "var(--text)" }}>{t.title}</span>
            {lastMsg && <span style={{ fontSize: 8, color: "var(--text-3)" }}>{formatTime(lastMsg.timestamp)}</span>}
          </div>
          {lastMsg && (
            <div style={{ fontSize: 10, color: "var(--text-3)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginTop: 1 }}>
              {lastMsg.role === "user" ? "You: " : ""}{lastMsg.text}
            </div>
          )}
          {/* Typing indicator */}
          {(t.typing?.length ?? 0) > 0 && (
            <div style={{ fontSize: 9, color: "#3b82f6", fontStyle: "italic", marginTop: 2 }}>
              {t.typing!.map((tid) => {
                const tp = t.participants.find((p) => p.id === tid);
                return tp ? `${tp.name} is typing…` : "";
              }).filter(Boolean).join(", ")}
            </div>
          )}
        </div>
        {/* Unread badge */}
        {unread > 0 && (
          <div style={{
            width: 16, height: 16, borderRadius: "50%",
            background: "#3b82f6", color: "#fff", fontSize: 8, fontWeight: 700,
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
          }}>{unread}</div>
        )}
      </button>
    );
  };

  return (
    <div style={{ padding: "20px 24px", maxWidth: 1600, margin: "0 auto", height: "calc(100vh - 60px)", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <MessageSquare size={20} style={{ color: "#3b82f6" }} />
          <h1 style={{ fontSize: 18, fontWeight: 700, color: "var(--text)" }}>Messages</h1>
          {totalUnread > 0 && (
            <div style={{ background: "#3b82f6", color: "#fff", fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 10 }}>{totalUnread}</div>
          )}
          <LocalBadge />
          {runtimeMode === "nvidia" ? <NvidiaLiveBadge /> : <SimBadge />}
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <GhostButton onClick={() => setShowArchived((value) => !value)}><Archive size={11} /> {showArchived ? "Active" : "Archived"}</GhostButton>
          <GhostButton onClick={() => setShowNewFolder(true)}><FolderPlus size={11} /> Folder</GhostButton>
          <GhostButton onClick={() => setShowNewThread(true)}><PlusCircle size={11} /> New Chat</GhostButton>
          <GhostButton onClick={loadData}><RefreshCw size={11} /></GhostButton>
        </div>
      </div>

      {error && <ErrorBanner message={error} onRetry={loadData} />}

      {/* 3-Column Layout: iMessage/Slack style */}
      <div style={{ display: "grid", gridTemplateColumns: "260px 1fr 260px", gap: 0, flex: 1, minHeight: 0, borderRadius: 12, overflow: "hidden", border: "1px solid var(--border)" }}>

        {/* ── LEFT: Sidebar — Search + Folders + Thread List ── */}
        <div style={{ display: "flex", flexDirection: "column", background: "var(--surface)", borderRight: "1px solid var(--border)", minHeight: 0 }}>
          {/* Search */}
          <div style={{ padding: "10px 12px", borderBottom: "1px solid var(--border)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, background: "var(--bg-2)", borderRadius: 8, padding: "6px 10px" }}>
              <Search size={12} style={{ color: "var(--text-3)", flexShrink: 0 }} />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search conversations…"
                style={{ border: "none", background: "transparent", fontSize: 11, color: "var(--text)", outline: "none", flex: 1 }}
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-3)", padding: 0 }}>
                  <X size={10} />
                </button>
              )}
            </div>
          </div>

          {/* Folders */}
          <div style={{ padding: "6px 12px", borderBottom: "1px solid var(--border)" }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 4 }}>Folders</div>
            <button onClick={() => setSelectedFolder(null)} style={{
              padding: "3px 6px", fontSize: 10, fontWeight: selectedFolder === null ? 600 : 400,
              background: selectedFolder === null ? "var(--bg-2)" : "transparent",
              border: "none", borderRadius: 4, color: "var(--text)", cursor: "pointer", display: "block", width: "100%", textAlign: "left",
            }}>All</button>
            {folders.map((f) => (
              <button key={f.id} onClick={() => setSelectedFolder(f.id)} style={{
                padding: "3px 6px", fontSize: 10, fontWeight: selectedFolder === f.id ? 600 : 400,
                background: selectedFolder === f.id ? "var(--bg-2)" : "transparent",
                border: "none", borderRadius: 4, color: "var(--text)", cursor: "pointer", display: "block", width: "100%", textAlign: "left",
                borderLeft: `2px solid ${f.color}`,
              }}>
                <span style={{ color: f.color, marginRight: 4 }}>●</span>{f.name}
              </button>
            ))}
          </div>

          {/* Thread list */}
          <div style={{ flex: 1, overflowY: "auto", padding: "6px 6px" }}>
            {favorites.length > 0 && (
              <>
                <div style={{ fontSize: 9, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.5px", padding: "4px 6px" }}>
                  <Star size={8} style={{ color: "#f59e0b", marginRight: 3 }} />Favorites
                </div>
                {favorites.map((t) => <ThreadItem key={t.id} t={t} />)}
              </>
            )}
            {pinned.length > 0 && (
              <>
                <div style={{ fontSize: 9, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.5px", padding: "4px 6px", marginTop: 4 }}>
                  <Pin size={8} style={{ color: "#f59e0b", marginRight: 3 }} />Pinned
                </div>
                {pinned.map((t) => <ThreadItem key={t.id} t={t} />)}
              </>
            )}
            <div style={{ fontSize: 9, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.5px", padding: "4px 6px", marginTop: 4 }}>
              Recent
            </div>
            {recent.map((t) => <ThreadItem key={t.id} t={t} />)}
            {displayThreads.length === 0 && (
              <div style={{ textAlign: "center", padding: 20, color: "var(--text-3)", fontSize: 11 }}>
                {searchQuery ? "No results found" : "No conversations yet"}
              </div>
            )}
          </div>
        </div>

        {/* ── CENTER: Chat — iMessage style ── */}
        <div style={{ display: "flex", flexDirection: "column", background: "var(--bg)", minHeight: 0 }}>
          {activeThread ? (
            <>
              {/* Thread header */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: "50%",
                    background: `${activeThread.participants[0]?.color ?? "#94a3b8"}22`,
                    display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13,
                  }}>
                    {activeThread.participants[0]?.avatar ?? "💬"}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>{activeThread.title}</div>
                    <div style={{ fontSize: 9, color: "var(--text-3)" }}>
                      {activeThread.participants.map((p) => p.name).join(", ")}
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                  <GhostButton onClick={() => handleFavorite(activeThread.id)}>
                    <Star size={10} style={{ color: activeThread.favorite ? "#f59e0b" : "var(--text-3)" }} />
                  </GhostButton>
                  <GhostButton onClick={() => handlePin(activeThread.id, !activeThread.pinned)}>
                    <Pin size={10} style={{ color: activeThread.pinned ? "#f59e0b" : "var(--text-3)" }} />
                  </GhostButton>
                  <GhostButton onClick={() => handleArchive(activeThread.id)}>
                    <Archive size={10} />
                  </GhostButton>
                  <GhostButton onClick={() => { setRenameThreadId(activeThread.id); setRenameTitle(activeThread.title); }}>
                    <Edit3 size={10} />
                  </GhostButton>
                  <GhostButton onClick={() => handleDelete(activeThread.id)}>
                    <Trash2 size={10} />
                  </GhostButton>
                </div>
              </div>

              {/* Messages — iMessage bubble style */}
              <div ref={chatContainerRef} style={{ flex: 1, overflowY: "auto", padding: "12px 16px" }}>
                {activeThread.messages.length === 0 && (
                  <div style={{ textAlign: "center", padding: 40, color: "var(--text-3)", fontSize: 12 }}>
                    Start the conversation below.
                  </div>
                )}
                <AnimatePresence mode="popLayout">
                  {activeThread.messages.map((msg, idx) => {
                    const isUser = msg.role === "user";
                    const participant = !isUser ? activeThread.participants.find((p) => p.id === msg.role) : null;
                    // Group with previous
                    const prevMsg = idx > 0 ? activeThread.messages[idx - 1] : null;
                    const sameSender = prevMsg?.role === msg.role;
                    const showAvatar = !isUser && !sameSender;

                    return (
                      <motion.div
                        key={msg.id}
                        initial={{ opacity: 0, y: 8, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ duration: 0.2 }}
                        style={{
                          display: "flex",
                          flexDirection: isUser ? "row-reverse" : "row",
                          gap: 6,
                          marginBottom: sameSender ? 2 : 8,
                          alignItems: "flex-end",
                        }}
                      >
                        {/* Avatar (only on first message in group) */}
                        {showAvatar && (
                          <div style={{
                            width: 24, height: 24, borderRadius: "50%",
                            background: `${participant?.color ?? "#94a3b8"}22`,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: 11, flexShrink: 0,
                          }}>
                            {participant?.avatar ?? "🤖"}
                          </div>
                        )}
                        {!showAvatar && !isUser && <div style={{ width: 24, flexShrink: 0 }} />}

                        {/* Bubble */}
                        <div style={{ maxWidth: "75%" }}>
                          {showAvatar && (
                            <div style={{ fontSize: 9, fontWeight: 600, color: participant?.color ?? "var(--text-3)", marginBottom: 2, paddingLeft: 4 }}>
                              {participant?.name ?? msg.role}
                            </div>
                          )}
                          <div style={{
                            padding: sameSender ? "6px 12px" : "8px 12px",
                            borderRadius: isUser
                              ? (sameSender ? "12px 4px 4px 12px" : "14px 4px 12px 14px")
                              : (sameSender ? "4px 12px 12px 4px" : "4px 14px 14px 4px"),
                            fontSize: 12, lineHeight: 1.5,
                            background: isUser ? "#3b82f6" : `${participant?.color ?? "#94a3b8"}15`,
                            color: isUser ? "#fff" : "var(--text)",
                            whiteSpace: "pre-wrap",
                          }}>
                            {msg.text}
                          </div>
                          {/* Timestamp */}
                          {!sameSender && (
                            <div style={{ fontSize: 8, color: "var(--text-3)", marginTop: 2, textAlign: isUser ? "right" : "left", padding: "0 4px" }}>
                              {formatTime(msg.timestamp)}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>

                {/* Agent Question Cards */}
                {threadQuestions.length > 0 && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
                    {threadQuestions.map((q) => (
                      <div key={q.id} style={{
                        padding: 14, borderRadius: 12,
                        background: `${q.agentColor}08`,
                        border: `1px solid ${q.agentColor}25`,
                      }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                          <div style={{ width: 24, height: 24, borderRadius: "50%", background: `${q.agentColor}22`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12 }}>{q.agentAvatar}</div>
                          <span style={{ fontSize: 11, fontWeight: 700, color: q.agentColor }}>{q.agentName}</span>
                          <span style={{ fontSize: 8, color: "var(--text-3)" }}>{formatTime(q.createdAt)}</span>
                        </div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", marginBottom: 10 }}>{q.question}</div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                          {q.options.map((opt) => (
                            <button key={opt.id} onClick={() => opt.id === "autre" ? setShowAutre((p) => ({ ...p, [q.id]: true })) : handleAnswerQuestion(q.id, opt.id)} style={{
                              padding: "6px 14px", fontSize: 11, fontWeight: 600,
                              background: "var(--bg-2)", border: `1px solid ${q.agentColor}35`,
                              borderRadius: 8, color: "var(--text)", cursor: "pointer",
                              transition: "all 0.15s",
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = `${q.agentColor}18`; e.currentTarget.style.borderColor = q.agentColor; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = "var(--bg-2)"; e.currentTarget.style.borderColor = `${q.agentColor}35`; }}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                        {showAutre[q.id] && (
                          <div style={{ display: "flex", gap: 4, marginTop: 8 }}>
                            <input value={autreText[q.id] ?? ""} onChange={(e) => setAutreText((p) => ({ ...p, [q.id]: e.target.value }))} placeholder="Votre réponse…"
                              style={{ flex: 1, padding: "6px 10px", fontSize: 11, background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text)", outline: "none" }}
                              onKeyDown={(e) => { if (e.key === "Enter" && autreText[q.id]?.trim()) handleAnswerQuestion(q.id, "autre"); }}
                            />
                            <button onClick={() => handleAnswerQuestion(q.id, "autre")} disabled={!(autreText[q.id]?.trim())}
                              style={{ padding: "6px 12px", fontSize: 11, fontWeight: 600, background: q.agentColor, color: "#fff", border: "none", borderRadius: 8, cursor: autreText[q.id]?.trim() ? "pointer" : "not-allowed", opacity: autreText[q.id]?.trim() ? 1 : 0.5 }}>
                              Send
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <div ref={chatEndRef} />
              </div>

              {/* Input — iMessage style */}
              <div style={{ padding: "10px 16px", borderTop: "1px solid var(--border)", flexShrink: 0 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={`Message ${activeThread.participants[0]?.name ?? "agent"}…`}
                    style={{
                      flex: 1, padding: "10px 14px", fontSize: 13,
                      background: "var(--bg-2)", border: "1px solid var(--border)",
                      borderRadius: 20, color: "var(--text)", outline: "none",
                    }}
                  />
                  <button
                    onClick={handleSend}
                    disabled={sending || !input.trim()}
                    style={{
                      width: 34, height: 34, borderRadius: "50%",
                      background: input.trim() ? "#3b82f6" : "var(--bg-2)",
                      border: "none", cursor: input.trim() ? "pointer" : "not-allowed",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      transition: "background 0.15s",
                    }}
                  >
                    <Send size={14} style={{ color: input.trim() ? "#fff" : "var(--text-3)" }} />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--text-3)", fontSize: 13 }}>
              <MessageSquare size={40} style={{ opacity: 0.2, marginBottom: 10 }} />
              <div>Select a conversation or start a new one</div>
            </div>
          )}
        </div>

        {/* ── RIGHT: Agent Profile + Context ── */}
        <div style={{ display: "flex", flexDirection: "column", background: "var(--surface)", borderLeft: "1px solid var(--border)", minHeight: 0, overflowY: "auto" }}>
          {activeThread ? (
            <>
              {/* Agent profile card */}
              {activeThread.participants.map((p) => {
                const exec = p.id !== "custom_agent" ? EXECUTIVES[p.id as ExecutiveId] : null;
                return (
                  <div key={p.id} style={{ padding: 14, borderBottom: "1px solid var(--border)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: "50%",
                        background: `${p.color}22`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 18,
                      }}>{p.avatar}</div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>{p.name}</div>
                        {exec && <div style={{ fontSize: 9, color: "var(--text-3)" }}>{exec.title}</div>}
                      </div>
                      {/* Online dot */}
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#22c55e", marginLeft: "auto" }} />
                    </div>
                    {exec && (
                      <div style={{ fontSize: 9, color: "var(--text-3)", marginTop: 4 }}>{exec.specialty}</div>
                    )}
                    <a href={`/agents/${p.id}`} style={{ fontSize: 9, color: "#3b82f6", textDecoration: "none", display: "block", marginTop: 6 }}>View Profile →</a>
                  </div>
                );
              })}

              {activeThread.linkedMissionId && (
                <div style={{ padding: 12, borderBottom: "1px solid var(--border)" }}>
                  <div style={{ fontSize: 9, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 4 }}>Linked Mission</div>
                  <a href={`/mission/${activeThread.linkedMissionId}`} style={{ fontSize: 11, color: "#3b82f6", textDecoration: "none" }}>
                    Open Mission Room →
                  </a>
                </div>
              )}

              <div style={{ padding: 12, borderBottom: "1px solid var(--border)" }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6 }}>Conversation Management</div>
                <select value={activeThread.folderId ?? ""} onChange={(e) => handleMove(activeThread.id, e.target.value || null)} style={inputStyle}>
                  <option value="">No folder</option>
                  {folders.map((folder) => <option key={folder.id} value={folder.id}>{folder.name}</option>)}
                </select>
              </div>

              {/* Direct Chat with other agents */}
              <div style={{ padding: 12, borderBottom: "1px solid var(--border)" }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6 }}>Direct Chat</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                  {AGENT_LIST.filter((p) => !activeThread.participants.some((ap) => ap.id === p.id)).map((p) => (
                    <button key={p.id} onClick={async () => {
                      const res = await fetch("/api/conversations/threads", {
                        method: "POST", headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ title: `Chat with ${p.label}`, participants: [p.id] }),
                      });
                      if (res.ok) { const d = await res.json(); setActiveThread(d.thread); loadData(); }
                    }} style={{
                      padding: "4px 8px", fontSize: 9, border: "1px solid var(--border)",
                      borderRadius: 6, background: "var(--bg-2)", color: "var(--text)",
                      cursor: "pointer", display: "flex", alignItems: "center", gap: 3,
                    }}>
                      {p.avatar} {p.label}
                    </button>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div style={{ textAlign: "center", padding: 20, color: "var(--text-3)", fontSize: 11 }}>
              Select a conversation
            </div>
          )}
        </div>
      </div>

      {/* New Thread Modal */}
      {showNewThread && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, backdropFilter: "blur(4px)" }}>
          <div style={{ background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 12, padding: 24, width: 420 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
              <span style={{ fontSize: 16, fontWeight: 700, color: "var(--text)" }}>New Conversation</span>
              <button onClick={() => setShowNewThread(false)} style={{ background: "none", border: "none", color: "var(--text-3)", cursor: "pointer" }}><X size={16} /></button>
            </div>
            <label style={{ fontSize: 10, fontWeight: 600, color: "var(--text-2)", display: "block", marginBottom: 4 }}>Title</label>
            <input style={inputStyle} value={newThreadTitle} onChange={(e) => setNewThreadTitle(e.target.value)} placeholder="e.g. Brand discussion" />
            <label style={{ fontSize: 10, fontWeight: 600, color: "var(--text-2)", display: "block", marginTop: 12, marginBottom: 4 }}>Chat with</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
              {AGENT_LIST.map((p) => (
                <button key={p.id} onClick={() => setNewThreadParticipant(p.id)} style={{
                  padding: "5px 10px", fontSize: 10, fontWeight: newThreadParticipant === p.id ? 700 : 400,
                  background: newThreadParticipant === p.id ? `${p.color}22` : "var(--bg-2)",
                  border: newThreadParticipant === p.id ? `1px solid ${p.color}` : "1px solid var(--border)",
                  borderRadius: 8, color: "var(--text)", cursor: "pointer",
                }}>
                  {p.avatar} {p.label}
                </button>
              ))}
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 20 }}>
              <GhostButton onClick={() => setShowNewThread(false)}>Cancel</GhostButton>
              <PrimaryButton onClick={handleCreateThread} color="#3b82f6"><PlusCircle size={11} /> Create</PrimaryButton>
            </div>
          </div>
        </div>
      )}

      {renameThreadId && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, backdropFilter: "blur(4px)" }}>
          <div style={{ background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 12, padding: 24, width: 360 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
              <span style={{ fontSize: 16, fontWeight: 700, color: "var(--text)" }}>Rename Conversation</span>
              <button onClick={() => setRenameThreadId(null)} style={{ background: "none", border: "none", color: "var(--text-3)", cursor: "pointer" }}><X size={16} /></button>
            </div>
            <input style={inputStyle} value={renameTitle} onChange={(e) => setRenameTitle(e.target.value)} placeholder="Conversation title" />
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 20 }}>
              <GhostButton onClick={() => setRenameThreadId(null)}>Cancel</GhostButton>
              <PrimaryButton onClick={handleRename} color="#3b82f6"><Edit3 size={11} /> Rename</PrimaryButton>
            </div>
          </div>
        </div>
      )}

      {/* New Folder Modal */}
      {showNewFolder && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, backdropFilter: "blur(4px)" }}>
          <div style={{ background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 12, padding: 24, width: 320 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
              <span style={{ fontSize: 16, fontWeight: 700, color: "var(--text)" }}>New Folder</span>
              <button onClick={() => setShowNewFolder(false)} style={{ background: "none", border: "none", color: "var(--text-3)", cursor: "pointer" }}><X size={16} /></button>
            </div>
            <label style={{ fontSize: 10, fontWeight: 600, color: "var(--text-2)", display: "block", marginBottom: 4 }}>Name</label>
            <input style={inputStyle} value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)} placeholder="e.g. Finance" />
            <label style={{ fontSize: 10, fontWeight: 600, color: "var(--text-2)", display: "block", marginTop: 12, marginBottom: 4 }}>Color</label>
            <input type="color" value={newFolderColor} onChange={(e) => setNewFolderColor(e.target.value)} style={{ width: 40, height: 28, border: "none", cursor: "pointer" }} />
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 20 }}>
              <GhostButton onClick={() => setShowNewFolder(false)}>Cancel</GhostButton>
              <PrimaryButton onClick={handleCreateFolder} color="#3b82f6"><FolderPlus size={11} /> Create</PrimaryButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
