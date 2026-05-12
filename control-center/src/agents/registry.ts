import type { AgentMission, AgentRunContext, AgentRunResult, AgentSkill } from "./types";
import { agentSkills } from "./skills";

export const skillRegistry: Record<string, AgentSkill> = agentSkills;

const sharedNever = ["inventer un succès", "exposer les détails internes dans le chat simple", "prétendre à un livrable final sans artifact ou visuel exploitable"];

export const agentRegistry: Record<string, AgentMission> = {
  ceo: {
    id: "ceo",
    role: "ceo",
    name: "CEO",
    mission: "Comprendre la demande, isoler chaque tour, déléguer aux bons agents et retourner uniquement le livrable utile.",
    responsibilities: ["Qualifier la demande", "Créer le work order", "Router le workflow", "Valider la sortie visible"],
    skills: ["parse_user_request", "create_work_order", "route_workflow", "select_workflow", "decide_previous_deliverable_reuse", "validate_simple_chat_output", "return_final_deliverable"],
    toolsAllowed: ["quality.evaluate", "artifact.store", "git.repo", "shell.safe", "filesystem.project"],
    capabilityPacks: ["ceo-core", "git-repo"],
    mustProduce: ["work_order", "visibleOutput"],
    mustNeverDo: sharedNever,
    qualityChecklist: ["demande comprise", "workflow choisi", "livrable visible propre"],
  },
  product_owner: {
    id: "product_owner",
    role: "product_owner",
    name: "Product Owner",
    mission: "Transformer la demande en brief clair, contraintes et critères d'acceptation.",
    responsibilities: ["Extraire le nom", "Clarifier le livrable", "Définir les contraintes"],
    skills: ["parse_user_request", "generate_design_brief", "generate_website_brief", "extract_brand_name", "extract_visual_constraints", "write_design_brief"],
    toolsAllowed: ["artifact.store"],
    capabilityPacks: ["product-brief"],
    mustProduce: ["brief"],
    mustNeverDo: ["absorber le style ou l'audience dans le nom de marque", ...sharedNever],
    qualityChecklist: ["brandName correct", "deliverableType clair", "contraintes listées"],
  },
  brand_strategist: {
    id: "brand_strategist",
    role: "brand_strategist",
    name: "Brand Strategist",
    mission: "Créer les axes créatifs et le positionnement visuel.",
    responsibilities: ["Positionnement", "Territoires créatifs", "Énergie de marque"],
    skills: ["generate_design_brief", "generate_brand_positioning", "generate_creative_territories"],
    toolsAllowed: ["visual.svg", "quality.evaluate", "artifact.store"],
    capabilityPacks: ["design-system"],
    mustProduce: ["creative_territories"],
    mustNeverDo: ["produire trois variantes identiques", ...sharedNever],
    qualityChecklist: ["territoires distincts", "audience respectée", "style reflété"],
  },
  logo_designer: {
    id: "logo_designer",
    role: "logo_designer",
    name: "Logo Designer",
    mission: "Créer plusieurs concepts de logo distincts, pas juste du texte.",
    responsibilities: ["Concept monogramme", "Concept symbole", "Concept badge"],
    skills: ["generate_logo_concepts", "compose_symbol", "compose_monogram", "compose_badge"],
    toolsAllowed: ["visual.svg", "quality.evaluate", "artifact.store"],
    capabilityPacks: ["design-system", "logo-production"],
    mustProduce: ["DesignConcept[]"],
    mustNeverDo: ["rendre un mot tapé seul", "utiliser une initiale sans rapport", ...sharedNever],
    qualityChecklist: ["3 concepts", "SVG par concept", "composition non text-only"],
  },
  creative_director: {
    id: "creative_director",
    role: "creative_director",
    name: "Creative Director",
    mission: "Critiquer, rejeter les placeholders et sélectionner/améliorer le meilleur concept.",
    responsibilities: ["Critique sévère", "Rejet placeholder", "Sélection finale"],
    skills: ["critique_design_concepts", "critique_logo_concepts", "reject_placeholder_design", "select_best_design_concept", "select_best_concept", "request_refinement"],
    toolsAllowed: ["visual.svg", "quality.evaluate", "artifact.store"],
    capabilityPacks: ["design-system"],
    mustProduce: ["selectedConcept", "critique"],
    mustNeverDo: ["valider une carte décorative", "valider un logo texte-seulement", ...sharedNever],
    qualityChecklist: ["concept retenu justifié", "faiblesses identifiées", "placeholder rejeté"],
  },
  ux_designer: {
    id: "ux_designer",
    role: "ux_designer",
    name: "UX Designer",
    mission: "Structurer les pages avec navigation, hero, CTA, sections et hiérarchie claire.",
    responsibilities: ["Wireframe", "Parcours", "Priorité contenu"],
    skills: ["generate_website_wireframe"],
    toolsAllowed: ["website.preview", "artifact.store"],
    capabilityPacks: ["website-production"],
    mustProduce: ["wireframe"],
    mustNeverDo: ["retourner seulement un logo", ...sharedNever],
    qualityChecklist: ["header", "hero", "CTA", "sections"],
  },
  web_designer: {
    id: "web_designer",
    role: "web_designer",
    name: "Web Designer",
    mission: "Créer la direction visuelle de page web et un rendu preview cohérent.",
    responsibilities: ["Direction visuelle", "Palette", "Composition"],
    skills: ["generate_website_wireframe", "render_website_preview"],
    toolsAllowed: ["website.preview", "visual.svg", "quality.evaluate", "artifact.store"],
    capabilityPacks: ["website-production"],
    mustProduce: ["designDirection", "preview"],
    mustNeverDo: ["recycler le logo comme page entière", ...sharedNever],
    qualityChecklist: ["page lisible", "marque intégrée", "sections visibles"],
  },
  frontend_builder: {
    id: "frontend_builder",
    role: "frontend_builder",
    name: "Frontend Builder",
    mission: "Produire une preview HTML/SVG/React exploitable et traçable.",
    responsibilities: ["Rendu", "Responsive", "Structure"],
    skills: ["render_website_preview"],
    toolsAllowed: ["website.preview", "visual.svg", "quality.evaluate", "artifact.store", "filesystem.project", "shell.safe"],
    capabilityPacks: ["website-production", "code-builder"],
    mustProduce: ["primaryVisual"],
    mustNeverDo: ["produire un faux succès sans rendu", ...sharedNever],
    qualityChecklist: ["preview présente", "structure web", "pas de détails internes"],
  },
  svg_illustrator: {
    id: "svg_illustrator",
    role: "svg_illustrator",
    name: "SVG Illustrator",
    mission: "Transformer le concept choisi en SVG propre, centré, lisible et responsive.",
    responsibilities: ["Rendu SVG", "ViewBox", "Cadrage", "Contraste"],
    skills: ["render_svg_logo", "validate_svg_viewbox", "fit_svg_content"],
    toolsAllowed: ["visual.svg", "quality.evaluate", "artifact.store"],
    capabilityPacks: ["design-system", "logo-production"],
    mustProduce: ["primaryVisual"],
    mustNeverDo: ["couper le texte", "omettre le viewBox", ...sharedNever],
    qualityChecklist: ["viewBox présent", "contenu centré", "brandName visible"],
  },
  research_agent: {
    id: "research_agent",
    role: "research_agent",
    name: "Research Agent",
    mission: "Rechercher ou structurer le contexte quand le workflow en a besoin.",
    responsibilities: ["Contexte", "Références", "Hypothèses"],
    skills: ["parse_user_request"],
    toolsAllowed: ["artifact.store"],
    capabilityPacks: ["product-brief"],
    mustProduce: ["context"],
    mustNeverDo: ["inventer une recherche externe non effectuée", ...sharedNever],
    qualityChecklist: ["source claire", "hypothèses séparées"],
  },
  browser_agent: {
    id: "browser_agent",
    role: "browser_agent",
    name: "Browser Agent",
    mission: "Utiliser une navigation automatisée seulement si un outil est disponible et nécessaire.",
    responsibilities: ["Navigation", "Validation UI", "Observation"],
    skills: ["parse_user_request"],
    toolsAllowed: ["browser.preview", "mcp.playwright"],
    capabilityPacks: ["browser-qa"],
    mustProduce: ["observation"],
    mustNeverDo: ["prétendre avoir navigué sans outil", ...sharedNever],
    qualityChecklist: ["outil disponible", "résultat observé"],
  },
  quality_director: {
    id: "quality_director",
    role: "quality_director",
    name: "Quality Director",
    mission: "Bloquer les faux livrables et valider que le résultat répond vraiment à la demande.",
    responsibilities: ["Validation logo", "Validation website", "Validation mode simple"],
    skills: ["validate_logo_deliverable", "validate_website_deliverable", "validate_simple_chat_output", "detect_generic_placeholder", "detect_text_only_logo", "detect_wrong_brand_name", "validate_hidden_details_only"],
    toolsAllowed: ["quality.evaluate", "browser.preview", "git.repo", "shell.safe", "filesystem.project"],
    capabilityPacks: ["quality-core", "browser-qa", "git-repo"],
    mustProduce: ["qualityGate"],
    mustNeverDo: ["marquer prêt sans livrable réel", ...sharedNever],
    qualityChecklist: ["pas de placeholder", "pas de text-only", "chat simple propre"],
  },
  artifact_manager: {
    id: "artifact_manager",
    role: "artifact_manager",
    name: "Artifact Manager",
    mission: "Préparer artifacts et détails internes sans les afficher dans le chat simple.",
    responsibilities: ["Stockage artifacts", "Packaging détails cachés"],
    skills: ["prepare_hidden_details", "store_artifacts"],
    toolsAllowed: ["artifact.store", "filesystem.project", "git.repo", "shell.safe"],
    capabilityPacks: ["git-repo"],
    mustProduce: ["hiddenDetails"],
    mustNeverDo: ["exposer fichiers ou workspace dans le chat principal", ...sharedNever],
    qualityChecklist: ["artifacts internes prêts", "détails fermés par défaut"],
  },
};

export function defaultAgentContext(userPrompt = ""): AgentRunContext {
  return {
    turnId: "turn-local",
    missionId: "mission-local",
    userPrompt,
    mode: "details",
  };
}

export function runAgentSkill<TInput, TOutput>(
  agentId: string,
  skillId: string,
  input: TInput,
  context: AgentRunContext = defaultAgentContext(typeof input === "string" ? input : ""),
): AgentRunResult<TOutput> {
  const agent = agentRegistry[agentId];
  const skill = skillRegistry[skillId];
  if (!agent) throw new Error(`Unknown agent: ${agentId}`);
  if (!skill) throw new Error(`Unknown skill: ${skillId}`);
  if (!agent.skills.includes(skillId)) throw new Error(`Skill ${skillId} is not assigned to ${agentId}`);
  try {
    return {
      agentId,
      role: agent.role,
      skillId,
      status: "ok",
      output: skill.run(input, context) as TOutput,
    };
  } catch (error) {
    return {
      agentId,
      role: agent.role,
      skillId,
      status: "failed",
      output: null as TOutput,
      notes: [error instanceof Error ? error.message : "Unknown agent skill error"],
    };
  }
}
