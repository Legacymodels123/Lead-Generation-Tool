function isPlaceholderKey(key: string): boolean {
  const lower = key.toLowerCase();
  return (
    lower.includes("vul") ||
    lower.includes("hier") ||
    lower.includes("voek") ||
    lower.includes("dashboard") ||
    lower.includes("your_") ||
    lower.includes("placeholder") ||
    lower.includes("changeme") ||
    lower.length < 20
  );
}

function readEnv(name: string): string | null {
  const value = process.env[name]?.trim();
  return value || null;
}

/** Server-side Supabase key: service role / secret, else anon / publishable. */
export function getSupabaseServerKey(): string | null {
  const serviceRole =
    readEnv("SUPABASE_SERVICE_ROLE_KEY") ?? readEnv("SUPABASE_SECRET_KEY");
  if (serviceRole && !isPlaceholderKey(serviceRole)) return serviceRole;
  return readEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
}

export function getSupabaseEnvStatus(): {
  url: boolean;
  anonKey: boolean;
  serverKey: boolean;
  cloud: boolean;
  missingEnv: string[];
} {
  const url = Boolean(readEnv("NEXT_PUBLIC_SUPABASE_URL"));
  const anonKey = Boolean(readEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"));
  const serverKey = Boolean(getSupabaseServerKey());
  const missingEnv: string[] = [];

  if (!url) missingEnv.push("NEXT_PUBLIC_SUPABASE_URL");
  if (!anonKey) missingEnv.push("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  if (!serverKey) missingEnv.push("SUPABASE_SERVICE_ROLE_KEY");

  return {
    url,
    anonKey,
    serverKey,
    cloud: url && serverKey,
    missingEnv,
  };
}
