import Link from "next/link";

export default function ArtifactsPlatformPage() {
  return (
    <section className="platform-page">
      <header className="platform-page-header">
        <span>Artifacts</span>
        <h1>Livrables produits</h1>
        <p>Les livrables finaux restent associés aux missions et leurs détails restent hors du chat simple.</p>
      </header>
      <div className="platform-card-grid">
        <Link href="/outputs" className="platform-card-link">
          <strong>Résultats existants</strong>
          <span>Voir les previews et sorties générées.</span>
        </Link>
        <Link href="/ceo" className="platform-card-link">
          <strong>Nouveau livrable</strong>
          <span>Demander au CEO de produire un artifact validé.</span>
        </Link>
      </div>
    </section>
  );
}
