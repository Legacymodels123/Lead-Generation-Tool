import { LEGACY_SCALE_MODELS_ICP } from "@/lib/icp/legacy-scale-models";
import type { IcpConfig } from "@/lib/icp/types";
import { DEFAULT_WORKSPACE_ID, type Workspace } from "@/lib/types";

export const WORKSPACES: Workspace[] = [
  {
    id: DEFAULT_WORKSPACE_ID,
    slug: "legacy-scale-models",
    name: "Legacy Scale Models",
    icpConfigId: "legacy-scale-models",
  },
];

const ICP_REGISTRY: Record<string, IcpConfig> = {
  "legacy-scale-models": LEGACY_SCALE_MODELS_ICP,
};

export function getWorkspace(id: string): Workspace | undefined {
  return WORKSPACES.find((w) => w.id === id);
}

export function getDefaultWorkspace(): Workspace {
  return WORKSPACES[0];
}

export function getIcpForWorkspace(workspaceId: string): IcpConfig {
  const ws = getWorkspace(workspaceId) ?? getDefaultWorkspace();
  return ICP_REGISTRY[ws.icpConfigId] ?? LEGACY_SCALE_MODELS_ICP;
}

export function listIcpConfigs(): IcpConfig[] {
  return Object.values(ICP_REGISTRY);
}
