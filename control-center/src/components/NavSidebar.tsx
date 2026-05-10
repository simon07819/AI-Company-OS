"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const IconDashboard = () => (
  <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
    <path d="M3 4a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm8 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V4zM3 13a1 1 0 011-1h4a1 1 0 011 1v3a1 1 0 01-1 1H4a1 1 0 01-1-1v-3zm8-1a1 1 0 011-1h4a1 1 0 011 1v3a1 1 0 01-1 1h-4a1 1 0 01-1-1v-3z"/>
  </svg>
);

const IconProjects = () => (
  <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
    <path d="M2 6a2 2 0 012-2h4l2 2h6a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z"/>
  </svg>
);

const IconAgents = () => (
  <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
    <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zm8 0a3 3 0 11-6 0 3 3 0 016 0zM9 13a5 5 0 00-5 5v1h10v-1a5 5 0 00-5-5zm5.19-1.5A6.97 6.97 0 0117 17v1h2v-1a5 5 0 00-4.81-4.99z"/>
  </svg>
);

const IconActivity = () => (
  <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M3 10a7 7 0 1114 0A7 7 0 013 10zm7-9a9 9 0 100 18A9 9 0 0010 1zm.75 4.75a.75.75 0 00-1.5 0v4.5l-1.97 1.97a.75.75 0 101.06 1.06l2.19-2.19a.75.75 0 00.22-.53v-4.8z" clipRule="evenodd"/>
  </svg>
);

const IconActions = () => (
  <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd"/>
  </svg>
);

const IconLogs = () => (
  <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd"/>
  </svg>
);

const NAV = [
  { href: "/",                label: "Dashboard",    icon: <IconDashboard />, exact: true },
  { href: "/projects",        label: "Projects",     icon: <IconProjects /> },
  { href: "/agents",          label: "Agents",       icon: <IconAgents /> },
  { href: "/agents/activity", label: "Live Activity",icon: <IconActivity /> },
  { href: "/actions",         label: "Actions",      icon: <IconActions /> },
  { href: "/logs",            label: "Logs",         icon: <IconLogs /> },
];

export default function NavSidebar() {
  const pathname = usePathname();

  return (
    <aside className="sidebar">
      {/* Brand */}
      <div className="sidebar-brand">
        <div className="sidebar-logo">A</div>
        <div>
          <div className="sidebar-brand-name">AI Company OS</div>
          <div className="sidebar-brand-sub">Control Center</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="sidebar-nav">
        {NAV.map((item) => {
          const active = item.exact
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`sidebar-link${active ? " active" : ""}`}
            >
              {item.icon}
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        <div
          style={{
            width: 7,
            height: 7,
            borderRadius: "50%",
            background: "var(--green)",
            animation: "pulse-ring 2.4s ease infinite",
            flexShrink: 0,
          }}
        />
        <div className="sidebar-footer-text">
          <div style={{ fontWeight: 600, color: "var(--text-2)", fontSize: 11 }}>System online</div>
          <div style={{ color: "var(--text-3)", fontSize: 10 }}>6 agents ready</div>
        </div>
      </div>
    </aside>
  );
}
