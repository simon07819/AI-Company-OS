"use client";

import { AlertTriangle, Download, ExternalLink, Info, Wand2 } from "lucide-react";
import { useState } from "react";
import ChatAttachmentGrid from "./ChatAttachmentGrid";
import CEOResultDetails from "./CEOResultDetails";
import CodePreviewFrame from "./CodePreviewFrame";
import LogoFinalAnswer from "./LogoFinalAnswer";
import WebsitePreviewReply from "./WebsitePreviewReply";
import type { CEOMemoryAction, CEOMissionAction, ChatAttachment, CEOCurrentMission, CEOCurrentResult } from "./types";

type TeamContribution = {
  agent?: string;
  agentId?: string;
  name?: string;
  role?: string;
  status?: string;
  summary?: string;
  durationMs?: number;
  providerUsed?: string;
};

type RuntimeWithTeam = {
  creativeAgency?: {
    agentOutputs?: TeamContribution[];
    imageGenerationPlan?: {
      selectedDirection?: string;
      visualGoals?: string[];
      expectedOutputType?: string;
    };
    critiqueReport?: {
      decision?: string;
      brandAlignmentScore?: number;
      clarityScore?: number;
      marketingEffectivenessScore?: number;
      visualCohesionScore?: number;
    };
  };
  timeline?: TeamContribution[];
};

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
  if (
    /^data:image\//i.test(visual)
    && (
      (result.sourceType === "nvidia_image" && result.providerUsed === "nvidia")
      || (result.sourceType === "deepinfra_image" && result.providerUsed === "deepinfra")
    )
  ) return true;
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
  if (result.sourceType === "code_artifact" || result.sourceType === "codex_code" || result.sourceType === "real-image-provider" || result.sourceType === "nvidia_text" || result.sourceType === "nvidia_image" || result.sourceType === "deepinfra_image") {
    return "Provider réel";
  }
  if (result.sourceType === "local_storage" || result.sourceType === "local_preview") return "Prototype local";
  return null;
}

