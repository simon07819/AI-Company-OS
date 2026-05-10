import Link from "next/link";
import { PLANS } from "../../lib/billing";

const planOrder = ["starter", "pro", "enterprise"] as const;

const planColors = {
  starter:    { border: "border-gray-200",  badge: "", cta: "border border-gray-300 text-gray-700 hover:bg-gray-50" },
  pro:        { border: "border-blue-500 ring-2 ring-blue-500", badge: "Most Popular", cta: "bg-blue-600 text-white hover:bg-blue-700" },
  enterprise: { border: "border-gray-200",  badge: "", cta: "border border-gray-300 text-gray-700 hover:bg-gray-50" },
};

const FAQ = [
  { q: "Is there a free trial?",              a: "Yes — every plan starts with a 14-day free trial. No credit card required." },
  { q: "Can I change plans later?",           a: "Absolutely. Upgrade or downgrade anytime from your Settings page." },
  { q: "What happens if I exceed my member limit?", a: "We'll notify you and give you 14 days to upgrade before new sign-ups are paused." },
  { q: "Do you offer annual billing?",        a: "Yes — pay annually and save 2 months (20% off). Contact us to switch." },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <header className="border-b border-gray-100 sticky top-0 bg-white/90 backdrop-blur z-50">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="font-black text-gray-900 text-lg tracking-tight">
            <span className="text-blue-600">Gym</span>Flow
          </Link>
          <Link
            href="/dashboard"
            className="text-sm px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            Go to dashboard
          </Link>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-20">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl font-black text-gray-900 mb-4 tracking-tight">
            Simple, honest pricing
          </h1>
          <p className="text-lg text-gray-500 max-w-xl mx-auto">
            No hidden fees. No long-term contracts. Pay month-to-month and cancel anytime.
          </p>
        </div>

        {/* Plans */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-20">
          {planOrder.map((key) => {
            const plan   = PLANS[key];
            const colors = planColors[key];
            return (
              <div
                key={key}
                className={`rounded-2xl border p-8 flex flex-col relative ${colors.border}`}
              >
                {colors.badge && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 text-xs font-bold bg-blue-600 text-white rounded-full">
                    {colors.badge}
                  </span>
                )}

                <h2 className="text-lg font-bold text-gray-900 capitalize mb-1">{key}</h2>
                <p className="text-sm text-gray-400 mb-6">
                  {key === "starter"    && "For small studios getting started"}
                  {key === "pro"        && "For growing gyms that need more"}
                  {key === "enterprise" && "For multi-location or large gyms"}
                </p>

                <div className="mb-6">
                  <span className="text-5xl font-black text-gray-900">${plan.price}</span>
                  <span className="text-gray-400 text-sm">/month</span>
                </div>

                <p className="text-sm font-medium text-gray-600 mb-5">
                  {plan.maxMembers === -1 ? "Unlimited members" : `Up to ${plan.maxMembers} members`}
                </p>

                <ul className="space-y-3 mb-8 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-gray-600">
                      <span className="text-green-500 font-bold mt-px">✓</span>
                      {f}
                    </li>
                  ))}
                </ul>

                <Link
                  href="/dashboard"
                  className={`block text-center px-6 py-3 rounded-xl font-semibold text-sm transition-colors ${colors.cta}`}
                >
                  Start free trial
                </Link>
              </div>
            );
          })}
        </div>

        {/* Feature comparison */}
        <div className="mb-20">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-8">Compare plans</h2>
          <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-6 py-4 font-medium text-gray-500">Feature</th>
                  {planOrder.map((k) => (
                    <th key={k} className="px-4 py-4 font-bold text-gray-900 capitalize text-center">{k}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  ["Member limit",          "100",   "500",       "Unlimited"],
                  ["Class scheduling",      "✓",     "✓",         "✓"],
                  ["Billing automation",    "—",     "✓",         "✓"],
                  ["Analytics dashboard",  "Basic", "Advanced",  "Advanced"],
                  ["Email notifications",  "✓",     "✓",         "✓"],
                  ["Priority support",     "—",     "✓",         "✓"],
                  ["Custom integrations",  "—",     "—",         "✓"],
                  ["Dedicated account mgr","—",     "—",         "✓"],
                ].map(([feat, ...vals]) => (
                  <tr key={feat} className="border-b border-gray-50 last:border-none">
                    <td className="px-6 py-3.5 text-gray-700">{feat}</td>
                    {vals.map((v, i) => (
                      <td key={i} className="px-4 py-3.5 text-center text-gray-500">
                        {v === "✓" ? <span className="text-green-500 font-bold">✓</span>
                         : v === "—" ? <span className="text-gray-200">—</span>
                         : v}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* FAQ */}
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-8">Frequently asked questions</h2>
          <div className="space-y-4">
            {FAQ.map((item) => (
              <div key={item.q} className="border border-gray-100 rounded-xl p-5">
                <p className="font-semibold text-gray-900 mb-1.5">{item.q}</p>
                <p className="text-sm text-gray-500 leading-relaxed">{item.a}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="text-center text-sm text-gray-400 mt-16">
          Billing is simulated — no real charges in this demo.{" "}
          <Link href="/" className="underline hover:text-gray-600">← Back to home</Link>
        </p>
      </div>
    </div>
  );
}
