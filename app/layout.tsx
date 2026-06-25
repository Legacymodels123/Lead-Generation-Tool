import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import "@/app/globals.css";
import { AuthProvider } from "@/lib/auth";
import { AppProvider } from "@/lib/store";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "Lead Research Workspace",
  description: "Spreadsheet-first company research and enrichment workspace",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl" className={inter.variable}>
      <body className={inter.className}>
        <AuthProvider>
          <AppProvider>{children}</AppProvider>
        </AuthProvider>
        <Analytics />
      </body>
    </html>
  );
}
