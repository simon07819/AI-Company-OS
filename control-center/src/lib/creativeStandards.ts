import { type AgentId, type CreativeStyle, type CreativeStandard, CREATIVE_STANDARDS } from "./agentTypes";

export { type AgentId, type CreativeStyle, type CreativeStandard, CREATIVE_STANDARDS };

// ─── Premium Design Presets ──────────────────────────────────────────────

export interface DesignPreset {
  id: string;
  name: string;
  style: CreativeStyle;
  reference: string;
  description: string;
  colorStrategy: string;
  typographyStrategy: string;
  layoutStrategy: string;
  qualityBenchmark: string;
  applicableMissionTypes: string[];
}

export const DESIGN_PRESETS: DesignPreset[] = [
  {
    id: "dp-apple-premium",
    name: "Apple Premium",
    style: "minimalist_premium",
    reference: "apple.com",
    description: "White space mastery, typography-driven, subtle animations. Every element intentional. No clutter.",
    colorStrategy: "Monochrome base + one accent. Dark mode with subtle gradients. No more than 3 colors.",
    typographyStrategy: "SF Pro or Inter. Large headings (32-48px), generous line-height. Light font weight for body.",
    layoutStrategy: "Full-width sections, generous padding (48-64px), centered content. Card radius: 12-16px.",
    qualityBenchmark: "Every page looks like an Apple keynote slide. Pixel-perfect. Zero visual noise.",
    applicableMissionTypes: ["branding_pack", "website", "saas_project"],
  },
  {
    id: "dp-nike-bold",
    name: "Nike Bold Athletic",
    style: "bold_athletic",
    reference: "nike.com",
    description: "High-energy, bold typography, dynamic layouts. Movement and impact. Every design shouts confidence.",
    colorStrategy: "High contrast. Black/white base + energy accent (red, orange). Bold blocks of color.",
    typographyStrategy: "Condensed bold sans-serif. ALL CAPS headlines. Tight tracking. Impact over elegance.",
    layoutStrategy: "Asymmetric grids, diagonal elements, overlapping layers. Full-bleed images. Edge-to-edge energy.",
    qualityBenchmark: "Nike campaign quality. Every visual has movement and confidence. Zero hesitation.",
    applicableMissionTypes: ["branding_pack", "flyer", "social_campaign"],
  },
  {
    id: "dp-tesla-futurism",
    name: "Tesla Modern Futurism",
    style: "elegant_luxury",
    reference: "tesla.com",
    description: "Clean futurism. Dark/light contrast. Data-driven aesthetics. Technology meets luxury.",
    colorStrategy: "Dark backgrounds (#0A0A0A), metallic accents, electric blue highlights. Cinematic feel.",
    typographyStrategy: "Clean sans-serif. Medium weight. Large numbers. Data visualization integration.",
    layoutStrategy: "Full-screen hero sections, configurator-style layouts, 3D-feel elements. Smooth transitions.",
    qualityBenchmark: "Tesla configurator quality. Feels like the future. Premium without being cold.",
    applicableMissionTypes: ["branding_pack", "website", "saas_project"],
  },
  {
    id: "dp-dribbble-featured",
    name: "Dribbble Featured Quality",
    style: "minimalist_premium",
    reference: "dribbble.com/shots",
    description: "Top 1% creative quality. Pixel-perfect, trend-aware, premium aesthetics. Agency-grade output.",
    colorStrategy: "Trend-aware palettes. Harmonious gradients. Soft shadows. Glassmorphism accents.",
    typographyStrategy: "Modern geometric sans-serif. Variable weight. Optical sizing. Balanced hierarchy.",
    layoutStrategy: "Balanced white space, subtle depth, refined micro-interactions. Shadow + blur for depth.",
    qualityBenchmark: "Would get 500+ likes on Dribbble. Every detail intentional. Production-ready.",
    applicableMissionTypes: ["branding_pack", "flyer", "website", "social_campaign"],
  },
  {
    id: "dp-stripe-docs",
    name: "Stripe Documentation",
    style: "corporate_clean",
    reference: "stripe.com/docs",
    description: "Best-in-class documentation. Clear, structured, interactive. Developer trust and clarity.",
    colorStrategy: "Stripe purple accent on white. Syntax highlighting. Status colors for success/warning/error.",
    typographyStrategy: "System font stack. Monospace for code. Clear hierarchy. Readable at all sizes.",
    layoutStrategy: "Two-column layout. Sticky navigation. Code + preview side by side. Inline examples.",
    qualityBenchmark: "Every developer understands immediately. Zero confusion. Trust through clarity.",
    applicableMissionTypes: ["saas_project", "website"],
  },
];

