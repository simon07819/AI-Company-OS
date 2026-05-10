import Link from "next/link";
import { PLANS } from "../../lib/billing";

const planOrder = ["starter", "pro", "enterprise"] as const;

const highlights: Record<string, string> = {
  starter: "border-gray-200",
  pro: "border-blue-500 ring-2 ring-blue-500",
  enterprise: "border-gray-200",
};

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-white">
      <div className="max-w-5xl mx-auto px-8 py-20">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Simple, transparent pricing
          </h1>
          <p className="text-lg text-gray-500">
            No hidden fees. Cancel anytime.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {planOrder.map((key) => {
            const plan = PLANS[key];
            const isPopular = key === "pro";
            return (
              <div
                key={key}
                className={`rounded-2xl border p-8 flex flex-col ${highlights[key]}`}
              >
                {isPopular && (
                  <span className="inline-block mb-4 px-3 py-1 text-xs font-semibold bg-blue-100 text-blue-700 rounded-full self-start">
                    Most Popular
                  </span>
                )}
                <h2 className="text-xl font-bold text-gray-900 capitalize mb-2">
                  {key}
                </h2>
                <div className="mb-6">
                  <span className="text-4xl font-bold text-gray-900">
                    ${plan.price}
                  </span>
                  <span className="text-gray-400">/mo</span>
                </div>
                <p className="text-sm text-gray-500 mb-6">
                  {plan.maxMembers === -1
                    ? "Unlimited members"
                    : `Up to ${plan.maxMembers} members`}
                </p>
                <ul className="space-y-3 mb-8 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-gray-600">
                      <span className="text-green-500 font-bold">✓</span>
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/dashboard"
                  className={`block text-center px-6 py-3 rounded-lg font-semibold text-sm transition ${
                    isPopular
                      ? "bg-blue-600 text-white hover:bg-blue-700"
                      : "border border-gray-300 text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  Get started
                </Link>
              </div>
            );
          })}
        </div>

        <p className="text-center text-sm text-gray-400 mt-12">
          Billing is simulated — no real charges in this demo.{" "}
          <Link href="/" className="underline hover:text-gray-600">
            Back to home
          </Link>
        </p>
      </div>
    </main>
  );
}
