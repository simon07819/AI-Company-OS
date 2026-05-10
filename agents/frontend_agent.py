"""Frontend agent — generates Next.js pages and UI components."""

from .base_agent import BaseAgent

# Maps keyword → (rel_path, content_fn)
_PAGE_ROUTES = [
    ("landing",    "app/page.tsx"),
    ("hero",       "app/page.tsx"),
    ("home page",  "app/page.tsx"),
    ("dashboard",  "app/dashboard/page.tsx"),
    ("pricing",    "app/pricing/page.tsx"),
    ("member",     "app/members/page.tsx"),
    ("class",      "app/classes/page.tsx"),
    ("schedule",   "app/classes/page.tsx"),
    ("settings",   "app/settings/page.tsx"),
    ("onboarding", "app/onboarding/page.tsx"),
    ("admin",      "app/admin/page.tsx"),
    ("profile",    "app/profile/page.tsx"),
    ("signup",     "app/signup/page.tsx"),
    ("login",      "app/login/page.tsx"),
]


def _generic_page(title: str, description: str, path: str) -> str:
    component = "".join(w.capitalize() for w in title.split()[:3]) + "Page"
    return (
        'import Link from "next/link";\n\n'
        f"export default function {component}() {{\n"
        "  return (\n"
        '    <main className="min-h-screen bg-gray-50">\n'
        '      <div className="max-w-5xl mx-auto px-8 py-16">\n'
        f'        <h1 className="text-3xl font-bold text-gray-900 mb-4">{title}</h1>\n'
        f'        <p className="text-lg text-gray-500 mb-8">{description}</p>\n'
        '        <Link href="/dashboard" className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Back to Dashboard</Link>\n'
        "      </div>\n"
        "    </main>\n"
        "  );\n"
        "}\n"
    )


def _landing_page(title: str, description: str) -> str:
    return (
        'import Link from "next/link";\n\n'
        "export default function LandingPage() {\n"
        "  return (\n"
        '    <main className="min-h-screen bg-white">\n'
        '      <section className="flex flex-col items-center justify-center min-h-[80vh] px-8 text-center">\n'
        f'        <h1 className="text-5xl font-bold tracking-tight text-gray-900 mb-6">{title}</h1>\n'
        f'        <p className="text-xl text-gray-500 max-w-2xl mb-10">{description}</p>\n'
        '        <div className="flex gap-4">\n'
        '          <Link href="/dashboard" className="px-8 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700">Get Started</Link>\n'
        '          <Link href="/pricing" className="px-8 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50">View Pricing</Link>\n'
        "        </div>\n"
        "      </section>\n"
        "    </main>\n"
        "  );\n"
        "}\n"
    )


def _dashboard_page(title: str, description: str) -> str:
    return (
        'const STATS = [\n'
        '  { label: "Total Members", value: "248", change: "+12 this month" },\n'
        '  { label: "Monthly Revenue", value: "$8,340", change: "+8% vs last month" },\n'
        '  { label: "Active Classes", value: "14", change: "3 today" },\n'
        '  { label: "Retention Rate", value: "94%", change: "+2% vs last month" },\n'
        '];\n\n'
        "export default function DashboardPage() {\n"
        "  return (\n"
        '    <main className="min-h-screen bg-gray-50">\n'
        '      <div className="max-w-6xl mx-auto px-8 py-10">\n'
        '        <h1 className="text-3xl font-bold text-gray-900 mb-8">Dashboard</h1>\n'
        '        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-10">\n'
        "          {STATS.map((stat) => (\n"
        '            <div key={stat.label} className="bg-white rounded-xl p-6 shadow-sm">\n'
        '              <p className="text-sm text-gray-500 mb-1">{stat.label}</p>\n'
        '              <p className="text-3xl font-bold text-gray-900">{stat.value}</p>\n'
        '              <p className="text-xs text-green-600 mt-1">{stat.change}</p>\n'
        "            </div>\n"
        "          ))}\n"
        "        </div>\n"
        f'        <p className="text-gray-500 text-sm">{description}</p>\n'
        "      </div>\n"
        "    </main>\n"
        "  );\n"
        "}\n"
    )