// ─── Creative Direction Presets ───────────────────────────────────────────

export interface CreativeDirectionPreset {
  id: string;
  name: string;
  description: string;
  mood: string;
  visualAnchors: string[];
  forbiddenPatterns: string[];
  colorFamilies: string[];
  typographyVibe: string;
  targetMissionTypes: string[];
}

export const CREATIVE_DIRECTION_PRESETS: CreativeDirectionPreset[] = [
  {
    id: "cd-premium-confidence",
    name: "Premium Confidence",
    description: "The brand that makes you trust it instantly. Think: Apple, Tesla, Stripe.",
    mood: "Confident, calm, authoritative. No shouting — just certainty.",
    visualAnchors: ["dark mode", "generous whitespace", "subtle gradients", "premium typography", "micro-animations"],
    forbiddenPatterns: ["clip art", "stock photos", "comic sans", "rainbow gradients", "busy backgrounds", "template look"],
    colorFamilies: ["deep navy", "metallic gold", "platinum", "charcoal", "electric blue"],
    typographyVibe: "Inter Bold for headings, Inter Regular for body. Large, confident, readable.",
    targetMissionTypes: ["branding_pack", "website", "saas_project"],
  },
  {
    id: "cd-energy-impact",
    name: "Energy & Impact",
    description: "The brand that hits you like a Nike ad. Bold, dynamic, unforgettable.",
    mood: "Energetic, intense, motivational. Movement and power.",
    visualAnchors: ["bold typography", "high contrast", "dynamic angles", "full-bleed imagery", "overlay text"],
    forbiddenPatterns: ["pastel colors", "thin fonts", "excessive whitespace", "slow animations", "subtle anything"],
    colorFamilies: ["pure black", "signal red", "electric orange", "neon yellow", "white on dark"],
    typographyVibe: "Condensed bold. ALL CAPS. Tight spacing. Impact over readability at first glance.",
    targetMissionTypes: ["flyer", "social_campaign", "branding_pack"],
  },
  {
    id: "cd-luxe-noir",
    name: "Luxe Noir",
    description: "The brand that whispers wealth. Think: Chanel, Rolls Royce, Aesop.",
    mood: "Sophisticated, mysterious, exclusive. Quiet luxury.",
    visualAnchors: ["deep black", "gold accents", "serif headings", "minimal layout", "photography-first"],
    forbiddenPatterns: ["bright colors", "sans-serif headings", "busy layouts", "cartoon elements", "playful anything"],
    colorFamilies: ["absolute black", "warm gold", "champagne", "deep burgundy", "cream"],
    typographyVibe: "Elegant serif for headings, refined sans-serif for body. Generous letter-spacing.",
    targetMissionTypes: ["branding_pack"],
  },
  {
    id: "cd-modern-startup",
    name: "Modern Startup",
    description: "The brand that feels like the next unicorn. Think: Linear, Vercel, Notion.",
    mood: "Smart, clean, approachable. Developer-friendly but premium.",
    visualAnchors: ["dark mode", "code accents", "monospace elements", "smooth animations", "card-based layout"],
    forbiddenPatterns: ["clip art", "stock photos", "gradient text", "busy dashboards", "legacy patterns"],
    colorFamilies: ["indigo", "violet", "slate", "emerald accents", "amber highlights"],
    typographyVibe: "Inter variable. Clean hierarchy. Monospace for technical content. 14px base.",
    targetMissionTypes: ["saas_project", "website"],
  },
];

