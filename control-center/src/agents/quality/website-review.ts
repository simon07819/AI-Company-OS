import { artifactIsLogoOnly } from "@/agents/artifacts/artifact-renderer";
import { createArtifactFingerprint } from "@/agents/artifacts/artifact-fingerprint";
import type { MissionArtifact } from "@/agents/artifacts/types";
import type { WorkOrder } from "@/agents/runtime/types";
import type { PreviousDeliverable } from "@/lib/ceoWorkOrder";
import { createWebsiteQualityRubric, issue } from "./quality-rubrics";
import type { QualityIssue } from "./types";

export function reviewWebsiteDeliverable(input: {
  workOrder: WorkOrder;
  visibleOutput: { kind?: string; deliverableType?: string; brandName?: string; primaryVisual?: string };
  primaryArtifact?: MissionArtifact | null;
  previousDeliverable?: PreviousDeliverable | null;
}) {
  const rubric = createWebsiteQualityRubric(input.workOrder);
  const visual = input.primaryArtifact?.content ?? input.visibleOutput.primaryVisual ?? "";
  const issues: QualityIssue[] = [];

  if (input.visibleOutput.kind !== "website_preview" || !["website", "landing_page"].includes(input.visibleOutput.deliverableType ?? "")) {
    issues.push(issue({ id: "website-type", category: "wrong_deliverable_type", message: "Le livrable visible n'est pas une preview web.", suggestedFix: "Router vers le workflow website." }));
  }
  if (!input.visibleOutput.brandName || input.visibleOutput.brandName === "Marque à nommer" || (rubric.requiredBrandName && input.visibleOutput.brandName !== rubric.requiredBrandName)) {
    issues.push(issue({ id: "website-brand", category: "brand_extraction", message: "Nom de marque web incorrect.", suggestedFix: "Ré-extraire la marque depuis la demande actuelle." }));
  }
  if (!input.primaryArtifact?.id || !visual) {
    issues.push(issue({ id: "website-artifact", category: "visual_structure", message: "Artifact preview web primaire absent.", suggestedFix: "Créer un artifact preview web avant affichage." }));
  }
  if (artifactIsLogoOnly(visual)) {
    issues.push(issue({ id: "website-logo-only", category: "wrong_deliverable_type", message: "La preview web est seulement un logo.", suggestedFix: "Construire une page avec nav, hero, CTA et sections." }));
  }
  if (!/aria-label="nav"/i.test(visual)) {
    issues.push(issue({ id: "website-nav", category: "visual_structure", message: "Header/nav manquant.", suggestedFix: "Ajouter une navigation de page." }));
  }
  if (!/aria-label="hero"/i.test(visual)) {
    issues.push(issue({ id: "website-hero", category: "visual_structure", message: "Hero manquant.", suggestedFix: "Ajouter une section hero." }));
  }
  if (!/Voir la collection|CTA|Acheter|Contact|Découvrir/i.test(visual)) {
    issues.push(issue({ id: "website-cta", category: "visual_structure", message: "CTA manquant.", suggestedFix: "Ajouter un appel à l'action visible." }));
  }
  if (!/aria-label="sections"/i.test(visual)) {
    issues.push(issue({ id: "website-sections", category: "visual_structure", message: "Sections de contenu manquantes.", suggestedFix: "Ajouter au moins une section de contenu." }));
  }
  if (rubric.requiresTemporaryContent && !/temporaire|Sélection temporaire|Images à remplacer|Contenu temporaire/i.test(visual)) {
    issues.push(issue({ id: "website-temporary-content", category: "request_mismatch", message: "Contenu temporaire demandé mais absent.", suggestedFix: "Ajouter du contenu temporaire clair." }));
  }
  if (rubric.industry === "apparel" && !/linge|vêtement|collection|lookbook|Confort quotidien/i.test(visual)) {
    issues.push(issue({ id: "website-industry", category: "request_mismatch", message: "Contexte compagnie de linge non reflété.", suggestedFix: "Adapter hero et sections à l'habillement." }));
  }
  const previousFingerprint = input.previousDeliverable?.primaryVisual ? createArtifactFingerprint(input.previousDeliverable.primaryVisual) : null;
  if (previousFingerprint && input.primaryArtifact?.fingerprint === previousFingerprint) {
    issues.push(issue({ id: "website-recycled-output", category: "recycled_output", message: "Ancien visuel recyclé comme preview web.", suggestedFix: "Créer un nouvel artifact web." }));
  }

  return issues;
}
