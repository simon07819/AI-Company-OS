"use client";

import Link from "next/link";
import { isActiveNavItem, navigationForMode } from "@/lib/navigation";
import type { ViewMode } from "@/lib/viewMode";

export default function CommandDock({ mode, pathname }: { mode: ViewMode; pathname: string }) {
  const navItems = navigationForMode(mode);

  return (
    <aside className="platform-sidebar os-dock sidebar" aria-label="Platform navigation">
      <Link className="platform-sidebar-brand" href="/" aria-label="AI Company OS home">
        <span className="platform-sidebar-logo">AI</span>
        <span>
          <strong>AI Company OS</strong>
          <small>Control Center</small>
        </span>
      </Link>
      <Link className="platform-new-mission" href="/ceo">
        <span aria-hidden="true">+</span>
        Nouveau chat
      </Link>
      <nav className="platform-sidebar-nav">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`platform-sidebar-link os-dock-item${isActiveNavItem(item, pathname) ? " active" : ""}`}
            aria-label={item.label}
            title={item.label}
          >
            {item.icon}
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>
      <div className="platform-sidebar-footer">
        <span className="platform-status-dot" aria-hidden="true" />
        <span>CEO en ligne</span>
      </div>
    </aside>
  );
}
