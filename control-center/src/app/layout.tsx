import type { Metadata } from "next";
import "./globals.css";
import AppShell from "@/components/AppShell";
import ThemeBootScript from "@/components/ThemeBootScript";

export const metadata: Metadata = {
  title: "AI Company OS — Control Center",
  description: "Control center for AI Company OS factory",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <ThemeBootScript />
      </head>
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
