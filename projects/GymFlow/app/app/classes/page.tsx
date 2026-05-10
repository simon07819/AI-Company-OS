import AppNav from "../components/AppNav";
import { CLASSES } from "../../lib/mock-data";

function CapacityBar({ enrolled, capacity }: { enrolled: number; capacity: number }) {
  const pct = Math.round((enrolled / capacity) * 100);
  const color = pct >= 95 ? "bg-red-400" : pct >= 75 ? "bg-yellow-400" : "bg-green-400";
  return (
    <div>
      <div className="flex justify-between text-xs text-gray-500 mb-1">
        <span>{enrolled}/{capacity} enrolled</span>
        <span>{pct}%</span>
      </div>
      <div className="h-1.5 w-full bg-gray-100 rounded-full">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function ClassesPage() {
  const totalEnrolled  = CLASSES.reduce((s, c) => s + c.enrolled, 0);
  const totalCapacity  = CLASSES.reduce((s, c) => s + c.capacity, 0);
  const fullClasses    = CLASSES.filter((c) => c.enrolled >= c.capacity).length;

  return (
    <div className="flex min-h-screen bg-gray-50">
      <AppNav />

      <main className="flex-1 overflow-auto">
        <div className="bg-white border-b border-gray-100 px-8 py-5 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Classes</h1>
            <p className="text-sm text-gray-500 mt-0.5">{CLASSES.length} active classes this week</p>
          </div>
          <button className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors">
            + Schedule Class
          </button>
        </div>

        <div className="px-8 py-8">
          {/* Summary */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Total Enrolled</p>
              <p className="text-2xl font-black text-gray-900">{totalEnrolled}</p>
              <p className="text-xs text-gray-400 mt-1">of {totalCapacity} spots</p>
            </div>
            <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Classes Full</p>
              <p className="text-2xl font-black text-red-500">{fullClasses}</p>
              <p className="text-xs text-gray-400 mt-1">consider expanding capacity</p>
            </div>
            <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Avg Fill Rate</p>
              <p className="text-2xl font-black text-green-600">
                {Math.round((totalEnrolled / totalCapacity) * 100)}%
              </p>
            </div>
          </div>

          {/* Class cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {CLASSES.map((c) => (
              <div key={c.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col gap-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-gray-900">{c.name}</h3>
                    <p className="text-sm text-gray-500 mt-0.5">{c.instructor}</p>
                  </div>
                  {c.enrolled >= c.capacity && (
                    <span className="shrink-0 text-xs font-semibold bg-red-100 text-red-600 px-2 py-0.5 rounded-full">
                      Full
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">Schedule</p>
                    <p className="font-medium text-gray-700">{c.days}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">Time</p>
                    <p className="font-medium text-gray-700">{c.time}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs text-gray-400 mb-0.5">Location</p>
                    <p className="font-medium text-gray-700">{c.location}</p>
                  </div>
                </div>

                <CapacityBar enrolled={c.enrolled} capacity={c.capacity} />

                <div className="flex gap-2 pt-1">
                  <button className="flex-1 text-xs py-1.5 border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors font-medium">
                    Edit
                  </button>
                  <button className="flex-1 text-xs py-1.5 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors font-medium">
                    View roster
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
