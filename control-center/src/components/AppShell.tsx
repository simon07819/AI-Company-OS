"use client";

import type { ReactNode } from "react";
import DesktopShell from "@/components/os/DesktopShell";

export default function AppShell({ children }: { children: ReactNode }) {
  return <DesktopShell>{children}</DesktopShell>;
}
