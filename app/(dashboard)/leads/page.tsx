"use client";

import { Suspense } from "react";
import LeadsPageContent from "./LeadsPageContent";

export default function LeadsPage() {
  return (
    <Suspense fallback={<div className="page-scroll" style={{ padding: 24 }}>Laden…</div>}>
      <LeadsPageContent />
    </Suspense>
  );
}
