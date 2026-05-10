import { getProject } from "@/lib/projects";
import { notFound } from "next/navigation";
import Link from "next/link";

function taskBadge(status: string) {
  const map: Record<string, string> = {
    completed_real: "badge-green",
    completed: "badge-green",
    failed: "badge-red",
    queued: "badge-blue",
    pending: "badge-blue",
    retrying: "badge-yellow",
    archived: "badge-gray",
    in_progress: "badge-purple",
  };
  return (
    <span className={`badge ${map[status] ?? "badge-gray"}`}>{status}</span>
  );
}

export default function ProjectPage({
  params,
}: {
  params: { project: string };
}) {
  const project = getProject(params.project);
  if (!project) notFound();

  const tasksByStatus = project.tasks.reduce(
    (acc, t) => {
      acc[t.status] = (acc[t.status] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const sortedTasks = [...project.tasks].sort((a, b) => a.id - b.id);

  return (
    <main className="page">
      <Link href="/projects" className="back-link">
        ← All Projects
      </Link>

      <h1>{project.name}</h1>

      <div className="section">
        <h2>Meta</h2>
        <div className="card">
          <table>
            <tbody>
              {Object.entries(project.meta)
                .filter(([k]) => k !== "name" && k !== "agents")
                .map(([k, v]) => (
                  <tr key={k}>
                    <td style={{ color: "var(--muted)", width: 160 }}>{k}</td>
                    <td>{String(v)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="section">
        <h2>Task Summary</h2>
        <div className="stat-grid">
          {Object.entries(tasksByStatus).map(([status, count]) => (
            <div className="stat-card" key={status}>
              <div className="stat-label">{status.replace(/_/g, " ")}</div>
              <div
                className={`stat-value ${
                  status.includes("completed")
                    ? "green"
                    : status === "failed"
                      ? "red"
                      : status === "retrying"
                        ? "yellow"
                        : ""
                }`}
              >
                {count}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="section">
        <h2>Tasks ({project.tasks.length})</h2>
        <div className="card" style={{ padding: 0 }}>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Title</th>
                <th>Status</th>
                <th>Priority</th>
                <th>Completed</th>
              </tr>
            </thead>
            <tbody>
              {sortedTasks.map((t) => (
                <tr key={t.id}>
                  <td style={{ color: "var(--muted)" }}>{t.id}</td>
                  <td>
                    {t.pr_url ? (
                      <a href={t.pr_url} target="_blank" rel="noreferrer">
                        {t.title}
                      </a>
                    ) : (
                      t.title
                    )}
                  </td>
                  <td>{taskBadge(t.status)}</td>
                  <td>
                    {t.priority ? (
                      <span className="badge badge-gray">{t.priority}</span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td style={{ color: "var(--muted)", fontSize: 12 }}>
                    {t.completed_at
                      ? new Date(t.completed_at).toLocaleString()
                      : "—"}
                  </td>
                </tr>
              ))}
              {sortedTasks.length === 0 && (
                <tr>
                  <td colSpan={5} className="empty">
                    No tasks found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {project.roadmap && (
        <div className="section">
          <h2>Roadmap Preview</h2>
          <div className="prose">{project.roadmap.slice(0, 3000)}</div>
        </div>
      )}

      {project.validationReport && (
        <div className="section">
          <h2>Validation Report</h2>
          <div className="prose">
            {project.validationReport.slice(0, 3000)}
          </div>
        </div>
      )}
    </main>
  );
}