function teamStatus(result: CEOCurrentResult) {
  if (result.status === "completed" && (result.deliverableType === "logo" || result.requestType === "logo" || result.requestType === "branding")) {
    return "Équipe branding terminée · Review validée";
  }
  if (result.status === "completed" && (result.deliverableType === "website" || result.requestType === "website")) {
    return "Équipe website terminée · Review validée";
  }
  if (result.status === "needs_action") return "Action requise · Review validée";
  if (result.status === "reviewing") return "Review en cours";
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

function runtimeTeam(result: CEOCurrentResult): { team: TeamContribution[]; selectedDirection?: string; score?: string } {
  const runtime = result.expert?.runtime as RuntimeWithTeam | undefined;
  const agency = runtime?.creativeAgency;
  const team = agency?.agentOutputs?.length
    ? agency.agentOutputs
    : runtime?.timeline?.filter((item) => (item.agent ?? item.agentId ?? item.name) && (item.agent ?? item.agentId) !== "ceo") ?? [];
  const critique = agency?.critiqueReport;
  const scores = critique
    ? [critique.brandAlignmentScore, critique.clarityScore, critique.marketingEffectivenessScore, critique.visualCohesionScore]
      .filter((value): value is number => typeof value === "number")
    : [];
  const score = scores.length ? `${Math.round(scores.reduce((sum, value) => sum + value, 0) / scores.length)}/100` : undefined;
  return {
    team: team.slice(0, 9),
    selectedDirection: agency?.imageGenerationPlan?.selectedDirection,
    score,
  };
}

function labelForAgent(agent?: string) {
  const labels: Record<string, string> = {
    creative_project_manager: "Chef de projet créatif",
    brand_strategist: "Stratégie de marque",
    marketing_strategist: "Stratégie marketing",
    art_director: "Direction artistique",
    copy_concept_agent: "Concept & wording",
    image_designer: "Designer image",
    creative_critic: "Critique créative",
    ceo_synthesis: "Synthèse CEO",
    artifact_manager: "Artifacts",
  };
  return labels[agent ?? ""] ?? agent?.replace(/_/g, " ") ?? "Agent";
}

function agentLabel(item: TeamContribution) {
  return item.name ?? labelForAgent(item.agent ?? item.agentId);
}

function TeamContributionTable({ result }: { result: CEOCurrentResult }) {
  const { team, selectedDirection, score } = runtimeTeam(result);
  if (!team.length) return null;
  return (
    <section className="ceo-team-summary" aria-label="Travail de l’équipe">
      <div className="ceo-team-summary-head">
        <strong>Travail de l’équipe</strong>
        <span>{selectedDirection ? `Direction: ${selectedDirection}` : "Workflow validé"}{score ? ` · QA ${score}` : ""}</span>
      </div>
      <div className="ceo-team-summary-grid" role="table" aria-label="Participants et contributions">
        {team.map((item, index) => (
          <div role="row" className="ceo-team-summary-row" key={`${item.agent ?? item.role ?? "agent"}-${index}`}>
            <span role="cell">{agentLabel(item)}</span>
            <span role="cell">{item.role ?? "Contribution"}</span>
            <p role="cell">{item.summary ?? item.status ?? "Contribution validée."}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function CEOResultMessage({
  result,
  mission,
  expertMode,
  onModify,
  onLogoAction,
  onMemoryAction,
  onQuickPrompt,
}: {
  result: CEOCurrentResult;
  mission: CEOCurrentMission | null;
  expertMode: boolean;
  onModify: () => void;
  onLogoAction: (action: CEOMissionAction, promptOverride?: string) => void;
  onMemoryAction: (action: CEOMemoryAction, result: CEOCurrentResult) => void;
  onQuickPrompt: (prompt: string) => void;
}) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const hasArtifacts = result.artifactPaths.length > 0;
  const isWebsite = result.requestType === "website" || result.deliverableType === "website" || result.deliverableType === "landing_page";
  const isLogoDeliverable = !isWebsite && !isLogoSupportResult(result) && (result.deliverableType === "logo" || result.requestType === "logo" || /^Logo\s+/i.test(result.title));
  const hasValidPrimaryVisual = hasValidatedPrimaryVisual(result);
  const requiresVisual = isLogoDeliverable;
  const isTextRenderable = isLogoSupportResult(result);
  const isCodeDeliverable = result.deliverableType === "code" || result.sourceType === "codex_code";
  const isNoProviderLogo = isNoProviderLogoResult(result);
  const isGeneratedProviderImage = Boolean(
    result.primaryVisual
    && /^data:image\//i.test(result.primaryVisual)
    && (
      (result.sourceType === "nvidia_image" && result.providerUsed === "nvidia")
      || (result.sourceType === "deepinfra_image" && result.providerUsed === "deepinfra")
    ),
  );
  const isRenderable = isGeneratedProviderImage || isCodeDeliverable || isTextRenderable || isNoProviderLogo || (requiresVisual ? hasValidPrimaryVisual : hasArtifacts && hasValidatedPrimaryVisual(result));
  const brandName = brandNameFromResult(result);
  const modifyLabel = isLogoDeliverable && !hasValidPrimaryVisual ? "Générer brief complet" : "Modifier";
  const badge = sourceBadge(result);
  const shortTeamStatus = teamStatus(result);
  const isCreativeImage = result.status === "completed" && (isGeneratedProviderImage || result.deliverableType === "graphic_image");
  const continuationSubject = brandName && brandName !== result.title ? brandName : result.title;

  return (
    <article className={`ceo-chat-message ceo ${isRenderable ? "ready" : "failed"}`}>
      {badge && <span className="ceo-source-badge">{badge}</span>}
      {shortTeamStatus && <small>{shortTeamStatus}</small>}
      {!isLogoDeliverable && !isWebsite && !isTextRenderable && !isNoProviderLogo && <p>{responseIntro(result)}</p>}
      {isRenderable ? (
        <div className={isLogoDeliverable && hasValidPrimaryVisual ? "ceo-chat-visual-reply brand" : "ceo-chat-visual-reply product"}>
          {isGeneratedProviderImage ? (
            <img className="ceo-chat-generated-image" src={result.primaryVisual ?? ""} alt={brandName ? `Visuel ${brandName}` : result.title} />
          ) : isWebsite && hasValidPrimaryVisual ? (
            <WebsitePreviewReply title={result.title} svg={result.primaryVisual} />
          ) : isLogoDeliverable && hasValidPrimaryVisual ? (
            <LogoFinalAnswer
              brandName={brandName}
              darkBackground={usesDarkLogoBackground(mission?.prompt)}
              svg={result.primaryVisual}
              variants={result.prototypeVariants}
            />
          ) : isCodeDeliverable ? (
            result.primaryArtifactId ? (
              <CodePreviewFrame
                artifactId={result.primaryArtifactId}
                code={result.summary}
                title={result.title}
              />
            ) : (
              <div className="ceo-chat-text-deliverable">
                <strong>{result.title}</strong>
                <pre><code>{result.summary}</code></pre>
              </div>
            )
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
      {isRenderable && <TeamContributionTable result={result} />}
      <div className="ceo-chat-actions">
        {isCodeDeliverable && result.primaryArtifactId && (
          <>
            <a
              className="ceo-chat-action-link"
              href={`/api/export/${result.primaryArtifactId}`}
              download
            >
              <Download size={13} />
              Télécharger
            </a>
            <a
              className="ceo-chat-action-link"
              href="https://vercel.com/new"
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink size={13} />
              Deploy Vercel
            </a>
          </>
        )}
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
        {isCreativeImage && (
          <>
            <button type="button" onClick={() => onQuickPrompt(`Régénère une nouvelle version de ${continuationSubject} dans la même direction, plus premium et plus mémorable.`)}>
              <Wand2 size={15} />
              Régénérer
            </button>
            <button type="button" onClick={() => onQuickPrompt(`Crée une bannière marketing cohérente avec la direction de ${continuationSubject}.`)}>
              <Wand2 size={15} />
              Créer bannière
            </button>
            <button type="button" onClick={() => onQuickPrompt(`Crée une charte graphique complète cohérente avec la direction de ${continuationSubject}.`)}>
              <Wand2 size={15} />
              Créer charte
            </button>
          </>
        )}
        <button type="button" onClick={() => setDetailsOpen((open) => !open)}>
          <Info size={15} />
          Voir travail de l’équipe
        </button>
        <button type="button" onClick={() => onMemoryAction("retain_direction", result)}>
          Retenir cette direction
        </button>
        <button type="button" onClick={() => onMemoryAction("reject_direction", result)}>
          Refuser cette direction
        </button>
        <button type="button" onClick={() => onMemoryAction("avoid_style", result)}>
          Ne plus proposer ce style
        </button>
        <button type="button" onClick={() => onMemoryAction("use_style_for_project", result)}>
          Utiliser ce style pour ce projet
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
  onMemoryAction = () => {},
  onQuickPrompt = () => {},
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
  onMemoryAction?: (action: CEOMemoryAction, result: CEOCurrentResult) => void;
  onQuickPrompt?: (prompt: string) => void;
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
              onMemoryAction={onMemoryAction}
              onQuickPrompt={onQuickPrompt}
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

      <CEOResultMessage result={result} mission={mission} expertMode={expertMode} onModify={onModify} onLogoAction={onLogoAction} onMemoryAction={onMemoryAction} onQuickPrompt={onQuickPrompt} />
    </section>
  );
}
