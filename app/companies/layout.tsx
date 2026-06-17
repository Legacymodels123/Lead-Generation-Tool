import { ReactNode } from "react";
import MainLayoutClient from "@/components/MainLayoutClient";

export default function CompaniesLayout({ children }: { children: ReactNode }) {
  return <MainLayoutClient>{children}</MainLayoutClient>;
}
