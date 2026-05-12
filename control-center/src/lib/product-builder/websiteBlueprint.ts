import type { ProductFile, ProductSpec } from "./types";

function json(value: unknown) {
  return JSON.stringify(value, null, 2) + "\n";
}

function websiteDomainCopy(spec: ProductSpec) {
  if (spec.domain === "construction") {
    return {
      map: ["Accueil premium", "Services construction", "Projets réalisés", "Processus", "Garanties et sécurité", "Soumission"],
      stories: [
        "As a property owner, I can understand the contractor's expertise, proof and project fit in under 10 seconds.",
        "As a commercial buyer, I can review completed projects, safety posture and service scope before requesting a quote.",
        "As the operator, I can capture qualified construction leads with project type, budget range and timeline.",
      ],
      wireframe: "Hero project-led -> services grid -> proof/case studies -> safety and process band -> quote CTA.",
      content: [
        "Headline: premium construction outcome with trust and project certainty.",
        "Body: concise proof around completed builds, renovation expertise, timelines, safety and craftsmanship.",
        "CTA: request a construction quote or book a site consultation.",
      ],
      design: "Premium construction identity: warm off-white surfaces, graphite typography, steel blue accents, large project photography slots, strong proof bands, restrained motion and high-trust spacing.",
      heroEyebrow: "Premium construction",
      heroHeadline: "Build with confidence, proof and precision.",
      heroSubcopy: "A polished construction website prototype focused on project credibility, service clarity and quote conversion.",
      cards: [
        ["Residential and commercial projects", "Showcase project types, budgets and finished work without clutter."],
        ["Safety and reliability proof", "Surface licenses, process, timelines and quality controls early."],
        ["Quote-ready lead capture", "Guide buyers toward a qualified consultation instead of a generic contact form."],
      ],
    };
  }

  return {
    map: ["Home", "Services / Offer", "Proof / Case studies", "About", "Contact / Lead capture"],
    stories: [
      "As a visitor, I can understand the offer in under 10 seconds.",
      "As a buyer, I can see services, proof, and a clear CTA.",
      "As the operator, I can capture qualified leads.",
    ],
    wireframe: "Hero -> offer cards -> proof band -> process -> contact CTA.",
    content: [
      "Headline: clear product category and outcome.",
      `Body: concise benefit statements for ${spec.targetUser}.`,
      "CTA: book a call or request a quote.",
    ],
    design: "Premium light interface, calm typography, strong whitespace, restrained accent color, responsive sections.",
    heroEyebrow: spec.industry,
    heroHeadline: spec.name,
    heroSubcopy: spec.goal,
    cards: spec.coreFeatures.slice(0, 3).map((feature) => [feature, `Focused section for ${feature}.`]),
  };
}

export function createWebsiteBlueprint(spec: ProductSpec): ProductFile[] {
  const copy = websiteDomainCopy(spec);
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

${copy.map.map((item) => `- ${item}`).join("\n")}
`,
    },
    {
      relativePath: "user-stories.md",
      content: `# User Stories

${copy.stories.map((story) => `- ${story}`).join("\n")}
`,
    },
    { relativePath: "database-schema.md", content: "# Database Schema\n\nNo database required for the first static prototype.\n" },
    { relativePath: "api-routes.md", content: "# API Routes\n\n- POST /api/contact for future lead capture.\n" },
    {
      relativePath: "ui-wireframe.md",
      content: `# UI Wireframe

${copy.wireframe}
`,
    },
    {
      relativePath: "content-plan.md",
      content: `# Content Plan

${copy.content.map((item) => `- ${item}`).join("\n")}
`,
    },
    {
      relativePath: "design-direction.md",
      content: `# Design Direction

${copy.design}
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
        <p>${copy.heroEyebrow}</p>
        <h1>${copy.heroHeadline}</h1>
        <span>${copy.heroSubcopy}</span>
        <a href="#contact">${spec.domain === "construction" ? "Request a quote" : "Start the project"}</a>
      </section>
      <section className="cards">
        ${copy.cards.map(([title, body]) => `<article><h2>${title}</h2><p>${body}</p></article>`).join("\n        ")}
      </section>
      <section id="contact" className="contact"><h2>${spec.domain === "construction" ? "Plan the next build." : "Ready to talk?"}</h2><p>${spec.domain === "construction" ? "Lead capture can collect project type, location, budget range and timeline next." : "Lead capture can be wired next."}</p></section>
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
