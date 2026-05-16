"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Activity,
  Archive,
  Folder,
  Image,
  MessageCircle,
  Settings,
  Terminal,
} from "lucide-react";

const NAV_MAIN = [
  { href: "/ceo",      label: "Chat CEO",  icon: MessageCircle, exact: true },
  { href: "/projects", label: "Projets",   icon: Folder },
  { href: "/outputs",  label: "Livrables", icon: Image },
  { href: "/archive",  label: "Archives",  icon: Archive },
] as const;

function isActive(href: string, pathname: string, exact = false) {
  return exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

export default function CommandDock({ mobileOpen = false, onNavigate }: { mobileOpen?: boolean; onNavigate?: () => void }) {
  const pathname = usePathname();
  const [activeAgents, setActiveAgents] = useState(0);

  useEffect(() => {
    fetch("/api/agents")
      .then((r) => r.json())
      .then((d: { agents?: Array<{ status: string }> }) => {
        const running = (d.agents ?? []).filter((a) => a.status === "running" || a.status === "busy").length;
        setActiveAgents(running);
      })
      .catch(() => {});
  }, [pathname]);

  return (
    <aside
      className={`platform-sidebar${mobileOpen ? " mobile-open" : ""}`}
      aria-label="Navigation principale"
    >
      {/* Brand */}
      <Link className="platform-sidebar-brand" href="/" onClick={onNavigate}>
        <span className="platform-sidebar-logo">AI</span>
        <span>
          <strong>AI Agency OS</strong>
          <small>Agence IA Pro</small>
        </span>
      </Link>

      {/* Main nav */}
      <nav className="platform-sidebar-nav" aria-label="Navigation">
        {NAV_MAIN.map(({ href, label, icon: Icon, ...rest }) => {
          const exact = "exact" in rest ? (rest as { exact?: boolean }).exact : false;
          const active = isActive(href, pathname, exact);
          return (
            <Link
              key={href}
              href={href}
              className={`platform-sidebar-link os-dock-item${active ? " active" : ""}`}
              aria-label={label}
              onClick={onNavigate}
            >
              <Icon size={15} />
              <span>{label}</span>
            </Link>
          );
        })}

        {/* System separator */}
        <div className="sidebar-separator" />
        <div className="sidebar-section-label">Système</div>

        <Link
          href="/logs"
          className={`platform-sidebar-link os-dock-item${isActive("/logs", pathname) ? " active" : ""}`}
          onClick={onNavigate}
        >
          <Terminal size={15} />
          <span>Logs</span>
          <span className="sidebar-nav-badge sidebar-nav-badge-live">Live</span>
        </Link>

        <Link
          href="/runtime"
          className={`platform-sidebar-link os-dock-item${isActive("/runtime", pathname) ? " active" : ""}`}
          onClick={onNavigate}
        >
          <Activity size={15} />
          <span>Runtime</span>
          {activeAgents > 0 && (
            <span className="sidebar-nav-badge sidebar-nav-badge-count">{activeAgents}</span>
          )}
        </Link>

        <div className="sidebar-separator" />

        <Link
          href="/settings"
          className={`platform-sidebar-link os-dock-item${isActive("/settings", pathname) ? " active" : ""}`}
          onClick={onNavigate}
        >
          <Settings size={15} />
          <span>Paramètres</span>
        </Link>
      </nav>
    </aside>
  );
}
