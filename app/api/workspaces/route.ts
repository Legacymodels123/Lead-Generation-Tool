import { NextResponse } from "next/server";
import { listIcpConfigs, WORKSPACES } from "@/lib/workspace/context";

export async function GET() {
  return NextResponse.json({
    workspaces: WORKSPACES,
    icpConfigs: listIcpConfigs().map((icp) => ({
      id: icp.id,
      name: icp.name,
      markets: icp.markets.map((m) => m.label),
      dmuRoles: icp.dmuRoles,
    })),
  });
}
