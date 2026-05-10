import AppNav from "../components/AppNav";
import { MEMBERS, type MemberStatus, type MemberPlan } from "../../lib/mock-data";

const statusStyles: Record<MemberStatus, string> = {
  active:    "bg-green-100 text-green-700",
  inactive:  "bg-gray-100 text-gray-500",
  suspended: "bg-red-100 text-red-600",
};

const planStyles: Record<MemberPlan, string> = {
  starter:    "bg-slate-100 text-slate-600",
  pro:        "bg-blue-100 text-blue-700",
  enterprise: "bg-purple-100 text-purple-700",
};

export default function MembersPage() {
  const active    = MEMBERS.filter((m) => m.status === "active").length;
  const inactive  = MEMBERS.filter((m) => m.status === "inactive").length;
  const suspended = MEMBERS.filter((m) => m.status === "suspended").length;

  return (
    <div className="flex min-h-screen bg-gray-50">
      <AppNav />

      <main className="flex-1 overflow-auto">
        <div className="bg-white border-b border-gray-100 px-8 py-5 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Members</h1>
            <p className="text-sm text-gray-500 mt-0.5">{MEMBERS.length} total members</p>
          </div>
          <button className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors">
            + Add Member
          </button>
        </div>

        <div className="px-8 py-8">
          {/* Summary */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Active</p>
              <p className="text-2xl font-black text-green-600">{active}</p>
            </div>
            <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Inactive</p>
              <p className="text-2xl font-black text-gray-400">{inactive}</p>
            </div>
            <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Suspended</p>
              <p className="text-2xl font-black text-red-500">{suspended}</p>
            </div>
          </div>

          {/* Member table */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-semibold text-gray-900 text-sm">All Members</h2>
              <div className="flex items-center gap-2">
                <input
                  type="search"
                  placeholder="Search members…"
                  className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 outline-none focus:border-blue-400 w-44"
                />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left px-6 py-3 text-xs text-gray-400 font-medium uppercase tracking-wide">Name</th>
                    <th className="text-left px-4 py-3 text-xs text-gray-400 font-medium uppercase tracking-wide">Plan</th>
                    <th className="text-left px-4 py-3 text-xs text-gray-400 font-medium uppercase tracking-wide">Status</th>
                    <th className="text-left px-4 py-3 text-xs text-gray-400 font-medium uppercase tracking-wide">Joined</th>
                    <th className="text-left px-4 py-3 text-xs text-gray-400 font-medium uppercase tracking-wide">Last Visit</th>
                    <th className="text-left px-4 py-3 text-xs text-gray-400 font-medium uppercase tracking-wide"></th>
                  </tr>
                </thead>
                <tbody>
                  {MEMBERS.map((m, i) => (
                    <tr
                      key={m.id}
                      className={`border-b border-gray-50 hover:bg-gray-50 transition-colors ${i === MEMBERS.length - 1 ? "border-none" : ""}`}
                    >
                      <td className="px-6 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center shrink-0">
                            {m.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{m.name}</p>
                            <p className="text-xs text-gray-400">{m.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${planStyles[m.plan]}`}>
                          {m.plan}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${statusStyles[m.status]}`}>
                          {m.status}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-gray-500 text-xs">{m.joined}</td>
                      <td className="px-4 py-3.5 text-gray-500 text-xs">{m.lastVisit}</td>
                      <td className="px-4 py-3.5">
                        <button className="text-xs text-blue-600 hover:underline">View</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
