import { getAllProjects } from "@/lib/projects";
import { listCeoProjects, type CeoProject } from "@/lib/ceoProjectStore";
import { getOutputsForSession } from "@/lib/visibleOutputs";
import Link from "next/link";

function statusClass(status?: string) {
  const map: Record<string, string> = {
    active: "badge-green",
    initialized: "badge-blue",
    paused: "badge-yellow",
    completed: "badge-purple",
    failed: "badge-red",
    starting: "badge-blue",
    in_progress: "badge-green",
    review: "badge-yellow",
    delivered: "badge-purple",
  };
  return map[status ?? ""] ?? "badge-gray";
}

function priorityStyle(priority?: string) {
  if (priority === "high")   return { color: "var(--red)",    bg: "var(--red-dim)" };
  if (priority === "medium") return { color: "var(--yellow)", bg: "var(--yellow-dim)" };
  if (priority === "low")    return { color: "var(--blue)",   bg: "var(--blue-dim)" };
  return { color: "var(--text-3)", bg: "rgba(139,151,178,0.1)" };
}

export default function ProjectsPage() {
  const projects = getAllProjects();
  const ceoProjects = listCeoProjects();
  const totalCount = projects.length + ceoProjects.length;

  // Status label map for CEO projects
  const statusLabel: Record<string, string> = {
    starting: "Démarrage",
    in_progress: "En cours",
    review: "En révision",
    delivered: "Livré",
  };

  // Mission type label map
  const missionTypeLabel: Record<string, string> = {
    branding_pack: "Branding",
    website: "Site web",
    flyer: "Flyer",
    ecommerce_store: "E-commerce",
    saas_project: "SaaS",
    social_campaign: "Campagne sociale",
    automation_workflow: "Automation",
    business_card: "Carte d'affaires",
  };

  return (
    <main className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Projects</h1>
          <p className="page-subtitle">
            {totalCount} project{totalCount !== 1 ? "s" : ""} — créés par le CEO et l&apos;équipe AI
          </p>
        </div>
        <div className="page-actions">
          <Link href="/ceo" className="btn" style={{ background: "#f59e0b", color: "#fff", borderColor: "#f59e0b" }}>
            <svg width="13" height="13" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd"/>
            </svg>
            Parler au CEO
          </Link>
        </div>
      </div>

      {totalCount === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div style={{ fontSize: 48, marginBottom: 12 }}>👑</div>
            <div className="empty-state-title">Aucun projet encore</div>
            <div className="empty-state-sub">Parlez au CEO pour créer votre premier projet. Il comprendra votre demande et lancera l&apos;équipe automatiquement.</div>
            <Link href="/ceo" className="btn" style={{ marginTop: 8, background: "#f59e0b", color: "#fff", borderColor: "#f59e0b" }}>Parler au CEO</Link>
          </div>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
            gap: 14,
          }}
        >
          {/* CEO-created projects — shown first */}
          {ceoProjects.map((cp) => {
            const latestOutput = cp.sessionId ? getOutputsForSession(cp.sessionId)[0] : null;
            return (
            <Link key={cp.id} href={cp.sessionId ? `/mission/${cp.sessionId}` : `/projects/${cp.name}`} className="project-card-link">
              <div className="project-card" style={{ borderLeft: "3px solid #8b5cf6" }}>
                <div className="project-card-header">
                  <span className="project-name">{cp.name}</span>
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <span className="badge" style={{ background: "rgba(139,92,246,0.15)", color: "#8b5cf6" }}>{missionTypeLabel[cp.missionType] ?? cp.missionType}</span>
                    <span className={`badge ${statusClass(cp.status)}`}>{statusLabel[cp.status] ?? cp.status.replace("_", " ")}</span>
                  </div>
                </div>
                <div className="project-progress-bar">
                  <div className="project-progress-fill" style={{ width: `${cp.progress}%`, background: cp.progress >= 100 ? "var(--green)" : cp.progress >= 50 ? "linear-gradient(90deg, #3b82f6, #8b5cf6)" : "var(--blue)" }} />
                </div>
                <div className="project-stats">
                  <div className="project-stat"><span className="project-stat-value" style={{ color: "#8b5cf6" }}>{cp.outputsCount}</span><span className="project-stat-label">Outputs</span></div>
                  <div className="project-stat"><span className="project-stat-value" style={{ color: cp.progress >= 80 ? "var(--green)" : "var(--text-3)" }}>{cp.progress}%</span><span className="project-stat-label">Progress</span></div>
                  {cp.sessionId && (
                    <div className="project-stat"><span className="project-stat-value" style={{ color: "#3b82f6", fontSize: 10 }}>Mission Room</span><span className="project-stat-label">Voir</span></div>
                  )}
                  <div className="project-stat" style={{ marginLeft: "auto" }}><span className="project-stat-value" style={{ color: "var(--text-3)", fontSize: 10 }}>{new Date(cp.lastActivity).toLocaleDateString()}</span><span className="project-stat-label">Activité</span></div>
                </div>
                {latestOutput && (
                  <div style={{ marginTop: 10, padding: "8px 10px", borderRadius: 6, background: "var(--bg-2)", border: "1px solid var(--border)" }}>
                    <div style={{ fontSize: 10, fontWeight: 800, color: "#8b5cf6", marginBottom: 3 }}>Latest output preview</div>
                    <div style={{ fontSize: 11, color: "var(--text)", fontWeight: 700 }}>{latestOutput.title}</div>
                    <div style={{ fontSize: 10, color: "var(--text-3)", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{latestOutput.preview}</div>
                  </div>
                )}
              </div>
            </Link>
            );
          })}

          {projects.map((p) => {
            const done = p.tasks.filter(
              (t) => t.status === "completed_real" || t.status === "completed"
            ).length;
            const failed = p.tasks.filter((t) => t.status === "failed").length;
            const queued = p.tasks.filter((t) => t.status === "queued" || t.status === "pending").length;
            const rate = p.tasks.length > 0 ? Math.round((done / p.tasks.length) * 100) : 0;
            const { color: priColor, bg: priBg } = priorityStyle(p.meta.project_priority);

            return (
              <Link key={p.name} href={`/projects/${p.name}`} className="project-card-link">
                <div className="project-card">
                  <div className="project-card-header">
                    <span className="project-name">{p.name}</span>
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      {p.meta.project_priority && (
                        <span className="badge" style={{ background: priBg, color: priColor }}>{p.meta.project_priority}</span>
                      )}
                      <span className={`badge ${statusClass(p.meta.status)}`}>{p.meta.status}</span>
                    </div>
                  </div>
                  <div className="project-progress-bar">
                    <div className="project-progress-fill" style={{ width: `${rate}%`, background: rate === 100 ? "var(--green)" : failed > 0 ? "var(--yellow)" : "linear-gradient(90deg, var(--accent), var(--accent-light))" }} />
                  </div>
                  <div className="project-stats">
                    <div className="project-stat"><span className="project-stat-value">{p.tasks.length}</span><span className="project-stat-label">Tasks</span></div>
                    <div className="project-stat"><span className="project-stat-value" style={{ color: "var(--green)" }}>{done}</span><span className="project-stat-label">Done</span></div>
                    {queued > 0 && <div className="project-stat"><span className="project-stat-value" style={{ color: "var(--blue)" }}>{queued}</span><span className="project-stat-label">Queued</span></div>}
                    {failed > 0 && <div className="project-stat"><span className="project-stat-value" style={{ color: "var(--red)" }}>{failed}</span><span className="project-stat-label">Failed</span></div>}
                    <div className="project-stat" style={{ marginLeft: "auto" }}><span className="project-stat-value" style={{ color: rate >= 80 ? "var(--green)" : rate >= 40 ? "var(--yellow)" : "var(--text-3)" }}>{rate}%</span><span className="project-stat-label">Success</span></div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </main>
  );
}
