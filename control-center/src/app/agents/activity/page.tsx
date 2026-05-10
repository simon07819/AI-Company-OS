import LiveActivityFeed from "@/components/LiveActivityFeed";

export default function ActivityPage() {
  return (
    <main className="page">
      <a href="/agents" className="back-link">← Agents</a>
      <h1>Live Agent Activity</h1>
      <LiveActivityFeed />
    </main>
  );
}
