"use client";

import Link from "next/link";
import { isActiveNavItem, navigationForMode } from "@/lib/navigation";
import type { ViewMode } from "@/lib/viewMode";

export default function CommandDock({ mode, pathname }: { mode: ViewMode; pathname: string }) {
  const navItems = navigationForMode(mode);

  return (
    <aside className="command-dock os-dock" aria-label={mode === "expert" ? "Expert navigation" : "Simple navigation"}>
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
