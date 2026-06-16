export interface OAuthProvider {
  id: string;
  name: string;
  icon: string;
  clientId: string;
  clientSecret: string;
  authorizationUrl: string;
  tokenUrl: string;
  revokeUrl?: string;
  scopes: string[];
  redirectUri: string;
}

export interface OAuthToken {
  provider: string;
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
  scope?: string;
  tokenType?: string;
}

export interface OAuthSession {
  provider: string;
  state: string;
  redirectTo?: string;
  createdAt: number;
}

export const OAUTH_PROVIDERS: Record<string, Partial<OAuthProvider>> = {
  linkedin: {
    id: "linkedin",
    name: "LinkedIn",
    icon: "🔗",
    authorizationUrl: "https://www.linkedin.com/oauth/v2/authorization",
    tokenUrl: "https://www.linkedin.com/oauth/v2/accessToken",
    revokeUrl: "https://www.linkedin.com/oauth/v2/revoke",
    scopes: ["r_liteprofile", "r_emailaddress"],
  },
  hubspot_oauth: {
    id: "hubspot_oauth",
    name: "HubSpot (OAuth)",
    icon: "🔵",
    authorizationUrl: "https://app.hubspot.com/oauth/authorize",
    tokenUrl: "https://api.hubapi.com/oauth/v1/token",
    scopes: [
      "crm.objects.companies.read",
      "crm.objects.companies.write",
      "crm.objects.contacts.read",
      "crm.objects.contacts.write",
    ],
  },
};
