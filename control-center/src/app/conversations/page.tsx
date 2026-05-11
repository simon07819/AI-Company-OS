"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import {
  Archive,
  ChevronRight,
  FolderPlus,
  Hash,
  MessageSquare,
  Pin,
  PlusCircle,
  RefreshCw,
  Send,
  X,
} from "lucide-react";
import {
  PageHeader,
  Panel,
  SectionHeader,
  GhostButton,
  PrimaryButton,
  StatusBadge,
  LocalBadge,
  SimBadge,
  ErrorBanner,
} from "@/components/ui";
import { EXECUTIVES, type ExecutiveId } from "@/lib/executiveTeam";

// ─── Types ────────────────────────────────────────────────────────────────

type ParticipantRole = ExecutiveId | "custom_agent";

interface ConvParticipant { id: ParticipantRole; name: string; avatar: string; color: string; }
interface ConvMessage { id: string; role: "user" | ParticipantRole; text: string; timestamp: string; metadata?: Record<string, string>; }
interface ConvThread { id: string; title: string; folderId: string | null; participants: ConvParticipant[]; messages: ConvMessage[]; linkedMissionId: string | null; pinned: boolean; archived: boolean; createdAt: string; updatedAt: string; }
interface ConvFolder { id: string; name: string; color: string; order: number; }

interface AgentQOption { id: string; label: string; }
interface AgentQ { id: string; agentId: string; agentName: string; agentAvatar: string; agentColor: string; question: string; options: AgentQOption[]; missionId: string | null; threadId: string | null; status: string; answer: { optionId: string | null; freeText: string | null; answeredAt: string } | null; context: string; createdAt: string; }

