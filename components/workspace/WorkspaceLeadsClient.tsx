"use client";

import dynamic from "next/dynamic";

const LeadsAgGrid = dynamic(() => import("@/components/workspace/LeadsAgGrid"), {
  ssr: false,
  loading: () => <div className="ws-loading">Loading grid…</div>,
});

export default function WorkspaceLeadsClient() {
  return <LeadsAgGrid />;
}
