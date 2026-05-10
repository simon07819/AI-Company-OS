import type { Metadata } from "next";
import "./globals.css";
import NavSidebar from "@/components/NavSidebar";

export const metadata: Metadata = {
  title: "AI Company OS — Control Center",
  description: "Control center for AI Company OS factory",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="app-shell">
          <NavSidebar />
          <div className="main-content">{children}</div>
        </div>
      </body>
    </html>
  );
}
