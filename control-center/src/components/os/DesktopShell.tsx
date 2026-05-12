"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
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
  Search,
  Settings,
  Shield,
  Sparkles,
  Users,
} from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";

const NAV_MODE_STORAGE_KEY = "ai-company-os-nav-mode";

type DesktopNavItem = {
  href: string;
  label: string;
  icon: ReactNode;
  exact?: boolean;
};

const SIMPLE_NAV: DesktopNavItem[] = [
  { href: "/ceo", label: "CEO", icon: <Crown size={18} /> },
  { href: "/companies", label: "Entreprises", icon: <Building2 size={18} /> },
  { href: "/projects", label: "Projets", icon: <FolderKanban size={18} /> },
  { href: "/outputs", label: "Resultats", icon: <Eye size={18} /> },
  { href: "/ceo/expert", label: "Expert", icon: <Shield size={18} /> },
];

const EXPERT_NAV: DesktopNavItem[] = [
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

function isAdvancedPath(pathname: string) {
  return /^\/(ceo\/expert|runtime|logs|system|settings|demo|crm|revenue|distribution|workspaces|agents|approvals|mission|conversations|business|archive)(\/|$)/.test(pathname);
}

function isActive(item: DesktopNavItem, pathname: string) {
  return item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
}

function pageLabel(pathname: string, items: DesktopNavItem[]) {
  const active = [...items].sort((a, b) => b.href.length - a.href.length).find((item) => isActive(item, pathname));
  if (active) return active.label;
  if (pathname === "/") return "Home";
  return pathname.split("/").filter(Boolean).at(-1)?.replace(/-/g, " ") ?? "AI Company OS";
}

export default function DesktopShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [expertMode, setExpertMode] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(NAV_MODE_STORAGE_KEY);
      if (stored === "expert") {
        setExpertMode(true);
        return;
      }
      if (stored === "simple") {
        setExpertMode(false);
        return;
      }
      setExpertMode(isAdvancedPath(pathname));
    } catch {
      setExpertMode(isAdvancedPath(pathname));
    }
  }, [pathname]);

  const navItems = useMemo(() => expertMode ? EXPERT_NAV : SIMPLE_NAV, [expertMode]);
  const activeLabel = pageLabel(pathname, navItems);

  const toggleExpertMode = () => {
    setExpertMode((current) => {
      const next = !current;
      try {
        window.localStorage.setItem(NAV_MODE_STORAGE_KEY, next ? "expert" : "simple");
      } catch {
        // localStorage can be unavailable in private or test environments.
      }
      return next;
    });
  };

  return (
    <div className="desktop-os-shell" data-mode={expertMode ? "expert" : "simple"}>
      <aside className="os-dock" aria-label={expertMode ? "Expert navigation" : "Simple navigation"}>
        <Link className="os-dock-brand" href="/" aria-label="AI Company OS home">
          <span>AI</span>
        </Link>
        <nav className="os-dock-nav">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`os-dock-item${isActive(item, pathname) ? " active" : ""}`}
              aria-label={item.label}
              title={item.label}
            >
              {item.icon}
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
      </aside>

      <div className="desktop-viewport">
        <header className="desktop-appbar">
          <div className="window-controls" aria-hidden="true">
            <i className="close" />
            <i className="minimize" />
            <i className="zoom" />
          </div>
          <div className="desktop-title">
            <span>AI Company OS</span>
            <strong>{activeLabel}</strong>
          </div>
          <div className="desktop-appbar-actions">
            <div className="desktop-search" aria-label="Command palette preview">
              <Search size={14} />
              <span>Command</span>
            </div>
            <div className="desktop-status">
              <Sparkles size={13} />
              Agence AI active
            </div>
            <ThemeToggle />
            <button className="desktop-mode-toggle" type="button" onClick={toggleExpertMode}>
              {expertMode ? "Mode simple" : "Mode expert"}
            </button>
          </div>
        </header>

        <div className="desktop-main-surface">
          {children}
        </div>
      </div>
    </div>
  );
}
