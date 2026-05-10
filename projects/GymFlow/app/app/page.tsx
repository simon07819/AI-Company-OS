import Link from "next/link";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-white">
      {/* Hero */}
      <section className="flex flex-col items-center justify-center min-h-[80vh] px-8 text-center">
        <h1 className="text-5xl font-bold tracking-tight text-gray-900 mb-6">
          The Smart Gym Management Platform
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mb-10">
          GymFlow automates memberships, billing, and class scheduling so you can focus on your members — not the paperwork.
        </p>
        <div className="flex gap-4">
          <Link
            href="/dashboard"
            className="px-8 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition"
          >
            Start Free Trial
          </Link>
          <Link
            href="/pricing"
            className="px-8 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition"
          >
            View Pricing
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="bg-gray-50 py-20 px-8">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            Everything Your Gym Needs
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h3 className="text-lg font-semibold mb-2">Member Management</h3>
              <p className="text-gray-500">Track memberships, attendance, and member progress in one place.</p>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h3 className="text-lg font-semibold mb-2">Billing Automation</h3>
              <p className="text-gray-500">Automated recurring billing, invoices, and payment reminders.</p>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h3 className="text-lg font-semibold mb-2">Class Scheduling</h3>
              <p className="text-gray-500">Schedule classes, manage instructors, and let members book online.</p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
