"use client";

import type { ReactNode } from "react";
import Link from "next/link";
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

export type DesktopNavItem = {
  href: string;
  label: string;
  icon: ReactNode;
  exact?: boolean;
};

export const SIMPLE_NAV: DesktopNavItem[] = [
  { href: "/ceo", label: "CEO", icon: <Crown size={18} /> },
  { href: "/companies", label: "Entreprises", icon: <Building2 size={18} /> },
  { href: "/projects", label: "Projets", icon: <FolderKanban size={18} /> },
  { href: "/outputs", label: "Resultats", icon: <Eye size={18} /> },
  { href: "/ceo/expert", label: "Expert", icon: <Shield size={18} /> },
];

export const EXPERT_NAV: DesktopNavItem[] = [
  { href: "/", label: "Home", icon: <Command size={18} />, exact: true },
  { href: "/ceo", label: "CEO", icon: <Crown size={18} /> },
  { href: "/ceo/expert", label: "CEO Cockpit", icon: <Shield size={18} /> },
  { href: "/companies", label: "Entreprises", icon: <Building2 size={18} /> },
  { href: "/projects", label: "Projets", icon: <FolderKanban size={18} /> },
  { href: "/outputs", label: "Resultats", icon: <Eye size={18} /> },
  { href: "/approvals", label: "Approvals", icon: <CheckSquare size={18} /> },
  { href: "/mission", label: "Mission Rooms", icon: <ClipboardList size={18} /> },
  { href: "/workspaces", label: "Workspaces", icon: <Database size={18} /> },
  { href: "/agents", label: "Agents", icon: <Bot size={18} /> },
  { href: "/conversations", label: "Conversations", icon: <MessageSquare size={18} /> },
  { href: "/crm", label: "CRM", icon: <Users size={18} /> },
  { href: "/revenue", label: "Revenue", icon: <DollarSign size={18} /> },
  { href: "/distribution", label: "Distribution", icon: <PanelTop size={18} /> },
  { href: "/runtime", label: "Runtime", icon: <Activity size={18} /> },
  { href: "/logs", label: "Logs", icon: <ClipboardList size={18} /> },
  { href: "/system", label: "System Health", icon: <HeartPulse size={18} /> },
  { href: "/demo", label: "Demo Center", icon: <Factory size={18} /> },
  { href: "/settings", label: "Settings", icon: <Settings size={18} /> },
  { href: "/archive", label: "Archive", icon: <Archive size={18} /> },
];

export function isActiveNavItem(item: DesktopNavItem, pathname: string) {
  return item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export function pageLabel(pathname: string, items: DesktopNavItem[]) {
  const active = [...items].sort((a, b) => b.href.length - a.href.length).find((item) => isActiveNavItem(item, pathname));
  if (active) return active.label;
  if (pathname === "/") return "Home";
  return pathname.split("/").filter(Boolean).at(-1)?.replace(/-/g, " ") ?? "AI Company OS";
}

export default function CommandDock({ expertMode, pathname }: { expertMode: boolean; pathname: string }) {
  const navItems = expertMode ? EXPERT_NAV : SIMPLE_NAV;

  return (
    <aside className="command-dock os-dock" aria-label={expertMode ? "Expert navigation" : "Simple navigation"}>
      <Link className="os-dock-brand" href="/" aria-label="AI Company OS home">
        <span>AI</span>
      </Link>
      <nav className="os-dock-nav">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`os-dock-item${isActiveNavItem(item, pathname) ? " active" : ""}`}
            aria-label={item.label}
            title={item.label}
          >
            {item.icon}
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>
    </aside>
  );
}
