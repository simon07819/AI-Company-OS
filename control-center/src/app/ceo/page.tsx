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
type SimpleUiStatus = "working" | "preparing" | "ready" | "approved" | "changes" | "done" | "check";

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
  type?: string;
  status: string;
  avatar: string;
  projectsCount: number;
  projectIds: string[];
  hasPendingApproval?: boolean;
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
  review: "Resultat pret - approbation requise",
  waiting_approval: "Resultat pret - approbation requise",
  completed: "Termine",
  delivered: "Livre",
  approved: "Approuve",
  rejected: "Changements demandes",
  changes_requested: "Changements demandes",
  failed: "A verifier",
};

const TECHNICAL_LOG_PATTERNS = [
  "runtime scheduler",
  "nvidia",
  "scaffold",
  "worker health",
  "task queue",
  "dependency",
];

function agentMeta(agentId: string) {
  return AGENT_META[agentId] ?? { name: agentId.replace(/_/g, " "), role: "Travaille sur la mission", avatar: agentId.slice(0, 2).toUpperCase(), color: "#94a3b8" };
}

function statusLabel(status: string) {
  return STATUS_LABEL[status] ?? status.replace(/_/g, " ");
}

function simpleStatusFor(session?: AutopilotSession | null, output?: VisibleOutput | null, approval?: ApprovalCardData | null): { label: string; badge: string; kind: SimpleUiStatus; progress: number } {
  if (approval) return { label: "Resultat pret - approbation requise", badge: "Pret a approuver", kind: "ready", progress: 100 };
  if (output?.status === "approved") return { label: "Approuve", badge: "Approuve", kind: "approved", progress: 100 };
  if (output?.status === "draft" && session?.status === "waiting_approval") return { label: "Changements demandes", badge: "A retravailler", kind: "changes", progress: 100 };
  if (session?.status === "waiting_approval") return { label: "Resultat pret - approbation requise", badge: "Pret a approuver", kind: "ready", progress: 100 };
  if (session?.status === "running") {
    const progress = Math.max(session.progress, output ? 55 : 20);
    return { label: output ? "Resultats en preparation" : "Agents au travail", badge: output ? "En preparation" : "Travaille", kind: output ? "preparing" : "working", progress };
  }
  if (session?.status === "completed") return { label: "Termine", badge: "Termine", kind: "done", progress: 100 };
  if (session?.status === "failed") return { label: "A verifier", badge: "A verifier", kind: "check", progress: session.progress };
  return { label: output ? statusLabel(output.status) : "En preparation", badge: output ? statusLabel(output.status) : "En preparation", kind: "preparing", progress: session?.progress ?? 0 };
}

function outputForProject(project: CeoProject, outputs: VisibleOutput[]) {
  return outputs.find((output) => output.projectId === project.id || (!!project.sessionId && output.sessionId === project.sessionId)) ?? null;
}

function approvalForSession(sessionId: string | null | undefined, approvals: ApprovalCardData[]) {
  if (!sessionId) return null;
  return approvals.find((approval) => approval.item.sessionId === sessionId) ?? null;
}

function friendlyAgentAction(text: string) {
  const lower = text.toLowerCase();
  if (lower.includes("approval") || lower.includes("approbation")) return "Le premier concept est pret pour approbation.";
  if (lower.includes("visible output") || lower.includes("generated visible")) return "Resultat visuel prepare.";
  if (lower.includes("auto-execution") || lower.includes("étapes") || lower.includes("etapes")) return "Les agents ont avance automatiquement.";
  if (lower.includes("équipe") || lower.includes("equipe") || lower.includes("assigned")) return "Equipe AI assignee au projet.";
  if (lower.includes("brand") || lower.includes("creative")) return "Direction creative definie.";
  if (lower.includes("design") || lower.includes("visual")) return "Concept visuel prepare.";
  return text.replace(/Runtime scheduler started.*/i, "Mission demarree.");
}

