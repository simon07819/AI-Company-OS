import type { AgentMission, AgentRunResult, AgentSkill } from "./types";
import { logoAgentSkills } from "./skills/logoSkills";

export const skillRegistry: Record<string, AgentSkill> = logoAgentSkills;

export const agentRegistry: Record<string, AgentMission> = {
  ceo: {
    id: "ceo",
    role: "ceo",
    name: "CEO",
    mission: "Comprendre la demande, déléguer aux bons agents et retourner uniquement le livrable final utile.",
    responsibilities: ["Qualifier la demande", "Choisir le workflow", "Déléguer", "Masquer le process en mode simple"],
    skills: ["parse_user_request", "create_work_order", "select_workflow", "return_final_deliverable"],
    mustProduce: ["work_order", "visibleOutput"],
    mustNeverDo: ["inventer un succès", "afficher les détails internes dans le chat simple"],
    qualityChecklist: ["demande comprise", "workflow choisi", "livrable réel présent"],
  },
  product_owner: {
    id: "product_owner",
    role: "product_owner",
    name: "Product Owner",
    mission: "Transformer la demande en brief clair, contraintes et critères d'acceptation.",
    responsibilities: ["Extraire le nom", "Extraire les contraintes", "Écrire le brief"],
    skills: ["extract_brand_name", "extract_visual_constraints", "write_design_brief"],
    mustProduce: ["DesignBrief"],
    mustNeverDo: ["absorber le style ou l'audience dans le nom de marque"],
    qualityChecklist: ["brandName correct", "contraintes visuelles listées", "deliverableType clair"],
  },
  brand_strategist: {
    id: "brand_strategist",
    role: "brand_strategist",
    name: "Brand Strategist",
    mission: "Définir les axes créatifs et le positionnement visuel.",
    responsibilities: ["Positionnement", "Territoires créatifs", "Énergie de marque"],
    skills: ["generate_brand_positioning", "generate_creative_territories"],
    mustProduce: ["creative_territories"],
    mustNeverDo: ["produire trois variantes identiques"],
    qualityChecklist: ["territoires distincts", "audience respectée", "style reflété"],
  },
  logo_designer: {
    id: "logo_designer",
    role: "logo_designer",
    name: "Logo Designer",
    mission: "Créer plusieurs concepts de logo distincts, pas juste du texte.",
    responsibilities: ["Concept monogramme", "Concept symbole", "Concept badge"],
    skills: ["generate_logo_concepts", "compose_symbol", "compose_monogram", "compose_badge"],
    mustProduce: ["DesignConcept[]"],
    mustNeverDo: ["rendre un mot tapé seul", "utiliser une initiale sans rapport"],
    qualityChecklist: ["3 concepts", "SVG par concept", "composition non text-only"],
  },
  creative_director: {
    id: "creative_director",
    role: "creative_director",
    name: "Creative Director",
    mission: "Critiquer, choisir et améliorer le meilleur concept.",
    responsibilities: ["Critique sévère", "Rejet placeholder", "Sélection finale"],
    skills: ["critique_logo_concepts", "reject_placeholder_design", "select_best_concept", "request_refinement"],
    mustProduce: ["selectedConcept", "artDirectorNotes"],
    mustNeverDo: ["valider une carte décorative", "valider un logo texte-seulement"],
    qualityChecklist: ["concept retenu justifié", "faiblesses identifiées", "placeholder rejeté"],
  },
  svg_illustrator: {
    id: "svg_illustrator",
    role: "svg_illustrator",
    name: "SVG Illustrator",
    mission: "Transformer le meilleur concept en SVG propre, centré, lisible et responsive.",
    responsibilities: ["Rendu SVG", "ViewBox", "Cadrage", "Contraste"],
    skills: ["render_svg_logo", "validate_svg_viewbox", "fit_svg_content"],
    mustProduce: ["primaryVisual"],
    mustNeverDo: ["couper le texte", "omettre le viewBox", "utiliser un fond contraire à la demande"],
    qualityChecklist: ["viewBox présent", "contenu centré", "brandName visible"],
  },
  quality_director: {
    id: "quality_director",
    role: "quality_director",
    name: "Quality Director",
    mission: "Bloquer les faux livrables et valider que le résultat répond vraiment à la demande.",
    responsibilities: ["Validation logo", "Détection placeholder", "Validation mode simple"],
    skills: ["validate_logo_deliverable", "detect_generic_placeholder", "detect_text_only_logo", "detect_wrong_brand_name", "validate_hidden_details_only"],
    mustProduce: ["qualityGate"],
    mustNeverDo: ["marquer prêt sans livrable réel"],
    qualityChecklist: ["pas de placeholder", "pas de text-only", "chat simple propre"],
  },
  artifact_manager: {
    id: "artifact_manager",
    role: "artifact_manager",
    name: "Artifact Manager",
    mission: "Préparer les artifacts internes sans les afficher dans le chat simple.",
    responsibilities: ["Stockage artifacts", "Packaging détails cachés"],
    skills: ["store_artifacts", "prepare_hidden_details"],
    mustProduce: ["hiddenDetails"],
    mustNeverDo: ["exposer fichiers ou workspace dans le chat principal"],
    qualityChecklist: ["artifacts internes prêts", "détails fermés par défaut"],
  },
};

export function runAgentSkill<TInput, TOutput>(agentId: string, skillId: string, input: TInput): AgentRunResult<TOutput> {
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
      output: skill.run(input) as TOutput,
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
