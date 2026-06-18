import { ReactNode } from "react";
import ModernLayout from "@/components/ModernLayout";

export default function CompaniesLayout({ children }: { children: ReactNode }) {
  return <ModernLayout>{children}</ModernLayout>;
}
