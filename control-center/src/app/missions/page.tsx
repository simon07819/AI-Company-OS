import Link from "next/link";

export default function MissionsPlatformPage() {
  return (
    <section className="platform-page">
      <header className="platform-page-header">
        <span>Missions</span>
        <h1>Missions actives</h1>
        <p>Suivi clair des demandes en cours, sans logs techniques dans l’interface principale.</p>
      </header>
      <div className="platform-card-grid">
        {[
          ["CEO intake", "Brief en attente de production", "/ceo"],
          ["Design delivery", "Artifacts et validation qualité", "/artifacts"],
          ["Agent runtime", "Coordination et exécution interne", "/agents"],
        ].map(([title, copy, href]) => (
          <Link key={title} href={href} className="platform-card-link">
            <strong>{title}</strong>
            <span>{copy}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
