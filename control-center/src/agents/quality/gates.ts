import { validateLogoDeliverable, type LogoDeliverableInput, type LogoQualityGate } from "./logo-quality-gates";

export interface WebsiteDeliverableInput {
  brandName?: string | null;
  visibleOutput?: {
    kind?: string;
    deliverableType?: string;
    brandName?: string | null;
    primaryVisual?: string | null;
  };
  previousPrimaryVisual?: string | null;
  simpleChatText?: string;
}

export function validateWebsiteDeliverable(input: WebsiteDeliverableInput): LogoQualityGate {
  const issues: string[] = [];
  const brandName = input.brandName ?? input.visibleOutput?.brandName ?? "";
  const visual = input.visibleOutput?.primaryVisual ?? "";

  if (!brandName) issues.push("brandName absent");
  if (brandName === "Marque à nommer") issues.push("brandName placeholder");
  if (input.visibleOutput?.kind !== "website_preview") issues.push("kind website_preview requis");
  if (input.visibleOutput?.deliverableType !== "website" && input.visibleOutput?.deliverableType !== "landing_page") issues.push("deliverableType website requis");
  if (!/<svg|<html|<main/i.test(visual)) issues.push("preview web manquante");
  if (!/nav|Collection|À propos|Contact|hero|Voir la collection|CTA|section|Nouveautés/i.test(visual)) issues.push("structure page manquante");
  if (input.previousPrimaryVisual && visual === input.previousPrimaryVisual) issues.push("primaryVisual précédent recyclé");
  if (input.simpleChatText && /score|artifact|README|workspace|quality|process|Brand system|Marque à nommer|runtime|sessionId|projectId/i.test(input.simpleChatText)) {
    issues.push("détails internes visibles dans le chat simple");
  }

  return { ok: issues.length === 0, issues };
}

export function validateSimpleChatOutput(input: { text?: string; visibleOutput?: unknown }): LogoQualityGate {
  const text = `${input.text ?? ""} ${JSON.stringify(input.visibleOutput ?? {})}`;
  const issues = /score|artifact|README|workspace|quality report|process|Brand system|Marque à nommer|runtime|sessionId|projectId|LOGO|Prototype visuel/i.test(text)
    ? ["détails internes visibles dans le chat simple"]
    : [];
  return { ok: issues.length === 0, issues };
}

export { validateLogoDeliverable };
export type { LogoDeliverableInput, LogoQualityGate };
