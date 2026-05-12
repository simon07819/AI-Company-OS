import {
  Activity,
  Archive,
  Bot,
  Building2,
  CheckSquare,
  ClipboardList,
  Command,
  Crown,
  Database,
  DollarSign,
  Eye,
  Factory,
  FolderKanban,
  HeartPulse,
  MessageSquare,
  PanelTop,
  Settings,
  Shield,
  Users,
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
  { href: "/ceo", label: "CEO", icon: createElement(Crown, { size: 18 }) },
  { href: "/companies", label: "Entreprises", icon: createElement(Building2, { size: 18 }) },
  { href: "/projects", label: "Projets", icon: createElement(FolderKanban, { size: 18 }) },
  { href: "/outputs", label: "Resultats", icon: createElement(Eye, { size: 18 }) },
  { href: "/ceo/expert", label: "Expert", icon: createElement(Shield, { size: 18 }), advanced: true },
];

export const EXPERT_NAV: DesktopNavItem[] = [
  { href: "/", label: "Home", icon: createElement(Command, { size: 18 }), exact: true },
  { href: "/ceo", label: "CEO", icon: createElement(Crown, { size: 18 }) },
  { href: "/ceo/expert", label: "CEO Cockpit", icon: createElement(Shield, { size: 18 }), advanced: true },
  { href: "/companies", label: "Entreprises", icon: createElement(Building2, { size: 18 }) },
  { href: "/projects", label: "Projets", icon: createElement(FolderKanban, { size: 18 }) },
  { href: "/outputs", label: "Resultats", icon: createElement(Eye, { size: 18 }) },
  { href: "/agents", label: "Agents", icon: createElement(Bot, { size: 18 }), advanced: true },
  { href: "/approvals", label: "Approvals", icon: createElement(CheckSquare, { size: 18 }), advanced: true },
  { href: "/mission", label: "Mission Rooms", icon: createElement(ClipboardList, { size: 18 }), advanced: true },
  { href: "/workspaces", label: "Workspaces", icon: createElement(Database, { size: 18 }), advanced: true },
  { href: "/settings", label: "Settings", icon: createElement(Settings, { size: 18 }), advanced: true },
  { href: "/runtime", label: "Runtime", icon: createElement(Activity, { size: 18 }), advanced: true },
  { href: "/logs", label: "Logs", icon: createElement(ClipboardList, { size: 18 }), advanced: true },
  { href: "/system", label: "System Health", icon: createElement(HeartPulse, { size: 18 }), advanced: true },
  { href: "/demo", label: "Demo Center", icon: createElement(Factory, { size: 18 }), advanced: true },
  { href: "/conversations", label: "Conversations", icon: createElement(MessageSquare, { size: 18 }), advanced: true },
  { href: "/revenue", label: "Revenue", icon: createElement(DollarSign, { size: 18 }), advanced: true },
  { href: "/crm", label: "CRM", icon: createElement(Users, { size: 18 }), advanced: true },
  { href: "/distribution", label: "Distribution", icon: createElement(PanelTop, { size: 18 }), advanced: true },
  { href: "/archive", label: "Archive", icon: createElement(Archive, { size: 18 }), advanced: true },
];

export const ADVANCED_ROUTE_PREFIXES = [
  "ceo/expert",
  "runtime",
  "logs",
  "system",
  "settings",
  "demo",
  "crm",
  "revenue",
  "distribution",
  "workspaces",
  "agents",
  "approvals",
  "mission",
  "conversations",
  "business",
  "archive",
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
