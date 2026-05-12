import type { ProductFile, ProductSpec } from "./types";

function json(value: unknown) {
  return JSON.stringify(value, null, 2) + "\n";
}

export function createAppBlueprint(spec: ProductSpec): ProductFile[] {
  return [
    {
      relativePath: "README.md",
      content: `# ${spec.name}

${spec.prototypeNotice}

This app artifact defines product flows, screens, architecture, and a simple Next prototype.
`,
    },
    { relativePath: "product-spec.json", content: json(spec) },
    { relativePath: "app-map.md", content: "# App Map\n\n- Welcome\n- Onboarding\n- Home\n- Detail view\n- Settings\n" },
    { relativePath: "user-stories.md", content: "# User Stories\n\n- As a new user, I can understand the value quickly.\n- As a returning user, I can resume my main workflow.\n- As an operator, I can review key usage signals.\n" },
    { relativePath: "database-schema.md", content: "# Database Schema Draft\n\n## users\n- id\n- email\n\n## records\n- id\n- user_id\n- status\n- payload\n" },
    { relativePath: "api-routes.md", content: "# API Routes Draft\n\n- GET /api/me\n- GET /api/records\n- POST /api/records\n" },
    { relativePath: "ui-wireframe.md", content: "# UI Wireframe\n\nWelcome -> onboarding cards -> home feed -> detail drawer -> settings.\n" },
    { relativePath: "user-flows.md", content: "# User Flows\n\n1. Open app.\n2. Complete onboarding.\n3. Create or review first record.\n4. Return to home dashboard.\n" },
    { relativePath: "screens.md", content: "# Screens\n\n- Welcome\n- Home\n- Record detail\n- Settings\n" },
    {
      relativePath: "next-app/package.json",
      content: json({
        scripts: { dev: "next dev", build: "next build", start: "next start" },
        dependencies: { next: "14.2.29", react: "^18", "react-dom": "^18" },
        devDependencies: { typescript: "^5", "@types/react": "^18", "@types/node": "^20" },
      }),
    },
    { relativePath: "next-app/app/layout.tsx", content: "import type { ReactNode } from \"react\";\nimport \"./globals.css\";\n\nexport default function RootLayout({ children }: { children: ReactNode }) { return <html lang=\"en\"><body>{children}</body></html>; }\n" },
    {
      relativePath: "next-app/app/page.tsx",
      content: `export default function Page() {
  return (
    <main className="phone-stage">
      <section className="phone">
        <p>${spec.industry}</p>
        <h1>${spec.name}</h1>
        <span>${spec.goal}</span>
        <a href="/dashboard">Open prototype</a>
      </section>
    </main>
  );
}
`,
    },
    { relativePath: "next-app/app/dashboard/page.tsx", content: "export default function DashboardPage() { return <main className=\"phone-stage\"><section className=\"phone\"><p>Dashboard</p><h1>Today</h1><span>Prototype workflow ready for the next implementation pass.</span></section></main>; }\n" },
    { relativePath: "next-app/components/README.md", content: "# Components\n\nNative-style app components go here.\n" },
    { relativePath: "next-app/lib/README.md", content: "# Lib\n\nState and API helpers go here.\n" },
    { relativePath: "next-app/data/README.md", content: "# Data\n\nMock data goes here.\n" },
    {
      relativePath: "next-app/app/globals.css",
      content: `body { margin: 0; font-family: Inter, ui-sans-serif, system-ui, sans-serif; background: #eef2f4; color: #17202a; }
.phone-stage { min-height: 100vh; display: grid; place-items: center; padding: 40px; }
.phone { width: min(390px, 100%); min-height: 720px; display: grid; align-content: center; gap: 16px; padding: 32px; border-radius: 44px; background: #fff; border: 1px solid #d9e0e6; box-shadow: 0 30px 90px rgba(23,32,42,.16); }
.phone h1 { font-size: 44px; letter-spacing: -0.05em; margin: 0; }
.phone span { color: #526070; }
.phone a { width: max-content; padding: 12px 18px; border-radius: 999px; background: #1f5eff; color: white; text-decoration: none; font-weight: 800; }
`,
    },
  ];
}
