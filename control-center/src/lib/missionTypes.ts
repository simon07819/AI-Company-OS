import type { AutopilotPhase } from "./autopilotStore";

// ─── Types ────────────────────────────────────────────────────────────────────

export type MissionTypeId =
  | "saas_project"
  | "website"
  | "branding_pack"
  | "flyer"
  | "business_card"
  | "ecommerce_store"
  | "social_campaign"
  | "automation_workflow";

export interface MissionPhase {
  id: AutopilotPhase;
  label: string;
  agent: string;
}

export interface MissionDeliverable {
  name: string;
  description: string;
  path: string;
}

export interface MissionType {
  id: MissionTypeId;
  label: string;
  description: string;
  category: "software" | "design" | "marketing" | "automation";
  recommendedAgents: string[];
  defaultPhases: MissionPhase[];
  expectedDeliverables: MissionDeliverable[];
  workspaceFolders: string[];
}

// ─── Mission Type Definitions ────────────────────────────────────────────────

export const MISSION_TYPES: MissionType[] = [
  {
    id: "saas_project",
    label: "SaaS Project",
    description: "Full-stack SaaS application with auth, billing, dashboard and API",
    category: "software",
    recommendedAgents: ["product_agent", "architect_agent", "frontend_agent", "backend_agent", "qa_agent", "devops_agent"],
    defaultPhases: [
      { id: "idea", label: "Idea Analysis", agent: "product_agent" },
      { id: "planning", label: "Product Planning", agent: "product_agent" },
      { id: "architecture", label: "Architecture Design", agent: "architect_agent" },
      { id: "frontend", label: "Frontend Tasks", agent: "frontend_agent" },
      { id: "backend", label: "Backend Tasks", agent: "backend_agent" },
      { id: "validation", label: "Validation", agent: "qa_agent" },
      { id: "build", label: "Build Preparation", agent: "devops_agent" },
      { id: "runtime", label: "Runtime Monitoring", agent: "devops_agent" },
    ],
    expectedDeliverables: [
      { name: "SaaS Application", description: "Full Next.js app with auth, dashboard, API", path: "project/" },
      { name: "Product Brief", description: "PRD with user stories and roadmap", path: "product/brief.md" },
      { name: "System Design", description: "Architecture and data model", path: "architecture/system-design.md" },
      { name: "Test Suite", description: "Unit and integration tests", path: "qa/test-plan.md" },
    ],
    workspaceFolders: ["product", "architecture", "frontend", "backend", "qa", "devops", "project"],
  },
  {
    id: "website",
    label: "Website",
    description: "Professional website with landing page, about, contact and blog",
    category: "software",
    recommendedAgents: ["product_agent", "frontend_agent", "qa_agent"],
    defaultPhases: [
      { id: "idea", label: "Client Brief", agent: "product_agent" },
      { id: "planning", label: "Site Planning", agent: "product_agent" },
      { id: "frontend", label: "Page Development", agent: "frontend_agent" },
      { id: "validation", label: "QA & Review", agent: "qa_agent" },
      { id: "build", label: "Deploy Prep", agent: "devops_agent" },
    ],
    expectedDeliverables: [
      { name: "Website", description: "Multi-page site with responsive design", path: "project/" },
      { name: "Site Brief", description: "Client brief and sitemap", path: "product/brief.md" },
      { name: "UI Plan", description: "Page layouts and components", path: "frontend/ui-plan.md" },
    ],
    workspaceFolders: ["product", "frontend", "qa", "devops", "project"],
  },
  {
    id: "branding_pack",
    label: "Branding Pack",
    description: "Complete brand identity: logo, colors, typography, guidelines",
    category: "design",
    recommendedAgents: ["product_agent", "frontend_agent"],
    defaultPhases: [
      { id: "idea", label: "Brand Discovery", agent: "product_agent" },
      { id: "planning", label: "Brand Strategy", agent: "product_agent" },
      { id: "frontend", label: "Visual Design", agent: "frontend_agent" },
      { id: "validation", label: "Brand Review", agent: "qa_agent" },
    ],
    expectedDeliverables: [
      { name: "Brand Guidelines", description: "Logo, colors, typography, usage rules", path: "brand/guidelines.md" },
      { name: "Color Palette", description: "Primary, secondary and accent colors", path: "brand/colors.md" },
      { name: "Typography Guide", description: "Font families, sizes and hierarchy", path: "brand/typography.md" },
    ],
    workspaceFolders: ["product", "brand", "frontend"],
  },
  {
    id: "flyer",
    label: "Flyer",
    description: "Print-ready promotional flyer with layout, copy and visuals",
    category: "design",
    recommendedAgents: ["product_agent", "frontend_agent"],
    defaultPhases: [
      { id: "idea", label: "Flyer Brief", agent: "product_agent" },
      { id: "planning", label: "Content Planning", agent: "product_agent" },
      { id: "frontend", label: "Layout Design", agent: "frontend_agent" },
      { id: "validation", label: "Proof Review", agent: "qa_agent" },
    ],
    expectedDeliverables: [
      { name: "Flyer Layout", description: "HTML/CSS layout for print or digital", path: "deliverables/flyer.md" },
      { name: "Copy Draft", description: "Headlines, body text and CTA", path: "product/brief.md" },
    ],
    workspaceFolders: ["product", "brand", "deliverables"],
  },
  {
    id: "business_card",
    label: "Business Card",
    description: "Professional business card design with layout and print specs",
    category: "design",
    recommendedAgents: ["product_agent", "frontend_agent"],
    defaultPhases: [
      { id: "idea", label: "Card Brief", agent: "product_agent" },
      { id: "planning", label: "Info Architecture", agent: "product_agent" },
      { id: "frontend", label: "Card Design", agent: "frontend_agent" },
      { id: "validation", label: "Proof Review", agent: "qa_agent" },
    ],
    expectedDeliverables: [
      { name: "Business Card", description: "Front/back layout with contact info", path: "deliverables/business-card.md" },
      { name: "Print Specs", description: "Dimensions, bleed, color mode", path: "deliverables/print-specs.md" },
    ],
    workspaceFolders: ["product", "brand", "deliverables"],
  },
  {
    id: "ecommerce_store",
    label: "E-Commerce Store",
    description: "Online store with product catalog, cart, checkout and payments",
    category: "software",
    recommendedAgents: ["product_agent", "architect_agent", "frontend_agent", "backend_agent", "qa_agent", "devops_agent"],
    defaultPhases: [
      { id: "idea", label: "Store Concept", agent: "product_agent" },
      { id: "planning", label: "Product Catalog Plan", agent: "product_agent" },
      { id: "architecture", label: "Store Architecture", agent: "architect_agent" },
      { id: "frontend", label: "Storefront UI", agent: "frontend_agent" },
      { id: "backend", label: "Cart & Checkout API", agent: "backend_agent" },
      { id: "validation", label: "Checkout QA", agent: "qa_agent" },
      { id: "build", label: "Payment Integration", agent: "devops_agent" },
    ],
    expectedDeliverables: [
      { name: "E-Commerce App", description: "Full storefront with cart and checkout", path: "project/" },
      { name: "Product Catalog", description: "Categories, products, variants", path: "product/brief.md" },
      { name: "API Plan", description: "Cart, orders, payments endpoints", path: "backend/api-plan.md" },
    ],
    workspaceFolders: ["product", "architecture", "frontend", "backend", "qa", "devops", "project"],
  },
  {
    id: "social_campaign",
    label: "Social Media Campaign",
    description: "Multi-platform social campaign with content calendar and creatives",
    category: "marketing",
    recommendedAgents: ["product_agent", "frontend_agent"],
    defaultPhases: [
      { id: "idea", label: "Campaign Brief", agent: "product_agent" },
      { id: "planning", label: "Content Calendar", agent: "product_agent" },
      { id: "frontend", label: "Creative Design", agent: "frontend_agent" },
      { id: "validation", label: "Brand Review", agent: "qa_agent" },
    ],
    expectedDeliverables: [
      { name: "Campaign Plan", description: "Strategy, platforms, KPIs", path: "campaign/plan.md" },
      { name: "Content Calendar", description: "Post schedule per platform", path: "campaign/calendar.md" },
      { name: "Creative Templates", description: "Post templates for each platform", path: "deliverables/creatives.md" },
    ],
    workspaceFolders: ["product", "campaign", "deliverables"],
  },
  {
    id: "automation_workflow",
    label: "Automation Workflow",
    description: "Automated pipeline: triggers, actions, integrations and monitoring",
    category: "automation",
    recommendedAgents: ["product_agent", "architect_agent", "backend_agent", "qa_agent", "devops_agent"],
    defaultPhases: [
      { id: "idea", label: "Workflow Discovery", agent: "product_agent" },
      { id: "planning", label: "Step Definition", agent: "product_agent" },
      { id: "architecture", label: "Integration Map", agent: "architect_agent" },
      { id: "backend", label: "Pipeline Implementation", agent: "backend_agent" },
      { id: "validation", label: "Flow Testing", agent: "qa_agent" },
      { id: "build", label: "Deployment & Scheduling", agent: "devops_agent" },
    ],
    expectedDeliverables: [
      { name: "Workflow Definition", description: "Triggers, steps, conditions", path: "workflow/definition.md" },
      { name: "Integration Map", description: "APIs, webhooks, data flows", path: "architecture/system-design.md" },
      { name: "Pipeline Code", description: "Implementation of the automation", path: "backend/services.md" },
    ],
    workspaceFolders: ["product", "architecture", "workflow", "backend", "qa", "devops"],
  },
];

// ─── Lookup helpers ─────────────────────────────────────────────────────────

const MISSION_MAP = new Map(MISSION_TYPES.map((m) => [m.id, m]));

export function getMissionType(id: string): MissionType | undefined {
  return MISSION_MAP.get(id as MissionTypeId);
}

export function getDefaultMissionType(): MissionType {
  return MISSION_TYPES[0];
}

export function isSoftwareMission(id: string): boolean {
  const mt = getMissionType(id);
  return mt?.category === "software";
}
