import { logoEvalCases } from "@/agents/evals/golden-cases/logo-cases";
import { websiteEvalCases } from "@/agents/evals/golden-cases/website-cases";

export default function EvalsPlatformPage() {
  const cases = [...logoEvalCases, ...websiteEvalCases];
  return (
    <section className="platform-page">
      <header className="platform-page-header">
        <span>Evals</span>
        <h1>Régressions produit</h1>
        <p>Cas critiques qui empêchent le CEO de revenir aux anciens faux livrables.</p>
      </header>
      <div className="platform-card-grid">
        {cases.slice(0, 6).map((item) => (
          <article key={item.id} className="platform-card-link">
            <strong>{item.name}</strong>
            <span>{item.prompt}</span>
          </article>
        ))}
      </div>
    </section>
  );
}
