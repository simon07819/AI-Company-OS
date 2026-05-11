"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Crown, Menu, ShieldCheck, Sparkles, X } from "lucide-react";
import NavSidebar, { getActiveNavItem } from "@/components/NavSidebar";

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

  const active = getActiveNavItem(pathname);
  const breadcrumbs = useMemo(() => buildBreadcrumbs(pathname), [pathname]);
  const expertMode = pathname.startsWith("/ceo/expert") || pathname.startsWith("/runtime") || pathname.startsWith("/logs");

  return (
    <div className="app-shell">
      <div className={`mobile-sidebar-panel${mobileOpen ? " open" : ""}`}>
        <NavSidebar onNavigate={() => setMobileOpen(false)} />
      </div>
      {mobileOpen && <button className="mobile-sidebar-backdrop" aria-label="Close navigation" onClick={() => setMobileOpen(false)} />}

      <div className="desktop-sidebar">
        <NavSidebar />
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
            <Link className="top-header-link" href="/ceo"><Crown size={14} /> Parler au CEO</Link>
            <Link className="top-header-link subtle" href="/ceo/expert">Mode expert</Link>
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
