"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Bot,
  Building2,
  CheckCircle2,
  FolderKanban,
  MessageSquare,
  RefreshCw,
} from "lucide-react";
import { VisualOutputPreview } from "@/components/previews/VisualOutputPreview";
import type { ApprovalItem, ApprovalPreview } from "@/lib/approvalPreview";
import type { OutputVisualPreview } from "@/lib/visibleOutputs";

type PageVariant = "dashboard" | "companies" | "projects" | "agents" | "outputs" | "approvals";
type SessionStatus = "draft" | "running" | "paused" | "waiting_approval" | "completed" | "failed";

interface CeoProject {
  id: string;
  name: string;
  missionType: string;
  status: string;
  sessionId: string | null;
  workspaceId?: string | null;
  progress: number;
  outputsCount: number;
  updatedAt?: string;
  lastActivity?: string;
}

interface AutopilotSession {
  sessionId: string;
  projectName: string;
  projectIdea: string;
  missionType: string;
  businessStatus: string;
  status: SessionStatus;
  progress: number;
  assignedAgents: { agentId: string; role: string; status: string; provider?: string }[];
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

interface SimpleCompany {
  id: string;
  name: string;
  type: string;
  status: string;
  avatar: string;
  projectsCount: number;
  projectIds: string[];
  hasPendingApproval: boolean;
  lastResult?: VisibleOutput;
}

interface SimpleApproval {
  item: ApprovalItem;
  preview: ApprovalPreview | null;
  visualPreview: OutputVisualPreview | null;
  canApprove: boolean;
}

interface SimpleAgencyView {
  companies: SimpleCompany[];
  projects: CeoProject[];
  sessions: AutopilotSession[];
  outputs: VisibleOutput[];
  approvals: SimpleApproval[];
}

interface AgentSummary {
  id: string;
  name: string;
  role: string;
  avatar: string;
  status: string;
  task: string;
  projectName?: string;
}

const EMPTY_VIEW: SimpleAgencyView = {
  companies: [],
  projects: [],
  sessions: [],
  outputs: [],
  approvals: [],
};

const AGENT_NAMES: Record<string, { name: string; role: string; avatar: string }> = {
  ceo: { name: "CEO AI", role: "Coordination", avatar: "AI" },
  cmo: { name: "Brand Strategist", role: "Direction creative", avatar: "BS" },
  frontend_agent: { name: "Designer", role: "Design et rendu", avatar: "DS" },
  product_agent: { name: "Growth Agent", role: "Offre et positionnement", avatar: "GA" },
  qa_agent: { name: "Quality Agent", role: "Verification", avatar: "QA" },
  architect_agent: { name: "Systems Agent", role: "Structure", avatar: "SA" },
  backend_agent: { name: "Build Agent", role: "Execution", avatar: "BA" },
  devops_agent: { name: "Launch Agent", role: "Livraison", avatar: "LA" },
};

const PAGE_COPY: Record<PageVariant, { eyebrow: string; title: string; subtitle: string }> = {
  dashboard: {
    eyebrow: "Simple OS",
    title: "Ce que votre agence AI fait maintenant",
    subtitle: "Entreprises, projets, agents, resultats et decisions dans une seule vue claire.",
  },
  companies: {
    eyebrow: "Entreprises",
    title: "Les entreprises que vous construisez",
    subtitle: "Chaque entreprise regroupe ses projets, ses resultats et ses prochaines decisions.",
  },
  projects: {
    eyebrow: "Projets",
    title: "Projets actifs",
    subtitle: "Suivez les missions en cours sans pourcentages techniques ni logs bruyants.",
  },
  agents: {
    eyebrow: "Equipe AI",
    title: "Agents au travail",
    subtitle: "Une equipe lisible: qui travaille, qui a livre, et qui attend votre decision.",
  },
  outputs: {
    eyebrow: "Resultats",
    title: "Resultats produits",
    subtitle: "Les directions creatives, concepts, palettes et recommandations livres par vos agents.",
  },
  approvals: {
    eyebrow: "Approvals",
    title: "Decisions a prendre",
    subtitle: "Approuvez un resultat ou demandez une iteration directement depuis l'inbox.",
  },
};

function simpleStatus(project: CeoProject, session?: AutopilotSession, approval?: SimpleApproval | null) {
  if (approval || session?.status === "waiting_approval" || project.status === "review") {
    return { label: "Resultat pret - approbation requise", badge: "Action requise", className: "ready", progress: 100 };
  }
  if (project.status === "approved") return { label: "Approuve", badge: "Approuve", className: "approved", progress: 100 };
  if (project.status === "changes_requested" || project.status === "rejected") {
    return { label: "Changements demandes", badge: "Iteration", className: "changes", progress: 100 };
  }
  if (session?.status === "running" || project.status === "in_progress") {
    return { label: "Agents au travail", badge: "En cours", className: "working", progress: Math.max(project.progress ?? 0, session?.progress ?? 0, 24) };
  }
  if (session?.status === "completed" || project.status === "delivered") return { label: "Termine", badge: "Livre", className: "done", progress: 100 };
  if (session?.status === "failed") return { label: "A verifier", badge: "A verifier", className: "warning", progress: project.progress ?? session.progress };
  return { label: "En preparation", badge: "Preparation", className: "neutral", progress: project.progress ?? 0 };
}

function companyForProject(project: CeoProject, companies: SimpleCompany[]) {
  return companies.find((company) => company.id === project.workspaceId || company.projectIds.includes(project.id));
}

function sessionForProject(project: CeoProject, sessions: AutopilotSession[]) {
  return sessions.find((session) => session.sessionId === project.sessionId);
}

function outputForProject(project: CeoProject, outputs: VisibleOutput[]) {
  return outputs.find((output) => output.projectId === project.id || (!!project.sessionId && output.sessionId === project.sessionId));
}

function approvalForProject(project: CeoProject, approvals: SimpleApproval[]) {
  return approvals.find((approval) => approval.item.sessionId === project.sessionId);
}

function cleanType(value?: string | null) {
  if (!value) return "Entreprise";
  return value.replace(/_/g, " ");
}

function displayDate(value?: string | null) {
  if (!value) return "Recent";
  try {
    return new Intl.DateTimeFormat("fr-CA", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
  } catch {
    return "Recent";
  }
}

function previewForApproval(approval: SimpleApproval): OutputVisualPreview {
  if (approval.visualPreview) return approval.visualPreview;
  return {
    kind: "brand_card",
    logoText: "AI",
    tagline: "Concept pret pour validation",
    colors: ["#172033", "#2f6fed", "#e9f2ff", "#d8a63f"],
    typography: { heading: "Inter SemiBold", body: "Inter Regular" },
    mockup: {
      title: approval.item.title || "Logo Concept",
      subtitle: approval.item.summary || "Brand board",
      blocks: ["Premium", "Clair", "Moderne"],
    },
  };
}

function agentsFromView(view: SimpleAgencyView): AgentSummary[] {
  const byAgent = new Map<string, AgentSummary>();
  view.sessions.forEach((session) => {
    session.assignedAgents.forEach((agent) => {
      const meta = AGENT_NAMES[agent.agentId] ?? {
        name: agent.agentId.replace(/_/g, " "),
        role: agent.role || "Agent AI",
        avatar: agent.agentId.slice(0, 2).toUpperCase(),
      };
      const delivered = view.outputs.some((output) => output.sessionId === session.sessionId && output.assignedAgent === agent.agentId);
      const pending = view.approvals.some((approval) => approval.item.sessionId === session.sessionId);
      byAgent.set(agent.agentId, {
        id: agent.agentId,
        name: meta.name,
        role: meta.role,
        avatar: meta.avatar,
        status: pending ? "Attend decision" : delivered ? "A livre" : session.status === "running" ? "Travaille" : "En ligne",
        task: delivered ? "Resultat produit" : session.runtime?.lastEvent || "Disponible pour le prochain projet",
        projectName: session.projectName,
      });
    });
  });

  if (!byAgent.has("ceo")) {
    byAgent.set("ceo", {
      id: "ceo",
      name: "CEO AI",
      role: "Coordination",
      avatar: "AI",
      status: view.approvals.length > 0 ? "Attend decision" : "En ligne",
      task: view.projects.length > 0 ? "Coordonne les projets actifs" : "Pret a lancer une entreprise",
    });
  }

  return Array.from(byAgent.values());
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="os-empty">
      <div className="os-empty-icon"><MessageSquare size={20} /></div>
      <h3>{title}</h3>
      <p>{description}</p>
      <Link className="os-button primary" href="/ceo">Parler au CEO</Link>
    </div>
  );
}

function CompanyCard({ company, projects }: { company: SimpleCompany; projects: CeoProject[] }) {
  const linked = projects.filter((project) => company.projectIds.includes(project.id) || project.workspaceId === company.id);
  return (
    <article className={`os-card os-company-card${company.hasPendingApproval ? " needs-action" : ""}`}>
      <div className="os-card-top">
        <div className="os-avatar">{company.avatar}</div>
        <span className={`os-pill ${company.hasPendingApproval ? "ready" : "neutral"}`}>{company.hasPendingApproval ? "Action requise" : company.status}</span>
      </div>
      <h3>{company.name}</h3>
      <p>{cleanType(company.type)}</p>
      <div className="os-meta-line">
        <span>{company.projectsCount} projet{company.projectsCount > 1 ? "s" : ""}</span>
        <span>{company.lastResult?.title ?? "Aucun resultat recent"}</span>
      </div>
      {linked.length > 0 && (
        <div className="os-mini-list">
          {linked.slice(0, 3).map((project) => <span key={project.id}>{project.name}</span>)}
        </div>
      )}
    </article>
  );
}

function ProjectCard({ project, view }: { project: CeoProject; view: SimpleAgencyView }) {
  const company = companyForProject(project, view.companies);
  const session = sessionForProject(project, view.sessions);
  const output = outputForProject(project, view.outputs);
  const approval = approvalForProject(project, view.approvals);
  const state = simpleStatus(project, session, approval);
  return (
    <article className={`os-card os-project-card ${state.className}`}>
      <div className="os-card-top">
        <span className={`os-pill ${state.className}`}>{state.badge}</span>
        <span className="os-muted">{displayDate(project.updatedAt ?? project.lastActivity)}</span>
      </div>
      <h3>{project.name}</h3>
      <p>{company?.name ?? "Entreprise a definir"} · {cleanType(project.missionType)}</p>
      <div className="os-progress" aria-label={`${state.progress}%`}>
        <span style={{ width: `${Math.min(100, Math.max(0, state.progress))}%` }} />
      </div>
      <div className="os-meta-line">
        <span>{state.label}</span>
        <span>{output?.title ?? "Resultat en preparation"}</span>
      </div>
      <div className="os-card-actions">
        {project.sessionId && <Link className="os-button subtle" href={`/mission/${project.sessionId}`}>Mission Room</Link>}
        <Link className="os-button subtle" href="/ceo">CEO</Link>
      </div>
    </article>
  );
}

function ResultCard({ output }: { output: VisibleOutput }) {
  return (
    <article className="os-card os-result-card">
      {output.visualPreview ? (
        <VisualOutputPreview visualPreview={output.visualPreview} title={output.title} compact />
      ) : (
        <div className="os-structured-preview">
          <span>{output.type.replace(/_/g, " ")}</span>
          <strong>{output.title}</strong>
          <p>{output.summary || output.preview}</p>
        </div>
      )}
      <div className="os-card-top">
        <span className="os-pill neutral">{output.status.replace(/_/g, " ")}</span>
        <span className="os-muted">{displayDate(output.updatedAt)}</span>
      </div>
      <h3>{output.title}</h3>
      <p>{output.summary || output.preview}</p>
    </article>
  );
}

function AgentCard({ agent }: { agent: AgentSummary }) {
  const statusClass = agent.status.includes("decision") ? "ready" : agent.status.includes("Travaille") ? "working" : agent.status.includes("livre") ? "approved" : "neutral";
  return (
    <article className="os-card os-agent-card">
      <div className="os-card-top">
        <div className="os-avatar soft">{agent.avatar}</div>
        <span className={`os-pill ${statusClass}`}>{agent.status}</span>
      </div>
      <h3>{agent.name}</h3>
      <p>{agent.role}</p>
      <div className="os-agent-task">{agent.task}</div>
      {agent.projectName && <span className="os-muted">{agent.projectName}</span>}
    </article>
  );
}

function ApprovalCard({ approval, onDone }: { approval: SimpleApproval; onDone: () => Promise<void> }) {
  const [mode, setMode] = useState<"idle" | "change">("idle");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const visual = previewForApproval(approval);

  const approve = async () => {
    setBusy(true);
    await fetch(`/api/approvals/${approval.item.id}/approve`, { method: "POST" });
    await onDone();
    setBusy(false);
  };

  const reject = async () => {
    if (!note.trim()) return;
    setBusy(true);
    await fetch(`/api/approvals/${approval.item.id}/reject`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: note }),
    });
    setNote("");
    setMode("idle");
    await onDone();
    setBusy(false);
  };

  return (
    <article className="os-card os-approval-card">
      <div className="os-card-top">
        <span className="os-pill ready">Pret a approuver</span>
        <span className="os-muted">{displayDate(approval.item.createdAt)}</span>
      </div>
      <VisualOutputPreview visualPreview={visual} title={approval.item.title} compact={false} />
      <h3>{approval.item.title}</h3>
      <p>{approval.item.summary || "Les agents ont prepare un resultat. Validez-le ou demandez une iteration."}</p>
      <div className="os-card-actions">
        <button className="os-button primary" type="button" onClick={approve} disabled={busy || !approval.canApprove}>
          Approuver
        </button>
        <button className="os-button subtle" type="button" onClick={() => setMode("change")} disabled={busy}>
          Demander des changements
        </button>
        <Link className="os-button ghost" href={approval.item.sessionId ? `/mission/${approval.item.sessionId}` : "/outputs"}>
          Voir details
        </Link>
      </div>
      {mode === "change" && (
        <div className="os-change-box">
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Quels changements voulez-vous demander?"
          />
          <button className="os-button primary" type="button" onClick={reject} disabled={busy || !note.trim()}>
            Envoyer la demande
          </button>
        </div>
      )}
    </article>
  );
}

