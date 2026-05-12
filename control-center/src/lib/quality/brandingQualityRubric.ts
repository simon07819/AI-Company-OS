import type { BrandBrief, LogoConcept } from "@/lib/brandGeneration";
import { buildQualityReport, containsPlaceholder, normalizeQualityText, type OutputQualityReport, type QualityCheck } from "./outputQuality";

export interface BrandingQualityInput {
  requestedBrandName?: string;
  brief: BrandBrief;
  concepts: LogoConcept[];
}

function check(id: string, label: string, passed: boolean, details: string): QualityCheck {
  return { id, label, passed, details };
}

export function evaluateBrandingQuality(input: BrandingQualityInput): OutputQualityReport {
  const expected = input.requestedBrandName?.trim();
  const briefText = JSON.stringify(input.brief);
  const conceptText = JSON.stringify(input.concepts);
  const distinctConceptTitles = new Set(input.concepts.map((concept) => normalizeQualityText(concept.title)));
  const allPaletteColors = input.concepts.flatMap((concept) => concept.palette);

  const checks = [
    check(
      "brand-name-respected",
      "Nom de marque respecté",
      expected ? normalizeQualityText(input.brief.brandName) === normalizeQualityText(expected) && input.concepts.every((concept) => normalizeQualityText(concept.brandName) === normalizeQualityText(expected)) : input.brief.explicitBrandName,
      expected ? `Attendu: ${expected}, reçu: ${input.brief.brandName}.` : "Aucun nom explicite détecté.",
    ),
    check("placeholder-free", "Pas de placeholder", !containsPlaceholder(`${briefText}\n${conceptText}`), "Aucun placeholder type Nouvelle Marque AI ne doit apparaître."),
    check("no-default-brand", "Pas de Nouvelle Marque AI", !/Nouvelle Marque AI/i.test(`${briefText}\n${conceptText}`), "Le nom générique ne doit jamais remplacer un nom demandé."),
    check("distinct-concepts", "Concepts distincts", input.concepts.length >= 3 && distinctConceptTitles.size >= 3, "Au moins trois concepts distincts sont requis."),
    check("palette-justified", "Palette justifiée", allPaletteColors.length >= 4 && allPaletteColors.every((color) => color.hex && color.justification), "Chaque couleur doit avoir une justification."),
    check("typography-justified", "Typographie justifiée", input.concepts.every((concept) => concept.typography.length > 16) && input.brief.typographyRecommendation.length > 16, "La typographie doit être recommandée et expliquée."),
    check("industry-reflected", "Domaine reflété", input.brief.industry.length > 3 && input.brief.creativeDirection.length > 12, "Le brief doit refléter un domaine et une direction créative."),
  ];

  return buildQualityReport("logo", checks, [
    "Réextraire le nom de marque depuis la demande utilisateur.",
    "Remplacer les placeholders par le vrai nom demandé.",
    "Créer trois concepts visuellement et stratégiquement distincts.",
    "Ajouter justification palette et typographie avant de présenter comme prêt.",
  ]);
}
