import { execFileSync } from "node:child_process";
import Link from "next/link";
import NvidiaImageDiagnosticButton from "@/components/diagnostics/NvidiaImageDiagnosticButton";
import { getProviderRegistry, listTraceableArtifacts } from "@/lib/providers/providerRegistry";
import { getNvidiaImageDiagnostics } from "@/lib/providers/nvidiaImageProvider";
import { runtimeDataRoot } from "@/lib/runtime/runtimeFileStore";
import { listProductionRuns } from "@/lib/runtime/missionState";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

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

function yesNo(value: boolean) {
  return value ? "oui" : "non";
}

function statusPill(ok: boolean) {
  return ok ? "ok" : "warn";
}

export default function CeoDiagnosticsPage() {
  const registry = getProviderRegistry();
  const nvidiaImage = getNvidiaImageDiagnostics();
  const artifacts = listTraceableArtifacts();
  const productionRuns = listProductionRuns();
  const lastArtifact = artifacts[0];
  const lastRun = productionRuns[0];
  const lastMissionId = lastArtifact?.missionId ?? lastRun?.id ?? "aucune";
  const lastMissionStatus = lastRun?.status ?? (lastArtifact ? "artifact_created" : "aucune mission persistée");
  const env = [
    { key: "NVIDIA_API_KEY", present: Boolean(process.env.NVIDIA_API_KEY) },
    { key: "AI_COMPANY_RUNTIME_DIR", present: Boolean(process.env.AI_COMPANY_RUNTIME_DIR), optional: true },
  ];

  const checks = [
    { label: "Runtime mission actif", value: "oui", ok: true },
    { label: "Provider texte NVIDIA", value: registry.text.available ? "disponible" : "indisponible proprement", ok: true },
    { label: "Provider image réel", value: registry.image.available ? "disponible" : "aucun configuré", ok: !registry.image.available },
    { label: "Prototype local", value: "explicite seulement", ok: registry.localPrototype.available },
    { label: "Storage artifacts", value: artifacts.length ? `${artifacts.length} artifact(s)` : "vide", ok: true },
  ];

  return (
    <main className="ceo-diagnostics-page">
      <section className="ceo-diagnostics-hero">
        <div>
          <span className="ceo-os-eyebrow">Expert diagnostics</span>
          <h1>CEO Runtime Diagnostics</h1>
          <p>Statut opérationnel du runtime CEO, des providers et des artifacts traçables.</p>
        </div>
        <Link className="os-button subtle" href="/ceo/expert">Retour expert</Link>
      </section>

      <section className="ceo-diagnostics-grid">
        <article className="os-card">
          <h2>Build</h2>
          <dl className="ceo-diagnostics-list">
            <div><dt>Git SHA</dt><dd>{gitSha()}</dd></div>
            <div><dt>Runtime data</dt><dd>{runtimeDataRoot()}</dd></div>
            <div><dt>Runtime enabled</dt><dd>oui</dd></div>
          </dl>
        </article>

        <article className="os-card">
          <h2>Providers</h2>
          <dl className="ceo-diagnostics-list">
            <div><dt>Texte</dt><dd>{registry.text.providerUsed} · {yesNo(registry.text.available)}</dd></div>
            <div><dt>Image</dt><dd>{registry.image.providerUsed} · {yesNo(registry.image.available)}</dd></div>
            <div><dt>NVIDIA image endpoint</dt><dd>{nvidiaImage.endpointHost ?? "manquant"}</dd></div>
            <div><dt>NVIDIA image model</dt><dd>{nvidiaImage.model}</dd></div>
            <div><dt>Website</dt><dd>{registry.website.providerUsed} · {registry.website.sourceType}</dd></div>
            <div><dt>Local prototype</dt><dd>{registry.localPrototype.providerUsed} · explicite</dd></div>
          </dl>
        </article>

        <article className="os-card">
          <h2>Dernière mission</h2>
          <dl className="ceo-diagnostics-list">
            <div><dt>missionId</dt><dd>{lastMissionId}</dd></div>
            <div><dt>status</dt><dd>{lastMissionStatus}</dd></div>
            <div><dt>artifactId</dt><dd>{lastArtifact?.artifactId ?? "aucun"}</dd></div>
            <div><dt>providerUsed</dt><dd>{lastArtifact?.providerUsed ?? "none"}</dd></div>
            <div><dt>sourceType</dt><dd>{lastArtifact?.sourceType ?? "none"}</dd></div>
          </dl>
        </article>

        <article className="os-card">
          <h2>Variables</h2>
          <dl className="ceo-diagnostics-list">
            {env.map((item) => (
              <div key={item.key}>
                <dt>{item.key}{item.optional ? " (optionnel)" : ""}</dt>
                <dd>{yesNo(item.present)}</dd>
              </div>
            ))}
          </dl>
        </article>
      </section>

      <section className="ceo-diagnostics-section os-card">
        <h2>Checks MVP</h2>
        <div className="ceo-diagnostics-checks">
          {checks.map((check) => (
            <div key={check.label} className={`ceo-diagnostics-check ${statusPill(check.ok)}`}>
              <strong>{check.label}</strong>
              <span>{check.value}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="ceo-diagnostics-section os-card">
        <h2>NVIDIA Image réel</h2>
        <div className="ceo-diagnostics-checks">
          <div className={`ceo-diagnostics-check ${statusPill(nvidiaImage.providerAvailable)}`}>
            <strong>Provider disponible</strong>
            <span>{yesNo(nvidiaImage.providerAvailable)}</span>
            <span>{nvidiaImage.reasons.join(" ") || "Configuration prête."}</span>
          </div>
          <div className={`ceo-diagnostics-check ${statusPill(nvidiaImage.canAttemptGeneration)}`}>
            <strong>Génération testable</strong>
            <span>{yesNo(nvidiaImage.canAttemptGeneration)}</span>
            <span>{nvidiaImage.suggestedFix}</span>
          </div>
        </div>
        <NvidiaImageDiagnosticButton />
      </section>

      <section className="ceo-diagnostics-section os-card">
        <h2>Tests recommandés</h2>
        <ul className="ceo-diagnostics-tests">
          <li>npm run lint</li>
          <li>npm run build</li>
          <li>npm test</li>
          <li>npm run test:e2e</li>
        </ul>
      </section>
    </main>
  );
}
