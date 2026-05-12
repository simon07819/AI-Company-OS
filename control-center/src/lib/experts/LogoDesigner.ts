import type { BrandPaletteColor } from "@/lib/brand-builder";
import type { AgentOutput, MissionPlan } from "@/lib/orchestrator/types";

export interface LogoDirection {
  id: string;
  label: "A" | "B" | "C";
  title: string;
  brandName: string;
  tagline: string;
  palette: BrandPaletteColor[];
  typography: string;
  rationale: string;
  keywords: string[];
  layoutSignature: string;
  svg: string;
}

function color(name: string, hex: string, justification: string): BrandPaletteColor {
  return { name, hex, justification };
}

function escapeXml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function performanceWordmark(brand: string) {
  const safe = escapeXml(brand);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 520" role="img" aria-label="${safe} performance wordmark prototype">
  <rect width="900" height="520" rx="44" fill="#F7F8F4"/>
  <path d="M136 206h210M112 260h250M152 314h172" stroke="#00A36C" stroke-width="22" stroke-linecap="round"/>
  <path d="M382 165h176l-72 190H310l72-190Z" fill="#0B1B2B"/>
  <path d="M432 214h90M410 260h86M390 306h88" stroke="#F7F8F4" stroke-width="18" stroke-linecap="round"/>
  <text x="590" y="270" fill="#0B1B2B" font-family="Arial, Helvetica, sans-serif" font-size="86" font-weight="900" letter-spacing="6">${safe}</text>
  <text x="594" y="320" fill="#4B5563" font-family="Arial, Helvetica, sans-serif" font-size="24" font-weight="700">BUILT FOR MOTION</text>
</svg>`;
}

function athleticShield(brand: string) {
  const safe = escapeXml(brand);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 520" role="img" aria-label="${safe} athletic shield prototype">
  <rect width="900" height="520" rx="44" fill="#101820"/>
  <path d="M450 74 662 142v130c0 108-72 169-212 214C310 441 238 380 238 272V142L450 74Z" fill="#FF4D2E"/>
  <path d="M450 118 604 168v98c0 76-49 121-154 156-105-35-154-80-154-156v-98l154-50Z" fill="#101820"/>
  <path d="M382 265h136l-38-65h-60l-38 65Zm-42 68 78-170h66l78 170h-58l-16-32H410l-16 32h-54Z" fill="#F9FAFB"/>
  <text x="450" y="426" text-anchor="middle" fill="#F9FAFB" font-family="Arial, Helvetica, sans-serif" font-size="82" font-weight="900" letter-spacing="8">${safe}</text>
  <text x="450" y="466" text-anchor="middle" fill="#A7F3D0" font-family="Arial, Helvetica, sans-serif" font-size="22" font-weight="700">STRENGTH IN ELEVATION</text>
</svg>`;
}

function motionMonogram(brand: string) {
  const safe = escapeXml(brand);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 520" role="img" aria-label="${safe} motion monogram prototype">
  <rect width="900" height="520" rx="44" fill="#EEF4FF"/>
  <circle cx="270" cy="260" r="132" fill="#2563EB"/>
  <path d="M218 178h130M218 260h104M218 342h130" stroke="#FFFFFF" stroke-width="34" stroke-linecap="round"/>
  <path d="M352 260h180m0 0-58-58m58 58-58 58" stroke="#0F172A" stroke-width="28" stroke-linecap="round" stroke-linejoin="round"/>
  <text x="556" y="250" fill="#0F172A" font-family="Arial, Helvetica, sans-serif" font-size="84" font-weight="900" letter-spacing="5">${safe}</text>
  <text x="562" y="304" fill="#2563EB" font-family="Arial, Helvetica, sans-serif" font-size="24" font-weight="800">FAST VERTICAL PERFORMANCE</text>
</svg>`;
}

export function createLogoDirections(plan: MissionPlan): LogoDirection[] {
  const brand = plan.brandName || "Marque à nommer";
  const sport = /sport|performance|fitness|athlet/i.test(plan.industry);
  const performanceTagline = sport ? "Built for motion" : "Vertical. Fiable. Précis.";
  return [
    {
      id: "performance-wordmark",
      label: "A",
      title: sport ? "Performance premium" : "Premium corporate",
      brandName: brand,
      tagline: performanceTagline,
      palette: [
        color("Graphite compétition", "#0B1B2B", "donne une base premium et technique."),
        color("Vert accélération", "#00A36C", "évoque énergie, progression et performance mesurable."),
        color("Ivoire piste", "#F7F8F4", "garde la marque lumineuse et lisible."),
        color("Gris équipement", "#4B5563", "stabilise les supports professionnels."),
      ],
      typography: "Arial Black / Inter Tight: mot-symbole compact, incliné et robuste.",
      rationale: `${brand} devient une marque sportive haut de gamme: lignes de vitesse, posture technique et énergie contrôlée.`,
      keywords: ["sport", "vitesse", "premium"],
      layoutSignature: "wordmark-speed-lines-slanted-block",
      svg: performanceWordmark(brand),
    },
    {
      id: "athletic-shield",
      label: "B",
      title: "Sécurité athlétique",
      brandName: brand,
      tagline: sport ? "Strength in elevation" : "La confiance en mouvement.",
      palette: [
        color("Charcoal terrain", "#101820", "ancre la marque dans la puissance et la résistance."),
        color("Rouge énergie", "#FF4D2E", "crée un signal fort, compétitif et mémorable."),
        color("Blanc maillot", "#F9FAFB", "assure la lisibilité sur équipement et affichage."),
        color("Vert récupération", "#A7F3D0", "ajoute un signal santé/performance."),
      ],
      typography: "Montserrat ExtraBold: présence de maillot, écusson et événement sportif.",
      rationale: "Une direction plus protectrice: bouclier, endurance, confiance et identité facile à poser sur vêtements ou terrain.",
      keywords: ["fiabilité", "équipe", "force"],
      layoutSignature: "shield-centered-emblem-stacked-wordmark",
      svg: athleticShield(brand),
    },
    {
      id: "motion-monogram",
      label: "C",
      title: "Mouvement vertical",
      brandName: brand,
      tagline: sport ? "Fast vertical performance" : "Montez plus haut.",
      palette: [
        color("Bleu propulsion", "#2563EB", "signale vitesse, technologie et précision."),
        color("Nuit profonde", "#0F172A", "donne contraste et sérieux."),
        color("Bleu glacier", "#EEF4FF", "apporte une surface moderne et claire."),
        color("Blanc signal", "#FFFFFF", "renforce la lisibilité du monogramme."),
      ],
      typography: "Sora ExtraBold: géométrique, rapide, adapté aux apps et signalétique.",
      rationale: `${brand} est traité comme un signal de déplacement: monogramme E, flèche et mouvement net vers l'avant.`,
      keywords: ["verticalité", "signal", "mouvement"],
      layoutSignature: "monogram-arrow-horizontal-system",
      svg: motionMonogram(brand),
    },
  ];
}

export function runLogoDesigner(plan: MissionPlan): AgentOutput {
  const directions = createLogoDirections(plan);
  return {
    id: `${plan.id}-logo-directions`,
    missionId: plan.id,
    expert: "LogoDesigner",
    title: "Logo prototype directions",
    kind: "concept",
    summary: `${directions.length} directions distinctes pour ${plan.brandName || "la marque"}.`,
    content: JSON.stringify(directions.map(({ svg: _svg, ...direction }) => direction), null, 2),
    artifactPaths: [],
    metadata: { directions },
  };
}