// ─── Design QA Rules ─────────────────────────────────────────────────────

export interface DesignQARule {
  id: string;
  category: "layout" | "typography" | "color" | "imagery" | "accessibility" | "consistency";
  rule: string;
  severity: "critical" | "warning" | "suggestion";
  check: string;
  fix: string;
}

export const DESIGN_QA_RULES: DesignQARule[] = [
  // Layout
  { id: "qa-layout-1", category: "layout", rule: "No section should have less than 24px padding", severity: "warning", check: "Inspect section padding values", fix: "Increase padding to minimum 24px" },
  { id: "qa-layout-2", category: "layout", rule: "Card border radius must be consistent (12px or 16px)", severity: "critical", check: "Compare all card border-radius values", fix: "Standardize to 12px (compact) or 16px (spacious)" },
  { id: "qa-layout-3", category: "layout", rule: "No more than 3 visual columns on mobile", severity: "critical", check: "Check responsive breakpoints", fix: "Stack columns vertically below 768px" },
  { id: "qa-layout-4", category: "layout", rule: "Hero section must have full-width impact", severity: "warning", check: "Verify hero takes full viewport width", fix: "Remove horizontal constraints on hero" },

  // Typography
  { id: "qa-type-1", category: "typography", rule: "No more than 3 font sizes on a single screen", severity: "warning", check: "Count distinct font-size values", fix: "Consolidate to heading/body/label sizes" },
  { id: "qa-type-2", category: "typography", rule: "Body text must be at least 14px", severity: "critical", check: "Check minimum font-size", fix: "Set body base to 14px minimum" },
  { id: "qa-type-3", category: "typography", rule: "Line height must be at least 1.5 for body text", severity: "critical", check: "Verify line-height values", fix: "Set line-height: 1.5 for paragraphs" },

  // Color
  { id: "qa-color-1", category: "color", rule: "Primary brand color must appear in top section", severity: "warning", check: "Check hero/first section for brand color", fix: "Add brand color accent to hero section" },
  { id: "qa-color-2", category: "color", rule: "No pure black (#000) on backgrounds — use #0A0A0A or similar", severity: "suggestion", check: "Search for #000000 in CSS", fix: "Replace with deep navy or charcoal" },
  { id: "qa-color-3", category: "color", rule: "Contrast ratio must meet WCAG AA (4.5:1 for text)", severity: "critical", check: "Run contrast checker on text/background pairs", fix: "Adjust text or background color for contrast" },

  // Imagery
  { id: "qa-img-1", category: "imagery", rule: "No placeholder images in production", severity: "critical", check: "Search for placeholder/stock image URLs", fix: "Replace with actual brand imagery" },
  { id: "qa-img-2", category: "imagery", rule: "All images must have alt text", severity: "critical", check: "Check img elements for alt attribute", fix: "Add descriptive alt text" },

  // Accessibility
  { id: "qa-a11y-1", category: "accessibility", rule: "Interactive elements must have visible focus states", severity: "critical", check: "Tab through interface", fix: "Add focus-visible outlines" },
  { id: "qa-a11y-2", category: "accessibility", rule: "Touch targets must be at least 44x44px", severity: "warning", check: "Measure button/link sizes", fix: "Increase padding on interactive elements" },

  // Consistency
  { id: "qa-cons-1", category: "consistency", rule: "All cards must use the same shadow style", severity: "warning", check: "Compare box-shadow values across cards", fix: "Standardize to single shadow definition" },
  { id: "qa-cons-2", category: "consistency", rule: "Button styles must be consistent across pages", severity: "critical", check: "Compare button components", fix: "Use shared button component" },
];