const PARTICIPANT_OPTIONS: { id: ParticipantRole; label: string; avatar: string; color: string }[] = [
  { id: "ceo", label: "CEO", avatar: "👑", color: "#f59e0b" },
  { id: "cfo", label: "CFO", avatar: "💰", color: "#22c55e" },
  { id: "coo", label: "COO", avatar: "⚙️", color: "#3b82f6" },
  { id: "cmo", label: "CMO", avatar: "📣", color: "#8b5cf6" },
  { id: "cto", label: "CTO", avatar: "🔧", color: "#06b6d4" },
  { id: "logistics", label: "Logistics", avatar: "📦", color: "#f97316" },
  { id: "support", label: "Support", avatar: "🎧", color: "#ec4899" },
  { id: "sales", label: "Sales", avatar: "🎯", color: "#ef4444" },
  { id: "hr", label: "HR", avatar: "👥", color: "#a78bfa" },
];

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
  const chatEndRef = useRef<HTMLDivElement>(null);

  const loadData = async () => {
    try {
      const [fRes, tRes, qRes] = await Promise.all([
        fetch("/api/conversations/folders"),
        fetch(`/api/conversations/threads${selectedFolder ? `?folderId=${selectedFolder}` : ""}`),
        fetch("/api/agent-questions"),
      ]);
      if (fRes.ok) { const d = await fRes.json(); setFolders(d.folders ?? []); }
      if (tRes.ok) { const d = await tRes.json(); setThreads(d.threads ?? []); }
      if (qRes.ok) { const d = await qRes.json(); setAgentQuestions(d.questions ?? []); }
      setError(null);
    } catch { setError("Failed to load conversations"); }
  };

  useEffect(() => { loadData(); }, [selectedFolder]);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [activeThread?.messages?.length]);

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
        // Reload thread list to reflect update
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
        body: JSON.stringify({
          title: newThreadTitle,
          participants: [newThreadParticipant],
          folderId: selectedFolder,
        }),
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
      if (res.ok) {
        setShowNewFolder(false);
        setNewFolderName("");
        loadData();
      }
    } catch { /* */ }
  };

  const handleArchive = async (threadId: string, archive = true) => {
    try {
      const res = await fetch(`/api/conversations/threads/${threadId}/archive`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ archived: archive }),
      });
      if (res.ok) {
        if (activeThread?.id === threadId && archive) setActiveThread(null);
        loadData();
      }
    } catch { /* */ }
  };

  const handlePin = async (threadId: string, pin = true) => {
    try {
      await fetch(`/api/conversations/threads/${threadId}/pin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pinned: pin }),
      });
      loadData();
    } catch { /* */ }
  };

  const handleMove = async (threadId: string, folderId: string | null) => {
    try {
      await fetch(`/api/conversations/threads/${threadId}/move`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folderId }),
      });
      loadData();
    } catch { /* */ }
  };

  const handleAnswerQuestion = async (questionId: string, optionId: string) => {
    try {
      const freeText = optionId === "autre" ? (autreText[questionId] ?? "") : undefined;
      const res = await fetch(`/api/agent-questions/${questionId}/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ optionId, freeText }),
      });
      if (res.ok) loadData();
    } catch { /* */ }
  };

  // Get open questions relevant to current thread
  const threadQuestions = activeThread
    ? agentQuestions.filter((q) => q.status === "pending" && (!q.threadId || q.threadId === activeThread.id))
    : agentQuestions.filter((q) => q.status === "pending");

  const pinned = threads.filter((t) => t.pinned);
  const unpinned = threads.filter((t) => !t.pinned);

  const inputStyle = { padding: "6px 10px", fontSize: 12, background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: 6, color: "var(--text)", outline: "none", width: "100%" };

  return (
    <div style={{ padding: "20px 24px", maxWidth: 1600, margin: "0 auto", height: "calc(100vh - 60px)", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <MessageSquare size={20} style={{ color: "#3b82f6" }} />
          <h1 style={{ fontSize: 18, fontWeight: 700, color: "var(--text)" }}>Conversations</h1>
          <LocalBadge />
          <SimBadge />
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <GhostButton onClick={() => setShowNewFolder(true)}><FolderPlus size={11} /> Folder</GhostButton>
          <GhostButton onClick={() => setShowNewThread(true)}><PlusCircle size={11} /> Chat</GhostButton>
          <GhostButton onClick={loadData}><RefreshCw size={11} /> Refresh</GhostButton>
        </div>
      </div>

      {error && <ErrorBanner message={error} onRetry={loadData} />}

      {/* 3-Column Layout */}
      <div style={{ display: "grid", gridTemplateColumns: "240px 1fr 240px", gap: 16, flex: 1, minHeight: 0 }}>

        {/* ── LEFT: Folders + Threads ── */}
        <Panel style={{ display: "flex", flexDirection: "column", minHeight: 0 }}>
          <SectionHeader title="Folders" icon={<Hash size={12} />} />
          <div style={{ marginBottom: 6 }}>
            <button onClick={() => setSelectedFolder(null)} style={{
              padding: "4px 8px", fontSize: 10, fontWeight: selectedFolder === null ? 700 : 400,
              background: selectedFolder === null ? "var(--bg-2)" : "transparent",
              border: "none", borderRadius: 4, color: "var(--text)", cursor: "pointer", width: "100%", textAlign: "left",
            }}>All Conversations</button>
            {folders.map((f) => (
              <button key={f.id} onClick={() => setSelectedFolder(f.id)} style={{
                padding: "4px 8px", fontSize: 10, fontWeight: selectedFolder === f.id ? 700 : 400,
                background: selectedFolder === f.id ? "var(--bg-2)" : "transparent",
                border: "none", borderRadius: 4, color: "var(--text)", cursor: "pointer", width: "100%", textAlign: "left",
                borderLeft: `2px solid ${f.color}`,
              }}>
                <span style={{ color: f.color, marginRight: 6 }}>●</span>{f.name}
              </button>
            ))}
          </div>

          <SectionHeader title="Pinned" icon={<Pin size={12} />} />
          <div style={{ marginBottom: 8 }}>
            {pinned.map((t) => (
              <button key={t.id} onClick={() => handleSelectThread(t.id)} style={{
                padding: "4px 8px", fontSize: 10, fontWeight: activeThread?.id === t.id ? 700 : 400,
                background: activeThread?.id === t.id ? "rgba(59,130,246,0.1)" : "transparent",
                border: "none", borderRadius: 4, color: "var(--text)", cursor: "pointer", width: "100%", textAlign: "left",
                display: "flex", alignItems: "center", gap: 4,
              }}>
                <Pin size={8} style={{ color: "#f59e0b" }} /> {t.title}
              </button>
            ))}
          </div>

          <SectionHeader title="Recent" />
          <div style={{ flex: 1, overflowY: "auto" }}>
            {unpinned.map((t) => (
              <button key={t.id} onClick={() => handleSelectThread(t.id)} style={{
                padding: "4px 8px", fontSize: 10, fontWeight: activeThread?.id === t.id ? 700 : 400,
                background: activeThread?.id === t.id ? "rgba(59,130,246,0.1)" : "transparent",
                border: "none", borderRadius: 4, color: "var(--text)", cursor: "pointer", width: "100%", textAlign: "left",
                display: "flex", alignItems: "center", gap: 4,
              }}>
                <span style={{ fontSize: 10 }}>{t.participants[0]?.avatar ?? "💬"}</span> {t.title}
              </button>
            ))}
          </div>
        </Panel>

        {/* ── CENTER: Chat Thread ── */}
        <Panel style={{ display: "flex", flexDirection: "column", minHeight: 0 }}>
          {activeThread ? (
            <>
              {/* Thread header */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8, flexShrink: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 14 }}>{activeThread.participants[0]?.avatar ?? "💬"}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>{activeThread.title}</span>
                  {activeThread.pinned && <Pin size={10} style={{ color: "#f59e0b" }} />}
                </div>
                <div style={{ display: "flex", gap: 4 }}>
                  <GhostButton onClick={() => handlePin(activeThread.id, !activeThread.pinned)}>
                    <Pin size={10} />
                  </GhostButton>
                  <GhostButton onClick={() => handleArchive(activeThread.id)}>
                    <Archive size={10} />
                  </GhostButton>
                </div>
              </div>

              {/* Messages */}
              <div style={{ flex: 1, overflowY: "auto", padding: "4px 0", marginBottom: 8 }}>
                {activeThread.messages.length === 0 && (
                  <div style={{ textAlign: "center", padding: 40, color: "var(--text-3)", fontSize: 12 }}>
                    Start the conversation by typing a message below.
                  </div>
                )}
                <AnimatePresence mode="popLayout">
                  {activeThread.messages.map((msg) => {
                    const isUser = msg.role === "user";
                    const participant = !isUser ? activeThread.participants.find((p) => p.id === msg.role) : null;
                    return (
                      <motion.div
                        key={msg.id}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        style={{
                          marginBottom: 8, padding: "8px 10px",
                          borderRadius: 8, fontSize: 12, lineHeight: 1.5,
                          background: isUser ? "rgba(59,130,246,0.08)" : `${participant?.color ?? "#94a3b8"}11`,
                          borderLeft: isUser ? "2px solid #3b82f6" : `2px solid ${participant?.color ?? "#94a3b8"}`,
                        }}
                      >
                        <div style={{ fontWeight: 700, fontSize: 10, marginBottom: 2, color: isUser ? "#3b82f6" : (participant?.color ?? "#94a3b8") }}>
                          {isUser ? "You" : `${participant?.avatar ?? "🤖"} ${participant?.name ?? msg.role}`}
                        </div>
                        <div style={{ whiteSpace: "pre-wrap", color: "var(--text)" }}>{msg.text}</div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>

                {/* Agent Question Cards */}
                {threadQuestions.length > 0 && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
                    {threadQuestions.map((q) => (
                      <div key={q.id} style={{
                        padding: 12, borderRadius: 10,
                        background: `${q.agentColor}08`,
                        border: `1px solid ${q.agentColor}30`,
                      }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                          <span style={{ fontSize: 14 }}>{q.agentAvatar}</span>
                          <span style={{ fontSize: 11, fontWeight: 700, color: q.agentColor }}>{q.agentName}</span>
                          <span style={{ fontSize: 9, color: "var(--text-3)", marginLeft: 4 }}>{new Date(q.createdAt).toLocaleTimeString()}</span>
                        </div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", marginBottom: 8 }}>{q.question}</div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                          {q.options.map((opt) => (
                            <button
                              key={opt.id}
                              onClick={() => {
                                if (opt.id === "autre") {
                                  setShowAutre((prev) => ({ ...prev, [q.id]: true }));
                                } else {
                                  handleAnswerQuestion(q.id, opt.id);
                                }
                              }}
                              style={{
                                padding: "6px 12px", fontSize: 11, fontWeight: 600,
                                background: "var(--bg-2)", border: `1px solid ${q.agentColor}40`,
                                borderRadius: 6, color: "var(--text)", cursor: "pointer",
                                transition: "all 0.15s",
                              }}
                              onMouseEnter={(e) => { e.currentTarget.style.background = `${q.agentColor}22`; e.currentTarget.style.borderColor = q.agentColor; }}
                              onMouseLeave={(e) => { e.currentTarget.style.background = "var(--bg-2)"; e.currentTarget.style.borderColor = `${q.agentColor}40`; }}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                        {showAutre[q.id] && (
                          <div style={{ display: "flex", gap: 4, marginTop: 8 }}>
                            <input
                              value={autreText[q.id] ?? ""}
                              onChange={(e) => setAutreText((prev) => ({ ...prev, [q.id]: e.target.value }))}
                              placeholder="Votre réponse…"
                              style={{ flex: 1, padding: "6px 10px", fontSize: 11, background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: 6, color: "var(--text)", outline: "none" }}
                              onKeyDown={(e) => { if (e.key === "Enter" && (autreText[q.id]?.trim())) handleAnswerQuestion(q.id, "autre"); }}
                            />
                            <button
                              onClick={() => handleAnswerQuestion(q.id, "autre")}
                              disabled={!(autreText[q.id]?.trim())}
                              style={{
                                padding: "6px 10px", fontSize: 11, fontWeight: 600,
                                background: q.agentColor, color: "#fff", border: "none", borderRadius: 6,
                                cursor: autreText[q.id]?.trim() ? "pointer" : "not-allowed", opacity: autreText[q.id]?.trim() ? 1 : 0.5,
                              }}
                            >
                              Envoyer
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <div ref={chatEndRef} />
              </div>

              {/* Input */}
              <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={`Message ${activeThread.participants[0]?.name ?? "agent"}...`}
                  style={{
                    flex: 1, padding: "8px 12px", fontSize: 12,
                    background: "var(--bg-2)", border: "1px solid var(--border)",
                    borderRadius: 8, color: "var(--text)", outline: "none",
                  }}
                />
                <PrimaryButton onClick={handleSend} disabled={sending || !input.trim()} color="#3b82f6">
                  <Send size={11} />
                </PrimaryButton>
              </div>
            </>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--text-3)", fontSize: 12 }}>
              <MessageSquare size={32} style={{ opacity: 0.3, marginBottom: 8 }} />
              Select or create a conversation
            </div>
          )}
        </Panel>

        {/* ── RIGHT: Participant Context ── */}
        <Panel style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {activeThread ? (
            <>
              <SectionHeader title="Participants" />
              {activeThread.participants.map((p) => {
                const exec = p.id !== "custom_agent" ? EXECUTIVES[p.id as ExecutiveId] : null;
                return (
                  <div key={p.id} style={{ padding: "6px 8px", background: "var(--bg-2)", borderRadius: 6, borderLeft: `2px solid ${p.color}` }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text)" }}>{p.avatar} {p.name}</div>
                    {exec && <div style={{ fontSize: 9, color: "var(--text-3)", marginTop: 2 }}>{exec.title}</div>}
                    {exec && <div style={{ fontSize: 9, color: "var(--text-3)", marginTop: 1 }}>{exec.specialty}</div>}
                  </div>
                );
              })}

              {activeThread.linkedMissionId && (
                <>
                  <SectionHeader title="Linked Mission" />
                  <a href={`/mission/${activeThread.linkedMissionId}`} style={{ fontSize: 10, color: "#3b82f6", textDecoration: "underline" }}>
                    <ChevronRight size={9} /> Mission {activeThread.linkedMissionId}
                  </a>
                </>
              )}

              <SectionHeader title="Direct Chat" />
              {PARTICIPANT_OPTIONS.filter((p) => !activeThread.participants.some((ap) => ap.id === p.id)).map((p) => (
                <button key={p.id} onClick={async () => {
                  // Create new thread with this participant
                  const res = await fetch("/api/conversations/threads", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ title: `Chat with ${p.label}`, participants: [p.id] }),
                  });
                  if (res.ok) {
                    const d = await res.json();
                    setActiveThread(d.thread);
                    loadData();
                  }
                }} style={{
                  padding: "4px 8px", fontSize: 10, border: "1px solid var(--border)",
                  borderRadius: 6, background: "var(--bg-2)", color: "var(--text)",
                  cursor: "pointer", display: "flex", alignItems: "center", gap: 4,
                }}>
                  {p.avatar} Message {p.label}
                </button>
              ))}
            </>
          ) : (
            <div style={{ textAlign: "center", padding: 16, color: "var(--text-3)", fontSize: 11 }}>
              No conversation selected
            </div>
          )}
        </Panel>
      </div>

      {/* New Thread Modal */}
      {showNewThread && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}>
          <div style={{ background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 8, padding: 20, width: 400 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>New Conversation</span>
              <button onClick={() => setShowNewThread(false)} style={{ background: "none", border: "none", color: "var(--text-3)", cursor: "pointer" }}><X size={14} /></button>
            </div>
            <label style={{ fontSize: 10, fontWeight: 600, color: "var(--text-2)", display: "block", marginBottom: 3 }}>Title</label>
            <input style={inputStyle} value={newThreadTitle} onChange={(e) => setNewThreadTitle(e.target.value)} placeholder="e.g. Invoice discussion" />
            <label style={{ fontSize: 10, fontWeight: 600, color: "var(--text-2)", display: "block", marginTop: 10, marginBottom: 3 }}>Chat with</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
              {PARTICIPANT_OPTIONS.map((p) => (
                <button key={p.id} onClick={() => setNewThreadParticipant(p.id)} style={{
                  padding: "4px 8px", fontSize: 10, fontWeight: newThreadParticipant === p.id ? 700 : 400,
                  background: newThreadParticipant === p.id ? `${p.color}22` : "var(--bg-2)",
                  border: newThreadParticipant === p.id ? `1px solid ${p.color}` : "1px solid var(--border)",
                  borderRadius: 6, color: "var(--text)", cursor: "pointer",
                }}>
                  {p.avatar} {p.label}
                </button>
              ))}
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
              <GhostButton onClick={() => setShowNewThread(false)}>Cancel</GhostButton>
              <PrimaryButton onClick={handleCreateThread} color="#3b82f6"><PlusCircle size={11} /> Create</PrimaryButton>
            </div>
          </div>
        </div>
      )}

      {/* New Folder Modal */}
      {showNewFolder && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}>
          <div style={{ background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 8, padding: 20, width: 320 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>New Folder</span>
              <button onClick={() => setShowNewFolder(false)} style={{ background: "none", border: "none", color: "var(--text-3)", cursor: "pointer" }}><X size={14} /></button>
            </div>
            <label style={{ fontSize: 10, fontWeight: 600, color: "var(--text-2)", display: "block", marginBottom: 3 }}>Name</label>
            <input style={inputStyle} value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)} placeholder="e.g. Finance" />
            <label style={{ fontSize: 10, fontWeight: 600, color: "var(--text-2)", display: "block", marginTop: 10, marginBottom: 3 }}>Color</label>
            <input type="color" value={newFolderColor} onChange={(e) => setNewFolderColor(e.target.value)} style={{ width: 40, height: 24, border: "none", cursor: "pointer" }} />
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
              <GhostButton onClick={() => setShowNewFolder(false)}>Cancel</GhostButton>
              <PrimaryButton onClick={handleCreateFolder} color="#3b82f6"><FolderPlus size={11} /> Create</PrimaryButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
