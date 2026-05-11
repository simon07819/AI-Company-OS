"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  Archive,
  BarChart3,
  Bot,
  Boxes,
  Building2,
  Cpu,
  Crown,
  Eye,
  FileText,
  FolderKanban,
  Gauge,
  GitBranch,
  Home,
  Megaphone,
  MessageSquare,
  Play,
  PlusCircle,
  Rocket,
  Settings,
  Shield,
  ShoppingBag,
  TerminalSquare,
  Users,
  Zap,
} from "lucide-react";
export type NavItem = {
  href: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  exact?: boolean;
};

const NAV_SECTIONS: { label: string; items: NavItem[] }[] = [
  {
    label: "CEO Cockpit",
    items: [
      { href: "/ceo", label: "CEO Cockpit", description: "AI CEO chat, missions, decisions", icon: <Crown size={16} /> },
      { href: "/conversations", label: "Conversations", description: "Chat folders, threads, employees", icon: <MessageSquare size={16} /> },
      { href: "/team", label: "Team", description: "AI team profiles, studio, edit", icon: <Users size={16} /> },
      { href: "/mission", label: "Recent Missions", description: "Guided Mission Rooms", icon: <Rocket size={16} /> },
    ],
  },
  {
    label: "Command",
    items: [
      { href: "/command", label: "Command Center", description: "Executive company overview", icon: <Gauge size={16} /> },
      { href: "/", label: "Dashboard", description: "Factory overview", icon: <Home size={16} />, exact: true },
      { href: "/projects", label: "Projects", description: "Products and task state", icon: <FolderKanban size={16} /> },
      { href: "/projects/new", label: "New Project", description: "Create a product", icon: <PlusCircle size={16} /> },
      { href: "/demo", label: "Demo", description: "Guided product mode", icon: <Play size={16} /> },
    ],
  },
  {
    label: "Autopilot",
    items: [
      { href: "/autopilot", label: "Autopilot", description: "AI agency sessions", icon: <Rocket size={16} /> },
      { href: "/business", label: "Business Center", description: "Mission pipeline and revenue", icon: <BarChart3 size={16} /> },
      { href: "/ecommerce", label: "E-Commerce", description: "Dropshipping products & orders", icon: <ShoppingBag size={16} /> },
      { href: "/crm", label: "Client CRM", description: "Leads and client management", icon: <Users size={16} /> },
      { href: "/revenue", label: "Revenue", description: "Proposals and invoices", icon: <FileText size={16} /> },
      { href: "/distribution", label: "Distribution", description: "Publishing and campaigns", icon: <Megaphone size={16} /> },
      { href: "/workspaces", label: "Workspaces", description: "Companies and brands", icon: <Building2 size={16} /> },
    ],
  },
  {
    label: "Operations",
    items: [
      { href: "/operations/live", label: "Live Ops", description: "Realtime operations", icon: <Activity size={16} /> },
      { href: "/outputs", label: "Output Gallery", description: "Visual outputs and previews", icon: <Eye size={16} /> },
      { href: "/factory", label: "Factory", description: "Autonomous build floor", icon: <Boxes size={16} /> },
      { href: "/tasks/graph", label: "Tasks Graph", description: "Dependency graph", icon: <GitBranch size={16} /> },
      { href: "/actions", label: "Actions", description: "Run factory commands", icon: <Zap size={16} /> },
      { href: "/archive", label: "Archive", description: "Restore and permanently remove archived records", icon: <Archive size={16} /> },
    ],
  },
  {
    label: "Intelligence",
    items: [
      { href: "/agents", label: "Agents", description: "AI team control", icon: <Bot size={16} /> },
      { href: "/runtime", label: "Runtime", description: "NVIDIA inference center", icon: <Cpu size={16} /> },
      { href: "/agents/activity", label: "Activity", description: "Agent event stream", icon: <BarChart3 size={16} /> },
      { href: "/logs", label: "Logs", description: "Execution console", icon: <TerminalSquare size={16} /> },
    ],
  },
  {
    label: "System",
    items: [
      { href: "/system", label: "System Health", description: "Health checks and backups", icon: <Shield size={16} /> },
      { href: "/settings", label: "Settings", description: "Environment and controls", icon: <Settings size={16} /> },
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
        <div className="sidebar-logo">A</div>
        <div>
          <div className="sidebar-brand-name">AI Company OS</div>
          <div className="sidebar-brand-sub">NVIDIA factory control</div>
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
        <Gauge size={15} color="var(--green)" />
        <div className="sidebar-footer-text">
          <div style={{ fontWeight: 700, color: "var(--text-2)", fontSize: 11 }}>System online</div>
          <div style={{ color: "var(--text-3)", fontSize: 10 }}>6 agents ready</div>
        </div>
      </div>
    </aside>
  );
}
