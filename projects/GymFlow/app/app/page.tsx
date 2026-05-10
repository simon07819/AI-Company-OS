import Link from "next/link";

const FEATURES = [
  {
    icon: "◎",
    title: "Member Management",
    desc: "Track every member — status, plan, visit history, and billing — in one searchable dashboard.",
  },
  {
    icon: "◈",
    title: "Class Scheduling",
    desc: "Create recurring classes, assign instructors, manage capacity, and let members book in seconds.",
  },
  {
    icon: "💳",
    title: "Billing Automation",
    desc: "Recurring invoices, automatic retries, and overdue alerts. No more chasing payments.",
  },
  {
    icon: "📊",
    title: "Revenue Analytics",
    desc: "Monthly revenue trends, retention rates, and plan breakdowns — always up to date.",
  },
  {
    icon: "🔔",
    title: "Smart Notifications",
    desc: "Automated emails for renewals, class reminders, and payment confirmations.",
  },
  {
    icon: "🔒",
    title: "Role-Based Access",
    desc: "Staff accounts with scoped permissions — trainers see their classes, managers see everything.",
  },
];

const STEPS = [
  { num: "1", title: "Set up your gym",     desc: "Add your gym details, plans, and class schedule in under 10 minutes." },
  { num: "2", title: "Import your members", desc: "Bulk import existing members via CSV or add them one by one." },
  { num: "3", title: "Automate everything", desc: "Billing, reminders, and reports run themselves. You focus on the gym." },
];

const TESTIMONIALS = [
  {
    quote: "GymFlow cut our admin time by 70%. We used to spend every Monday on invoices — now it just happens.",
    author: "Mark Ellison",
    role: "Owner, Iron Peak Fitness",
  },
  {
    quote: "The class scheduling alone was worth it. Members book online, we see who's coming, and no-shows dropped.",
    author: "Claire Bouchard",
    role: "Manager, Élan Sport Club",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <header className="border-b border-gray-100 sticky top-0 bg-white/90 backdrop-blur z-50">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="font-black text-gray-900 text-lg tracking-tight">
            <span className="text-blue-600">Gym</span>Flow
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm text-gray-600">
            <Link href="/pricing" className="hover:text-gray-900 transition-colors">Pricing</Link>
            <Link href="/dashboard" className="hover:text-gray-900 transition-colors">Dashboard</Link>
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="text-sm text-gray-600 hover:text-gray-900 transition-colors hidden sm:block">
              Sign in
            </Link>
            <Link
              href="/dashboard"
              className="text-sm px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              Start free trial
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 text-white">
        <div className="max-w-5xl mx-auto px-6 py-24 text-center">
          <span className="inline-block mb-6 px-3 py-1 text-xs font-semibold bg-white/20 rounded-full tracking-wide">
            Trusted by 500+ gyms worldwide
          </span>
          <h1 className="text-5xl md:text-6xl font-black tracking-tight leading-tight mb-6">
            Run your gym.
            <br />
            <span className="text-blue-200">Not spreadsheets.</span>
          </h1>
          <p className="text-xl text-blue-100 max-w-2xl mx-auto mb-10 leading-relaxed">
            GymFlow automates memberships, billing, and class scheduling so you can
            focus on your members — not the paperwork.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/dashboard"
              className="px-8 py-3.5 bg-white text-blue-700 rounded-xl font-bold text-base hover:bg-blue-50 transition-colors"
            >
              Start free trial — 14 days
            </Link>
            <Link
              href="/pricing"
              className="px-8 py-3.5 border-2 border-white/40 text-white rounded-xl font-semibold text-base hover:border-white/80 transition-colors"
            >
              View pricing
            </Link>
          </div>
          <p className="mt-5 text-sm text-blue-200">No credit card required. Cancel anytime.</p>
        </div>

        {/* Stats bar */}
        <div className="bg-white/10 border-t border-white/20">
          <div className="max-w-4xl mx-auto px-6 py-6 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {[
              { value: "500+",  label: "Gyms active" },
              { value: "50K+",  label: "Members managed" },
              { value: "99.9%", label: "Uptime" },
              { value: "$2M+",  label: "Revenue processed" },
            ].map((s) => (
              <div key={s.label}>
                <div className="text-2xl font-black text-white">{s.value}</div>
                <div className="text-sm text-blue-200 mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Problem */}
      <section className="py-20 px-6 bg-gray-50">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Managing a gym is hard enough.
          </h2>
          <p className="text-lg text-gray-500 leading-relaxed">
            Chasing overdue payments. Reconciling membership spreadsheets.
            Manually texting class reminders. Losing track of who cancelled.
            Sound familiar? GymFlow handles all of it so you don&apos;t have to.
          </p>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">
            Everything your gym needs
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f) => (
              <div key={f.title} className="p-6 rounded-2xl border border-gray-100 hover:border-blue-100 hover:shadow-md transition-all bg-white">
                <div className="text-2xl mb-3">{f.icon}</div>
                <h3 className="font-bold text-gray-900 mb-2">{f.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 px-6 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-14">
            Up and running in minutes
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {STEPS.map((s) => (
              <div key={s.num} className="text-center">
                <div className="w-10 h-10 rounded-full bg-blue-600 text-white font-black text-lg flex items-center justify-center mx-auto mb-4">
                  {s.num}
                </div>
                <h3 className="font-bold text-gray-900 mb-2">{s.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">
            Gym owners love it
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {TESTIMONIALS.map((t) => (
              <div key={t.author} className="bg-gray-50 rounded-2xl p-8 border border-gray-100">
                <p className="text-gray-700 italic leading-relaxed mb-6">
                  &ldquo;{t.quote}&rdquo;
                </p>
                <div>
                  <div className="font-semibold text-gray-900 text-sm">{t.author}</div>
                  <div className="text-gray-400 text-sm">{t.role}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6 bg-blue-600">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to simplify your gym operations?
          </h2>
          <p className="text-blue-100 mb-8">
            Join 500+ gym owners who save hours every week with GymFlow.
          </p>
          <Link
            href="/dashboard"
            className="inline-block px-10 py-4 bg-white text-blue-700 rounded-xl font-bold text-base hover:bg-blue-50 transition-colors"
          >
            Start your free 14-day trial
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 bg-white">
        <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <span className="font-black text-gray-900">
            <span className="text-blue-600">Gym</span>Flow
          </span>
          <div className="flex gap-6 text-sm text-gray-400">
            <Link href="/pricing" className="hover:text-gray-700 transition-colors">Pricing</Link>
            <Link href="/dashboard" className="hover:text-gray-700 transition-colors">Dashboard</Link>
            <Link href="/api/health" className="hover:text-gray-700 transition-colors">Status</Link>
          </div>
          <span className="text-sm text-gray-400">© 2026 GymFlow. All rights reserved.</span>
        </div>
      </footer>
    </div>
  );
}
