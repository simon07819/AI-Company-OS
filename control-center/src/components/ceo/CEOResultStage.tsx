"use client";

import Link from "next/link";
import { AlertTriangle, FolderOpen, Info, Wand2 } from "lucide-react";
import { useState } from "react";
import CEOResultDetails from "./CEOResultDetails";
import LogoFinalAnswer from "./LogoFinalAnswer";
import type { CEOCurrentMission, CEOCurrentResult } from "./types";

function projectTypeLabel(type?: string) {
  if (type === "saas") return "SaaS";
  if (type === "website") return "Site web";
  if (type === "app") return "App";
  if (type === "branding" || type === "logo") return "Branding";
  if (type === "business-system") return "Système business";
  return "Projet";
}

function responseIntro(result: CEOCurrentResult) {
  if (result.shortMessage) return result.shortMessage;
  if (!result.artifactPaths.length) return "Je n’ai pas encore produit un résultat exploitable.";
  if (result.requestType === "branding" || result.requestType === "logo") {
    return `Voici une première version du logo ${brandNameFromResult(result)}.`;
  }
  if (result.requestType === "website") return "J’ai préparé une première version du site.";
  if (result.requestType === "saas") return "Le projet est prêt en première version.";
  if (result.requestType === "app") return "J’ai préparé une première version de l’app.";
  return "J’ai préparé un premier résultat exploitable.";
}

function brandNameFromTitle(title: string) {
  return title
    .replace(/^Logo\s+/i, "")
    .replace(/\s+(brand system|logo concept|branding)$/i, "")
    .trim() || title;
}

function brandNameFromResult(result: CEOCurrentResult) {
  return result.brandName || brandNameFromTitle(result.title);
}

function primaryArtifactLabel(result: CEOCurrentResult) {
  if (!result.artifactPaths.length) return "Aucun fichier exploitable";
  if (result.requestType === "branding" || result.requestType === "logo") return "Prototype visuel";
  if (result.requestType === "website") return "Structure de site créée";
  if (result.requestType === "saas") return "Starter produit créé";
  return "Artifact principal créé";
}

export default function CEOResultStage({
  result,
  mission,
  expertMode,
  loading,
  error,
  onModify,
}: {
  result: CEOCurrentResult | null;
  mission: CEOCurrentMission | null;
  expertMode: boolean;
  loading: boolean;
  error: string | null;
  onModify: () => void;
  onContinue: () => void;
}) {
  const [detailsOpen, setDetailsOpen] = useState(false);

  if (loading || mission?.status === "production" || mission?.status === "preparing") {
    return (
      <section className="ceo-os-conversation" aria-label="Conversation CEO">
        {mission?.prompt && (
          <article className="ceo-os-bubble user">
            <span>Toi</span>
            <p>{mission.prompt}</p>
          </article>
        )}
        <article className="ceo-os-bubble ceo">
          <span>CEO AI</span>
          <p>Je prépare le résultat.</p>
          <div className="ceo-os-thinking" aria-label="Production en cours"><i /><i /><i /></div>
        </article>
      </section>
    );
  }

  if (error) {
    return (
      <section className="ceo-os-conversation" aria-label="Conversation CEO">
        {mission?.prompt && (
          <article className="ceo-os-bubble user">
            <span>Toi</span>
            <p>{mission.prompt}</p>
          </article>
        )}
        <article className="ceo-os-bubble ceo error">
          <span>CEO AI</span>
          <p>Impossible de créer le projet. Détail disponible en mode expert.</p>
          <small>{error}</small>
        </article>
      </section>
    );
  }

  if (!result) {
    return (
      <section className="ceo-os-conversation empty" aria-label="Conversation CEO">
        <article className="ceo-os-empty-card">
          <span>CEO AI</span>
          <h2>Prêt à construire.</h2>
          <p>Écris ce que tu veux créer. Je répondrai ici avec le résultat final utile.</p>
        </article>
      </section>
    );
  }

  const hasArtifacts = result.artifactPaths.length > 0;
  const isBranding = result.requestType === "branding" || result.requestType === "logo";
  const isLogoDeliverable = isBranding && (result.deliverableType === "logo" || /^Logo\s+/i.test(result.title) || Boolean(result.brandName));
  const brandName = brandNameFromResult(result);

  return (
    <section className="ceo-os-conversation" aria-label="Conversation CEO">
      {mission?.prompt && (
        <article className="ceo-os-bubble user">
          <span>Toi</span>
          <p>{mission.prompt}</p>
        </article>
      )}

      <article className={`ceo-os-bubble ceo ${hasArtifacts ? "ready" : "failed"}`}>
        <span>CEO AI</span>
        <p>{responseIntro(result)}</p>

        {hasArtifacts ? (
          <div className={isBranding ? "ceo-os-final-preview brand" : "ceo-os-final-preview product"}>
            <em>{isLogoDeliverable ? "Logo" : projectTypeLabel(result.requestType)}</em>
            {isBranding ? (
              <>
                <LogoFinalAnswer brandName={brandName} />
                <p>{isLogoDeliverable ? `Prototype visuel pour ${brandName}.` : result.summary}</p>
              </>
            ) : (
              <>
                <strong>{result.title}</strong>
                <p>{result.summary}</p>
                <small>{primaryArtifactLabel(result)}</small>
              </>
            )}
          </div>
        ) : (
          <div className="ceo-os-final-preview failed">
            <AlertTriangle size={18} />
            <strong>Je n’ai pas encore produit un résultat exploitable.</strong>
            <p>{result.summary}</p>
          </div>
        )}

        <div className="ceo-os-minimal-actions">
          <button type="button" onClick={onModify}>
            <Wand2 size={15} />
            Modifier
          </button>
          {!isLogoDeliverable && result.workspaceHref ? (
            <Link href={result.workspaceHref}>
              <FolderOpen size={15} />
              Ouvrir workspace
            </Link>
          ) : !isLogoDeliverable ? (
            <button type="button" disabled>
              <FolderOpen size={15} />
              Ouvrir workspace
            </button>
          ) : null}
          <button type="button" onClick={() => setDetailsOpen((open) => !open)}>
            <Info size={15} />
            Voir détails
          </button>
        </div>

        {detailsOpen && <CEOResultDetails result={result} mission={mission} expertMode={expertMode} />}
      </article>
    </section>
  );
}
