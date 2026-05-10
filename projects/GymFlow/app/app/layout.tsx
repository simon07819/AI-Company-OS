import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GymFlow — Smart Gym Management",
  description:
    "Automate memberships, billing, and class scheduling for your gym.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
