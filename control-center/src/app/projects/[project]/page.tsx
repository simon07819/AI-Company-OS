import { getProject } from "@/lib/projects";
import { notFound } from "next/navigation";
import Link from "next/link";
import fs from "fs";
import path from "path";
import ProjectActions from "@/components/ProjectActions";
import ProjectWorkspace from "@/components/projects/ProjectWorkspace";
import { readGeneratedProject } from "@/lib/product-builder/workspace";
import { listTraceableArtifacts } from "@/lib/providers/providerRegistry";

const REPO_ROOT = path.resolve(process.cwd(), "..");

function taskBadge(status: string) {
  const map: Record<string, string> = {
    completed_real: "badge-green",
    completed:      "badge-green",
    failed:         "badge-red",
    queued:         "badge-blue",
    pending:        "badge-blue",
    retrying:       "badge-yellow",
    archived:       "badge-gray",
    in_progress:    "badge-accent",
  };
  return <span className={`badge ${map[status] ?? "badge-gray"}`}>{status.replace("_", " ")}</span>;
}

function statusClass(status?: string) {
  const map: Record<string, string> = {
    active: "badge-green", initialized: "badge-blue",
    paused: "badge-yellow", completed: "badge-purple", failed: "badge-red",
  };
  return map[status ?? ""] ?? "badge-gray";
}

