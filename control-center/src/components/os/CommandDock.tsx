"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Activity,
  Archive,
  Folder,
  Image,
  MessageCircle,
  Settings,
  Clock,
  Terminal,
  CheckSquare,
  Link2,
  DollarSign,
} from "lucide-react";

interface ProjectEntry {
  id: string;
  name: string;
  status: string;
}

const NAV_MAIN = [
  { href: "/ceo",            label: "Chat CEO",       icon: MessageCircle, exact: true },
  { href: "/projects",       label: "Projets",        icon: Folder },
  { href: "/outputs",        label: "Livrables",      icon: Image },
  { href: "/approvals",      label: "Approbations",   icon: CheckSquare },
  { href: "/client-portals", label: "Portails client", icon: Link2 },
  { href: "/archive",        label: "Archives",       icon: Clock },
] as const;

const NAV_SYSTEM = [
  { href: "/logs",     label: "Logs",       icon: Terminal },
  { href: "/runtime",  label: "Runtime",    icon: Activity },
] as const;

function isActive(href: string, pathname: string, exact = false) {
  return exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

export default function CommandDock({ mobileOpen = false, onNavigate }: { mobileOpen?: boolean; onNavigate?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const [projects, setProjects] = useState<ProjectEntry[]>([]);
  const [activeAgents, setActiveAgents] = useState(0);
  const [pendingApprovals, setPendingApprovals] = useState(0);
  const [totalCost, setTotalCost] = useState<number | null>(null);
  const [costAlert, setCostAlert] = useState(false);

  useEffect(() => {
    // Fetch active CEO projects for sidebar
    fetch("/api/ceo-projects")
      .then((r) => r.json())
      .then((d: { ok?: boolean; projects?: Array<{ id: string; name: string; status: string }> }) => {
        if (d.ok && Array.isArray(d.projects)) {
          setProjects(
            d.projects
              .filter((p) => p.status !== "archived" && p.status !== "deleted")
              .slice(0, 6)
              .map((p) => ({ id: p.id, name: p.name, status: p.status }))
          );
        }
      })
      .catch(() => {});

    // Fetch runtime agent count
    fetch("/api/agents")
      .then((r) => r.json())
      .then((d: { agents?: Array<{ status: string }> }) => {
        const running = (d.agents ?? []).filter((a) => a.status === "running" || a.status === "busy").length;
        setActiveAgents(running);
      })
      .catch(() => {});

    // Pending approvals count
    fetch("/api/approvals")
      .then((r) => r.json())
      .then((d: { pendingCount?: number }) => {
        setPendingApprovals(d.pendingCount ?? 0);
      })
      .catch(() => {});

    // Cost summary
    fetch("/api/costs")
      .then((r) => r.json())
      .then((d: { ok: boolean; totalUsd?: number; alertProjects?: string[] }) => {
        if (d.ok) {
          setTotalCost(d.totalUsd ?? 0);
          setCostAlert((d.alertProjects?.length ?? 0) > 0);
        }
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
          const badge = href === "/approvals" && pendingApprovals > 0 ? String(pendingApprovals) : null;
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
              {badge && (
                <span className="sidebar-nav-badge sidebar-nav-badge-count">{badge}</span>
              )}
            </Link>
          );
        })}

        {/* System separator */}
        <div className="sidebar-separator" />
        <div className="sidebar-section-label">Système</div>

        {/* Logs */}
        <Link
          href="/logs"
          className={`platform-sidebar-link os-dock-item${isActive("/logs", pathname) ? " active" : ""}`}
          onClick={onNavigate}
        >
          <Terminal size={15} />
          <span>Logs</span>
          <span className="sidebar-nav-badge sidebar-nav-badge-live">Live</span>
        </Link>

        {/* Runtime */}
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

        {/* Coûts */}
        <Link
          href="/runtime"
          className={`platform-sidebar-link os-dock-item${isActive("/runtime", pathname) ? " active" : ""}`}
          onClick={onNavigate}
          style={{ opacity: 0.85 }}
        >
          <DollarSign size={15} />
          <span>Coûts API</span>
          {totalCost !== null && (
            <span
              className="sidebar-nav-badge"
              style={{
                background: costAlert ? "rgba(251,113,133,0.15)" : "rgba(100,116,139,0.15)",
                color: costAlert ? "#fb7185" : "var(--text-muted)",
                border: `1px solid ${costAlert ? "rgba(251,113,133,0.3)" : "rgba(100,116,139,0.2)"}`,
              }}
            >
              ${totalCost.toFixed(2)}
            </span>
          )}
        </Link>

        <div className="sidebar-separator" />

        {/* Settings */}
        <Link
          href="/settings"
          className={`platform-sidebar-link os-dock-item${isActive("/settings", pathname) ? " active" : ""}`}
          onClick={onNavigate}
        >
          <Settings size={15} />
          <span>Paramètres</span>
        </Link>
      </nav>

      {/* Projets actifs */}
      {projects.length > 0 && (
        <div className="sidebar-projects">
          <div className="sidebar-section-label">Projets actifs</div>
          {projects.map((p) => {
            const isRunning = p.status === "running" || p.status === "in_progress";
            const isDone = p.status === "completed" || p.status === "done";
            const dotColor = isRunning ? "#4f8ef7" : isDone ? "#22c55e" : "#64748b";
            return (
              <div
                key={p.id}
                className="sidebar-project-row"
                onClick={() => { router.push(`/ceo?project=${p.id}`); onNavigate?.(); }}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === "Enter" && router.push(`/ceo?project=${p.id}`)}
              >
                <span className="sidebar-project-dot" style={{ background: dotColor }} />
                <span className="sidebar-project-name">{p.name}</span>
              </div>
            );
          })}
        </div>
      )}
    </aside>
  );
}
