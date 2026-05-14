"use client";

import Link from "next/link";
import { isActiveNavItem, navigationForMode } from "@/lib/navigation";
import type { ViewMode } from "@/lib/viewMode";

export default function CommandDock({
  mode,
  pathname,
  mobileOpen = false,
  onNavigate,
}: {
  mode: ViewMode;
  pathname: string;
  mobileOpen?: boolean;
  onNavigate?: () => void;
}) {
  const navItems = navigationForMode(mode);

  return (
    /* ACTIVE AI COMPANY OS SHELL */
    <aside className={`platform-sidebar os-dock sidebar${mobileOpen ? " mobile-open" : ""}`} aria-label="Platform navigation" data-collapsed="false">
      <Link className="platform-sidebar-brand" href="/" aria-label="AI Company OS home">
        <span className="platform-sidebar-logo">AI</span>
        <span>
          <strong>AI Company OS</strong>
          <small>{mode === "expert" ? "Mode expert" : "CEO workspace"}</small>
        </span>
      </Link>
      <nav className="platform-sidebar-nav">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`platform-sidebar-link os-dock-item${isActiveNavItem(item, pathname) ? " active" : ""}`}
            aria-label={item.label}
            title={item.label}
            onClick={onNavigate}
          >
            {item.icon}
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>
      <footer className="platform-sidebar-footer">
        <Link className="platform-expert-link" href="/ceo/expert" aria-label="Ouvrir le mode expert">
          Mode expert
        </Link>
      </footer>
    </aside>
  );
}
