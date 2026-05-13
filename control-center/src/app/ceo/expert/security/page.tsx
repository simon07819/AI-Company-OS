import { execFileSync } from "node:child_process";
import Link from "next/link";
import { headers } from "next/headers";
import { getCurrentUser } from "@/lib/auth/serverAuth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const criticalTables = [
  { name: "users / profiles", access: "self_or_admin", anon: "non" },
  { name: "companies", access: "owner_or_admin", anon: "non" },
  { name: "projects", access: "owner_or_admin", anon: "non" },
  { name: "missions", access: "owner_or_admin", anon: "non" },
  { name: "messages / chats / conversations", access: "owner_or_admin", anon: "non" },
  { name: "artifacts / outputs", access: "owner_or_admin", anon: "public explicite seulement" },
  { name: "uploads / files", access: "owner_or_admin", anon: "non" },
  { name: "logs / runtime / events", access: "admin_only", anon: "non" },
  { name: "agent_runs / agent_logs", access: "admin_only", anon: "non" },
];

const expectedBuckets = [
  { name: "uploads", access: "private", writes: "authenticated" },
  { name: "files", access: "private", writes: "authenticated" },
  { name: "artifacts", access: "private", writes: "authenticated" },
  { name: "mission-artifacts", access: "private", writes: "authenticated" },
  { name: "workspaces", access: "private", writes: "authenticated" },
  { name: "ceo-uploads", access: "private", writes: "authenticated" },
];

function gitSha() {
  if (process.env.VERCEL_GIT_COMMIT_SHA) return process.env.VERCEL_GIT_COMMIT_SHA.slice(0, 12);
  try {
    return execFileSync("git", ["rev-parse", "--short=12", "HEAD"], {
      cwd: process.cwd(),
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return "unknown";
  }
}

function present(key: string) {
  return process.env[key] ? "oui" : "non";
}

export default function CeoSecurityPage() {
  const auth = getCurrentUser({ headers: headers() as unknown as Headers });
  if (!auth.user) {
    return (
      <main className="local-access-page">
        <section className="local-access-panel os-card">
          <span className="ceo-os-eyebrow">Expert security</span>
          <h1>Accès requis</h1>
          <p>Les diagnostics sécurité sont privés. Configure une auth serveur ou utilise le bypass local en développement.</p>
          <Link className="os-button" href="/login">Accès local</Link>
        </section>
      </main>
    );
  }

  const env = [
    { key: "NEXT_PUBLIC_SUPABASE_URL", required: true },
    { key: "NEXT_PUBLIC_SUPABASE_ANON_KEY", required: true },
    { key: "SUPABASE_SERVICE_ROLE_KEY", required: false, serverOnly: true },
  ];

  const warnings = [
    "Appliquer la migration Supabase avant de considérer les tables publiques sécurisées.",
    "Vérifier dans Supabase que security_audit.phase8_rls_expected_status ne retourne aucun anon_can_write.",
    "Garder les routes API admin derrière auth avant exposition multi-utilisateur publique.",
  ];

  return (
    <main className="ceo-diagnostics-page ceo-security-page">
      <section className="ceo-diagnostics-hero">
        <div>
          <span className="ceo-os-eyebrow">Expert security</span>
          <h1>Supabase Security Diagnostics</h1>
          <p>Contrôle attendu des tables, buckets et variables Supabase sans exposer les secrets.</p>
        </div>
        <div className="ceo-security-actions">
          <Link className="os-button subtle" href="/ceo/expert/diagnostics">Diagnostics runtime</Link>
          <Link className="os-button subtle" href="/ceo/expert">Retour expert</Link>
        </div>
      </section>

      <section className="ceo-diagnostics-grid">
        <article className="os-card">
          <h2>Build</h2>
          <dl className="ceo-diagnostics-list">
            <div><dt>Git SHA</dt><dd>{gitSha()}</dd></div>
            <div><dt>Migration active</dt><dd>20260513175314_secure_rls_policies.sql</dd></div>
            <div><dt>RLS attendu</dt><dd>activé et forcé</dd></div>
          </dl>
        </article>

        <article className="os-card">
          <h2>Variables</h2>
          <dl className="ceo-diagnostics-list">
            {env.map((item) => (
              <div key={item.key}>
                <dt>{item.key}{item.required ? "" : " (optionnel)"}</dt>
                <dd>{present(item.key)}{item.serverOnly ? " · serveur seulement" : ""}</dd>
              </div>
            ))}
          </dl>
        </article>

        <article className="os-card">
          <h2>Auth serveur</h2>
          <dl className="ceo-diagnostics-list">
            <div><dt>Bypass dev</dt><dd>{process.env.NODE_ENV === "production" ? "non" : "localhost seulement"}</dd></div>
            <div><dt>Token local</dt><dd>{process.env.AI_COMPANY_AUTH_TOKEN || process.env.AIOS_AUTH_TOKEN ? "configuré" : "non configuré"}</dd></div>
            <div><dt>Production sans auth</dt><dd>bloquée</dd></div>
          </dl>
        </article>
      </section>

      <section className="ceo-diagnostics-section os-card">
        <h2>Tables Critiques</h2>
        <div className="ceo-security-table" role="table" aria-label="Tables Supabase critiques">
          <div role="row" className="head">
            <span role="columnheader">Table</span>
            <span role="columnheader">Accès attendu</span>
            <span role="columnheader">Anon</span>
          </div>
          {criticalTables.map((table) => (
            <div role="row" key={table.name}>
              <span role="cell">{table.name}</span>
              <span role="cell">{table.access}</span>
              <span role="cell">{table.anon}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="ceo-diagnostics-section os-card">
        <h2>Storage</h2>
        <div className="ceo-security-table" role="table" aria-label="Buckets Supabase attendus">
          <div role="row" className="head">
            <span role="columnheader">Bucket</span>
            <span role="columnheader">Visibilité</span>
            <span role="columnheader">Écriture</span>
          </div>
          {expectedBuckets.map((bucket) => (
            <div role="row" key={bucket.name}>
              <span role="cell">{bucket.name}</span>
              <span role="cell">{bucket.access}</span>
              <span role="cell">{bucket.writes}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="ceo-diagnostics-section os-card">
        <h2>Warnings</h2>
        <ul className="ceo-diagnostics-tests">
          {warnings.map((warning) => <li key={warning}>{warning}</li>)}
        </ul>
      </section>
    </main>
  );
}
