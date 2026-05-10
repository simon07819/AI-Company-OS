import AppNav from "../components/AppNav";
import { MEMBERS, CLASSES, REVENUE_MONTHS, RECENT_ACTIVITY } from "../../lib/mock-data";

const MAX_REVENUE = Math.max(...REVENUE_MONTHS.map((m) => m.amount));

const activityColors: Record<string, string> = {
  member:  "bg-blue-500",
  billing: "bg-green-500",
  class:   "bg-purple-500",
  system:  "bg-gray-400",
};

export default function DashboardPage() {
  const activeMembers = MEMBERS.filter((m) => m.status === "active").length;
  const todayClasses  = CLASSES.filter((_, i) => i < 4);
  const currentRevenue = REVENUE_MONTHS[REVENUE_MONTHS.length - 1].amount;
  const prevRevenue    = REVENUE_MONTHS[REVENUE_MONTHS.length - 2].amount;
  const revenueGrowth  = Math.round(((currentRevenue - prevRevenue) / prevRevenue) * 100);

  return (
    <div className="flex min-h-screen bg-gray-50">
      <AppNav />

      <main className="flex-1 overflow-auto">
        {/* Header */}
        <div className="bg-white border-b border-gray-100 px-8 py-5">
          <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">Overview of your gym — updated in real time</p>
        </div>

        <div className="px-8 py-8">
          {/* Stat cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-2">Total Members</p>
              <p className="text-3xl font-black text-gray-900">{MEMBERS.length}</p>
              <p className="text-xs text-green-600 mt-1.5">↑ 12 joined this month</p>
            </div>
            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-2">Monthly Revenue</p>
              <p className="text-3xl font-black text-gray-900">${currentRevenue.toLocaleString()}</p>
              <p className="text-xs text-green-600 mt-1.5">↑ {revenueGrowth}% vs last month</p>
            </div>
            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-2">Active Members</p>
              <p className="text-3xl font-black text-gray-900">{activeMembers}</p>
              <p className="text-xs text-gray-400 mt-1.5">{MEMBERS.length - activeMembers} inactive or suspended</p>
            </div>
            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-2">Retention Rate</p>
              <p className="text-3xl font-black text-gray-900">94%</p>
              <p className="text-xs text-green-600 mt-1.5">↑ 2% vs last month</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            {/* Revenue chart */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-bold text-gray-900">Monthly Revenue</h2>
                <span className="text-xs text-gray-400">Last 6 months</span>
              </div>
              <div className="flex items-end gap-3 h-36">
                {REVENUE_MONTHS.map((m) => {
                  const pct = Math.round((m.amount / MAX_REVENUE) * 100);
                  return (
                    <div key={m.month} className="flex-1 flex flex-col items-center gap-1.5">
                      <span className="text-xs text-gray-500 font-medium">${(m.amount / 1000).toFixed(1)}k</span>
                      <div
                        className="w-full rounded-t-md bg-blue-500"
                        style={{ height: `${pct}%` }}
                      />
                      <span className="text-xs text-gray-400">{m.month}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Activity feed */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h2 className="font-bold text-gray-900 mb-4">Recent Activity</h2>
              <ul className="space-y-4">
                {RECENT_ACTIVITY.map((a) => (
                  <li key={a.id} className="flex items-start gap-3">
                    <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${activityColors[a.type]}`} />
                    <div>
                      <p className="text-sm text-gray-700 leading-snug">{a.text}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{a.time}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Classes today */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-gray-900">Today&apos;s Classes</h2>
                <a href="/classes" className="text-xs text-blue-600 hover:underline">View all</a>
              </div>
              <ul className="space-y-3">
                {todayClasses.map((c) => {
                  const pct = Math.round((c.enrolled / c.capacity) * 100);
                  return (
                    <li key={c.id} className="flex items-center gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{c.name}</p>
                        <p className="text-xs text-gray-400">{c.instructor} · {c.time}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs font-medium text-gray-700">{c.enrolled}/{c.capacity}</p>
                        <div className="w-16 h-1.5 bg-gray-100 rounded-full mt-1">
                          <div
                            className={`h-full rounded-full ${pct >= 90 ? "bg-red-400" : pct >= 70 ? "bg-yellow-400" : "bg-green-400"}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>

            {/* Quick actions */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h2 className="font-bold text-gray-900 mb-4">Quick Actions</h2>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Add Member",     href: "/members",  color: "bg-blue-600 text-white hover:bg-blue-700" },
                  { label: "New Class",      href: "/classes",  color: "bg-indigo-600 text-white hover:bg-indigo-700" },
                  { label: "Send Invoice",   href: "/settings", color: "border border-gray-200 text-gray-700 hover:bg-gray-50" },
                  { label: "View Reports",   href: "/members",  color: "border border-gray-200 text-gray-700 hover:bg-gray-50" },
                ].map((a) => (
                  <a
                    key={a.label}
                    href={a.href}
                    className={`block text-center px-4 py-3 rounded-xl text-sm font-semibold transition-colors ${a.color}`}
                  >
                    {a.label}
                  </a>
                ))}
              </div>

              <div className="mt-5 p-4 bg-blue-50 rounded-xl border border-blue-100">
                <p className="text-xs font-semibold text-blue-800 mb-0.5">Plan: Pro</p>
                <p className="text-xs text-blue-600">
                  {activeMembers}/500 members used ·{" "}
                  <a href="/pricing" className="underline">Upgrade for unlimited</a>
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
