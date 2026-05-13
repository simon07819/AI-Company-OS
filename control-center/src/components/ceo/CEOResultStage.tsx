"use client";

import { AlertTriangle, Info, Wand2 } from "lucide-react";
import { useState } from "react";
import ChatAttachmentGrid from "./ChatAttachmentGrid";
import CEOResultDetails from "./CEOResultDetails";
import LogoFinalAnswer from "./LogoFinalAnswer";
import WebsitePreviewReply from "./WebsitePreviewReply";
import type { CEOMissionAction, ChatAttachment, CEOCurrentMission, CEOCurrentResult } from "./types";

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

function hasValidatedPrimaryVisual(result: CEOCurrentResult) {
  const visual = result.primaryVisual ?? "";
  if (!visual) return false;
  if (/mock|local|fallback/i.test(String(result.sourceType ?? "")) && !result.allowLocalPrototype) return false;
  if ((result.deliverableType === "logo" || result.requestType === "branding" || result.requestType === "logo") && !result.primaryArtifactId && result.artifactPaths.length === 0) return false;
  if (/Brand system|Marque à nommer|Prototype visuel|legacy|fallback/i.test(visual)) return false;
  if (/^data:image\//i.test(visual) && result.sourceType === "nvidia_image" && result.providerUsed === "nvidia") return true;
  if (result.deliverableType === "logo" || result.requestType === "branding" || result.requestType === "logo") {
    return /<svg[\s>]/i.test(visual) && /\bviewBox=/i.test(visual);
  }
  if (result.deliverableType === "website" || result.deliverableType === "landing_page" || result.requestType === "website") {
    return /<svg[\s>]|<html[\s>]|aria-label=["'](?:nav|hero|sections)["']/i.test(visual);
  }
  return true;
}

function isLogoSupportResult(result: CEOCurrentResult) {
  return result.deliverableType === "logo_brief"
    || result.deliverableType === "logo_prompts"
    || result.deliverableType === "logo_no_provider";
}

function isNoProviderLogoResult(result: CEOCurrentResult) {
  return result.deliverableType === "logo" && !result.primaryVisual && result.sourceType === "none";
}

function sourceBadge(result: CEOCurrentResult) {
  if (result.sourceType === "local_svg" || result.allowLocalPrototype) return "Prototype local";
  if (result.status === "needs_action" || result.sourceType === "none" || result.sourceType === "provider_unavailable") {
    return "Action requise";
  }
  if (result.sourceType === "code_artifact" || result.sourceType === "real-image-provider" || result.sourceType === "nvidia_text" || result.sourceType === "nvidia_image") {
    return "Provider réel";
  }
  if (result.sourceType === "local_storage" || result.sourceType === "local_preview") return "Prototype local";
  return null;
}

function SummaryText({ value }: { value: string }) {
  return (
    <>
      {value.split("\n").map((line) => line.trim()).filter(Boolean).map((line) => (
        <p key={line}>{line}</p>
      ))}
    </>
  );
}

function CEOResultMessage({
  result,
  mission,
  expertMode,
  onModify,
  onLogoAction,
}: {
  result: CEOCurrentResult;
  mission: CEOCurrentMission | null;
  expertMode: boolean;
  onModify: () => void;
  onLogoAction: (action: CEOMissionAction, promptOverride?: string) => void;
}) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const hasArtifacts = result.artifactPaths.length > 0;
  const isWebsite = result.requestType === "website" || result.deliverableType === "website" || result.deliverableType === "landing_page";
  const isLogoDeliverable = !isWebsite && !isLogoSupportResult(result) && (result.deliverableType === "logo" || result.requestType === "logo" || /^Logo\s+/i.test(result.title));
  const hasValidPrimaryVisual = hasValidatedPrimaryVisual(result);
  const requiresVisual = isLogoDeliverable;
  const isTextRenderable = isLogoSupportResult(result);
  const isNoProviderLogo = isNoProviderLogoResult(result);
  const isRenderable = isTextRenderable || isNoProviderLogo || (requiresVisual ? hasValidPrimaryVisual : hasArtifacts && hasValidatedPrimaryVisual(result));
  const brandName = brandNameFromResult(result);
  const modifyLabel = isLogoDeliverable && !hasValidPrimaryVisual ? "Générer brief complet" : "Modifier";
  const badge = sourceBadge(result);
  const isNvidiaImage = Boolean(result.primaryVisual && /^data:image\//i.test(result.primaryVisual) && result.sourceType === "nvidia_image");

  return (
    <article className={`ceo-chat-message ceo ${isRenderable ? "ready" : "failed"}`}>
      {badge && <span className="ceo-source-badge">{badge}</span>}
      {!isLogoDeliverable && !isWebsite && !isTextRenderable && !isNoProviderLogo && <p>{responseIntro(result)}</p>}
      {isRenderable ? (
        <div className={isLogoDeliverable && hasValidPrimaryVisual ? "ceo-chat-visual-reply brand" : "ceo-chat-visual-reply product"}>
          {isWebsite && hasValidPrimaryVisual ? (
            <WebsitePreviewReply title={result.title} svg={result.primaryVisual} />
          ) : isLogoDeliverable && isNvidiaImage ? (
            <img className="ceo-chat-generated-image" src={result.primaryVisual ?? ""} alt={brandName ? `Logo ${brandName}` : result.title} />
          ) : isLogoDeliverable && hasValidPrimaryVisual ? (
            <LogoFinalAnswer
              brandName={brandName}
              darkBackground={usesDarkLogoBackground(mission?.prompt)}
              svg={result.primaryVisual}
              variants={result.prototypeVariants}
            />
          ) : isTextRenderable || isNoProviderLogo ? (
            <div className="ceo-chat-text-deliverable">
              <strong>{result.title}</strong>
              <SummaryText value={result.summary} />
            </div>
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
          <strong>{result.title || "Mission lancée"}</strong>
          <p>{result.summary}</p>
        </div>
      )}
      <div className="ceo-chat-actions">
        {isNoProviderLogoResult(result) ? (
          <>
            <button type="button" onClick={() => onLogoAction("prepare_brief")}>
              <Wand2 size={15} />
              Préparer le brief
            </button>
            <button type="button" onClick={() => onLogoAction("create_visual_prompts")}>
              <Wand2 size={15} />
              Créer prompts visuels
            </button>
            <button type="button" onClick={() => onLogoAction("request_local_prototype")}>
              <Wand2 size={15} />
              Prototype SVG local
            </button>
          </>
        ) : (
          <button type="button" onClick={onModify}>
            <Wand2 size={15} />
            {modifyLabel}
          </button>
        )}
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
  pendingAttachments = [],
  onModify,
  onLogoAction = () => {},
}: {
  result: CEOCurrentResult | null;
  mission: CEOCurrentMission | null;
  turns?: Array<{ id: string; mission: CEOCurrentMission; result: CEOCurrentResult }>;
  expertMode: boolean;
  loading: boolean;
  error: string | null;
  pendingAttachments?: ChatAttachment[];
  onModify: () => void;
  onLogoAction?: (action: CEOMissionAction, promptOverride?: string) => void;
  onContinue: () => void;
}) {
  if (loading || mission?.status === "production" || mission?.status === "preparing") {
    return (
      <section className="ceo-chat-messages" aria-label="Messages CEO">
        {!mission?.hideUserPrompt && (mission?.prompt || pendingAttachments.length > 0 || (mission?.attachments?.length ?? 0) > 0) && (
          <article className="ceo-chat-message user">
            {mission?.prompt && <p>{mission.prompt}</p>}
            <ChatAttachmentGrid attachments={pendingAttachments.length ? pendingAttachments : mission?.attachments ?? []} compact />
          </article>
        )}
        <article className="ceo-chat-message ceo loading">
          <div className="ceo-agent-inline-avatar" aria-hidden="true">C</div>
          <div className="ceo-os-thinking" aria-label="CEO écrit"><i /><i /><i /></div>
        </article>
      </section>
    );
  }

  if (error) {
    return (
      <section className="ceo-chat-messages" aria-label="Messages CEO">
        {!mission?.hideUserPrompt && (mission?.prompt || (mission?.attachments?.length ?? 0) > 0) && (
          <article className="ceo-chat-message user">
            {mission?.prompt && <p>{mission.prompt}</p>}
            <ChatAttachmentGrid attachments={mission?.attachments ?? []} compact />
          </article>
        )}
        <article className="ceo-chat-message ceo error">
          <p>Impossible de créer le projet. Détail disponible en mode expert.</p>
          {expertMode && <small>{error}</small>}
        </article>
      </section>
    );
  }

  if (!result) {
    return (
      <section className="ceo-chat-messages empty" aria-label="Messages CEO">
        <article className="ceo-chat-empty">
          <div className="ceo-chat-empty-avatar" aria-hidden="true">C</div>
          <strong>CEO</strong>
          <p>Qu’est-ce qu’on construit?</p>
        </article>
      </section>
    );
  }

  if (turns.length > 0) {
    return (
      <section className="ceo-chat-messages" aria-label="Messages CEO">
        {turns.map((turn) => (
          <div key={turn.id} className="ceo-chat-turn">
            {!turn.mission.hideUserPrompt && (
              <article className="ceo-chat-message user">
                {turn.mission.prompt && <p>{turn.mission.prompt}</p>}
                <ChatAttachmentGrid attachments={turn.mission.attachments ?? []} compact />
              </article>
            )}
            <CEOResultMessage
              result={turn.result}
              mission={turn.mission}
              expertMode={expertMode}
              onModify={onModify}
              onLogoAction={(action) => onLogoAction(action, turn.mission.prompt)}
            />
          </div>
        ))}
      </section>
    );
  }

  return (
    <section className="ceo-chat-messages" aria-label="Messages CEO">
      {!mission?.hideUserPrompt && (mission?.prompt || (mission?.attachments?.length ?? 0) > 0) && (
        <article className="ceo-chat-message user">
          {mission?.prompt && <p>{mission.prompt}</p>}
          <ChatAttachmentGrid attachments={mission?.attachments ?? []} compact />
        </article>
      )}

      <CEOResultMessage result={result} mission={mission} expertMode={expertMode} onModify={onModify} onLogoAction={onLogoAction} />
    </section>
  );
}
