import type { BrandBrief, BrandPaletteColor, LogoConcept, VisualDirectionId } from "./brandSchemas";
import { generateLogoImagePrompt } from "./logoPrompt";

function palette(base: BrandPaletteColor[], order: number[]) {
  return order.map((index) => base[index]).filter(Boolean);
}

function withPrompt(concept: Omit<LogoConcept, "imagePrompt">): LogoConcept {
  return { ...concept, imagePrompt: generateLogoImagePrompt(concept as LogoConcept) };
}

export function buildVisualDirections(brief: BrandBrief): LogoConcept[] {
  const base = brief.colorPalette;
  const brand = brief.brandName;
  const directions: Array<Omit<LogoConcept, "imagePrompt"> & { id: VisualDirectionId }> = [
    {
      id: "premium-corporate",
      label: "A",
      title: "Premium / corporate",
      brandName: brand,
      tagline: brief.taglineOptions[1] ?? "Vertical. Fiable. Précis.",
      palette: palette(base, [0, 1, 3, 2]),
      typography: "Manrope SemiBold wordmark, Inter supporting UI: stable, premium and readable on technical documents.",
      rationale: "Direction haut de gamme et institutionnelle: le symbole paraît solide, précis et crédible pour des clients commerciaux.",
      keywords: ["premium", "corporate", "structure"],
      visualStyle: "construction-tech",
      recommended: true,
      prototypeNotice: "Prototype visuel — prêt pour génération finale",
    },
    {
      id: "vertical-movement",
      label: "B",
      title: "Mouvement / vitesse / verticalité",
      brandName: brand,
      tagline: brief.taglineOptions[0] ?? "Montez plus haut.",
      palette: palette(base, [1, 0, 3, 2]),
      typography: "Sora SemiBold for the logo with Inter for body copy: geometric, fast and engineered.",
      rationale: `Direction plus dynamique: ${brand} devient un signal d'élévation, utile si la marque doit évoquer ascenseur, vitesse ou progrès vertical.`,
      keywords: ["verticalité", "signal", "vitesse"],
      visualStyle: "vertical-signal",
      recommended: false,
      prototypeNotice: "Prototype visuel — prêt pour génération finale",
    },
    {
      id: "safety-infrastructure",
      label: "C",
      title: "Sécurité / fiabilité / infrastructure",
      brandName: brand,
      tagline: brief.taglineOptions[2] ?? "La confiance en mouvement.",
      palette: palette(base, [2, 0, 3, 1]),
      typography: "IBM Plex Sans SemiBold for authority, Inter Regular for service and maintenance communications.",
      rationale: "Direction rassurante: elle met l'accent sur conformité, maintenance, protection et fiabilité opérationnelle.",
      keywords: ["sécurité", "fiabilité", "infrastructure"],
      visualStyle: "safety-reliability",
      recommended: false,
      prototypeNotice: "Prototype visuel — prêt pour génération finale",
    },
  ];

  return directions.map(withPrompt);
}