export function AgencyDashboard({ variant }: { variant: PageVariant }) {
  const [view, setView] = useState<SimpleAgencyView>(EMPTY_VIEW);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const copy = PAGE_COPY[variant];

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/ceo/simple-agency", { cache: "no-store" });
      if (!res.ok) throw new Error("load failed");
      const payload = await res.json().catch(() => ({}));
      setView({ ...EMPTY_VIEW, ...(payload.view ?? {}) });
      setError("");
    } catch {
      setError("Impossible de charger les donnees de l'agence.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), 8000);
    return () => window.clearInterval(timer);
  }, [load]);

  const agents = useMemo(() => agentsFromView(view), [view]);
  const activeProject = view.projects.find((project) => approvalForProject(project, view.approvals)) ?? view.projects[0];
  const activeSession = activeProject ? sessionForProject(activeProject, view.sessions) : undefined;
  const activeState = activeProject ? simpleStatus(activeProject, activeSession, approvalForProject(activeProject, view.approvals)) : null;
  const pendingApprovals = view.approvals.filter((approval) => approval.item.status === "pending");

  const metrics = [
    { label: "Entreprises", value: view.companies.length, icon: <Building2 size={16} /> },
    { label: "Projets actifs", value: view.projects.length, icon: <FolderKanban size={16} /> },
    { label: "Agents visibles", value: agents.length, icon: <Bot size={16} /> },
    { label: "A approuver", value: pendingApprovals.length, icon: <CheckCircle2 size={16} /> },
  ];

  return (
    <main className="os-page">
      <section className="os-hero">
        <div>
          <span className="os-eyebrow">{copy.eyebrow}</span>
          <h1>{copy.title}</h1>
          <p>{copy.subtitle}</p>
        </div>
        <div className="os-hero-actions">
          <button className="os-button subtle" type="button" onClick={() => void load()}>
            <RefreshCw size={14} /> Actualiser
          </button>
          <Link className="os-button primary" href="/ceo">
            Parler au CEO <ArrowRight size={14} />
          </Link>
        </div>
      </section>

      {error && <div className="os-alert">{error}</div>}

      {variant === "dashboard" && (
        <>
          <div className="os-metric-grid">
            {metrics.map((metric) => (
              <div className="os-metric-card" key={metric.label}>
                <div>{metric.icon}</div>
                <span>{metric.label}</span>
                <strong>{loading ? "..." : metric.value}</strong>
              </div>
            ))}
          </div>

          <section className="os-now-grid">
            <div className="os-card os-now-card">
              <span className="os-eyebrow">Ce qui se passe maintenant</span>
              {activeProject && activeState ? (
                <>
                  <h2>{activeProject.name}</h2>
                  <p>{activeState.label}</p>
                  <div className="os-progress large"><span style={{ width: `${activeState.progress}%` }} /></div>
                  <div className="os-card-actions">
                    {activeProject.sessionId && <Link className="os-button subtle" href={`/mission/${activeProject.sessionId}`}>Mission Room</Link>}
                    <Link className="os-button primary" href="/approvals">Voir actions</Link>
                  </div>
                </>
              ) : (
                <EmptyState title="Aucun projet actif" description="Commencez par dire au CEO quelle entreprise vous voulez lancer." />
              )}
            </div>
            <div className="os-card os-next-action">
              <span className="os-eyebrow">Prochaine action</span>
              <h2>{pendingApprovals[0] ? "Un resultat attend votre decision" : "Parlez au CEO pour lancer la suite"}</h2>
              <p>{pendingApprovals[0] ? "Les agents ont prepare un premier resultat. Approuvez-le ou demandez des changements." : "Le CEO peut creer l'entreprise, le projet et demarrer la mission automatiquement."}</p>
              <Link className="os-button primary" href={pendingApprovals[0] ? "/approvals" : "/ceo"}>
                {pendingApprovals[0] ? "Ouvrir l'inbox" : "Demarrer"}
              </Link>
            </div>
          </section>
        </>
      )}

      {(variant === "dashboard" || variant === "companies") && (
        <section className="os-section">
          <div className="os-section-title">
            <div><span className="os-eyebrow">Entreprises</span><h2>Mes entreprises</h2></div>
            <Link href="/companies">Tout voir</Link>
          </div>
          {view.companies.length === 0 ? (
            <EmptyState title="Aucune entreprise pour le moment" description="Commencez par dire au CEO quelle entreprise vous voulez lancer." />
          ) : (
            <div className="os-grid cards">{view.companies.map((company) => <CompanyCard key={company.id} company={company} projects={view.projects} />)}</div>
          )}
        </section>
      )}

      {(variant === "dashboard" || variant === "projects") && (
        <section className="os-section">
          <div className="os-section-title">
            <div><span className="os-eyebrow">Projets</span><h2>Projets actifs</h2></div>
            <Link href="/projects">Tout voir</Link>
          </div>
          {view.projects.length === 0 ? (
            <EmptyState title="Aucun projet actif" description="Ecrivez au CEO: Je veux un logo pour une compagnie de photo." />
          ) : (
            <div className="os-grid cards">{view.projects.map((project) => <ProjectCard key={project.id} project={project} view={view} />)}</div>
          )}
        </section>
      )}

      {(variant === "dashboard" || variant === "agents") && (
        <section className="os-section">
          <div className="os-section-title">
            <div><span className="os-eyebrow">Agents</span><h2>Equipe AI active</h2></div>
            <Link href="/agents">Tout voir</Link>
          </div>
          <div className="os-grid agents">{agents.map((agent) => <AgentCard key={agent.id} agent={agent} />)}</div>
        </section>
      )}

      {variant === "dashboard" && (
        <section className="os-section">
          <div className="os-section-title">
            <div><span className="os-eyebrow">Resultats</span><h2>Resultats recents</h2></div>
            <Link href="/outputs">Tout voir</Link>
          </div>
          {view.outputs.length === 0 ? (
            <EmptyState title="Aucun resultat visible" description="Les resultats apparaitront ici des que les agents livrent un output." />
          ) : (
            <div className="os-grid results">{view.outputs.slice(0, 4).map((output) => <ResultCard key={output.id} output={output} />)}</div>
          )}
        </section>
      )}

      {variant === "outputs" && (
        <section className="os-section">
          <div className="os-section-title">
            <div><span className="os-eyebrow">Resultats</span><h2>Resultats recents</h2></div>
            <Link href="/approvals">Voir les decisions</Link>
          </div>
          {view.outputs.length === 0 ? (
            <EmptyState title="Aucun resultat visible" description="Les resultats apparaitront ici avec une preview des que les agents livrent un output." />
          ) : (
            <div className="os-grid results">{view.outputs.map((output) => <ResultCard key={output.id} output={output} />)}</div>
          )}
        </section>
      )}

      {(variant === "dashboard" || variant === "approvals") && (
        <section className="os-section">
          <div className="os-section-title">
            <div><span className="os-eyebrow">Approvals</span><h2>{pendingApprovals.length > 0 ? "A approuver maintenant" : "Inbox approvals"}</h2></div>
            <Link href="/approvals">Ouvrir</Link>
          </div>
          {pendingApprovals.length === 0 ? (
            <EmptyState title="Aucune decision en attente" description="Quand une mission arrive au stade d'approbation, la preview apparait ici." />
          ) : (
            <div className="os-grid approvals">{pendingApprovals.map((approval) => <ApprovalCard key={approval.item.id} approval={approval} onDone={load} />)}</div>
          )}
        </section>
      )}
    </main>
  );
}
