import type { ProductFile, ProductSpec } from "./types";

type SaasDomainConfig = {
  domain: string;
  productNoun: string;
  primaryEntity: string;
  primaryRoute: string;
  secondaryRoute: string;
  moneyLabel: string;
  personas: string[];
  features: string[];
  entities: { name: string; fields: string[] }[];
  routes: string[];
  screens: string[];
  metrics: { label: string; value: string; trend: string }[];
  records: Record<string, string>[];
  activities: string[];
  mvpRoadmap: string[];
  risks: string[];
};

function json(value: unknown) {
  return JSON.stringify(value, null, 2) + "\n";
}

function lines(items: string[]) {
  return items.map((item) => `- ${item}`).join("\n");
}

function domainConfig(spec: ProductSpec): SaasDomainConfig {
  if (spec.domain === "clinic") {
    return {
      domain: "clinic",
      productNoun: "clinic appointment platform",
      primaryEntity: "Patients",
      primaryRoute: "patients",
      secondaryRoute: "appointments",
      moneyLabel: "Billing pending",
      personas: [
        "Clinic manager: wants schedule visibility, billing status, and patient flow in one place.",
        "Receptionist: needs fast appointment booking, rescheduling, and patient lookup.",
        "Practitioner: needs a clean view of upcoming appointments and patient context.",
      ],
      features: ["patients", "rendez-vous", "praticiens", "facturation", "disponibilités", "tableau de bord"],
      entities: [
        { name: "patients", fields: ["id", "name", "phone", "email", "status", "nextAppointmentAt"] },
        { name: "appointments", fields: ["id", "patientId", "practitionerId", "startsAt", "reason", "status"] },
        { name: "practitioners", fields: ["id", "name", "specialty", "availabilityStatus"] },
        { name: "invoices", fields: ["id", "patientId", "amount", "status", "dueAt"] },
      ],
      routes: ["/dashboard", "/patients", "/appointments", "/practitioners", "/billing", "/settings"],
      screens: ["Operations dashboard", "Patient directory", "Appointment calendar", "Practitioner board", "Billing follow-up", "Settings"],
      metrics: [
        { label: "Appointments today", value: "38", trend: "+6 vs yesterday" },
        { label: "Patients active", value: "1,284", trend: "+42 this month" },
        { label: "Billing pending", value: "$12.8k", trend: "18 invoices" },
      ],
      records: [
        { name: "Amelie Gagnon", status: "Confirmed", detail: "Dental hygiene · 10:30" },
        { name: "Marc Tremblay", status: "Needs follow-up", detail: "Physio assessment · 13:00" },
        { name: "Nadia Boucher", status: "Invoice pending", detail: "Dermatology consult · $180" },
      ],
      activities: ["3 appointments need confirmation", "2 practitioners have open slots", "18 invoices are pending review"],
      mvpRoadmap: ["Patient directory", "Appointment scheduling", "Practitioner availability", "Billing status", "Daily dashboard"],
      risks: ["Medical privacy requirements need legal review.", "Calendar integrations are not connected yet.", "Billing provider is mocked."],
    };
  }

  if (spec.domain === "real-estate") {
    return {
      domain: "real-estate",
      productNoun: "real estate operations platform",
      primaryEntity: "Properties",
      primaryRoute: "properties",
      secondaryRoute: "showings",
      moneyLabel: "Pipeline value",
      personas: [
        "Broker owner: wants pipeline, showings, and contracts in one operating view.",
        "Agent: needs property and client follow-up without spreadsheet work.",
        "Coordinator: needs contract status and visit scheduling.",
      ],
      features: ["propriétés", "clients", "visites", "contrats", "pipeline", "tableau de bord"],
      entities: [
        { name: "properties", fields: ["id", "address", "askingPrice", "stage", "ownerId"] },
        { name: "clients", fields: ["id", "name", "intent", "budget", "status"] },
        { name: "showings", fields: ["id", "propertyId", "clientId", "startsAt", "status"] },
        { name: "contracts", fields: ["id", "propertyId", "clientId", "amount", "status"] },
      ],
      routes: ["/dashboard", "/properties", "/clients", "/showings", "/contracts", "/settings"],
      screens: ["Pipeline dashboard", "Property inventory", "Client CRM", "Showing schedule", "Contract tracker", "Settings"],
      metrics: [
        { label: "Active properties", value: "54", trend: "+7 this week" },
        { label: "Showings booked", value: "21", trend: "8 today" },
        { label: "Pipeline value", value: "$18.6M", trend: "+11%" },
      ],
      records: [
        { name: "1240 Rue Saint-Paul", status: "Showing booked", detail: "$749k · Condo" },
        { name: "Emma Larose", status: "Buyer lead", detail: "$900k budget" },
        { name: "Duplex Verdun", status: "Contract review", detail: "$1.2M" },
      ],
      activities: ["5 showings need confirmation", "3 contracts require review", "12 leads have no next action"],
      mvpRoadmap: ["Property inventory", "Client CRM", "Showing schedule", "Contract tracker", "Pipeline dashboard"],
      risks: ["MLS integrations are not connected.", "Contract workflows vary by region.", "No e-signature provider is configured."],
    };
  }

  if (spec.domain === "ecommerce") {
    return {
      domain: "ecommerce",
      productNoun: "e-commerce operations platform",
      primaryEntity: "Products",
      primaryRoute: "products",
      secondaryRoute: "orders",
      moneyLabel: "Revenue today",
      personas: [
        "Store operator: wants orders, inventory, and revenue in one dashboard.",
        "Support lead: needs customer and order context quickly.",
        "Growth owner: needs product and revenue signals.",
      ],
      features: ["produits", "commandes", "clients", "revenus", "inventaire", "tableau de bord"],
      entities: [
        { name: "products", fields: ["id", "name", "sku", "stock", "price", "status"] },
        { name: "orders", fields: ["id", "customerId", "total", "fulfillmentStatus", "createdAt"] },
        { name: "customers", fields: ["id", "name", "email", "lifetimeValue"] },
        { name: "revenue_events", fields: ["id", "orderId", "amount", "channel", "createdAt"] },
      ],
      routes: ["/dashboard", "/products", "/orders", "/customers", "/revenue", "/settings"],
      screens: ["Revenue dashboard", "Product catalog", "Order queue", "Customer list", "Revenue report", "Settings"],
      metrics: [
        { label: "Orders today", value: "126", trend: "+14%" },
        { label: "Revenue today", value: "$9.8k", trend: "+18%" },
        { label: "Low-stock SKUs", value: "12", trend: "Needs reorder" },
      ],
      records: [
        { name: "Camera Strap Pro", status: "Low stock", detail: "12 units" },
        { name: "Order #1048", status: "Fulfillment", detail: "$189.00" },
        { name: "Maya Chen", status: "VIP customer", detail: "$1,420 LTV" },
      ],
      activities: ["12 products need restock", "9 orders need fulfillment", "4 VIP customers opened tickets"],
      mvpRoadmap: ["Product catalog", "Order queue", "Customer profiles", "Revenue dashboard", "Inventory warnings"],
      risks: ["No payment processor is connected.", "Fulfillment integrations are mocked.", "Tax and shipping rules need configuration."],
    };
  }

  return {
    domain: "fitness",
    productNoun: "gym management platform",
    primaryEntity: "Members",
    primaryRoute: "members",
    secondaryRoute: "classes",
    moneyLabel: "Monthly revenue",
    personas: [
      "Gym owner: wants revenue, subscriptions, and attendance visible in one place.",
      "Coach: needs today's classes and member status.",
      "Operator: needs payment follow-up and schedule control.",
    ],
    features: ["membres", "abonnements", "cours", "coachs", "paiements", "tableau de bord"],
    entities: [
      { name: "members", fields: ["id", "name", "email", "subscriptionStatus", "joinedAt"] },
      { name: "subscriptions", fields: ["id", "memberId", "planName", "monthlyAmount", "status"] },
      { name: "classes", fields: ["id", "title", "coachId", "startsAt", "capacity"] },
      { name: "payments", fields: ["id", "memberId", "amount", "status", "dueAt"] },
    ],
    routes: ["/dashboard", "/members", "/classes", "/coaches", "/payments", "/settings"],
    screens: ["Owner dashboard", "Member directory", "Class schedule", "Coach board", "Payment follow-up", "Settings"],
    metrics: [
      { label: "Active members", value: "428", trend: "+12%" },
      { label: "Monthly revenue", value: "$18.4k", trend: "+8%" },
      { label: "Classes today", value: "16", trend: "4 full" },
    ],
    records: [
      { name: "Sofia Martin", status: "Active", detail: "Unlimited plan" },
      { name: "Alex Nguyen", status: "Payment due", detail: "$89 due Friday" },
      { name: "HIIT 18:00", status: "Almost full", detail: "18/20 booked" },
    ],
    activities: ["New member onboarding ready", "Coach schedule reviewed", "Payment follow-ups queued"],
    mvpRoadmap: ["Member directory", "Subscription tracking", "Class schedule", "Coach assignments", "Payment follow-up"],
    risks: ["Payment provider is not connected.", "Attendance check-in is not implemented.", "No auth provider is configured."],
  };
}

