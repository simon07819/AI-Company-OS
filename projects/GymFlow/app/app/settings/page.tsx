import AppNav from "../components/AppNav";
import { PLANS } from "../../lib/billing";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-5">
      <h2 className="font-bold text-gray-900 mb-5 pb-4 border-b border-gray-100">{title}</h2>
      {children}
    </section>
  );
}

function Field({ label, defaultValue, type = "text" }: { label: string; defaultValue: string; type?: string }) {
  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
      <input
        type={type}
        defaultValue={defaultValue}
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200 transition"
      />
    </div>
  );
}

function Toggle({ label, desc, enabled }: { label: string; desc: string; enabled: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 py-3 border-b border-gray-50 last:border-none">
      <div>
        <p className="text-sm font-medium text-gray-800">{label}</p>
        <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
      </div>
      <div className={`shrink-0 w-10 h-5 rounded-full transition-colors ${enabled ? "bg-blue-500" : "bg-gray-200"} relative mt-0.5`}>
        <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${enabled ? "translate-x-5" : "translate-x-0.5"}`} />
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const currentPlan = PLANS["pro"];

  return (
    <div className="flex min-h-screen bg-gray-50">
      <AppNav />

      <main className="flex-1 overflow-auto">
        <div className="bg-white border-b border-gray-100 px-8 py-5">
          <h1 className="text-xl font-bold text-gray-900">Settings</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage your gym profile and preferences</p>
        </div>

        <div className="px-8 py-8 max-w-2xl">
          <Section title="Gym Profile">
            <Field label="Gym Name"     defaultValue="Iron Peak Fitness" />
            <Field label="Email"        defaultValue="owner@ironpeak.com" type="email" />
            <Field label="Phone"        defaultValue="+1 (555) 012-3456" />
            <Field label="Address"      defaultValue="123 Main St, San Francisco, CA 94102" />
            <button className="mt-2 px-5 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors">
              Save changes
            </button>
          </Section>

          <Section title="Notifications">
            <Toggle label="New member alerts"        desc="Get notified when someone signs up"               enabled={true}  />
            <Toggle label="Payment reminders"        desc="Send automatic payment reminders to members"      enabled={true}  />
            <Toggle label="Class reminders"          desc="Notify members 2h before their booked class"      enabled={true}  />
            <Toggle label="Overdue invoice alerts"   desc="Get notified when a payment fails after retry"    enabled={false} />
            <Toggle label="Weekly summary email"     desc="Weekly digest with revenue, members, and classes" enabled={true}  />
          </Section>

          <Section title="Subscription Plan">
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-start justify-between gap-4 mb-4">
              <div>
                <p className="font-bold text-blue-900 capitalize">Pro Plan</p>
                <p className="text-sm text-blue-700 mt-0.5">
                  Up to {currentPlan.maxMembers} members · ${currentPlan.price}/month
                </p>
                <ul className="mt-2 space-y-0.5">
                  {currentPlan.features.map((f) => (
                    <li key={f} className="text-xs text-blue-600 flex items-center gap-1.5">
                      <span>✓</span> {f}
                    </li>
                  ))}
                </ul>
              </div>
              <a
                href="/pricing"
                className="shrink-0 text-xs px-3 py-1.5 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
              >
                Upgrade
              </a>
            </div>
            <p className="text-xs text-gray-400">
              Billing is simulated — no real charges in this demo.
            </p>
          </Section>

          <Section title="Danger Zone">
            <p className="text-sm text-gray-500 mb-4">
              These actions are irreversible. Proceed with care.
            </p>
            <div className="flex gap-3">
              <button className="text-sm px-4 py-2 border border-red-200 text-red-500 rounded-lg hover:bg-red-50 transition-colors font-medium">
                Export all data
              </button>
              <button className="text-sm px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors font-medium">
                Delete account
              </button>
            </div>
          </Section>
        </div>
      </main>
    </div>
  );
}
