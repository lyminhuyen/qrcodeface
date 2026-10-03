import type { ActionResult, SessionPrincipal } from '../domain';

export function failure(error: unknown, fallback: string): ActionResult<never> {
  const message = error instanceof Error ? error.message : fallback;
  return { ok: false, message };
}

export function requireActiveSession(session: SessionPrincipal | null): ActionResult<never> | null {
  if (!session) return { ok: false, message: 'Authentication required.' };
  if (session.state !== 'active') return { ok: false, message: `Account is ${session.state}.` };
  return null;
}

export function requireMfaAdmin(session: SessionPrincipal | null): ActionResult<never> | null {
  const activeFailure = requireActiveSession(session);
  if (activeFailure) return activeFailure;
  if (session?.role !== 'admin') return { ok: false, message: 'Admin role required.' };
  if (!session.mfaVerified) return { ok: false, message: 'A verified MFA session is required.' };
  return null;
}
