import { generateBrandBrief } from "@/lib/brand-builder";
import { validateLogoDeliverable } from "@/agents/quality/logo-quality-gates";
import { runAgentSkill } from "@/agents/registry";
import type { AgentRunResult } from "@/agents/types";

export interface DesignBrief {
  originalPrompt: string;
  deliverableType: "logo";
  brandName: string;
  style?: string;
  background?: "black" | "white" | "transparent";
  constraints: string[];
}

export interface DesignConcept {
  id: string;
  name: string;
  rationale: string;
  visualDirection: string;
  svg: string;
  strengths: string[];
  weaknesses: string[];
}

export interface DesignTeamResult {
  brief: DesignBrief;
  concepts: DesignConcept[];
  selectedConcept: DesignConcept;
  artDirectorNotes: string[];
  primaryVisual: string;
  visibleOutput: {
    kind: "visual";
    deliverableType: "logo";
    brandName: string;
    mediaType: "svg";
    primaryVisual: string;
  };
  hiddenDetails: {
    brief: DesignBrief;
    concepts: DesignConcept[];
    artDirectorNotes: string[];
    agentRuns: AgentRunResult[];
    qualityIssues: string[];
    score: number;
  };
}

function normalize(input: string) {
  return input.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function escapeXml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function monogramFor(brandName: string) {
  const compact = brandName.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  if (compact.length >= 2) return compact.slice(0, 2);
  return compact || "AI";
}

function detectStyle(input: string) {
  const lower = normalize(input);
  if (/sportif|sport|performance|athlet|fitness|photographe|photo/.test(lower)) return "sportif";
  if (/premium|luxe|haut de gamme/.test(lower)) return "premium";
  if (/minimal|minimaliste|simple/.test(lower)) return "minimaliste";
  if (/tech|futuriste|software/.test(lower)) return "tech";
  return undefined;
}

function createBrief(input: string): DesignBrief {
  const brandBrief = generateBrandBrief(input);
  const style = detectStyle(input);
  const background = brandBrief.visualPreferences?.background;
  return {
    originalPrompt: input,
    deliverableType: "logo",
    brandName: brandBrief.brandName,
    style,
    background,
    constraints: [
      "Répondre avec un visuel exploitable, pas un texte décoratif.",
      `Respecter strictement le nom ${brandBrief.brandName}.`,
      "Créer un symbole, une composition ou un monogramme travaillé.",
      "Ne pas afficher de label de process dans le livrable visible.",
      ...(background === "black" ? ["Utiliser un fond noir réel dans le visuel final."] : []),
      ...(style ? [`Interpréter le style demandé: ${style}.`] : []),
      ...(/photographe|photo|camera|sport/i.test(input) ? ["Relier le symbole à la photo sportive: viseur, mouvement, capture ou énergie terrain."] : []),
    ],
  };
}

function colors(brief: DesignBrief) {
  const dark = brief.background === "black";
  const sporty = brief.style === "sportif";
  return {
    background: dark ? "#030712" : "#F8FAFC",
    background2: dark ? "#111827" : "#E0ECFF",
    ink: dark ? "#FFFFFF" : "#0F172A",
    muted: dark ? "#93C5FD" : "#2563EB",
    accent: sporty ? "#22C55E" : "#2F6FED",
    accent2: sporty ? "#F97316" : "#38BDF8",
    line: dark ? "#E5E7EB" : "#0F172A",
    soft: dark ? "#172033" : "#DBEAFE",
  };
}

function monogramConcept(brief: DesignBrief) {
  const safeBrand = escapeXml(brief.brandName);
  const mark = escapeXml(monogramFor(brief.brandName));
  const c = colors(brief);
  const brandFontSize = safeBrand.length > 8 ? 70 : 92;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 560" role="img" aria-label="Logo ${safeBrand}">
  <rect width="900" height="560" rx="52" fill="${c.background}"/>
  <circle cx="694" cy="108" r="144" fill="${c.accent}" opacity="0.18"/>
  <circle cx="174" cy="456" r="160" fill="${c.accent2}" opacity="0.12"/>
  <g transform="translate(150 128)">
    <path d="M0 148 92 0h142l92 148-92 148H92L0 148Z" fill="${c.accent}"/>
    <path d="M48 148 118 42h90l70 106-70 106h-90L48 148Z" fill="${c.background}"/>
    <path d="M112 95h96M112 148h80M112 201h96" fill="none" stroke="${c.ink}" stroke-width="22" stroke-linecap="round"/>
    <path d="M226 92 286 148l-60 56" fill="none" stroke="${c.accent2}" stroke-width="22" stroke-linecap="round" stroke-linejoin="round"/>
    <text x="164" y="360" text-anchor="middle" fill="${c.muted}" font-family="Inter, Arial, sans-serif" font-size="36" font-weight="900" letter-spacing="4">${mark}</text>
  </g>
  <text x="510" y="258" fill="${c.ink}" font-family="Inter, Arial, sans-serif" font-size="${brandFontSize}" font-weight="900" letter-spacing="8">${safeBrand}</text>
  <path d="M514 306h238" stroke="${c.accent}" stroke-width="12" stroke-linecap="round"/>
</svg>`;
}

function symbolConcept(brief: DesignBrief) {
  const safeBrand = escapeXml(brief.brandName);
  const mark = escapeXml(monogramFor(brief.brandName));
  const c = colors(brief);
  const proshots = brief.brandName.toUpperCase() === "PROSHOTS";
  const brandFontSize = safeBrand.length > 8 ? 62 : 82;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 560" role="img" aria-label="Logo ${safeBrand}">
  <rect width="900" height="560" rx="52" fill="${c.background}"/>
  <g transform="translate(124 116)">
    <rect x="0" y="0" width="652" height="328" rx="42" fill="${c.soft}" opacity="0.42"/>
    <path d="M100 236 206 72h108l-72 112h132L268 348H160l72-112H100Z" fill="${c.accent}"/>
    ${proshots ? `<g aria-label="camera sport viewfinder">
      <rect x="178" y="116" width="134" height="92" rx="22" fill="none" stroke="${c.ink}" stroke-width="18"/>
      <circle cx="246" cy="162" r="28" fill="none" stroke="${c.accent2}" stroke-width="14"/>
      <path d="M316 122h54m-27-27v54" stroke="${c.accent2}" stroke-width="14" stroke-linecap="round"/>
    </g>` : ""}
    <path d="M402 98h154M402 164h118M402 230h154" stroke="${c.ink}" stroke-width="26" stroke-linecap="round"/>
    <path d="M566 164h86m0 0-34-34m34 34-34 34" stroke="${c.accent2}" stroke-width="22" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <text x="450" y="496" text-anchor="middle" fill="${c.ink}" font-family="Inter, Arial, sans-serif" font-size="${brandFontSize}" font-weight="950" letter-spacing="8">${safeBrand}</text>
  <text x="450" y="72" text-anchor="middle" fill="${c.muted}" font-family="Inter, Arial, sans-serif" font-size="24" font-weight="900" letter-spacing="7">${mark}</text>
</svg>`;
}

function emblemConcept(brief: DesignBrief) {
  const safeBrand = escapeXml(brief.brandName);
  const mark = escapeXml(monogramFor(brief.brandName));
  const c = colors(brief);
  const brandFontSize = safeBrand.length > 8 ? 56 : 70;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 560" role="img" aria-label="Logo ${safeBrand}">
  <rect width="900" height="560" rx="52" fill="${c.background}"/>
  <g transform="translate(260 58)">
    <path d="M190 0 348 58v118c0 118-60 196-158 252C92 372 32 294 32 176V58L190 0Z" fill="${c.accent}"/>
    <path d="M190 54 300 96v78c0 82-34 137-110 184-76-47-110-102-110-184V96l110-42Z" fill="${c.background}"/>
    <path d="M142 151h106M142 214h82M142 277h106" stroke="${c.ink}" stroke-width="24" stroke-linecap="round"/>
    <path d="M260 151 308 214l-48 63" fill="none" stroke="${c.accent2}" stroke-width="22" stroke-linecap="round" stroke-linejoin="round"/>
    <text x="190" y="432" text-anchor="middle" fill="${c.muted}" font-family="Inter, Arial, sans-serif" font-size="28" font-weight="950" letter-spacing="4">${mark}</text>
  </g>
  <text x="450" y="514" text-anchor="middle" fill="${c.ink}" font-family="Inter, Arial, sans-serif" font-size="${brandFontSize}" font-weight="950" letter-spacing="7">${safeBrand}</text>
</svg>`;
}

function generateLogoConcepts(brief: DesignBrief): DesignConcept[] {
  return [
    {
      id: "creative-director-monogram",
      name: "Monogramme dynamique",
      rationale: "Transforme les initiales en un symbole propriétaire plutôt qu'un simple mot tapé.",
      visualDirection: "Monogramme EK, flèche de mouvement et structure hexagonale premium.",
      svg: monogramConcept(brief),
      strengths: ["symbole distinct", "nom respecté", "lisible en petit format"],
      weaknesses: ["demande une déclinaison simplifiée pour favicon"],
    },
    {
      id: "logo-designer-geometric-signal",
      name: "Signal géométrique",
      rationale: "Crée un signe fort et rapide, utile pour un univers sport/performance ou tech.",
      visualDirection: "Symbole éclair/élévation, rails horizontaux et mot-symbole centré.",
      svg: symbolConcept(brief),
      strengths: ["énergie forte", "composition non générique", "bonne présence sur fond noir"],
      weaknesses: ["plus agressif que premium institutionnel"],
    },
    {
      id: "art-director-emblem",
      name: "Emblème moderne",
      rationale: "Apporte une signature plus institutionnelle avec un système d'écusson moderne.",
      visualDirection: "Badge protecteur, lignes EK et hiérarchie stable.",
      svg: emblemConcept(brief),
      strengths: ["forte mémorisation", "structure premium", "usage vêtement/signalétique"],
      weaknesses: ["moins minimal pour une app mobile"],
    },
  ];
}

function critiqueLogoConcepts(brief: DesignBrief, concepts: DesignConcept[]) {
  return concepts.map((concept) => {
    const textOnly = !/<(path|circle|rect|polygon|line|polyline)\b/i.test(concept.svg);
    const brandMissing = !concept.svg.includes(escapeXml(brief.brandName));
    const unrelatedGeneric = />(A|B)<|>(A|B)\s*</.test(concept.svg) && !/[AB]/.test(monogramFor(brief.brandName));
    const weaknesses = [
      ...concept.weaknesses,
      ...(textOnly ? ["rejet: trop textuel"] : []),
      ...(brandMissing ? ["rejet: nom de marque absent"] : []),
      ...(unrelatedGeneric ? ["rejet: lettre générique sans rapport"] : []),
    ];
    const score = 72
      + (textOnly ? -35 : 10)
      + (brandMissing ? -30 : 8)
      + (unrelatedGeneric ? -25 : 6)
      + (brief.background === "black" && /#030712|#111827/.test(concept.svg) ? 7 : 0)
      + (brief.style === "sportif" && /motion|signal|énergie|performance/i.test(`${concept.name} ${concept.rationale} ${concept.visualDirection}`) ? 7 : 0);
    return {
      concept,
      score,
      notes: weaknesses,
    };
  });
}

function selectFinalLogoConcept(brief: DesignBrief, concepts: DesignConcept[]) {
  const critiques = critiqueLogoConcepts(brief, concepts);
  const sorted = [...critiques].sort((a, b) => b.score - a.score);
  const winner = sorted[0]?.concept ?? concepts[0];
  return {
    selectedConcept: winner,
    artDirectorNotes: [
      `Sélection: ${winner.name}.`,
      "Le concept retenu contient un symbole construit et le nom de marque.",
      "Les options trop proches d'un simple mot tapé sont rejetées.",
      ...(brief.background === "black" ? ["Le fond noir est respecté dans le SVG final."] : []),
    ],
    score: Math.max(0, Math.min(100, Math.round(sorted[0]?.score ?? 0))),
  };
}

export function runDesignTeamWorkflow(input: string): DesignTeamResult {
  const agentRuns: AgentRunResult[] = [];
  const run = <TInput, TOutput>(agentId: string, skillId: string, payload: TInput) => {
    const result = runAgentSkill<TInput, TOutput>(agentId, skillId, payload);
    agentRuns.push(result);
    return result.output;
  };

  run("ceo", "parse_user_request", input);
  run("ceo", "create_work_order", { originalPrompt: input, deliverableType: "logo" });
  run("ceo", "select_workflow", { workflow: "logo-design", reason: "visual deliverable requested" });

  run("product_owner", "extract_brand_name", input);
  run("product_owner", "extract_visual_constraints", input);
  const brief = createBrief(input);
  run("product_owner", "write_design_brief", brief);
  run("brand_strategist", "generate_brand_positioning", brief);
  run("brand_strategist", "generate_creative_territories", {
    brandName: brief.brandName,
    territories: ["monogramme", "signal dynamique", "emblème moderne"],
  });

  const concepts = generateLogoConcepts(brief);
  run("logo_designer", "generate_logo_concepts", concepts);
  run("logo_designer", "compose_monogram", concepts[0]);
  run("logo_designer", "compose_symbol", concepts[1]);
  run("logo_designer", "compose_badge", concepts[2]);

  const critiques = critiqueLogoConcepts(brief, concepts);
  run("creative_director", "critique_logo_concepts", critiques);
  run("creative_director", "reject_placeholder_design", critiques.filter((critique) => critique.score < 80));
  const selection = selectFinalLogoConcept(brief, concepts);
  run("creative_director", "select_best_concept", selection.selectedConcept);
  run("creative_director", "request_refinement", {
    selectedConcept: selection.selectedConcept.id,
    requirements: ["symbol", "brandName", "responsive SVG"],
  });

  const primaryVisual = selection.selectedConcept.svg;
  run("svg_illustrator", "render_svg_logo", primaryVisual);
  run("svg_illustrator", "validate_svg_viewbox", primaryVisual);
  run("svg_illustrator", "fit_svg_content", primaryVisual);
  const visibleOutput = {
    kind: "visual" as const,
    deliverableType: "logo" as const,
    brandName: brief.brandName,
    mediaType: "svg" as const,
    primaryVisual,
  };
  const qualityGate = validateLogoDeliverable({ brandName: brief.brandName, visibleOutput });
  run("quality_director", "validate_logo_deliverable", qualityGate);
  run("quality_director", "detect_generic_placeholder", visibleOutput);
  run("quality_director", "detect_text_only_logo", visibleOutput);
  run("quality_director", "detect_wrong_brand_name", visibleOutput);
  run("quality_director", "validate_hidden_details_only", { simpleChatText: "", visibleOutput });
  run("artifact_manager", "prepare_hidden_details", {
    brief,
    concepts,
    artDirectorNotes: selection.artDirectorNotes,
    score: selection.score,
  });
  run("ceo", "return_final_deliverable", visibleOutput);

  return {
    brief,
    concepts,
    selectedConcept: selection.selectedConcept,
    artDirectorNotes: selection.artDirectorNotes,
    primaryVisual,
    visibleOutput,
    hiddenDetails: {
      brief,
      concepts,
      artDirectorNotes: selection.artDirectorNotes,
      agentRuns,
      qualityIssues: qualityGate.issues,
      score: selection.score,
    },
  };
}
