const TEST_SECRET = '1x0000000000000000000000000000000AA';

interface TurnstileResponse {
  success: boolean;
  hostname?: string;
  action?: string;
}

function allowedHostnames(): Set<string> {
  const configured = (process.env.TURNSTILE_ALLOWED_HOSTNAMES ?? '')
    .split(',')
    .map((hostname) => hostname.trim().toLowerCase())
    .filter(Boolean);
  for (const value of [process.env.APP_URL, process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}`]) {
    if (!value) continue;
    try { configured.push(new URL(value).hostname.toLowerCase()); } catch { /* Invalid values fail closed below. */ }
  }
  return new Set(configured);
}

export async function verifyTurnstile(token: string, expectedAction: string): Promise<boolean> {
  if (!token) return false;
  if (process.env.NODE_ENV === 'production' && !process.env.TURNSTILE_SECRET_KEY) return false;
  const secret = process.env.TURNSTILE_SECRET_KEY || TEST_SECRET;
  try {
    const body = new URLSearchParams({ secret, response: token });
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body,
      cache: 'no-store',
      signal: AbortSignal.timeout(5_000),
    });
    if (!response.ok) return false;
    const result = (await response.json()) as TurnstileResponse;
    if (!result.success) return false;
    if (result.action !== expectedAction) return false;
    if (process.env.NODE_ENV === 'production') {
      const hosts = allowedHostnames();
      if (!result.hostname || !hosts.has(result.hostname.toLowerCase())) return false;
    }
    return true;
  } catch {
    return false;
  }
}
