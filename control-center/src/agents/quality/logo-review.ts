import type { WorkOrder } from "@/agents/runtime/types";
import type { MissionArtifact } from "@/agents/artifacts/types";
import { createLogoQualityRubric, issue } from "./quality-rubrics";
import type { QualityIssue } from "./types";

export function reviewLogoDeliverable(input: {
  workOrder: WorkOrder;
  visibleOutput: { kind?: string; deliverableType?: string; brandName?: string; primaryVisual?: string };
  primaryArtifact?: MissionArtifact | null;
}) {
  const rubric = createLogoQualityRubric(input.workOrder);
  const svg = input.primaryArtifact?.content ?? input.visibleOutput.primaryVisual ?? "";
  const brandName = input.visibleOutput.brandName ?? input.workOrder.brandName ?? "";
  const normalizedBrand = brandName.toUpperCase();
  const issues: QualityIssue[] = [];

  if (input.visibleOutput.kind !== "visual" || input.visibleOutput.deliverableType !== "logo") {
    issues.push(issue({ id: "logo-type", category: "wrong_deliverable_type", message: "Le livrable visible n'est pas un logo.", suggestedFix: "Router vers le workflow logo et produire un SVG logo." }));
  }
  if (!brandName || brandName === "Marque à nommer" || brandName !== rubric.requiredBrandName) {
    issues.push(issue({ id: "logo-brand", category: "brand_extraction", message: "Nom de marque incorrect ou absent.", suggestedFix: "Ré-extraire le nom de marque depuis la demande actuelle." }));
  }
  if (!input.primaryArtifact?.id || !svg) {
    issues.push(issue({ id: "logo-artifact", category: "visual_structure", message: "Artifact logo primaire absent.", suggestedFix: "Créer un artifact SVG primaire avant affichage." }));
  }
  if (!/<svg[\s>]/i.test(svg) || !/\bviewBox\s*=/i.test(svg)) {
    issues.push(issue({ id: "logo-viewbox", category: "visual_structure", message: "SVG logo sans viewBox exploitable.", suggestedFix: "Reconstruire un SVG responsive avec viewBox." }));
  }
  if (/Brand system|Marque à nommer/i.test(svg)) {
    issues.push(issue({ id: "logo-placeholder", category: "placeholder", message: "Placeholder générique détecté.", suggestedFix: "Remplacer par un logo lié au nom réel." }));
  }
  if (!/(<path|<circle|<rect|<polygon|<line|<polyline)\b/i.test(svg)) {
    issues.push(issue({ id: "logo-text-only", category: "text_only", message: "Logo texte-only détecté.", suggestedFix: "Ajouter symbole, monogramme ou composition construite." }));
  }
  if (normalizedBrand === "EKIDA" && />\s*[AB]\s*</.test(svg)) {
    issues.push(issue({ id: "logo-ekida-generic-letter", category: "generic_symbol", message: "EKIDA utilise une lettre générique sans rapport.", suggestedFix: "Utiliser EKIDA, EK ou E dans le symbole." }));
  }
  if (normalizedBrand === "EKIDA" && !/EKIDA|>EK<|>E</i.test(svg)) {
    issues.push(issue({ id: "logo-ekida-missing-mark", category: "request_mismatch", message: "EKIDA/EK/E absent du visuel.", suggestedFix: "Reconstruire le logo autour de EKIDA, EK ou E." }));
  }
  if (normalizedBrand === "PROSHOTS" && !/PROSHOTS|>PS<|>P<|camera|viewfinder|viseur/i.test(svg)) {
    issues.push(issue({ id: "logo-proshots-context", category: "request_mismatch", message: "PROSHOTS ne reflète pas photo/sport.", suggestedFix: "Ajouter viseur, caméra, mouvement ou symbole sport/photo." }));
  }
  if (rubric.requiresBlackBackground && !/#030712|#000000|#111827|black/i.test(svg)) {
    issues.push(issue({ id: "logo-black-background", category: "request_mismatch", message: "Fond noir demandé mais absent.", suggestedFix: "Ajouter un fond noir réel au SVG." }));
  }

  return issues;
}