function entityMarkdown(config: SaasDomainConfig) {
  return config.entities.map((entity) => `## ${entity.name}\n${lines(entity.fields)}`).join("\n\n");
}

function appRouteContent(config: SaasDomainConfig) {
  return config.routes.map((route) => `- ${route}`).join("\n");
}

function routePage(title: string, config: SaasDomainConfig) {
  return `import { AppShell } from "../../components/AppShell";
import { DataTable } from "../../components/DataTable";
import { records } from "../../lib/mockData";

export default function Page() {
  return (
    <AppShell title="${title}">
      <section className="panel">
        <h2>${title}</h2>
        <p className="muted">Domain-aware prototype data for ${config.productNoun}.</p>
        <DataTable rows={records} />
      </section>
    </AppShell>
  );
}
`;
}

export function createSaasBlueprint(spec: ProductSpec): ProductFile[] {
  const config = domainConfig(spec);
  const features = config.features.length ? config.features : spec.coreFeatures;

  const files: ProductFile[] = [
    {
      relativePath: "README.md",
      content: `# ${spec.name}

${spec.prototypeNotice}

## Product Brief
${spec.goal}

This first build is a structured ${config.productNoun} for ${spec.targetUser}.

## Generated artifacts
- Product brief
- User personas
- Feature map
- Data model
- App routes
- UI screens
- Next.js starter app
- Mock data
- MVP roadmap
- Risks / assumptions
- Next steps
- Artifact manifest

## Launch the Next.js starter
\`\`\`bash
cd next-app
npm install
npm run dev
\`\`\`

Open http://localhost:3000 after the dev server starts.

## Current limitations
${lines(config.risks)}
- Prototype only: no auth, production database, external integrations, or deployment yet.
`,
    },
    { relativePath: "product-spec.json", content: json({ ...spec, features, routes: config.routes, screens: config.screens }) },
    {
      relativePath: "product-brief.md",
      content: `# Product Brief

## Product
${spec.name}

## Domain
${config.domain}

## Goal
${spec.goal}

## Target users
${spec.targetUser}

## First useful outcome
Give operators a clear dashboard and one primary workflow around ${config.primaryEntity.toLowerCase()}.
`,
    },
    {
      relativePath: "user-personas.md",
      content: `# User Personas

${lines(config.personas)}
`,
    },
    {
      relativePath: "feature-map.md",
      content: `# Feature Map

${lines(features)}

## MVP priority
${lines(config.mvpRoadmap)}
`,
    },
    { relativePath: "data-model.md", content: `# Data Model\n\n${entityMarkdown(config)}\n` },
    {
      relativePath: "app-routes.md",
      content: `# App Routes

${appRouteContent(config)}
`,
    },
    {
      relativePath: "ui-screens.md",
      content: `# UI Screens

${lines(config.screens)}
`,
    },
    {
      relativePath: "app-map.md",
      content: `# App Map

Landing page -> dashboard -> ${config.primaryRoute} -> ${config.secondaryRoute} -> settings.
`,
    },
    {
      relativePath: "user-stories.md",
      content: `# User Stories

${config.personas.map((persona) => `- As a ${persona.split(":")[0].toLowerCase()}, I can manage ${config.primaryEntity.toLowerCase()} and see the next operational action.`).join("\n")}
`,
    },
    { relativePath: "database-schema.md", content: `# Database Schema Draft\n\n${entityMarkdown(config)}\n` },
    {
      relativePath: "api-routes.md",
      content: `# API Routes Draft

- GET /api/metrics
- GET /api/${config.primaryRoute}
- POST /api/${config.primaryRoute}
- GET /api/${config.secondaryRoute}
- POST /api/${config.secondaryRoute}
- GET /api/settings
`,
    },
    {
      relativePath: "ui-wireframe.md",
      content: `# UI Wireframe

## Landing
Hero -> domain promise -> feature strip -> dashboard CTA.

## Dashboard
Metrics -> operating queue -> recent ${config.primaryEntity.toLowerCase()} -> next actions.

## Primary workflow
${config.primaryEntity} list -> detail view -> status update -> next action.
`,
    },
    {
      relativePath: "mvp-roadmap.md",
      content: `# MVP Roadmap

${lines(config.mvpRoadmap)}

## Next build pass
- Add create/edit forms.
- Add persistent database.
- Add authentication and role-based permissions.
`,
    },
    {
      relativePath: "risks-assumptions.md",
      content: `# Risks / Assumptions

${lines(config.risks)}
- The generated app uses mock data and does not claim production readiness.
`,
    },
    {
      relativePath: "next-steps.md",
      content: `# Next Steps

- Review the product brief and domain assumptions.
- Run the Next starter locally.
- Confirm data fields for ${config.primaryEntity.toLowerCase()}.
- Choose auth, database, and integration providers.
- Build create/edit flows for the MVP.
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
    <main className="landing">
      <section className="hero">
        <p className="eyebrow">${config.domain} SaaS prototype</p>
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
      content: `import { AppShell } from "../../components/AppShell";
import { MetricCard } from "../../components/MetricCard";
import { DataTable } from "../../components/DataTable";
import { activities, metrics, records } from "../../lib/mockData";

export default function DashboardPage() {
  return (
    <AppShell title="${spec.name}">
      <section className="grid">
        {metrics.map((metric) => <MetricCard key={metric.label} {...metric} />)}
      </section>
      <section className="twoCol">
        <div className="panel">
          <h2>Operating queue</h2>
          {activities.map((activity) => <p key={activity}>{activity}</p>)}
        </div>
        <div className="panel">
          <h2>Recent ${config.primaryEntity}</h2>
          <DataTable rows={records} />
        </div>
      </section>
    </AppShell>
  );
}
`,
    },
    { relativePath: `next-app/app/${config.primaryRoute}/page.tsx`, content: routePage(config.primaryEntity, config) },
    { relativePath: `next-app/app/${config.secondaryRoute}/page.tsx`, content: routePage(config.secondaryRoute.replace(/-/g, " "), config) },
    {
      relativePath: "next-app/app/settings/page.tsx",
      content: `import { AppShell } from "../../components/AppShell";

export default function SettingsPage() {
  return (
    <AppShell title="Settings">
      <section className="panel">
        <h2>Prototype settings</h2>
        <p className="muted">Configure auth, database, billing, and integrations in the next implementation pass.</p>
      </section>
    </AppShell>
  );
}
`,
    },
    {
      relativePath: "next-app/components/AppShell.tsx",
      content: `import Link from "next/link";
import type { ReactNode } from "react";

const nav = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/${config.primaryRoute}", label: "${config.primaryEntity}" },
  { href: "/${config.secondaryRoute}", label: "${config.secondaryRoute.replace(/-/g, " ")}" },
  { href: "/settings", label: "Settings" },
];

export function AppShell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className="app">
      <aside className="sidebar">
        <strong>${spec.name}</strong>
        <nav>{nav.map((item) => <Link key={item.href} href={item.href}>{item.label}</Link>)}</nav>
      </aside>
      <section className="workspace">
        <header><p className="eyebrow">${config.domain}</p><h1>{title}</h1></header>
        {children}
      </section>
    </main>
  );
}
`,
    },
    {
      relativePath: "next-app/components/MetricCard.tsx",
      content: `export function MetricCard({ label, value, trend }: { label: string; value: string; trend: string }) {
  return <article className="card"><span>{label}</span><strong>{value}</strong><small>{trend}</small></article>;
}
`,
    },
    {
      relativePath: "next-app/components/DataTable.tsx",
      content: `import type { RecordRow } from "../lib/types";

