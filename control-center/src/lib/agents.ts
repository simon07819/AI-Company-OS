export type AgentStatus = "available";

export interface AgentDef {
  id: string;
  name: string;
  role: string;
  responsibilities: string[];
  examples: string[];
  keywords: string[];
  status: AgentStatus;
  color: string;
}

export const AGENTS: AgentDef[] = [
  {
    id: "product_agent",
    name: "Product Agent",
    role: "Defines product specs, roadmaps, and user stories",
    responsibilities: [
      "Generate roadmap updates and milestone plans",
      "Write Product Requirement Documents (PRDs)",
      "Create feature specifications and user stories",
      "Define acceptance criteria and scope boundaries",
    ],
    examples: [
      "Define roadmap for Q3",
      "Write PRD for billing feature",
      "Create user stories for onboarding",
    ],
    keywords: ["roadmap", "prd", "product requirement", "feature spec", "user story", "acceptance criteria"],
    status: "available",
    color: "#a78bfa",
  },
  {
    id: "architect_agent",
    name: "Architect Agent",
    role: "Designs system architecture, API contracts, and infrastructure docs",
    responsibilities: [
      "Produce architecture decision records",
      "Define API specifications and data contracts",
      "Document environment configuration and secrets",
      "Design integration patterns between services",
    ],
    examples: [
      "System architecture design",
      "Define API contract for billing",
      "Document environment variables",
    ],
    keywords: ["architecture", "architect", "system design", "api design", "api contract", "api spec", "integration design"],
    status: "available",
    color: "#f59e0b",
  },
  {
    id: "frontend_agent",
    name: "Frontend Agent",
    role: "Generates Next.js pages, UI components, and layouts",
    responsibilities: [
      "Create landing pages, dashboards, and marketing pages",
      "Build UI components with Tailwind CSS",
      "Generate pricing, onboarding, and settings pages",
      "Implement client-side layouts and navigation",
    ],
    examples: [
      "Create landing page",
      "Build dashboard page",
      "Add pricing page",
      "Design onboarding flow",
    ],
    keywords: ["landing page", "landing", "home page", "hero", "dashboard page", "pricing page", "members page", "classes page", "settings page", "component", "layout", "navbar", "frontend"],
    status: "available",
    color: "#3b82f6",
  },
  {
    id: "backend_agent",
    name: "Backend Agent",
    role: "Generates API routes, lib utilities, and database schemas — fallback for unmatched tasks",
    responsibilities: [
      "Create Next.js API routes (auth, billing, webhooks)",
      "Write lib/ utility modules (auth, billing, email, notifications)",
      "Generate Prisma database schemas",
      "Produce Python backend stubs as fallback",
    ],
    examples: [
      "Setup billing API",
      "Implement authentication endpoint",
      "Generate Prisma schema",
      "Create webhook handler",
    ],
    keywords: ["api route", "api endpoint", "billing", "payment", "authentication", "auth route", "webhook", "database schema", "prisma", "schema", "backend", "server", "endpoint"],
    status: "available",
    color: "#22c55e",
  },
  {
    id: "qa_agent",
    name: "QA Agent",
    role: "Generates test files — unit, integration, and end-to-end",
    responsibilities: [
      "Write Playwright end-to-end test specs",
      "Create Vitest unit and API tests",
      "Generate pytest test files for Python modules",
      "Define test strategies and coverage targets",
    ],
    examples: [
      "Write e2e tests for auth",
      "Add unit tests for billing module",
      "Create test suite for API routes",
    ],
    keywords: ["e2e", "end-to-end", "unit test", "playwright", "vitest", "jest", "test suite", "write test", "add test", "quality assurance", "qa"],
    status: "available",
    color: "#ef4444",
  },
  {
    id: "devops_agent",
    name: "DevOps Agent",
    role: "Generates CI/CD pipelines, Docker configs, and deployment manifests",
    responsibilities: [
      "Create GitHub Actions CI/CD workflow files",
      "Write Dockerfiles and .dockerignore",
      "Generate Vercel and deployment configs",
      "Define environment and build pipelines",
    ],
    examples: [
      "Configure deployment pipeline",
      "Setup Docker container",
      "Create GitHub Actions workflow",
      "Configure Vercel deployment",
    ],
    keywords: ["deploy", "deployment", "ci/cd", "ci", "pipeline", "github action", "github workflow", "docker", "container", "vercel", "production"],
    status: "available",
    color: "#6c63ff",
  },
];

export function getAgentById(id: string): AgentDef | undefined {
  return AGENTS.find((a) => a.id === id);
}
