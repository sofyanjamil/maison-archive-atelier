/**
 * Helper to forward API requests from Vercel to the 24/7 Railway backend service
 * when RAILWAY_API_URL or NEXT_PUBLIC_RAILWAY_API_URL is configured.
 * Falls back cleanly to local execution if Railway is not set or unreachable.
 */
export function getRailwayBaseUrl(): string | null {
  const raw =
    process.env.RAILWAY_API_URL ||
    process.env.NEXT_PUBLIC_RAILWAY_API_URL ||
    "https://maison-archive-grokbot-production.up.railway.app";
  if (!raw || !raw.trim()) return null;
  return raw.trim().replace(/\/+$/, "");
}

export async function proxyToRailwayIfConfigured(
  pathAndQuery: string,
  init?: RequestInit
): Promise<any | null> {
  const baseUrl = getRailwayBaseUrl();
  if (!baseUrl) return null;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000);
    const res = await fetch(`${baseUrl}${pathAndQuery}`, {
      ...init,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers || {}),
      },
      cache: "no-store",
    });
    clearTimeout(timeout);
    if (res.ok) {
      return await res.json();
    }
    return null;
  } catch {
    return null;
  }
}
