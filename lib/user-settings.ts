export interface UserSettings {
  webhookUrl?: string;
  instantlyCampaignId?: string;
  autoImportPipeline?: boolean;
  hubspotTimelineNotes?: boolean;
}

const STORAGE_PREFIX = "legacy-leadgen-settings-";

export const DEFAULT_USER_SETTINGS: UserSettings = {
  autoImportPipeline: true,
  hubspotTimelineNotes: true,
};

export function loadUserSettings(userId: string): UserSettings {
  if (typeof window === "undefined") return { ...DEFAULT_USER_SETTINGS };
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + userId);
    if (!raw) return { ...DEFAULT_USER_SETTINGS };
    return { ...DEFAULT_USER_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_USER_SETTINGS };
  }
}

export function saveUserSettings(userId: string, settings: UserSettings): void {
  localStorage.setItem(STORAGE_PREFIX + userId, JSON.stringify(settings));
}

export interface ServerUserSettings extends UserSettings {
  nightlyAgent?: boolean;
}
