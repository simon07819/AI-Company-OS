import Link from "next/link";

export default function LoginPage() {
  const devBypass = process.env.NODE_ENV !== "production";
  const tokenConfigured = Boolean(process.env.AI_COMPANY_AUTH_TOKEN || process.env.AIOS_AUTH_TOKEN);

  return (
    <main className="local-access-page">
      <section className="local-access-panel os-card">
        <span className="ceo-os-eyebrow">Accès local</span>
        <h1>AI Company OS</h1>
        <p>
          L’accès API privé utilise une garde serveur locale. En développement local, le bypass est autorisé seulement
          depuis localhost. En production, une configuration d’auth est requise.
        </p>
        <dl className="ceo-diagnostics-list">
          <div><dt>Mode local</dt><dd>{devBypass ? "autorisé" : "désactivé"}</dd></div>
          <div><dt>Auth configurée</dt><dd>{tokenConfigured ? "oui" : "non"}</dd></div>
          <div><dt>Production sans auth</dt><dd>bloqué</dd></div>
        </dl>
        <Link className="os-button" href="/ceo">Continuer</Link>
      </section>
    </main>
  );
}
