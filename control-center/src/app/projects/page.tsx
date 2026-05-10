import { getAllProjects } from "@/lib/projects";
import Link from "next/link";

function statusBadge(status?: string) {
  const map: Record<string, string> = {
    active: "badge-green",
    initialized: "badge-blue",
    paused: "badge-yellow",
    completed: "badge-purple",
    failed: "badge-red",
  };
  return (
    <span className={`badge ${map[status ?? ""] ?? "badge-gray"}`}>
      {status ?? "unknown"}
    </span>
  );
}

export default function ProjectsPage() {
  const projects = getAllProjects();

  return (
    <main className="page">
      <h1>Projects ({projects.length})</h1>
      <div className="card" style={{ padding: 0 }}>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Status</th>
              <th>Mode</th>
              <th>Priority</th>
              <th>Tasks</th>
              <th>Done</th>
              <th>Success %</th>
            </tr>
          </thead>
          <tbody>
            {projects.map((p) => {
              const done = p.tasks.filter(
                (t) => t.status === "completed_real" || t.status === "completed"
              ).length;
              const rate =
                p.tasks.length > 0
                  ? Math.round((done / p.tasks.length) * 100)
                  : 0;
              return (
                <tr key={p.name}>
                  <td>
                    <Link href={`/projects/${p.name}`}>{p.name}</Link>
                  </td>
                  <td>{statusBadge(p.meta.status)}</td>
                  <td>
                    {p.meta.mode ? (
                      <span className="badge badge-gray">{p.meta.mode}</span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td>
                    {p.meta.project_priority ? (
                      <span className="badge badge-yellow">
                        {p.meta.project_priority}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td>{p.tasks.length}</td>
                  <td>{done}</td>
                  <td>
                    <span
                      className={`badge ${rate >= 80 ? "badge-green" : rate >= 40 ? "badge-yellow" : "badge-red"}`}
                    >
                      {rate}%
                    </span>
                  </td>
                </tr>
              );
            })}
            {projects.length === 0 && (
              <tr>
                <td colSpan={7} className="empty">
                  No projects found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
