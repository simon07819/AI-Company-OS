"use client";

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
  Database,
  DollarSign,
  Factory,
  Crown,
  Eye,
  FolderKanban,
  HeartPulse,
  Home,
  MessageSquare,
  PanelTop,
  Settings,
  Shield,
  Users,
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
    label: "Simple OS",
    items: [
      { href: "/ceo", label: "CEO", description: "Talk to the AI CEO", icon: <Crown size={16} /> },
      { href: "/companies", label: "Entreprises", description: "Companies you are building", icon: <Building2 size={16} /> },
      { href: "/projects", label: "Projets", description: "Active projects and next actions", icon: <FolderKanban size={16} /> },
      { href: "/outputs", label: "Resultats", description: "Generated results and previews", icon: <Eye size={16} /> },
      { href: "/ceo/expert", label: "Expert", description: "Advanced cockpit and admin tools", icon: <Shield size={16} /> },
    ],
  },
];

const EXPERT_NAV_SECTIONS: { label: string; items: NavItem[] }[] = [
  {
    label: "AI Company OS",
    items: [
      { href: "/", label: "Dashboard", description: "Main operating overview", icon: <Home size={16} />, exact: true },
      { href: "/ceo", label: "CEO", description: "Simple CEO conversation", icon: <Crown size={16} /> },
      { href: "/ceo/expert", label: "CEO Cockpit", description: "Specialized CEO expert view", icon: <Shield size={16} /> },
      { href: "/companies", label: "Entreprises", description: "Companies you are building", icon: <Building2 size={16} /> },
      { href: "/projects", label: "Projets", description: "Projects and missions", icon: <FolderKanban size={16} /> },
      { href: "/outputs", label: "Resultats", description: "Generated outputs", icon: <Eye size={16} /> },
      { href: "/approvals", label: "Approvals", description: "Approval inbox", icon: <CheckSquare size={16} /> },
      { href: "/mission", label: "Mission Rooms", description: "Mission rooms and delivery status", icon: <ClipboardList size={16} /> },
      { href: "/workspaces", label: "Workspaces", description: "Company workspaces", icon: <Database size={16} /> },
      { href: "/agents", label: "Agents", description: "AI agent team", icon: <Bot size={16} /> },
      { href: "/conversations", label: "Conversations", description: "Conversation center", icon: <MessageSquare size={16} /> },
    ],
  },
  {
    label: "Business",
    items: [
      { href: "/crm", label: "CRM", description: "Clients and leads", icon: <Users size={16} /> },
      { href: "/revenue", label: "Revenue", description: "Revenue and invoices", icon: <DollarSign size={16} /> },
      { href: "/distribution", label: "Distribution", description: "Distribution engine", icon: <PanelTop size={16} /> },
      { href: "/business", label: "Business Ops", description: "Business operations", icon: <Command size={16} /> },
    ],
  },
  {
    label: "System",
    items: [
      { href: "/runtime", label: "Runtime", description: "Agent runtime", icon: <Activity size={16} /> },
      { href: "/logs", label: "Logs", description: "Execution logs", icon: <ClipboardList size={16} /> },
      { href: "/system", label: "System Health", description: "System health and backups", icon: <HeartPulse size={16} /> },
      { href: "/demo", label: "Demo Center", description: "Demo and seed tools", icon: <Factory size={16} /> },
      { href: "/settings", label: "Settings", description: "System settings", icon: <Settings size={16} /> },
      { href: "/archive", label: "Archive", description: "Archived records", icon: <Archive size={16} /> },
    ],
  },
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
