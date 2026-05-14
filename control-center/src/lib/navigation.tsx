import {
  Activity,
  Bot,
  Building2,
  Crown,
  Eye,
  FileStack,
  FolderOpen,
  FolderKanban,
  LayoutDashboard,
  Settings,
  SlidersHorizontal,
  Sparkles,
  TerminalSquare,
} from "lucide-react";
import { createElement } from "react";
import type { ReactNode } from "react";
import type { ViewMode } from "./viewMode";

export type DesktopNavItem = {
  href: string;
  label: string;
  icon: ReactNode;
  exact?: boolean;
  advanced?: boolean;
};

export const SIMPLE_NAV: DesktopNavItem[] = [
  { href: "/", label: "Accueil", icon: createElement(LayoutDashboard, { size: 18 }), exact: true },
  { href: "/ceo", label: "CEO Chat", icon: createElement(Crown, { size: 18 }), exact: true },
  { href: "/projects", label: "Projets", icon: createElement(FolderOpen, { size: 18 }) },
  { href: "/agents", label: "Agents", icon: createElement(Bot, { size: 18 }) },
  { href: "/outputs", label: "Outputs", icon: createElement(FileStack, { size: 18 }) },
  { href: "/ceo/expert", label: "Expert Mode", icon: createElement(SlidersHorizontal, { size: 18 }), exact: true },
];

export const EXPERT_NAV: DesktopNavItem[] = [
  { href: "/", label: "Accueil", icon: createElement(LayoutDashboard, { size: 18 }), exact: true },
  { href: "/ceo", label: "CEO Chat", icon: createElement(Crown, { size: 18 }), exact: true },
  { href: "/projects", label: "Projets", icon: createElement(FolderOpen, { size: 18 }) },
  { href: "/agents", label: "Agents", icon: createElement(Bot, { size: 18 }) },
  { href: "/outputs", label: "Outputs", icon: createElement(FileStack, { size: 18 }) },
  { href: "/companies", label: "Companies", icon: createElement(Building2, { size: 18 }), advanced: true },
  { href: "/workspaces", label: "Workspaces", icon: createElement(FolderKanban, { size: 18 }), advanced: true },
  { href: "/artifacts", label: "Artifacts", icon: createElement(Eye, { size: 18 }), advanced: true },
  { href: "/skills", label: "Skills", icon: createElement(Sparkles, { size: 18 }), advanced: true },
  { href: "/evals", label: "Evals", icon: createElement(Activity, { size: 18 }), advanced: true },
  { href: "/settings", label: "Settings", icon: createElement(Settings, { size: 18 }), advanced: true },
  { href: "/logs", label: "Logs", icon: createElement(TerminalSquare, { size: 18 }), advanced: true },
  { href: "/runtime", label: "Runtime", icon: createElement(LayoutDashboard, { size: 18 }), advanced: true },
  { href: "/ceo/expert", label: "Expert Mode", icon: createElement(SlidersHorizontal, { size: 18 }), advanced: true, exact: true },
];

export const ADVANCED_ROUTE_PREFIXES = [
  "ceo/expert",
  "companies",
  "projects",
  "outputs",
  "evals",
  "skills",
  "settings",
  "workspaces",
  "artifacts",
  "logs",
  "runtime",
];

export function isAdvancedPath(pathname: string) {
  return new RegExp(`^/(${ADVANCED_ROUTE_PREFIXES.join("|")})(/|$)`).test(pathname);
}

export function navigationForMode(mode: ViewMode): DesktopNavItem[] {
  return mode === "expert" ? EXPERT_NAV : SIMPLE_NAV;
}

export function isActiveNavItem(item: DesktopNavItem, pathname: string) {
  return item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export function pageLabel(pathname: string, items: DesktopNavItem[]) {
  const active = [...items].sort((a, b) => b.href.length - a.href.length).find((item) => isActiveNavItem(item, pathname));
  if (active) return active.label;
  if (pathname === "/") return "Home";
  return pathname.split("/").filter(Boolean).at(-1)?.replace(/-/g, " ") ?? "AI Company OS";
}
