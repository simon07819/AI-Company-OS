const STATS = [
  { label: "Total Members", value: "248", change: "+12 this month" },
  { label: "Monthly Revenue", value: "$8,340", change: "+8% vs last month" },
  { label: "Active Classes", value: "14", change: "3 today" },
  { label: "Retention Rate", value: "94%", change: "+2% vs last month" },
];

export default function DashboardPage() {
  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-8 py-10">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Dashboard</h1>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-10">
          {STATS.map((stat) => (
            <div key={stat.label} className="bg-white rounded-xl p-6 shadow-sm">
              <p className="text-sm text-gray-500 mb-1">{stat.label}</p>
              <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
              <p className="text-xs text-green-600 mt-1">{stat.change}</p>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="flex gap-3">
            <a href="/members/new" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
              Add Member
            </a>
            <a href="/classes/new" className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm">
              Schedule Class
            </a>
            <a href="/billing" className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm">
              Billing
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}
