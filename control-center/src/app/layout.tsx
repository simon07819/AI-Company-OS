import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Company OS — Control Center",
  description: "Control center for AI Company OS factory",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <nav className="nav">
          <span className="nav-brand">AI Company OS</span>
          <a href="/">Dashboard</a>
          <a href="/projects">Projects</a>
          <a href="/agents">Agents</a>
        </nav>
        {children}
      </body>
    </html>
  );
}
