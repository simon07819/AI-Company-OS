import { PROJECT_CONFIG } from "../../lib/project-config";

export default function DashboardPage() {
  return (
    <main className="min-h-screen p-8">
      <h1 className="text-3xl font-bold mb-6">{PROJECT_CONFIG.name} — Dashboard</h1>
      <p className="text-gray-500">Your dashboard content will appear here.</p>
    </main>
  );
}