export default async function ProjectPage({ params }: { params: Promise<{ project: string }> }) {
  const { project: projectName } = await params;
  const generatedProject = readGeneratedProject(projectName);
  if (generatedProject) return <ProjectWorkspace workspace={generatedProject} />;

  const project = getProject(projectName);
  if (!project) notFound();

  const tasksByStatus = project.tasks.reduce((acc, t) => {
    acc[t.status] = (acc[t.status] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const sortedTasks = [...project.tasks].sort((a, b) => a.id - b.id);

  const done   = project.tasks.filter((t) => t.status === "completed_real" || t.status === "completed").length;
  const failed = project.tasks.filter((t) => t.status === "failed").length;
  const rate   = project.tasks.length > 0 ? Math.round((done / project.tasks.length) * 100) : 0;

  const appDir    = path.join(REPO_ROOT, "projects", projectName, "app");
  const hasApp    = fs.existsSync(path.join(appDir, "package.json"));
  let appName: string | null = null;
  if (hasApp) {
    try {
      const pkg = JSON.parse(fs.readFileSync(path.join(appDir, "package.json"), "utf8")) as { name?: string };
      appName = pkg.name ?? null;
    } catch { /* ignore */ }
  }

  // Find the latest artifact associated with this project
  const artifacts = listTraceableArtifacts().filter((a) => a.projectId === projectName);
  const latestArtifact = artifacts.at(-1) ?? null;
  const versions = artifacts.filter((a) => a.type === "code" || a.sourceType === "nvidia_text");

  return (
    <main className="page">
      <Link href="/projects" className="back-link">← All Projects</Link>

      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">{project.name}</h1>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
            <span className={`badge ${statusClass(project.meta.status)}`}>{project.meta.status}</span>
            {project.meta.project_priority && (
              <span className="badge badge-gray">{project.meta.project_priority} priority</span>
            )}
            {hasApp && <span className="badge badge-accent">has app</span>}
          </div>
        </div>
        <div className="page-actions">
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: rate >= 80 ? "var(--green)" : "var(--text)", lineHeight: 1 }}>{rate}%</div>
            <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 2 }}>{done}/{project.tasks.length} tasks</div>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ marginBottom: 32 }}>
        <div className="project-progress-bar" style={{ height: 6 }}>
          <div
            className="project-progress-fill"
            style={{
              width: `${rate}%`,
              background: rate === 100
                ? "var(--green)"
                : failed > 0
                ? "var(--yellow)"
                : "linear-gradient(90deg, var(--accent), var(--accent-light))",
            }}
          />
        </div>
      </div>

      {/* Quick stats */}
      <div className="metric-grid" style={{ marginBottom: 32 }}>
        <div className="metric-card">
          <div className="metric-label">Total Tasks</div>
          <div className="metric-value" style={{ marginTop: 8 }}>{project.tasks.length}</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Completed</div>
          <div className="metric-value green" style={{ marginTop: 8 }}>{done}</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Failed</div>
          <div className="metric-value" style={{ marginTop: 8, color: failed > 0 ? "var(--red)" : "var(--text-3)" }}>{failed}</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Queued</div>
          <div className="metric-value blue" style={{ marginTop: 8 }}>
            {tasksByStatus["queued"] ?? tasksByStatus["pending"] ?? 0}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="section">
        <h2>Actions</h2>
        <div className="card">
          <ProjectActions projectName={projectName} />
        </div>
      </div>

      {/* App section */}
      {hasApp && (
        <div className="section">
          <h2>Next.js App</h2>
          <div className="card" style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div
              style={{
                width: 40, height: 40, borderRadius: 10,
                background: "var(--accent-dim)",
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
              }}
            >
              <svg width="18" height="18" viewBox="0 0 20 20" fill="var(--accent-light)">
                <path fillRule="evenodd" d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd"/>
              </svg>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>{appName ?? "Next.js App"}</div>
              <code style={{ fontFamily: "ui-monospace, monospace", fontSize: 12, color: "var(--text-3)" }}>
                cd projects/{projectName}/app &amp;&amp; npm run dev
              </code>
            </div>
          </div>
        </div>
      )}

      {/* Live preview + version list */}
      {latestArtifact && (
        <div className="section">
          <div className="section-header">
            <h2 style={{ margin: 0 }}>Aperçu du livrable</h2>
            <div style={{ display: "flex", gap: 8 }}>
              <a href={`/api/export/${latestArtifact.artifactId}`} download
                style={{ fontSize: 12, color: "var(--accent-light)", textDecoration: "none" }}>
                Télécharger
              </a>
              <a href={`/client/${latestArtifact.artifactId}`} target="_blank" rel="noopener noreferrer"
                style={{ fontSize: 12, color: "var(--accent-light)", textDecoration: "none" }}>
                Portail client
              </a>
            </div>
          </div>
          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            {(latestArtifact.type === "code" || latestArtifact.sourceType === "nvidia_text") ? (
              <iframe
                src={`/api/preview/${latestArtifact.artifactId}`}
                style={{ width: "100%", height: 420, border: "none", background: "#09090b" }}
                sandbox="allow-scripts"
                loading="lazy"
                referrerPolicy="no-referrer"
                title={latestArtifact.title}
              />
            ) : latestArtifact.content?.trimStart().startsWith("<svg") ? (
              <div
                style={{ padding: 24, display: "flex", justifyContent: "center" }}
                dangerouslySetInnerHTML={{ __html: latestArtifact.content }}
              />
            ) : (
              <pre style={{ padding: 16, fontSize: 12, color: "var(--text-3)", overflow: "auto", margin: 0 }}>
                {(latestArtifact.content ?? "").slice(0, 4000)}
              </pre>
            )}
          </div>
          {versions.length > 1 && (
            <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
              {versions.map((v, i) => (
                <a
                  key={v.artifactId}
                  href={`/api/preview/${v.artifactId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    padding: "4px 10px", fontSize: 11, borderRadius: 6,
                    border: "1px solid var(--border)", color: "var(--text-2)",
                    textDecoration: "none",
                  }}
                >
                  v{i + 1} — {new Date(v.createdAt).toLocaleDateString()}
                </a>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tasks table */}
      <div className="section">
        <div className="section-header">
          <h2 style={{ margin: 0 }}>Tasks ({project.tasks.length})</h2>
        </div>
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <table>
            <thead>
              <tr>
                <th style={{ width: 36 }}>#</th>
                <th>Title</th>
                <th>Status</th>
                <th>Priority</th>
                <th>Completed</th>
              </tr>
            </thead>
            <tbody>
              {sortedTasks.map((t) => (
                <tr key={t.id}>
                  <td style={{ color: "var(--text-3)", fontSize: 12 }}>{t.id}</td>
                  <td>
                    {t.pr_url ? (
                      <a href={t.pr_url} target="_blank" rel="noreferrer" style={{ color: "var(--accent-light)" }}>
                        {t.title}
                      </a>
                    ) : t.title}
                  </td>
                  <td>{taskBadge(t.status)}</td>
                  <td>
                    {t.priority
                      ? <span className="badge badge-gray">{t.priority}</span>
                      : <span style={{ color: "var(--text-3)" }}>—</span>}
                  </td>
                  <td style={{ color: "var(--text-3)", fontSize: 12 }}>
                    {t.completed_at ? new Date(t.completed_at).toLocaleString() : "—"}
                  </td>
                </tr>
              ))}
              {sortedTasks.length === 0 && (
                <tr><td colSpan={5} className="empty">No tasks found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Meta */}
      <div className="section">
        <h2>Metadata</h2>
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <table>
            <tbody>
              {Object.entries(project.meta)
                .filter(([k]) => k !== "name" && k !== "agents")
                .map(([k, v]) => (
                  <tr key={k}>
                    <td style={{ color: "var(--text-3)", width: 180, fontSize: 12, fontFamily: "ui-monospace, monospace" }}>{k}</td>
                    <td style={{ fontSize: 13 }}>{String(v)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {project.roadmap && (
        <div className="section">
          <h2>Roadmap</h2>
          <div className="prose">{project.roadmap.slice(0, 3000)}</div>
        </div>
      )}

      {project.validationReport && (
        <div className="section">
          <h2>Validation Report</h2>
          <div className="prose">{project.validationReport.slice(0, 3000)}</div>
        </div>
      )}
    </main>
  );
}
