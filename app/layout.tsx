import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "@/app/globals.css";
import { AuthProvider } from "@/lib/auth";
import { AppProvider } from "@/lib/store";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "Legacy Scale Models — Lead Intelligence",
  description: "Lead intelligence platform voor Legacy Scale Models",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl" className={inter.variable}>
      <body className={inter.className}>
        <AuthProvider>
          <AppProvider>{children}</AppProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
