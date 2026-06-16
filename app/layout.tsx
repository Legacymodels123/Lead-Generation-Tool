import type { Metadata } from "next";
import "@/app/globals.css";

export const metadata: Metadata = {
  title: "Legacy Scale Models — Lead Intelligence",
  description: "Lead intelligence platform voor Legacy Scale Models",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl">
      <body>{children}</body>
    </html>
  );
}
