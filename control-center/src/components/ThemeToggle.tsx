"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

type Theme = "light" | "dark";

function getInitialTheme(): Theme {
  if (typeof window === "undefined") return "light";
  try {
    const storage = window.localStorage;
    const stored = typeof storage?.getItem === "function" ? storage.getItem("ai-company-os-theme") : null;
    if (stored === "light" || stored === "dark") return stored;
    return typeof window.matchMedia === "function" && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  } catch {
    return "light";
  }
}

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  try {
    if (typeof window.localStorage?.setItem === "function") {
      window.localStorage.setItem("ai-company-os-theme", theme);
    }
  } catch {
    // Theme still applies for the current session.
  }
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    const initial = getInitialTheme();
    setTheme(initial);
    applyTheme(initial);
  }, []);

  const nextTheme = theme === "dark" ? "light" : "dark";

  return (
    <button
      type="button"
      className="theme-toggle"
      aria-label={theme === "dark" ? "Activer le mode clair" : "Activer le mode sombre"}
      aria-pressed={theme === "dark"}
      onClick={() => {
        setTheme(nextTheme);
        applyTheme(nextTheme);
      }}
    >
      {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
      <span>{theme === "dark" ? "Mode clair" : "Mode sombre"}</span>
    </button>
  );
}
