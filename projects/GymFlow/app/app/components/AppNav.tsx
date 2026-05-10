"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_LINKS = [
  { href: "/dashboard", label: "Dashboard",  icon: "▦" },
  { href: "/members",   label: "Members",    icon: "◎" },
  { href: "/classes",   label: "Classes",    icon: "◈" },
  { href: "/settings",  label: "Settings",   icon: "⚙" },
];

export default function AppNav() {
  const pathname = usePathname();
  return (
    <aside className="w-56 shrink-0 bg-gray-900 min-h-screen flex flex-col">
      <div className="px-5 py-5 border-b border-gray-800">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-blue-400 font-black text-lg">GF</span>
          <span className="text-white font-bold text-base tracking-tight">GymFlow</span>
        </Link>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV_LINKS.map((link) => {
          const active = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? "bg-blue-600 text-white"
                  : "text-gray-400 hover:bg-gray-800 hover:text-white"
              }`}
            >
              <span className="text-xs opacity-80">{link.icon}</span>
              {link.label}
            </Link>
          );
        })}
      </nav>

      <div className="px-4 py-4 border-t border-gray-800">
        <div className="text-xs text-gray-500 mb-1">Current Plan</div>
        <div className="text-sm font-semibold text-white mb-3">Pro</div>
        <Link
          href="/pricing"
          className="block text-center text-xs px-3 py-1.5 border border-gray-700 text-gray-400 rounded-lg hover:border-blue-500 hover:text-blue-400 transition-colors"
        >
          Upgrade plan
        </Link>
      </div>
    </aside>
  );
}
