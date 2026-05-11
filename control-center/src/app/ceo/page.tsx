"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  BriefcaseBusiness,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Eye,
  MessageCircle,
  Palette,
  Send,
  Sparkles,
  Users,
  Zap,
} from "lucide-react";
import { VisualOutputPreview } from "@/components/previews/VisualOutputPreview";
import type { ApprovalItem, ApprovalPreview } from "@/lib/approvalPreview";
import type { OutputVisualPreview } from "@/lib/visibleOutputs";

type SessionStatus = "draft" | "running" | "paused" | "waiting_approval" | "completed" | "failed";

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
  sessionId?: string;
  actions?: CeoAction[];
  timestamp: string;
}

interface CeoProject {
  id: string;
  name: string;
  missionType: string;
  status: string;
  sessionId: string | null;
  workspaceId?: string | null;
  progress: number;
  outputsCount: number;
  updatedAt: string;
}

interface AutopilotSession {
  sessionId: string;
  projectName: string;
  projectIdea: string;
  missionType: string;
  businessStatus: string;
  status: SessionStatus;
  progress: number;
  assignedAgents: { agentId: string; role: string; status: string; provider: string }[];
  tasks: { id: string; title: string; agent: string; status: string; progress: number }[];
  logs: { id: string; timestamp: string; level: string; agent: string; message: string; source: string }[];
  runtime: { lastEvent: string; activeWorkers: number };
}

interface VisibleOutput {
  id: string;
  sessionId: string;
  projectId: string | null;
  title: string;
  type: string;
  summary: string;
  preview: string;
  status: string;
  assignedAgent: string;
  visualPreview?: OutputVisualPreview | null;
  updatedAt: string;
}

interface CompanyGroup {
  id: string;
  name: string;
  status: string;
  avatar: string;
  projectsCount: number;
  projectIds: string[];
  lastResult?: VisibleOutput;
}

interface ApprovalCardData {
  item: ApprovalItem;
  preview: ApprovalPreview | null;
  visualPreview: OutputVisualPreview | null;
  canApprove: boolean;
}

const AGENT_META: Record<string, { name: string; role: string; avatar: string; color: string }> = {
  ceo: { name: "CEO AI", role: "Coordonne le projet", avatar: "AI", color: "#f59e0b" },
  cmo: { name: "Brand Strategist", role: "Direction creative", avatar: "BS", color: "#8b5cf6" },
  frontend_agent: { name: "Designer", role: "Prepare le concept visuel", avatar: "DS", color: "#ec4899" },
  qa_agent: { name: "Quality Agent", role: "Verifie le resultat", avatar: "QA", color: "#22c55e" },
  product_agent: { name: "Growth Agent", role: "Clarifie l'offre", avatar: "GA", color: "#06b6d4" },
  architect_agent: { name: "Systems Agent", role: "Structure le plan", avatar: "SA", color: "#38bdf8" },
  backend_agent: { name: "Build Agent", role: "Prepare les fondations", avatar: "BA", color: "#f97316" },
  devops_agent: { name: "Launch Agent", role: "Prepare la livraison", avatar: "LA", color: "#14b8a6" },
};

const STATUS_LABEL: Record<string, string> = {
  draft: "En preparation",
  starting: "En preparation",
  in_progress: "Agents au travail",
  running: "Agents au travail",
  paused: "En pause",
  review: "Attend approbation",
  waiting_approval: "Attend approbation",
  completed: "Resultat pret",
  delivered: "Livre",
  approved: "Approuve",
  failed: "A verifier",
};

function agentMeta(agentId: string) {
  return AGENT_META[agentId] ?? { name: agentId.replace(/_/g, " "), role: "Travaille sur la mission", avatar: agentId.slice(0, 2).toUpperCase(), color: "#94a3b8" };
}

function statusLabel(status: string) {
  return STATUS_LABEL[status] ?? status.replace(/_/g, " ");
}

