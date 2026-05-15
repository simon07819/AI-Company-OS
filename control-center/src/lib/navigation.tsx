import {
  Activity,
  Archive,
  Crown,
  FileStack,
  FolderOpen,
  Settings,
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
};

const MAIN_NAV: DesktopNavItem[] = [
  { href: "/ceo",      label: "Chat CEO",   icon: createElement(Crown,          { size: 18 }), exact: true },
  { href: "/projects", label: "Projets",    icon: createElement(FolderOpen,     { size: 18 }) },
  { href: "/outputs",  label: "Livrables",  icon: createElement(FileStack,      { size: 18 }) },
  { href: "/archive",  label: "Archives",   icon: createElement(Archive,        { size: 18 }) },
  { href: "/logs",     label: "Logs",       icon: createElement(TerminalSquare, { size: 18 }) },
  { href: "/runtime",  label: "Runtime",    icon: createElement(Activity,       { size: 18 }) },
  { href: "/settings", label: "Paramètres", icon: createElement(Settings,       { size: 18 }) },
];

export const SIMPLE_NAV: DesktopNavItem[] = MAIN_NAV;
export const EXPERT_NAV: DesktopNavItem[] = MAIN_NAV;

export const ADVANCED_ROUTE_PREFIXES = [
  "archive",
  "logs",
  "runtime",
  "settings",
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
  if (pathname === "/") return "Accueil";
  return pathname.split("/").filter(Boolean).at(-1)?.replace(/-/g, " ") ?? "AI Company OS";
}
