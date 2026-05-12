import type { ProductFile, ProductSpec } from "./types";

function json(value: unknown) {
  return JSON.stringify(value, null, 2) + "\n";
}

function featureList(spec: ProductSpec) {
  return spec.coreFeatures.map((feature) => `- ${feature}`).join("\n");
}

export function createSaasBlueprint(spec: ProductSpec): ProductFile[] {
  const dataModule = `export const metrics = [
  { label: "Active members", value: "428", trend: "+12%" },
  { label: "Monthly revenue", value: "$18.4k", trend: "+8%" },
  { label: "Classes today", value: "16", trend: "4 full" },
];

export const activities = [
  "New member onboarding ready",
  "Coach schedule reviewed",
  "Payment follow-ups queued",
];
`;

  return [
    {
      relativePath: "README.md",
      content: `# ${spec.name}

${spec.prototypeNotice}

## Goal
${spec.goal}

## Target users
${spec.targetUser}

## Core features
${featureList(spec)}

## Run the prototype
\`\`\`bash
cd next-app
npm install
npm run dev
\`\`\`

## Current limits
- Local prototype only.
- Mock data only.
- No payment provider, auth provider, database, or deployment is configured yet.
`,
    },
    { relativePath: "product-spec.json", content: json(spec) },
    {
      relativePath: "app-map.md",
      content: `# App Map

- Landing page: product promise, target market, primary CTA.
- Dashboard: operational overview, metrics, recent activity.
- Members: future area for profiles, subscriptions, and attendance.
- Scheduling: future area for classes, coaches, and availability.
- Billing: future area for invoices, payments, and subscription status.
`,
    },
    {
      relativePath: "user-stories.md",
      content: `# User Stories

- As an owner, I can see revenue, members, and schedule status from one dashboard.
- As a coach, I can see today's sessions and attendance risk.
- As an operator, I can follow up on failed or late payments.
- As a member, I can eventually manage classes and subscription details.
`,
    },
    {
      relativePath: "database-schema.md",
      content: `# Database Schema Draft

## users
- id
- name
- email
- role

## members
- id
- user_id
- subscription_status
- joined_at

## subscriptions
- id
- member_id
- plan_name
- monthly_amount
- status

## classes
- id
- title
- coach_id
- starts_at
- capacity

## payments
- id
- member_id
- amount
- status
- due_at
`,
    },
    {
      relativePath: "api-routes.md",
      content: `# API Routes Draft

- GET /api/metrics
- GET /api/members
- POST /api/members
- GET /api/classes
- POST /api/classes
- GET /api/payments
- POST /api/payments/retry
`,
    },
    {
      relativePath: "ui-wireframe.md",
      content: `# UI Wireframe

## Landing
Hero -> product value -> feature strip -> CTA.

## Dashboard
Top summary metrics -> schedule panel -> payment follow-ups -> activity feed.

## Navigation
Dashboard, Members, Schedule, Billing, Settings.
`,
    },
    {
      relativePath: "next-app/package.json",
      content: json({
        scripts: { dev: "next dev", build: "next build", start: "next start" },
        dependencies: { next: "14.2.29", react: "^18", "react-dom": "^18" },
        devDependencies: { typescript: "^5", "@types/react": "^18", "@types/node": "^20" },
      }),
    },
    {
      relativePath: "next-app/app/layout.tsx",
      content: `import type { ReactNode } from "react";
import "./globals.css";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
`,
    },
    {
      relativePath: "next-app/app/page.tsx",
      content: `import Link from "next/link";

export default function Page() {
  return (
    <main className="shell">
      <section className="hero">
        <p className="eyebrow">Prototype product</p>
        <h1>${spec.name}</h1>
        <p>${spec.goal}</p>
        <Link href="/dashboard">Open dashboard</Link>
      </section>
    </main>
  );
}
`,
    },
    {
      relativePath: "next-app/app/dashboard/page.tsx",
      content: `import { activities, metrics } from "../../data/mock";
import { MetricCard } from "../../components/MetricCard";

export default function DashboardPage() {
  return (
    <main className="shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">${spec.industry}</p>
          <h1>${spec.name} Dashboard</h1>
        </div>
      </header>
      <section className="grid">
        {metrics.map((metric) => <MetricCard key={metric.label} {...metric} />)}
      </section>
      <section className="panel">
        <h2>Operating queue</h2>
        {activities.map((activity) => <p key={activity}>{activity}</p>)}
      </section>
    </main>
  );
}
`,
    },
    {
      relativePath: "next-app/components/MetricCard.tsx",
      content: `export function MetricCard({ label, value, trend }: { label: string; value: string; trend: string }) {
  return (
    <article className="card">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{trend}</small>
    </article>
  );
}
`,
    },
    { relativePath: "next-app/data/mock.ts", content: dataModule },
    { relativePath: "next-app/lib/README.md", content: "# Lib\n\nReserved for product services and typed helpers.\n" },
    {
      relativePath: "next-app/app/globals.css",
      content: `body { margin: 0; font-family: Inter, ui-sans-serif, system-ui, sans-serif; background: #f6f2eb; color: #17202a; }
.shell { min-height: 100vh; padding: 48px; }
.hero, .panel, .card { background: white; border: 1px solid #ded8cc; border-radius: 24px; box-shadow: 0 18px 50px rgba(23,32,42,.08); }
.hero { max-width: 860px; padding: 56px; }
.hero h1, .topbar h1 { font-size: 48px; letter-spacing: -0.04em; margin: 0 0 14px; }
.hero p { color: #526070; font-size: 18px; }
.hero a { display: inline-flex; margin-top: 20px; padding: 12px 18px; border-radius: 999px; background: #1f5eff; color: white; text-decoration: none; font-weight: 800; }
.eyebrow { color: #1f5eff; text-transform: uppercase; font-size: 12px; font-weight: 900; letter-spacing: .08em; }
.topbar { margin-bottom: 24px; }
.grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 16px; margin-bottom: 16px; }
.card { padding: 20px; display: grid; gap: 8px; }
.card span, .card small { color: #667085; }
.card strong { font-size: 30px; }
.panel { padding: 24px; }
`,
    },
  ];
}