function Avatar({ label, color, pulse = false }: { label: string; color: string; pulse?: boolean }) {
  return (
    <motion.div
      animate={pulse ? { boxShadow: [`0 0 0 0 ${color}55`, `0 0 0 7px ${color}00`] } : undefined}
      transition={pulse ? { duration: 1.4, repeat: Infinity } : undefined}
      style={{
        width: 36,
        height: 36,
        borderRadius: "50%",
        background: `linear-gradient(135deg, ${color}, #ffffff22)`,
        border: "1px solid rgba(255,255,255,0.5)",
        display: "grid",
        placeItems: "center",
        color: "#fff",
        fontSize: 11,
        fontWeight: 900,
        flexShrink: 0,
      }}
    >
      {label}
    </motion.div>
  );
}

export default function EasyAgencyOSPage() {
  const [messages, setMessages] = useState<CeoMessage[]>([]);
  const [projects, setProjects] = useState<CeoProject[]>([]);
  const [sessions, setSessions] = useState<AutopilotSession[]>([]);
  const [outputs, setOutputs] = useState<VisibleOutput[]>([]);
  const [approvals, setApprovals] = useState<ApprovalCardData[]>([]);
  const [companies, setCompanies] = useState<CompanyGroup[]>([]);
  const [logs, setLogs] = useState<AutopilotSession["logs"]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement | null>(null);

  const load = async () => {
    const res = await fetch("/api/ceo/simple-agency", { cache: "no-store" });
    const payload = await res.json().catch(() => ({}));
    const view = payload.view ?? {};
    setMessages(view.messages ?? []);
    setProjects(view.projects ?? []);
    setSessions(view.sessions ?? []);
    setOutputs(view.outputs ?? []);
    setApprovals(view.approvals ?? []);
    setCompanies(view.companies ?? []);
    setLogs(view.logs ?? []);
  };

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), 4000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, outputs.length]);

  const latestSession = sessions[0] ?? null;
  const activeSessionIds = new Set(sessions.filter((s) => s.status === "running" || s.status === "waiting_approval").map((s) => s.sessionId));
  const latestOutputs = outputs.slice(0, 5);

  const agentRows = useMemo(() => {
    const ids = new Set<string>(["ceo"]);
    for (const session of sessions.slice(0, 3)) {
      for (const agent of session.assignedAgents ?? []) ids.add(agent.agentId);
      for (const task of session.tasks ?? []) if (task.status === "running") ids.add(task.agent);
    }
    return Array.from(ids).slice(0, 6).map((id) => {
      const session = sessions.find((s) => s.assignedAgents?.some((a) => a.agentId === id) || s.tasks?.some((t) => t.agent === id));
      const task = session?.tasks?.find((t) => t.agent === id && (t.status === "running" || t.status === "queued"));
      const meta = agentMeta(id);
      const active = id === "ceo" || task?.status === "running" || session?.status === "running";
      return { id, ...meta, active, task: task?.title ?? meta.role };
    });
  }, [sessions]);

  const conversationItems = useMemo(() => {
    const items: Array<{ id: string; type: "message" | "agent" | "output" | "approval"; payload: CeoMessage | { agent: string; text: string; color: string } | VisibleOutput | ApprovalCardData; timestamp: string }> = [];
    for (const message of messages.slice(-18)) {
      items.push({ id: message.id, type: "message", payload: message, timestamp: message.timestamp });
    }
    for (const log of logs.slice(0, 8)) {
      const meta = agentMeta(log.agent);
      items.push({
        id: `log-${log.id}`,
        type: "agent",
        payload: { agent: meta.name, text: log.message, color: meta.color },
        timestamp: log.timestamp,
      });
    }
    if (latestSession) {
      for (const task of (latestSession.tasks ?? []).filter((t) => t.status === "completed" || t.status === "running").slice(0, 4)) {
        const meta = agentMeta(task.agent);
        items.push({
          id: `task-${task.id}`,
          type: "agent",
          payload: { agent: meta.name, text: task.status === "running" ? task.title : `${task.title} termine`, color: meta.color },
          timestamp: new Date().toISOString(),
        });
      }
    }
    for (const output of latestOutputs.slice(0, 2)) {
      items.push({ id: `output-${output.id}`, type: "output", payload: output, timestamp: output.updatedAt });
    }
    for (const approval of approvals.slice(0, 1)) {
      items.push({ id: `approval-${approval.item.id}`, type: "approval", payload: approval, timestamp: approval.item.createdAt });
    }
    return items.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()).slice(-24);
  }, [messages, logs, latestSession, latestOutputs, approvals]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    setInput("");
    setMessages((prev) => [...prev, { id: `local-${Date.now()}`, role: "user", text, timestamp: new Date().toISOString() }]);
    try {
      const res = await fetch("/api/ceo/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const payload = await res.json();
      if (payload.response) setMessages((prev) => [...prev.filter((m) => !m.id.startsWith("local-")), { id: `sent-${Date.now()}`, role: "user", text, timestamp: new Date().toISOString() }, payload.response]);
      await load();
    } finally {
      setSending(false);
    }
  };

  const approveOutput = async (outputId: string) => {
    await fetch("/api/visible-outputs", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ outputId, status: "approved" }),
    });
    await load();
  };

  const approveApproval = async (approvalId: string) => {
    await fetch(`/api/approvals/${approvalId}/approve`, { method: "POST" });
    await load();
  };

  const rejectApproval = async (approvalId: string) => {
    await fetch(`/api/approvals/${approvalId}/reject`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: "Changements demandes depuis le mode simple CEO." }),
    });
    await load();
  };

  return (
    <main className="agency-root">
      <style>{styles}</style>
      <div className="messenger-shell">
        <header className="topbar">
          <div className="brand-mark"><Sparkles size={17} /> AI Company OS</div>
          <div className="status-pill"><span className="online-dot" /> CEO AI en ligne</div>
          <div className="status-pill soft"><Zap size={13} /> Agence active</div>
          <Link href="/ceo/expert" className="expert-link">Mode expert <ChevronRight size={13} /></Link>
        </header>

        <aside className="left-rail">
          <SectionTitle icon={<BriefcaseBusiness size={14} />} label="Mes entreprises" />
          <div className="contact-list">
            {companies.map((company) => (
              <div key={company.id} className="company-card active">
                <Avatar label={company.avatar} color="#38bdf8" pulse={company.status !== "Pret a lancer"} />
                <div className="contact-copy">
                  <strong>{company.name}</strong>
                  <span>{company.status} · {company.projectsCount} projet{company.projectsCount > 1 ? "s" : ""}</span>
                  <small>{company.lastResult ? `Dernier resultat: ${company.lastResult.title}` : "Dis au CEO ce que tu veux creer"}</small>
                </div>
              </div>
            ))}
          </div>

          <SectionTitle icon={<MessageCircle size={14} />} label="Projets actifs" />
          <div className="project-list">
            {projects.length === 0 ? (
              <EmptyHint text="Aucun projet. Ecris au CEO pour lancer une entreprise ou un logo." />
            ) : projects.slice(0, 8).map((project) => {
              const session = sessions.find((s) => s.sessionId === project.sessionId);
              const company = companies.find((item) => item.projectIds.includes(project.id));
              const status = statusLabel(session?.status ?? project.status);
              return (
                <Link key={project.id} href={project.sessionId ? `/mission/${project.sessionId}` : "/projects"} className="project-row">
                  <div>
                    <strong>{project.name}</strong>
                    <span>{company?.name ?? "Entreprise AI"}</span>
                  </div>
                  <div className="progress-mini">
                    <span>{status}</span>
                    <div><i style={{ width: `${session?.progress ?? project.progress ?? 0}%` }} /></div>
                  </div>
                </Link>
              );
            })}
          </div>

          <SectionTitle icon={<CheckCircle2 size={14} />} label="A approuver" />
          {approvals.length === 0 ? <EmptyHint text="Rien en attente." /> : approvals.slice(0, 4).map((approval) => (
            <Link key={approval.item.id} href={approval.item.sessionId ? `/mission/${approval.item.sessionId}` : "/outputs"} className="approval-mini">
              <Clock3 size={13} /> {approval.item.title}
            </Link>
          ))}
        </aside>

        <section className="conversation">
          <div className="chat-header">
            <Avatar label="AI" color="#f59e0b" pulse />
            <div>
              <strong>CEO AI</strong>
              <span>Dis-lui ce que tu veux creer. Il lance les agents automatiquement.</span>
            </div>
          </div>

          <div className="chat-stream">
            {conversationItems.length === 0 && (
              <div className="welcome-card">
                <h1>Que fait ton agence AI maintenant?</h1>
                <p>Exemple: “Je veux un logo pour une compagnie de photo” ou “Je veux lancer une entreprise de photo”.</p>
              </div>
            )}
            <AnimatePresence initial={false}>
              {conversationItems.map((item) => {
                if (item.type === "output") {
                  const output = item.payload as VisibleOutput;
                  return (
                    <motion.div key={item.id} className="timeline-output" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                      <div className="agent-name"><Palette size={13} /> Resultat produit</div>
                      <VisualOutputPreview visualPreview={output.visualPreview} title={output.title} summary={output.summary} compact />
                      <div className="output-line">
                        <strong>{output.title}</strong>
                        <Link href={`/outputs/${output.id}`}>Voir</Link>
                      </div>
                    </motion.div>
                  );
                }
                if (item.type === "approval") {
                  const approval = item.payload as ApprovalCardData;
                  return (
                    <motion.div key={item.id} className="timeline-output" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                      <div className="agent-name"><CheckCircle2 size={13} /> Approval pret</div>
                      <VisualOutputPreview visualPreview={approval.visualPreview} title={approval.item.title} summary={approval.item.summary} compact />
                      <div className="output-line">
                        <strong>{approval.item.title}</strong>
                        <Link href={approval.item.sessionId ? `/mission/${approval.item.sessionId}` : "/outputs"}>Voir</Link>
                      </div>
                    </motion.div>
                  );
                }
                if (item.type === "agent") {
                  const update = item.payload as { agent: string; text: string; color: string };
                  return (
                    <motion.div key={item.id} className="agent-update" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                      <span style={{ background: update.color }} />
                      <div><strong>{update.agent}</strong>{update.text}</div>
                    </motion.div>
                  );
                }
                const message = item.payload as CeoMessage;
                const isUser = message.role === "user";
                return (
                  <motion.div key={item.id} className={`bubble-row ${isUser ? "user" : "ceo"}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                    {!isUser && <Avatar label="AI" color="#f59e0b" />}
                    <div className="bubble">
                      <p>{message.text}</p>
                      {message.actions?.some((a) => a.href) && (
                        <div className="bubble-actions">
                          {message.actions.filter((a) => a.href).slice(0, 2).map((action) => (
                            <Link key={`${action.type}-${action.targetId}`} href={action.href!}>{action.label}</Link>
                          ))}
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
            <div ref={endRef} />
          </div>

          <form className="composer" onSubmit={(event) => { event.preventDefault(); void sendMessage(); }}>
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Ecris au CEO AI: Je veux un logo pour une compagnie de photo..."
            />
            <button disabled={sending || !input.trim()}><Send size={16} /></button>
          </form>
        </section>

        <aside className="right-rail">
          <SectionTitle icon={<Users size={14} />} label="Agents au travail" />
          <div className="agent-list">
            {agentRows.map((agent) => (
              <div key={agent.id} className="agent-row">
                <Avatar label={agent.avatar} color={agent.color} pulse={agent.active} />
                <div>
                  <strong>{agent.name}</strong>
                  <span>{agent.task}</span>
                </div>
                <i className={agent.active ? "working-dot" : "idle-dot"} />
              </div>
            ))}
          </div>

          <SectionTitle icon={<Eye size={14} />} label="Resultats" />
          <div className="result-list">
            {latestOutputs.length === 0 ? <EmptyHint text="Les resultats apparaitront ici pendant que les agents travaillent." /> : latestOutputs.map((output) => (
              <div key={output.id} className="result-card">
                <VisualOutputPreview visualPreview={output.visualPreview} title={output.title} summary={output.summary} compact />
                <div className="result-meta">
                  <strong>{output.title}</strong>
                  <span>{statusLabel(output.status)}</span>
                </div>
                <p>{output.summary || output.preview}</p>
                <div className="result-actions">
                  <Link href={`/outputs/${output.id}`}>Voir</Link>
                  {(output.status === "review" || activeSessionIds.has(output.sessionId)) && (
                    <button onClick={() => void approveOutput(output.id)}>Approuver</button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <SectionTitle icon={<CheckCircle2 size={14} />} label="A approuver" />
          {approvals.length === 0 ? <EmptyHint text="Aucune decision urgente." /> : approvals.slice(0, 3).map((approval) => (
            <div key={approval.item.id} className="approval-card">
              <VisualOutputPreview visualPreview={approval.visualPreview} title={approval.item.title} summary={approval.item.summary} compact />
              <strong>{approval.item.title}</strong>
              <span>{approval.item.summary}</span>
              <div className="result-actions">
                <Link href={approval.item.sessionId ? `/mission/${approval.item.sessionId}` : "/outputs"}>Voir details</Link>
                <button disabled={!approval.canApprove} onClick={() => void approveApproval(approval.item.id)}>Approuver</button>
                <button className="reject-action" onClick={() => void rejectApproval(approval.item.id)}>Changements</button>
              </div>
              {!approval.canApprove && <small>Preview visuelle requise avant approbation.</small>}
            </div>
          ))}
        </aside>
      </div>
    </main>
  );
}

function SectionTitle({ icon, label }: { icon: ReactNode; label: string }) {
  return <div className="section-title">{icon}<span>{label}</span></div>;
}

function EmptyHint({ text }: { text: string }) {
  return <div className="empty-hint">{text}</div>;
}

const styles = `
.agency-root {
  min-height: 100vh;
  padding: 18px;
  background:
    radial-gradient(circle at 12% 8%, rgba(56,189,248,0.22), transparent 28%),
    radial-gradient(circle at 92% 12%, rgba(245,158,11,0.18), transparent 24%),
    linear-gradient(135deg, #eef7ff 0%, #f8fbff 42%, #fff7ed 100%);
  color: #172033;
}
.messenger-shell {
  height: calc(100vh - 36px);
  display: grid;
  grid-template-columns: 300px minmax(420px, 1fr) 340px;
  grid-template-rows: 58px 1fr;
  border: 1px solid rgba(59,130,246,0.18);
  border-radius: 22px;
  overflow: hidden;
  background: rgba(255,255,255,0.72);
  box-shadow: 0 24px 70px rgba(31,41,55,0.16);
  backdrop-filter: blur(18px);
}
.topbar {
  grid-column: 1 / -1;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 16px;
  background: linear-gradient(180deg, rgba(255,255,255,0.95), rgba(239,246,255,0.92));
  border-bottom: 1px solid rgba(59,130,246,0.16);
}
.brand-mark { display: inline-flex; align-items: center; gap: 8px; font-weight: 900; color: #0f172a; margin-right: auto; }
.status-pill { display: inline-flex; align-items: center; gap: 7px; border: 1px solid rgba(34,197,94,0.24); background: rgba(34,197,94,0.09); color: #15803d; border-radius: 999px; padding: 6px 10px; font-size: 12px; font-weight: 800; }
.status-pill.soft { color: #2563eb; background: rgba(59,130,246,0.09); border-color: rgba(59,130,246,0.18); }
.online-dot, .working-dot, .idle-dot { width: 8px; height: 8px; border-radius: 50%; background: #22c55e; display: inline-block; }
.working-dot { animation: pulse-dot 1.2s infinite; }
.idle-dot { background: #cbd5e1; }
.expert-link { color: #64748b; text-decoration: none; font-size: 12px; font-weight: 800; display: inline-flex; align-items: center; gap: 3px; }
.left-rail, .right-rail { overflow: auto; padding: 14px; background: rgba(248,250,252,0.82); }
.left-rail { border-right: 1px solid rgba(59,130,246,0.14); }
.right-rail { border-left: 1px solid rgba(59,130,246,0.14); }
.section-title { display: flex; align-items: center; gap: 7px; color: #475569; font-size: 11px; text-transform: uppercase; font-weight: 900; letter-spacing: 0.05em; margin: 12px 0 8px; }
.contact-list, .project-list, .agent-list, .result-list { display: grid; gap: 8px; }
.company-card, .project-row, .agent-row, .approval-card, .approval-mini, .result-card {
  border: 1px solid rgba(148,163,184,0.22);
  background: rgba(255,255,255,0.78);
  border-radius: 14px;
  box-shadow: 0 8px 22px rgba(15,23,42,0.06);
}
.company-card { display: flex; gap: 10px; padding: 10px; }
.company-card.active { border-color: rgba(56,189,248,0.35); background: linear-gradient(135deg, rgba(255,255,255,0.9), rgba(224,242,254,0.55)); }
.contact-copy, .agent-row div { min-width: 0; display: grid; gap: 2px; }
.contact-copy strong, .project-row strong, .agent-row strong, .result-meta strong { font-size: 13px; color: #0f172a; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.contact-copy span, .project-row span, .agent-row span, .result-meta span, .approval-card span { font-size: 11px; color: #64748b; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.contact-copy small { color: #94a3b8; font-size: 10px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.project-row { padding: 10px; text-decoration: none; display: grid; gap: 8px; }
.progress-mini { display: grid; gap: 5px; }
.progress-mini div { height: 5px; background: #e2e8f0; border-radius: 99px; overflow: hidden; }
.progress-mini i { display: block; height: 100%; background: linear-gradient(90deg, #38bdf8, #8b5cf6); border-radius: inherit; }
.approval-mini { padding: 9px 10px; display: flex; gap: 7px; color: #92400e; text-decoration: none; font-size: 12px; font-weight: 800; background: rgba(254,243,199,0.72); }
.conversation { min-width: 0; display: grid; grid-template-rows: auto 1fr auto; background: rgba(255,255,255,0.54); }
.chat-header { display: flex; gap: 10px; align-items: center; padding: 14px 18px; border-bottom: 1px solid rgba(59,130,246,0.12); background: rgba(255,255,255,0.52); }
.chat-header strong { display: block; font-size: 15px; }
.chat-header span { color: #64748b; font-size: 12px; }
.chat-stream { overflow: auto; padding: 18px; display: flex; flex-direction: column; gap: 12px; }
.welcome-card { align-self: center; margin-top: 12vh; max-width: 520px; text-align: center; background: rgba(255,255,255,0.72); border: 1px solid rgba(59,130,246,0.14); border-radius: 22px; padding: 28px; }
.welcome-card h1 { margin: 0 0 8px; font-size: 24px; }
.welcome-card p { margin: 0; color: #64748b; line-height: 1.5; }
.bubble-row { display: flex; gap: 9px; max-width: 82%; }
.bubble-row.user { align-self: flex-end; justify-content: flex-end; }
.bubble-row.ceo { align-self: flex-start; }
.bubble { border-radius: 18px; padding: 11px 13px; border: 1px solid rgba(148,163,184,0.2); background: #fff; box-shadow: 0 10px 24px rgba(15,23,42,0.07); }
.bubble-row.user .bubble { background: linear-gradient(135deg, #38bdf8, #2563eb); color: #fff; border-color: transparent; }
.bubble p { margin: 0; white-space: pre-wrap; line-height: 1.45; font-size: 13px; }
.bubble-actions { margin-top: 8px; display: flex; gap: 6px; flex-wrap: wrap; }
.bubble-actions a, .result-actions a, .result-actions button { border: 1px solid rgba(59,130,246,0.22); background: rgba(59,130,246,0.08); color: #2563eb; border-radius: 999px; padding: 5px 9px; font-size: 11px; font-weight: 900; text-decoration: none; cursor: pointer; }
.agent-update { align-self: flex-start; display: flex; align-items: center; gap: 8px; color: #475569; font-size: 12px; background: rgba(255,255,255,0.6); border: 1px solid rgba(148,163,184,0.18); border-radius: 999px; padding: 7px 10px; }
.agent-update span { width: 9px; height: 9px; border-radius: 50%; }
.agent-update strong { margin-right: 6px; color: #0f172a; }
.timeline-output { max-width: 460px; align-self: flex-start; border: 1px solid rgba(139,92,246,0.18); background: rgba(255,255,255,0.78); border-radius: 16px; padding: 10px; }
.agent-name { color: #7c3aed; display: flex; gap: 6px; align-items: center; font-size: 11px; font-weight: 900; text-transform: uppercase; margin-bottom: 8px; }
.output-line { display: flex; justify-content: space-between; align-items: center; gap: 10px; margin-top: 8px; }
.output-line strong { font-size: 12px; }
.output-line a { font-size: 11px; font-weight: 900; color: #7c3aed; text-decoration: none; }
.composer { margin: 12px 16px 16px; display: grid; grid-template-columns: 1fr auto; gap: 8px; }
.composer input { border: 1px solid rgba(59,130,246,0.18); background: rgba(255,255,255,0.92); border-radius: 999px; padding: 13px 16px; color: #0f172a; outline: none; font-size: 14px; }
.composer button { width: 46px; border: none; border-radius: 50%; background: linear-gradient(135deg, #38bdf8, #2563eb); color: #fff; display: grid; place-items: center; cursor: pointer; }
.composer button:disabled { opacity: 0.45; cursor: not-allowed; }
.agent-row { display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: 10px; padding: 10px; }
.result-card { padding: 10px; display: grid; gap: 8px; }
.result-meta { display: flex; justify-content: space-between; gap: 8px; align-items: center; }
.result-card p { margin: 0; color: #64748b; font-size: 11px; line-height: 1.45; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.result-actions { display: flex; gap: 6px; }
.result-actions button { color: #15803d; border-color: rgba(34,197,94,0.25); background: rgba(34,197,94,0.09); }
.result-actions button:disabled { opacity: 0.45; cursor: not-allowed; }
.result-actions .reject-action { color: #92400e; border-color: rgba(245,158,11,0.28); background: rgba(245,158,11,0.1); }
.approval-card { display: grid; gap: 4px; text-decoration: none; padding: 10px; }
.approval-card strong { color: #0f172a; font-size: 12px; }
.approval-card small { color: #b45309; font-size: 10px; font-weight: 800; }
.approval-card em { color: #7c3aed; font-size: 11px; font-style: normal; font-weight: 900; }
.empty-hint { color: #94a3b8; font-size: 12px; line-height: 1.45; border: 1px dashed rgba(148,163,184,0.38); border-radius: 12px; padding: 12px; background: rgba(255,255,255,0.46); }
@keyframes pulse-dot { 0%, 100% { opacity: 0.45; transform: scale(0.9); } 50% { opacity: 1; transform: scale(1.25); } }
@media (max-width: 1100px) {
  .messenger-shell { grid-template-columns: 250px 1fr; }
  .right-rail { display: none; }
}
@media (max-width: 760px) {
  .agency-root { padding: 0; }
  .messenger-shell { height: 100vh; border-radius: 0; grid-template-columns: 1fr; }
  .left-rail { display: none; }
  .topbar { gap: 6px; }
  .status-pill.soft { display: none; }
}
`;
