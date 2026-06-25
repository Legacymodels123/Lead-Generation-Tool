import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Company Enrichment Workspace",
  description: "Dynamic property enrichment workspace with Claude, Hunter, Lusha, and HubSpot sync",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
