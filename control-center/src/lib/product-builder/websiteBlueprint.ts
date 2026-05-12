import type { ProductFile, ProductSpec } from "./types";

function json(value: unknown) {
  return JSON.stringify(value, null, 2) + "\n";
}

export function createWebsiteBlueprint(spec: ProductSpec): ProductFile[] {
  return [
    {
      relativePath: "README.md",
      content: `# ${spec.name}

${spec.prototypeNotice}

This website artifact includes a content structure, design direction, and a simple Next prototype.
`,
    },
    { relativePath: "product-spec.json", content: json(spec) },
    {
      relativePath: "app-map.md",
      content: `# Website Map

- Home
- Services / Offer
- Proof / Case studies
- About
- Contact / Lead capture
`,
    },
    {
      relativePath: "user-stories.md",
      content: `# User Stories

- As a visitor, I can understand the offer in under 10 seconds.
- As a buyer, I can see services, proof, and a clear CTA.
- As the operator, I can capture qualified leads.
`,
    },
    { relativePath: "database-schema.md", content: "# Database Schema\n\nNo database required for the first static prototype.\n" },
    { relativePath: "api-routes.md", content: "# API Routes\n\n- POST /api/contact for future lead capture.\n" },
    {
      relativePath: "ui-wireframe.md",
      content: `# UI Wireframe

Hero -> offer cards -> proof band -> process -> contact CTA.
`,
    },
    {
      relativePath: "content-plan.md",
      content: `# Content Plan

- Headline: clear product category and outcome.
- Body: concise benefit statements for ${spec.targetUser}.
- CTA: book a call or request a quote.
`,
    },
    {
      relativePath: "design-direction.md",
      content: `# Design Direction

Premium light interface, calm typography, strong whitespace, restrained accent color, responsive sections.
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
  return <html lang="en"><body>{children}</body></html>;
}
`,
    },
    {
      relativePath: "next-app/app/page.tsx",
      content: `export default function Page() {
  return (
    <main>
      <section className="hero">
        <p>${spec.industry}</p>
        <h1>${spec.name}</h1>
        <span>${spec.goal}</span>
        <a href="#contact">Start the project</a>
      </section>
      <section className="cards">
        ${spec.coreFeatures.slice(0, 3).map((feature) => `<article><h2>${feature}</h2><p>Focused section for ${feature}.</p></article>`).join("\n        ")}
      </section>
      <section id="contact" className="contact"><h2>Ready to talk?</h2><p>Lead capture can be wired next.</p></section>
    </main>
  );
}
`,
    },
    { relativePath: "next-app/app/dashboard/page.tsx", content: "export default function DashboardPage() { return <main className=\"hero\"><h1>Website admin placeholder</h1><p>Analytics and leads can be added next.</p></main>; }\n" },
    { relativePath: "next-app/components/README.md", content: "# Components\n\nReusable website components go here.\n" },
    { relativePath: "next-app/lib/README.md", content: "# Lib\n\nLead capture and CMS helpers go here.\n" },
    { relativePath: "next-app/data/README.md", content: "# Data\n\nStatic page content can be moved here.\n" },
    {
      relativePath: "next-app/app/globals.css",
      content: `body { margin: 0; font-family: Inter, ui-sans-serif, system-ui, sans-serif; background: #f8f5ef; color: #17202a; }
.hero { min-height: 70vh; display: grid; align-content: center; gap: 18px; padding: 64px; }
.hero h1 { max-width: 900px; font-size: 64px; letter-spacing: -0.05em; margin: 0; }
.hero span { max-width: 720px; color: #526070; font-size: 20px; }
.hero a { width: max-content; padding: 13px 18px; border-radius: 999px; background: #1f5eff; color: white; text-decoration: none; font-weight: 800; }
.cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; padding: 0 64px 64px; }
article, .contact { background: white; border: 1px solid #ded8cc; border-radius: 24px; padding: 24px; box-shadow: 0 18px 50px rgba(23,32,42,.08); }
.contact { margin: 0 64px 64px; }
`,
    },
  ];
}
