import {
  Bot,
  ClipboardList,
  Crown,
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
  { href: "/ceo", label: "CEO Chat", icon: createElement(Crown, { size: 18 }) },
  { href: "/missions", label: "Missions", icon: createElement(ClipboardList, { size: 18 }) },
  { href: "/agents", label: "Agents", icon: createElement(Bot, { size: 18 }) },
];

export const EXPERT_NAV: DesktopNavItem[] = SIMPLE_NAV;

export const ADVANCED_ROUTE_PREFIXES = [
  "ceo/expert",
  "evals",
  "skills",
  "settings",
  "workspaces",
  "agents",
  "missions",
  "artifacts",
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
