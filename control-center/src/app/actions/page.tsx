import { getAllProjects } from "@/lib/projects";
import ActionsForms from "@/components/ActionsForms";

export default function ActionsPage() {
  const projectNames = getAllProjects().map((p) => p.name);

  return (
    <main className="page">
      <h1>Actions</h1>
      <p style={{ color: "var(--muted)", fontSize: 13, marginBottom: 28, marginTop: -16 }}>
        Trigger factory scripts directly from the Control Center. Each action runs the corresponding Python script in the repo root.
      </p>
      <ActionsForms projectNames={projectNames} />
    </main>
  );
}