// ─── Branding References ──────────────────────────────────────────────────

export interface BrandingReference {
  brand: string;
  url: string;
  style: CreativeStyle;
  qualities: string[];
  applicableTo: string[];
}

export const BRANDING_REFERENCES: BrandingReference[] = [
  { brand: "Apple", url: "apple.com", style: "minimalist_premium", qualities: ["typography mastery", "white space", "subtle animation", "premium feel"], applicableTo: ["branding_pack", "website"] },
  { brand: "Nike", url: "nike.com", style: "bold_athletic", qualities: ["bold typography", "energy", "movement", "impact"], applicableTo: ["flyer", "branding_pack", "social_campaign"] },
  { brand: "Tesla", url: "tesla.com", style: "elegant_luxury", qualities: ["futurism", "dark mode", "clean data", "cinematic"], applicableTo: ["branding_pack", "website"] },
  { brand: "Stripe", url: "stripe.com", style: "corporate_clean", qualities: ["documentation quality", "developer trust", "clean API", "structured"], applicableTo: ["saas_project", "website"] },
  { brand: "Linear", url: "linear.app", style: "minimalist_premium", qualities: ["dark elegance", "keyboard-first", "smooth transitions", "productivity"], applicableTo: ["saas_project"] },
  { brand: "Vercel", url: "vercel.com", style: "minimalist_premium", qualities: ["developer UX", "dark mode", "clean deploy", "modern stack"], applicableTo: ["website", "saas_project"] },
  { brand: "Figma", url: "figma.com", style: "playful_modern", qualities: ["collaboration", "colorful but clean", "creative tool", "accessible"], applicableTo: ["branding_pack", "website"] },
];

// ─── Visual Intelligence ──────────────────────────────────────────────────

export interface VisualIntelligenceRule {
  category: string;
  rule: string;
  benchmark: string;
}

export const VISUAL_INTELLIGENCE: VisualIntelligenceRule[] = [
  { category: "Color", rule: "Every design must have a dominant color (70%), secondary (20%), accent (10%)", benchmark: "Apple 70-20-10 color system" },
  { category: "Typography", rule: "Headings command attention, body earns trust, labels guide action", benchmark: "Stripe 3-tier type system" },
  { category: "Layout", rule: "If you can remove an element without losing meaning, remove it", benchmark: "Apple minimalist philosophy" },
  { category: "Imagery", rule: "One powerful image > ten mediocre ones", benchmark: "Nike hero photography" },
  { category: "Animation", rule: "Animations should feel physical, not mechanical. 300ms default, ease-out", benchmark: "Linear motion design" },
  { category: "Depth", rule: "Use shadow and blur for hierarchy, not decoration", benchmark: "Vercel dashboard depth" },
  { category: "Consistency", rule: "If two elements do the same thing, they must look the same", benchmark: "Stripe component system" },
  { category: "Trust", rule: "Professional design builds trust. Sloppy design destroys it", benchmark: "Apple product pages" },
];

// ─── Public API ───────────────────────────────────────────────────────────

export function getPresetsForMission(missionType: string): DesignPreset[] {
  return DESIGN_PRESETS.filter((p) => p.applicableMissionTypes.includes(missionType));
}

export function getDirectionsForMission(missionType: string): CreativeDirectionPreset[] {
  return CREATIVE_DIRECTION_PRESETS.filter((p) => p.targetMissionTypes.includes(missionType));
}

export function getQARulesForCategory(category: string): DesignQARule[] {
  return DESIGN_QA_RULES.filter((r) => r.category === category);
}

export function getCriticalQARules(): DesignQARule[] {
  return DESIGN_QA_RULES.filter((r) => r.severity === "critical");
}

export function getReferencesForMission(missionType: string): BrandingReference[] {
  return BRANDING_REFERENCES.filter((r) => r.applicableTo.includes(missionType));
}
