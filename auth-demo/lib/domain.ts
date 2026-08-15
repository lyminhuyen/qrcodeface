export const PROVIDERS = ['supabase'] as const;
export type ProviderId = (typeof PROVIDERS)[number];

export type AccountRole = 'user' | 'admin';
export type AccountState = 'active' | 'suspended' | 'pending_deletion';

export interface SessionPrincipal {
  userId: string;
  email: string;
  role: AccountRole;
  state: AccountState;
  mfaVerified: boolean;
}

export interface Favorite {
  userId: string;
  qrcodeId: string;
  createdAt: string;
}

export interface AdminUserSummary {
  userId: string;
  email: string;
  role: AccountRole;
  state: AccountState;
  createdAt: string;
  lastSignInAt: string | null;
}

export const ADMIN_ACCOUNT_ACTIONS = ['promote', 'demote', 'suspend', 'restore', 'request_deletion', 'cancel_deletion'] as const;
export type AdminAccountAction = (typeof ADMIN_ACCOUNT_ACTIONS)[number];

export function isAdminAccountAction(value: string): value is AdminAccountAction {
  return ADMIN_ACCOUNT_ACTIONS.includes(value as AdminAccountAction);
}

export interface TotpEnrollment {
  factorId: string;
  secret: string;
  uri: string;
}

export interface ProviderReadiness {
  provider: ProviderId;
  label: string;
  configured: boolean;
  missingEnvironment: string[];
  notes: string[];
}

export interface ActionResult<T = undefined> {
  ok: boolean;
  message: string;
  data?: T;
}

export interface AuthEvaluationAdapter {
  readiness(): ProviderReadiness;
  getSession(): Promise<SessionPrincipal | null>;
  signUp(input: { email: string; password: string; turnstileToken: string }): Promise<ActionResult>;
  signIn(input: { email: string; password: string }): Promise<ActionResult>;
  signOut(): Promise<ActionResult>;
  requestPasswordReset(input: { email: string; turnstileToken: string }): Promise<ActionResult>;
  listFavorites(): Promise<ActionResult<Favorite[]>>;
  setFavorite(qrcodeId: string, desired: boolean): Promise<ActionResult>;
  listUsers(search: string): Promise<ActionResult<AdminUserSummary[]>>;
  mutateUser(userId: string, action: AdminAccountAction): Promise<ActionResult>;
  beginTotpEnrollment(): Promise<ActionResult<TotpEnrollment>>;
  verifyTotp(factorId: string, code: string): Promise<ActionResult>;
}

export function isSafeReturnTo(value: string | null): boolean {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return false;
  try {
    const url = new URL(value, 'http://local.test');
    return url.origin === 'http://local.test';
  } catch {
    return false;
  }
}

export function validatePassword(password: string): string | null {
  if (password.length < 12) return 'Password must contain at least 12 characters.';
  if (password.length > 128) return 'Password must contain at most 128 characters.';
  return null;
}