export function DataTable({ rows }: { rows: RecordRow[] }) {
  return (
    <div className="table">
      {rows.map((row) => (
        <article key={row.name}>
          <strong>{row.name}</strong>
          <span>{row.status}</span>
          <small>{row.detail}</small>
        </article>
      ))}
    </div>
  );
}
`,
    },
    {
      relativePath: "next-app/lib/types.ts",
      content: `export type Metric = { label: string; value: string; trend: string };
export type RecordRow = { name: string; status: string; detail: string };
`,
    },
    {
      relativePath: "next-app/lib/mockData.ts",
      content: `import type { Metric, RecordRow } from "./types";

export const metrics: Metric[] = ${json(config.metrics).trim()};

export const records: RecordRow[] = ${json(config.records).trim()};

export const activities = ${json(config.activities).trim()};
`,
    },
    {
      relativePath: "next-app/app/globals.css",
      content: `body { margin: 0; font-family: Inter, ui-sans-serif, system-ui, sans-serif; background: #f6f2eb; color: #17202a; }
a { color: inherit; text-decoration: none; }
.landing { min-height: 100vh; display: grid; place-items: center; padding: 40px; }
.hero, .panel, .card { background: white; border: 1px solid #ded8cc; border-radius: 24px; box-shadow: 0 18px 50px rgba(23,32,42,.08); }
.hero { max-width: 860px; padding: 56px; }
.hero h1, header h1 { font-size: 48px; letter-spacing: -0.04em; margin: 0 0 14px; }
.hero p, .muted { color: #526070; font-size: 16px; }
.hero a { display: inline-flex; margin-top: 20px; padding: 12px 18px; border-radius: 999px; background: #1f5eff; color: white; font-weight: 800; }
.app { min-height: 100vh; display: grid; grid-template-columns: 240px minmax(0,1fr); }
.sidebar { padding: 24px; border-right: 1px solid #ded8cc; background: rgba(255,255,255,.72); }
.sidebar nav { display: grid; gap: 8px; margin-top: 24px; }
.sidebar a { padding: 10px 12px; border-radius: 12px; color: #526070; }
.sidebar a:hover { background: #eef3ff; color: #1f5eff; }
.workspace { min-width: 0; padding: 40px; }
.eyebrow { color: #1f5eff; text-transform: uppercase; font-size: 12px; font-weight: 900; letter-spacing: .08em; }
.grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 16px; margin: 24px 0; }
.twoCol { display: grid; grid-template-columns: minmax(0, .85fr) minmax(0, 1.15fr); gap: 16px; }
.card, .panel { padding: 20px; }
.card { display: grid; gap: 8px; }
.card span, .card small { color: #667085; }
.card strong { font-size: 30px; }
.table { display: grid; gap: 10px; }
.table article { display: grid; grid-template-columns: 1fr auto; gap: 4px 12px; padding: 12px; border: 1px solid #e5ded2; border-radius: 14px; }
.table small { grid-column: 1 / -1; color: #667085; }
@media (max-width: 820px) { .app { grid-template-columns: 1fr; } .sidebar { border-right: 0; border-bottom: 1px solid #ded8cc; } .twoCol { grid-template-columns: 1fr; } }
`,
    },
  ];

  return files;
}
