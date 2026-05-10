import { getAllProjects } from "@/lib/projects";
import ActionsForms from "@/components/ActionsForms";

export default function ActionsPage() {
  const projectNames = getAllProjects().map((p) => p.name);

  return (
    <main className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Actions</h1>
          <p className="page-subtitle">
            Trigger factory scripts from the browser — each action runs securely in the repo root.
          </p>
        </div>
      </div>
      <ActionsForms projectNames={projectNames} />
    </main>
  );
}
