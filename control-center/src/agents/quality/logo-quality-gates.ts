export interface LogoDeliverableInput {
  brandName?: string | null;
  visibleOutput?: {
    kind?: string;
    deliverableType?: string;
    brandName?: string | null;
    primaryVisual?: string | null;
  };
  simpleChatText?: string;
}

export interface LogoQualityGate {
  ok: boolean;
  issues: string[];
}

function compactBrand(brandName: string) {
  return brandName.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
}

function hasRelatedMark(svg: string, brandName: string) {
  const compact = compactBrand(brandName);
  const first = compact.slice(0, 1);
  const pair = compact.slice(0, 2);
  return svg.includes(brandName) || (pair.length >= 2 && svg.includes(pair)) || (!!first && svg.includes(`>${first}<`));
}

export function validateLogoDeliverable(input: LogoDeliverableInput): LogoQualityGate {
  const issues: string[] = [];
  const brandName = input.brandName ?? input.visibleOutput?.brandName ?? "";
  const svg = input.visibleOutput?.primaryVisual ?? "";

  if (!brandName) issues.push("brandName absent");
  if (brandName === "Marque à nommer") issues.push("brandName placeholder");
  if (input.visibleOutput?.kind === "brandSystem") issues.push("visibleOutput kind brandSystem interdit");
  if (input.visibleOutput?.deliverableType !== "logo") issues.push("deliverableType logo requis");
  if (!svg || !svg.includes("<svg")) issues.push("primaryVisual SVG manquant");
  if (svg && !/viewBox=["'][^"']+["']/.test(svg)) issues.push("viewBox SVG manquant");
  if (svg && !/<(path|circle|rect|polygon|line|polyline)\b/i.test(svg)) issues.push("logo texte-seulement");
  if (brandName && svg && !hasRelatedMark(svg, brandName)) issues.push("marque ou monogramme lié absent");

  const compact = compactBrand(brandName);
  if (svg && />A<|>B</.test(svg) && !/^[AB]/.test(compact)) {
    issues.push("initiale générique sans rapport");
  }

  if (brandName === "PROSHOTS" && svg && !/(PROSHOTS|PS|>P<|camera|viewfinder|viseur|sport|motion|flash|target)/i.test(svg)) {
    issues.push("PROSHOTS doit être lié à la photo sportive");
  }

  if (input.simpleChatText && /score|artifact|README|workspace|quality|process|Brand system|Marque à nommer|Prototype visuel|LOGO/i.test(input.simpleChatText)) {
    issues.push("détails internes visibles dans le chat simple");
  }

  return { ok: issues.length === 0, issues };
}
