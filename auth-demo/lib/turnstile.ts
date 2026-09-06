const TEST_SITE_KEY = '1x00000000000000000000AA';
const TEST_SECRET = '1x0000000000000000000000000000000AA';

interface TurnstileResponse {
  success: boolean;
  hostname?: string;
  action?: string;
}

export function isTurnstileTestMode(environment: NodeJS.ProcessEnv = process.env): boolean {
  if (environment.NODE_ENV === 'development') return true;
  return environment.VERCEL_ENV === 'preview' && environment.TURNSTILE_TEST_MODE === 'true';
}

export function turnstileSiteKey(): string | undefined {
  if (isTurnstileTestMode()) return TEST_SITE_KEY;
  return process.env.TURNSTILE_SITE_KEY;
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
  const testMode = isTurnstileTestMode();
  if (!testMode && !process.env.TURNSTILE_SECRET_KEY) return false;
  const secret = testMode ? TEST_SECRET : process.env.TURNSTILE_SECRET_KEY!;
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
    if (!testMode && result.action !== expectedAction) return false;
    if (!testMode) {
      const hosts = allowedHostnames();
      if (!result.hostname || !hosts.has(result.hostname.toLowerCase())) return false;
    }
    return true;
  } catch {
    return false;
  }
}
