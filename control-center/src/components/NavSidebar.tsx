"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  Bot,
  ClipboardList,
  Database,
  Crown,
  Eye,
  Settings,
  Shield,
  Sparkles,
} from "lucide-react";
export type NavItem = {
  href: string;
  label: string;
  description: string;
  icon: ReactNode;
  exact?: boolean;
};

const SIMPLE_NAV_SECTIONS: { label: string; items: NavItem[] }[] = [
  {
    label: "AI Company OS",
    items: [
      { href: "/ceo", label: "CEO Chat", description: "Talk to the AI CEO", icon: <Crown size={16} /> },
      { href: "/missions", label: "Missions", description: "Mission pipeline", icon: <ClipboardList size={16} /> },
      { href: "/agents", label: "Agents", description: "AI agent team", icon: <Bot size={16} /> },
      { href: "/workspaces", label: "Workspaces", description: "Company workspaces", icon: <Database size={16} /> },
      { href: "/artifacts", label: "Artifacts", description: "Generated deliverables", icon: <Eye size={16} /> },
      { href: "/skills", label: "Skills", description: "Agent skills library", icon: <Sparkles size={16} /> },
      { href: "/evals", label: "Evals", description: "Product regression suite", icon: <Activity size={16} /> },
      { href: "/settings", label: "Settings", description: "System settings", icon: <Settings size={16} /> },
    ],
  },
];

const EXPERT_NAV_SECTIONS: { label: string; items: NavItem[] }[] = [
  ...SIMPLE_NAV_SECTIONS,
];

export const NAV_ITEMS = [...SIMPLE_NAV_SECTIONS, ...EXPERT_NAV_SECTIONS].flatMap((section) => section.items);

export function getActiveNavItem(pathname: string) {
  const sorted = [...NAV_ITEMS].sort((a, b) => b.href.length - a.href.length);
  return sorted.find((item) => item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`));
}

export default function NavSidebar({ onNavigate, expertMode = false }: { onNavigate?: () => void; expertMode?: boolean }) {
  const pathname = usePathname();
  const sections = expertMode ? EXPERT_NAV_SECTIONS : SIMPLE_NAV_SECTIONS;

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
        {sections.map((section) => (
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
