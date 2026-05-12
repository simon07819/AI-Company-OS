"use client";

import { AlertTriangle, Info, Wand2 } from "lucide-react";
import { useState } from "react";
import CEOResultDetails from "./CEOResultDetails";
import LogoFinalAnswer from "./LogoFinalAnswer";
import WebsitePreviewReply from "./WebsitePreviewReply";
import type { CEOCurrentMission, CEOCurrentResult } from "./types";

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

function usesDarkLogoBackground(prompt?: string) {
  return /sur\s+fond\s+noir|fond\s+noir/i.test(prompt ?? "");
}

function CEOResultMessage({
  result,
  mission,
  expertMode,
  onModify,
}: {
  result: CEOCurrentResult;
  mission: CEOCurrentMission | null;
  expertMode: boolean;
  onModify: () => void;
}) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const hasArtifacts = result.artifactPaths.length > 0;
  const isBranding = result.requestType === "branding" || result.requestType === "logo";
  const isWebsite = result.requestType === "website" || result.deliverableType === "website" || result.deliverableType === "landing_page";
  const isLogoDeliverable = isBranding && (result.deliverableType === "logo" || /^Logo\s+/i.test(result.title) || Boolean(result.brandName));
  const brandName = brandNameFromResult(result);

  return (
    <article className={`ceo-chat-message ceo ${hasArtifacts ? "ready" : "failed"}`}>
      {!isLogoDeliverable && !isWebsite && <p>{responseIntro(result)}</p>}
      {hasArtifacts ? (
        <div className={isBranding ? "ceo-chat-visual-reply brand" : "ceo-chat-visual-reply product"}>
          {isBranding ? (
            <LogoFinalAnswer brandName={brandName} darkBackground={usesDarkLogoBackground(mission?.prompt)} svg={result.primaryVisual} />
          ) : isWebsite ? (
            <WebsitePreviewReply title={result.title} svg={result.primaryVisual} />
          ) : (
            <>
              <strong>{result.title}</strong>
              <p>{result.summary}</p>
            </>
          )}
        </div>
      ) : (
        <div className="ceo-chat-visual-reply failed">
          <AlertTriangle size={18} />
          <strong>Je n’ai pas encore produit un résultat exploitable.</strong>
          <p>{result.summary}</p>
        </div>
      )}
      <div className="ceo-chat-actions">
        <button type="button" onClick={onModify}>
          <Wand2 size={15} />
          Modifier
        </button>
        <button type="button" onClick={() => setDetailsOpen((open) => !open)}>
          <Info size={15} />
          Voir détails
        </button>
      </div>
      {detailsOpen && <CEOResultDetails result={result} mission={mission} expertMode={expertMode} />}
    </article>
  );
}

export default function CEOResultStage({
  result,
  mission,
  turns = [],
  expertMode,
  loading,
  error,
  onModify,
}: {
  result: CEOCurrentResult | null;
  mission: CEOCurrentMission | null;
  turns?: Array<{ id: string; mission: CEOCurrentMission; result: CEOCurrentResult }>;
  expertMode: boolean;
  loading: boolean;
  error: string | null;
  onModify: () => void;
  onContinue: () => void;
}) {
  if (loading || mission?.status === "production" || mission?.status === "preparing") {
    return (
      <section className="ceo-chat-messages" aria-label="Messages CEO">
        {mission?.prompt && (
          <article className="ceo-chat-message user">
            <p>{mission.prompt}</p>
          </article>
        )}
        <article className="ceo-chat-message ceo">
          <p>Je prépare le résultat.</p>
          <div className="ceo-os-thinking" aria-label="Production en cours"><i /><i /><i /></div>
        </article>
      </section>
    );
  }

  if (error) {
    return (
      <section className="ceo-chat-messages" aria-label="Messages CEO">
        {mission?.prompt && (
          <article className="ceo-chat-message user">
            <p>{mission.prompt}</p>
          </article>
        )}
        <article className="ceo-chat-message ceo error">
          <p>Impossible de créer le projet. Détail disponible en mode expert.</p>
          <small>{error}</small>
        </article>
      </section>
    );
  }

  if (!result) {
    return (
      <section className="ceo-chat-messages empty" aria-label="Messages CEO">
        <article className="ceo-chat-empty">
          <p>Écris un message au CEO.</p>
        </article>
      </section>
    );
  }

  if (turns.length > 0) {
    return (
      <section className="ceo-chat-messages" aria-label="Messages CEO">
        {turns.map((turn) => (
          <div key={turn.id} className="ceo-chat-turn">
            <article className="ceo-chat-message user">
              <p>{turn.mission.prompt}</p>
            </article>
            <CEOResultMessage result={turn.result} mission={turn.mission} expertMode={expertMode} onModify={onModify} />
          </div>
        ))}
      </section>
    );
  }

  return (
    <section className="ceo-chat-messages" aria-label="Messages CEO">
      {mission?.prompt && (
        <article className="ceo-chat-message user">
          <p>{mission.prompt}</p>
        </article>
      )}

      <CEOResultMessage result={result} mission={mission} expertMode={expertMode} onModify={onModify} />
    </section>
  );
}