def _pricing_page(title: str, description: str) -> str:
    return (
        'import Link from "next/link";\n\n'
        "const PLANS = [\n"
        '  { name: "Starter", price: 29, members: 100, features: ["Member management", "Basic reporting"] },\n'
        '  { name: "Pro", price: 79, members: 500, features: ["Everything in Starter", "Class scheduling", "Billing automation"] },\n'
        '  { name: "Enterprise", price: 199, members: -1, features: ["Everything in Pro", "Unlimited members", "Custom integrations"] },\n'
        "];\n\n"
        "export default function PricingPage() {\n"
        "  return (\n"
        '    <main className="min-h-screen bg-white py-20 px-8">\n'
        '      <div className="max-w-5xl mx-auto">\n'
        '        <h1 className="text-4xl font-bold text-center text-gray-900 mb-4">Simple, transparent pricing</h1>\n'
        f'        <p className="text-lg text-gray-500 text-center mb-14">{description}</p>\n'
        '        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">\n'
        "          {PLANS.map((plan) => (\n"
        '            <div key={plan.name} className="rounded-2xl border border-gray-200 p-8 flex flex-col">\n'
        '              <h2 className="text-xl font-bold mb-2">{plan.name}</h2>\n'
        '              <p className="text-4xl font-bold mb-6">${plan.price}<span className="text-sm font-normal text-gray-400">/mo</span></p>\n'
        "              <ul className=\"space-y-2 mb-8 flex-1\">\n"
        "                {plan.features.map((f) => (\n"
        '                  <li key={f} className="text-sm text-gray-600 flex items-center gap-2"><span className="text-green-500">✓</span>{f}</li>\n'
        "                ))}\n"
        "              </ul>\n"
        '              <Link href="/dashboard" className="block text-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Get started</Link>\n'
        "            </div>\n"
        "          ))}\n"
        "        </div>\n"
        "      </div>\n"
        "    </main>\n"
        "  );\n"
        "}\n"
    )


def _onboarding_page(title: str, description: str) -> str:
    return (
        "export default function OnboardingPage() {\n"
        "  return (\n"
        '    <main className="min-h-screen flex flex-col items-center justify-center p-8 bg-white">\n'
        '      <div className="max-w-md w-full text-center">\n'
        '        <h1 className="text-3xl font-bold text-gray-900 mb-4">Welcome!</h1>\n'
        f'        <p className="text-gray-500 mb-8">{description}</p>\n'
        '        <a href="/dashboard" className="block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold">Go to Dashboard</a>\n'
        "      </div>\n"
        "    </main>\n"
        "  );\n"
        "}\n"
    )


_CONTENT_BUILDERS = {
    "app/page.tsx":           _landing_page,
    "app/dashboard/page.tsx": _dashboard_page,
    "app/pricing/page.tsx":   _pricing_page,
    "app/onboarding/page.tsx": _onboarding_page,
}


class FrontendAgent(BaseAgent):
    name = "frontend_agent"

    def run(self, task: dict, context: dict) -> dict:
        title = self.title(task)
        description = self.description(task)
        lowered = f"{title} {description}".lower()

        rel_path = None
        for keyword, path in _PAGE_ROUTES:
            if keyword in lowered:
                rel_path = path
                break

        if rel_path is None:
            rel_path = f"app/{self.slug(task)}/page.tsx"

        builder = _CONTENT_BUILDERS.get(rel_path)
        if builder:
            content = builder(title, description)
        else:
            content = _generic_page(title, description, rel_path)

        print(f"  [{self.name}] generating {rel_path}")
        return self._result({rel_path: content}, notes=f"Generated {rel_path} for: {title}")
