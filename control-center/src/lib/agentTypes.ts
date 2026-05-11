// ─── Agent Types & Constants (client-safe) ──────────────────────────────

export type AgentId = "ceo" | "cfo" | "cmo" | "cto" | "coo" | "logistics" | "support" | "sales" | "hr" | "product_agent" | "architect_agent" | "frontend_agent" | "backend_agent" | "qa_agent" | "devops_agent";

export type CreativeStyle = "minimalist_premium" | "bold_athletic" | "elegant_luxury" | "playful_modern" | "corporate_clean" | "experimental_avant_garde";

export interface CreativeStandard {
  id: string;
  label: string;
  description: string;
  reference: string;
  applicableAgents: AgentId[];
}

export const CREATIVE_STANDARDS: CreativeStandard[] = [
  { id: "cs-apple", label: "Apple-Level Design", description: "Minimalist premium. White space, typography, subtle animations. Reference: apple.com, iOS HIG.", reference: "apple.com", applicableAgents: ["cmo", "frontend_agent", "product_agent"] },
  { id: "cs-nike", label: "Nike Athletic Bold", description: "Bold, athletic, high-energy. Strong typography, dynamic layouts. Reference: nike.com campaigns.", reference: "nike.com", applicableAgents: ["cmo", "frontend_agent"] },
  { id: "cs-tesla", label: "Tesla Modern Futurism", description: "Clean futurism. Dark/light contrast, data-driven aesthetics. Reference: tesla.com configurator.", reference: "tesla.com", applicableAgents: ["cto", "frontend_agent", "architect_agent"] },
  { id: "cs-dribbble", label: "Dribbble Featured Quality", description: "Top 1% creative quality. Pixel-perfect, trend-aware, premium aesthetics. Reference: dribbble.com/shots.", reference: "dribbble.com", applicableAgents: ["cmo", "frontend_agent"] },
  { id: "cs-behance", label: "Behance Portfolio Grade", description: "Agency-quality deliverables. Professional case study presentation. Reference: behance.net.", reference: "behance.net", applicableAgents: ["cmo", "frontend_agent"] },
  { id: "cs-vercel", label: "Vercel Developer UX", description: "Developer-first UX. Dark mode, monospace accents, clear hierarchy. Reference: vercel.com dashboard.", reference: "vercel.com", applicableAgents: ["cto", "devops_agent", "architect_agent"] },
  { id: "cs-linear", label: "Linear Product Quality", description: "Productivity-grade UI. Keyboard-first, smooth transitions, dark elegance. Reference: linear.app.", reference: "linear.app", applicableAgents: ["product_agent", "frontend_agent"] },
  { id: "cs-stripe", label: "Stripe API Documentation", description: "Best-in-class API docs. Clear, structured, interactive. Reference: stripe.com/docs.", reference: "stripe.com/docs", applicableAgents: ["cto", "backend_agent"] },
];

export function getLevelTitle(level: number): string {
  if (level >= 20) return "Legendary";
  if (level >= 15) return "Master";
  if (level >= 10) return "Expert";
  if (level >= 5) return "Senior";
  if (level >= 3) return "Professional";
  return "Junior";
}

export function getXpToNextLevel(xp: number): { current: number; needed: number; progress: number } {
  const currentLevel = Math.floor(xp / 500) + 1;
  const currentLevelXp = (currentLevel - 1) * 500;
  const nextLevelXp = currentLevel * 500;
  const progress = (xp - currentLevelXp) / (nextLevelXp - currentLevelXp);
  return { current: xp - currentLevelXp, needed: nextLevelXp - currentLevelXp, progress: Math.min(progress, 1) };
}
