"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  Crown,
  Eye,
  FolderKanban,
  Home,
  Shield,
} from "lucide-react";
export type NavItem = {
  href: string;
  label: string;
  description: string;
  icon: ReactNode;
  exact?: boolean;
};

const NAV_SECTIONS: { label: string; items: NavItem[] }[] = [
  {
    label: "Simple OS",
    items: [
      { href: "/", label: "Dashboard", description: "What your AI agency is doing now", icon: <Home size={16} />, exact: true },
      { href: "/ceo", label: "CEO", description: "Talk to the AI CEO", icon: <Crown size={16} /> },
      { href: "/companies", label: "Entreprises", description: "Companies you are building", icon: <Building2 size={16} /> },
      { href: "/projects", label: "Projets", description: "Active projects and next actions", icon: <FolderKanban size={16} /> },
      { href: "/outputs", label: "Resultats", description: "Generated results and previews", icon: <Eye size={16} /> },
    ],
  },
  {
    label: "Expert Admin",
    items: [
      { href: "/ceo/expert", label: "Mode expert", description: "Runtime, CRM, revenue, distribution and logs", icon: <Shield size={16} /> },
    ],
  },
];

export const NAV_ITEMS = NAV_SECTIONS.flatMap((section) => section.items);

export function getActiveNavItem(pathname: string) {
  const sorted = [...NAV_ITEMS].sort((a, b) => b.href.length - a.href.length);
  return sorted.find((item) => item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`));
}

export default function NavSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <aside className="sidebar" aria-label="Primary navigation">
      <Link href="/" className="sidebar-brand" onClick={onNavigate}>
        <div className="sidebar-logo">AI</div>
        <div>
          <div className="sidebar-brand-name">AI Company OS</div>
          <div className="sidebar-brand-sub">Company operating system</div>
        </div>
      </Link>

      <nav className="sidebar-nav">
        {NAV_SECTIONS.map((section) => (
          <div key={section.label} className="sidebar-section">
            <div className="sidebar-section-label">{section.label}</div>
            {section.items.map((item) => {
              const active = item.exact
                ? pathname === item.href
                : pathname === item.href || pathname.startsWith(`${item.href}/`);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`sidebar-link${active ? " active" : ""}`}
                  title={item.description}
                  onClick={onNavigate}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="sidebar-footer">
        <Shield size={15} color="var(--green)" />
        <div className="sidebar-footer-text">
          <div style={{ fontWeight: 700, color: "var(--text-2)", fontSize: 11 }}>Agence active</div>
          <div style={{ color: "var(--text-3)", fontSize: 10 }}>CEO AI en ligne</div>
        </div>
      </div>
    </aside>
  );
}