function isSimpleLog(log: AutopilotSession["logs"][number]) {
  const lower = `${log.source} ${log.message}`.toLowerCase();
  return !TECHNICAL_LOG_PATTERNS.some((pattern) => lower.includes(pattern)) || lower.includes("approval") || lower.includes("visible output") || lower.includes("équipe") || lower.includes("equipe");
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
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState<string | null>(null);
  const [changeRequestId, setChangeRequestId] = useState<string | null>(null);
  const [changeRequestText, setChangeRequestText] = useState("");
  const endRef = useRef<HTMLDivElement | null>(null);

  const load = async () => {
    try {
      const res = await fetch("/api/ceo/simple-agency", { cache: "no-store" });
      if (!res.ok) throw new Error("Impossible de charger l'agence.");
      const payload = await res.json().catch(() => ({}));
      const view = payload.view ?? {};
      setMessages(view.messages ?? []);
      setProjects(view.projects ?? []);
      setSessions(view.sessions ?? []);
      setOutputs(view.outputs ?? []);
      setApprovals(view.approvals ?? []);
      setCompanies(view.companies ?? []);
      setLogs(view.logs ?? []);
      setLoadError(null);
    } catch {
      setLoadError("Connexion au runtime en attente. Nouvelle tentative automatique.");
    } finally {
      setLoading(false);
    }
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
  const primaryApproval = approvals[0] ?? null;
  const primaryApprovalSession = primaryApproval?.item.sessionId ? sessions.find((session) => session.sessionId === primaryApproval.item.sessionId) : null;
  const primaryStatus = simpleStatusFor(primaryApprovalSession ?? latestSession, latestOutputs[0] ?? null, primaryApproval);

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
      const agentOutput = outputs.find((output) => output.sessionId === session?.sessionId && output.assignedAgent === id);
      const waiting = !!session && session.status === "waiting_approval";
      const active = id === "ceo" || task?.status === "running" || session?.status === "running";
      const status = waiting
        ? id === "ceo" ? "Attend ta decision" : agentOutput ? "A livre" : "Attend approbation"
        : active ? "Travaille" : agentOutput ? "A livre" : "En ligne";
      return { id, ...meta, active: active && !waiting, task: waiting && id === "ceo" ? "Attend ta decision" : agentOutput?.title ?? task?.title ?? meta.role, status, lastResult: agentOutput?.title };
    });
  }, [sessions, outputs]);

  const conversationItems = useMemo(() => {
    const items: Array<{ id: string; type: "message" | "agent" | "output" | "approval"; payload: CeoMessage | { agent: string; text: string; color: string } | VisibleOutput | ApprovalCardData; timestamp: string }> = [];
    for (const message of messages.slice(-18)) {
      items.push({ id: message.id, type: "message", payload: message, timestamp: message.timestamp });
    }
    for (const log of logs.filter(isSimpleLog).slice(0, 6)) {
      const meta = agentMeta(log.agent);
      items.push({
        id: `log-${log.id}`,
        type: "agent",
        payload: { agent: meta.name, text: friendlyAgentAction(log.message), color: meta.color },
        timestamp: log.timestamp,
      });
    }
    if (latestSession) {
      for (const task of (latestSession.tasks ?? []).filter((t) => t.status === "completed" || t.status === "running").slice(0, 4)) {
        const meta = agentMeta(task.agent);
        items.push({
          id: `task-${task.id}`,
          type: "agent",
          payload: { agent: meta.name, text: task.status === "running" ? task.title : "Action terminee.", color: meta.color },
          timestamp: new Date().toISOString(),
        });
      }
    }
    for (const output of latestOutputs.slice(0, 2)) {
      items.push({ id: `output-${output.id}`, type: "output", payload: output, timestamp: output.updatedAt });
    }
    for (const approval of approvals.slice(0, 1)) {
      items.push({
        id: `ceo-approval-${approval.item.id}`,
        type: "agent",
        payload: { agent: "CEO AI", text: "Le premier concept est pret. Tu peux l'approuver ou demander des changements.", color: "#f59e0b" },
        timestamp: approval.item.createdAt,
      });
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
    setActionBusy(outputId);
    await fetch("/api/visible-outputs", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ outputId, status: "approved" }),
    });
    await load();
    setActionBusy(null);
  };

  const approveApproval = async (approvalId: string) => {
    setActionBusy(approvalId);
    try {
      await fetch(`/api/approvals/${approvalId}/approve`, { method: "POST" });
      setMessages((prev) => [...prev, { id: `approved-${Date.now()}`, role: "ceo", text: "C'est approuve. Je marque ce resultat comme valide.", timestamp: new Date().toISOString() }]);
      await load();
    } finally {
      setActionBusy(null);
    }
  };

  const rejectApproval = async (approvalId: string, reason: string) => {
    setActionBusy(approvalId);
    try {
      await fetch(`/api/approvals/${approvalId}/reject`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      setMessages((prev) => [...prev, { id: `changes-${Date.now()}`, role: "ceo", text: "Demande envoyee. Le CEO va preparer une nouvelle version.", timestamp: new Date().toISOString() }]);
      setChangeRequestId(null);
      setChangeRequestText("");
      await load();
    } finally {
      setActionBusy(null);
    }
  };

  return (
    <main className="agency-root">
      <style>{styles}</style>
      <div className="messenger-shell">
        <header className="topbar">
          <div className="brand-mark"><Sparkles size={17} /> AI Company OS</div>
          <div className="status-pill"><span className="online-dot" /> CEO AI en ligne</div>
          <div className={`status-pill soft ${primaryStatus.kind === "ready" ? "ready" : ""}`}><Zap size={13} /> {primaryStatus.badge}</div>
          <Link href="/ceo/expert" className="expert-link">Mode expert <ChevronRight size={13} /></Link>
        </header>

        <aside className="left-rail">
          <SectionTitle icon={<BriefcaseBusiness size={14} />} label="Mes entreprises" />
          <div className="contact-list">
            {companies.length === 0 ? (
              <div className="empty-hint">
                Commence par dire au CEO quelle entreprise tu veux lancer.
                <span>Exemples: compagnie de photo, marque de vetements, agence marketing AI.</span>
              </div>
            ) : companies.map((company) => (
              <div key={company.id} className="company-card active">
                <Avatar label={company.avatar} color="#38bdf8" pulse={company.status !== "Pret a lancer"} />
                <div className="contact-copy">
                  <strong>{company.name}</strong>
                  <span>{company.type ?? "Entreprise"} · {company.projectsCount} projet{company.projectsCount > 1 ? "s" : ""}</span>
                  <small>{company.lastResult ? `Dernier resultat: ${company.lastResult.title}` : "Dis au CEO ce que tu veux creer"}</small>
                </div>
                {company.hasPendingApproval && <b className="mini-badge">Action</b>}
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
              const output = outputForProject(project, outputs);
              const approval = approvalForSession(project.sessionId, approvals);
              const status = simpleStatusFor(session, output, approval);
              return (
                <Link key={project.id} href={project.sessionId ? `/mission/${project.sessionId}` : "/projects"} className={`project-row ${status.kind === "ready" ? "needs-action" : ""}`}>
                  <div>
                    <strong>{project.name}</strong>
                    <span>{company?.name ?? "Entreprise AI"}</span>
                  </div>
                  {output && <small>Dernier resultat: {output.title}</small>}
                  <div className="progress-mini">
                    <span>{status.label}</span>
                    <div><i style={{ width: `${status.progress}%` }} /></div>
                  </div>
                  {status.kind === "ready" && <b className="ready-badge">Pret a approuver</b>}
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
              <span>{primaryApproval ? "Resultat pret - ta decision debloque la suite." : "Dis-lui ce que tu veux creer. Il lance les agents automatiquement."}</span>
            </div>
          </div>

          <div className="chat-stream">
            {loadError && <div className="system-note">{loadError}</div>}
            {loading && <div className="system-note">Connexion au runtime...</div>}
            {primaryApproval && (
              <div className="primary-approval-banner">
                <div>
                  <strong>Pret a approuver</strong>
                  <span>Les agents ont prepare un premier resultat. Valide-le ou demande des changements.</span>
                </div>
                <button disabled={!primaryApproval.canApprove || actionBusy === primaryApproval.item.id} onClick={() => void approveApproval(primaryApproval.item.id)}>Approuver</button>
              </div>
            )}
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
                      <div className="agent-name"><CheckCircle2 size={13} /> Pret a approuver</div>
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
                      <span className="agent-dot-avatar" style={{ background: update.color }}>{update.agent.slice(0, 2).toUpperCase()}</span>
                      <div><strong>{update.agent}</strong><em>{update.text}</em></div>
                      <small>maintenant</small>
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
                  {agent.lastResult && <small>{agent.lastResult}</small>}
                </div>
                <em className={`agent-state ${agent.status === "Travaille" ? "working" : agent.status === "A livre" ? "done" : agent.status.includes("Attend") ? "waiting" : ""}`}>{agent.status}</em>
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
                  <span>{simpleStatusFor(sessions.find((s) => s.sessionId === output.sessionId), output, approvalForSession(output.sessionId, approvals)).label}</span>
                </div>
                <p>{output.summary || output.preview}</p>
                <div className="result-actions">
                  <Link href={`/outputs/${output.id}`}>Voir</Link>
                  {(output.status === "review" || activeSessionIds.has(output.sessionId)) && (
                    <button disabled={actionBusy === output.id} onClick={() => void approveOutput(output.id)}>Approuver</button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <SectionTitle icon={<CheckCircle2 size={14} />} label="A approuver" />
          {approvals.length === 0 ? <EmptyHint text="Aucune decision urgente." /> : approvals.slice(0, 3).map((approval) => (
            <div key={approval.item.id} className={`approval-card ${approval.item.id === primaryApproval?.item.id ? "featured" : ""}`}>
              <div className="approval-card-head">
                <strong>{approval.item.id === primaryApproval?.item.id ? "Pret a approuver" : "En attente"}</strong>
                <span>{simpleStatusFor(sessions.find((s) => s.sessionId === approval.item.sessionId), null, approval).label}</span>
              </div>
              <VisualOutputPreview visualPreview={approval.visualPreview} title={approval.item.title} summary={approval.item.summary} compact={approval.item.id !== primaryApproval?.item.id} />
              <strong>{approval.item.title}</strong>
              <span>{approval.item.summary}</span>
              <div className="result-actions">
                <button className="primary-action" disabled={!approval.canApprove || actionBusy === approval.item.id} onClick={() => void approveApproval(approval.item.id)}>Approuver</button>
                <button className="reject-action" disabled={actionBusy === approval.item.id} onClick={() => { setChangeRequestId(approval.item.id); setChangeRequestText(""); }}>Demander des changements</button>
                <Link className="quiet-action" href={approval.item.sessionId ? `/mission/${approval.item.sessionId}` : "/outputs"}>Voir details</Link>
              </div>
              {changeRequestId === approval.item.id && (
                <form className="change-request" onSubmit={(event) => {
                  event.preventDefault();
                  const reason = changeRequestText.trim() || "Je veux une nouvelle version plus proche de ma direction.";
                  void rejectApproval(approval.item.id, reason);
                }}>
                  <label>Quels changements veux-tu demander?</label>
                  <textarea
                    value={changeRequestText}
                    onChange={(event) => setChangeRequestText(event.target.value)}
                    placeholder="Ex: Je veux quelque chose de plus luxe et minimaliste"
                  />
                  <div>
                    <button type="submit" disabled={actionBusy === approval.item.id}>Envoyer la demande</button>
                    <button type="button" onClick={() => setChangeRequestId(null)}>Annuler</button>
                  </div>
                </form>
              )}
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
.status-pill.ready { color: #92400e; background: rgba(245,158,11,0.14); border-color: rgba(245,158,11,0.28); }
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
.mini-badge, .ready-badge { align-self: start; justify-self: end; border-radius: 999px; background: rgba(245,158,11,0.16); color: #92400e; border: 1px solid rgba(245,158,11,0.24); padding: 4px 7px; font-size: 9px; font-weight: 900; text-transform: uppercase; }
.project-row { padding: 10px; text-decoration: none; display: grid; gap: 8px; }
.project-row.needs-action { border-color: rgba(245,158,11,0.45); background: linear-gradient(135deg, rgba(255,255,255,0.96), rgba(254,243,199,0.62)); }
.project-row small { color: #94a3b8; font-size: 10px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.progress-mini { display: grid; gap: 5px; }
.progress-mini div { height: 5px; background: #e2e8f0; border-radius: 99px; overflow: hidden; }
.progress-mini i { display: block; height: 100%; background: linear-gradient(90deg, #38bdf8, #8b5cf6); border-radius: inherit; }
.approval-mini { padding: 9px 10px; display: flex; gap: 7px; color: #92400e; text-decoration: none; font-size: 12px; font-weight: 800; background: rgba(254,243,199,0.72); }
.conversation { min-width: 0; display: grid; grid-template-rows: auto 1fr auto; background: rgba(255,255,255,0.54); }
.chat-header { display: flex; gap: 10px; align-items: center; padding: 14px 18px; border-bottom: 1px solid rgba(59,130,246,0.12); background: rgba(255,255,255,0.52); }
.chat-header strong { display: block; font-size: 15px; }
.chat-header span { color: #64748b; font-size: 12px; }
.chat-stream { overflow: auto; padding: 18px; display: flex; flex-direction: column; gap: 12px; }
.system-note { align-self: center; border: 1px solid rgba(148,163,184,0.22); background: rgba(255,255,255,0.7); color: #64748b; border-radius: 999px; padding: 7px 11px; font-size: 11px; font-weight: 800; }
.primary-approval-banner { display: flex; justify-content: space-between; gap: 12px; align-items: center; border: 1px solid rgba(245,158,11,0.32); background: linear-gradient(135deg, rgba(255,255,255,0.96), rgba(254,243,199,0.74)); border-radius: 16px; padding: 12px; box-shadow: 0 12px 28px rgba(146,64,14,0.1); }
.primary-approval-banner div { display: grid; gap: 2px; min-width: 0; }
.primary-approval-banner strong { color: #92400e; font-size: 13px; }
.primary-approval-banner span { color: #64748b; font-size: 12px; line-height: 1.4; }
.primary-approval-banner button { border: none; border-radius: 999px; background: linear-gradient(135deg, #22c55e, #15803d); color: #fff; padding: 8px 12px; font-size: 12px; font-weight: 900; cursor: pointer; white-space: nowrap; }
.primary-approval-banner button:disabled { opacity: 0.5; cursor: not-allowed; }
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
.agent-update { align-self: flex-start; display: flex; align-items: center; gap: 8px; color: #475569; font-size: 12px; background: rgba(255,255,255,0.72); border: 1px solid rgba(148,163,184,0.18); border-radius: 999px; padding: 6px 9px; }
.agent-dot-avatar { width: 26px; height: 26px; border-radius: 50%; color: #fff; display: grid; place-items: center; font-size: 9px; font-weight: 900; flex: 0 0 auto; }
.agent-update strong { margin-right: 6px; color: #0f172a; }
.agent-update em { font-style: normal; }
.agent-update small { color: #94a3b8; font-size: 10px; margin-left: 4px; }
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
.agent-row small { color: #94a3b8; font-size: 10px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.agent-state { border-radius: 999px; background: rgba(148,163,184,0.14); color: #64748b; border: 1px solid rgba(148,163,184,0.2); padding: 4px 7px; font-size: 9px; font-weight: 900; font-style: normal; white-space: nowrap; }
.agent-state.working { background: rgba(34,197,94,0.12); color: #15803d; border-color: rgba(34,197,94,0.24); }
.agent-state.done { background: rgba(59,130,246,0.1); color: #2563eb; border-color: rgba(59,130,246,0.2); }
.agent-state.waiting { background: rgba(245,158,11,0.14); color: #92400e; border-color: rgba(245,158,11,0.24); }
.result-card { padding: 10px; display: grid; gap: 8px; }
.result-meta { display: flex; justify-content: space-between; gap: 8px; align-items: center; }
.result-card p { margin: 0; color: #64748b; font-size: 11px; line-height: 1.45; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.result-actions { display: flex; gap: 6px; flex-wrap: wrap; }
.result-actions button { color: #15803d; border-color: rgba(34,197,94,0.25); background: rgba(34,197,94,0.09); }
.result-actions button:disabled { opacity: 0.45; cursor: not-allowed; }
.result-actions .primary-action { color: #fff; border-color: transparent; background: linear-gradient(135deg, #22c55e, #15803d); }
.result-actions .reject-action { color: #92400e; border-color: rgba(245,158,11,0.28); background: rgba(245,158,11,0.1); }
.result-actions .quiet-action { color: #64748b; background: rgba(148,163,184,0.08); border-color: rgba(148,163,184,0.18); }
.approval-card { display: grid; gap: 8px; text-decoration: none; padding: 10px; }
.approval-card.featured { border-color: rgba(245,158,11,0.42); background: linear-gradient(135deg, rgba(255,255,255,0.97), rgba(254,243,199,0.64)); box-shadow: 0 14px 30px rgba(146,64,14,0.12); }
.approval-card-head { display: flex; justify-content: space-between; gap: 8px; align-items: center; }
.approval-card-head strong { color: #92400e; font-size: 11px; text-transform: uppercase; }
.approval-card-head span { color: #64748b; font-size: 10px; text-align: right; }
.approval-card strong { color: #0f172a; font-size: 12px; }
.approval-card small { color: #b45309; font-size: 10px; font-weight: 800; }
.approval-card em { color: #7c3aed; font-size: 11px; font-style: normal; font-weight: 900; }
.change-request { display: grid; gap: 7px; border-top: 1px solid rgba(245,158,11,0.2); padding-top: 8px; }
.change-request label { color: #92400e; font-size: 11px; font-weight: 900; }
.change-request textarea { min-height: 74px; resize: vertical; border: 1px solid rgba(245,158,11,0.28); border-radius: 10px; padding: 9px; font: inherit; font-size: 12px; color: #0f172a; background: rgba(255,255,255,0.88); outline: none; }
.change-request div { display: flex; gap: 6px; }
.change-request button { border: 1px solid rgba(245,158,11,0.28); border-radius: 999px; padding: 6px 9px; font-size: 11px; font-weight: 900; color: #92400e; background: rgba(245,158,11,0.1); cursor: pointer; }
.change-request button:first-child { color: #fff; border-color: transparent; background: linear-gradient(135deg, #f59e0b, #d97706); }
.empty-hint span { display: block; margin-top: 5px; color: #64748b; }
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
