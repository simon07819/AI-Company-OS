"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Crown, Menu, ShieldCheck, Sparkles, X } from "lucide-react";
import NavSidebar, { getActiveNavItem } from "@/components/NavSidebar";
import ThemeToggle from "@/components/ThemeToggle";

const NAV_MODE_STORAGE_KEY = "ai-company-os-nav-mode";

function isAdvancedPath(pathname: string) {
  return /^\/(ceo\/expert|runtime|logs|system|settings|demo|crm|revenue|distribution|workspaces|agents|approvals|mission|conversations|business|archive)(\/|$)/.test(pathname);
}

function formatSegment(segment: string) {
  return segment
    .replace(/-/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function buildBreadcrumbs(pathname: string) {
  if (pathname === "/") return [{ href: "/", label: "Dashboard" }];

  const segments = pathname.split("/").filter(Boolean);
  return [
    { href: "/", label: "Dashboard" },
    ...segments.map((segment, index) => ({
      href: `/${segments.slice(0, index + 1).join("/")}`,
      label: segment === "operations" ? "Operations" : segment === "tasks" ? "Tasks" : formatSegment(segment),
    })),
  ];
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [expertMode, setExpertMode] = useState(false);

  const active = getActiveNavItem(pathname);
  const breadcrumbs = useMemo(() => buildBreadcrumbs(pathname), [pathname]);

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
    <div className="app-shell">
      <div className={`mobile-sidebar-panel${mobileOpen ? " open" : ""}`}>
        <NavSidebar expertMode={expertMode} onNavigate={() => setMobileOpen(false)} />
      </div>
      {mobileOpen && <button className="mobile-sidebar-backdrop" aria-label="Close navigation" onClick={() => setMobileOpen(false)} />}

      <div className="desktop-sidebar">
        <NavSidebar expertMode={expertMode} />
      </div>

      <div className="main-content">
        <header className="top-header">
          <div className="top-header-left">
            <button className="mobile-menu-button" type="button" aria-label="Open navigation" onClick={() => setMobileOpen(true)}>
              <Menu size={18} />
            </button>
            <div>
              <div className="breadcrumbs" aria-label="Breadcrumbs">
                {breadcrumbs.map((crumb, index) => (
                  <span key={crumb.href} className="breadcrumb-item">
                    {index > 0 && <ChevronRight size={12} />}
                    <Link href={crumb.href}>{crumb.label}</Link>
                  </span>
                ))}
              </div>
              <div className="top-header-title">{active?.label ?? formatSegment(pathname.split("/").filter(Boolean).at(-1) ?? "Dashboard")}</div>
            </div>
          </div>

          <div className="top-header-actions">
            <div className="global-status online">
              <Sparkles size={13} />
              Agence AI active
            </div>
            <div className="global-status">
              <ShieldCheck size={13} />
              {expertMode ? "Mode expert" : "Mode simple"}
            </div>
            <ThemeToggle />
            <Link className="top-header-link" href="/ceo"><Crown size={14} /> Parler au CEO</Link>
            <button className="top-header-link subtle" type="button" onClick={toggleExpertMode}>
              {expertMode ? "Mode simple" : "Mode expert"}
            </button>
          </div>
        </header>

        <div className="mobile-header-spacer" />
        {children}
      </div>

      {mobileOpen && (
        <button className="mobile-close-button" type="button" aria-label="Close navigation" onClick={() => setMobileOpen(false)}>
          <X size={18} />
        </button>
      )}
    </div>
  );
}
