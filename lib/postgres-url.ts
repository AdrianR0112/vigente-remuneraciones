const legacySslModes = new Set(["prefer", "require", "verify-ca"]);

export function normalizePostgresUrl(value: string) {
  const url = new URL(value);
  const sslMode = url.searchParams.get("sslmode");
  if (sslMode && legacySslModes.has(sslMode)) url.searchParams.set("sslmode", "verify-full");
  return url.toString();
}
