import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import type {
  AccountRole,
  AccountState,
  AdminAccountAction,
  AdminUserSummary,
  AuthEvaluationAdapter,
  Favorite,
  SessionPrincipal,
} from '../domain';
import { providerReadiness } from '../provider-config';
import { verifyTurnstile } from '../turnstile';
import { createUnconfiguredAdapter } from './unconfigured';
import { failure, requireActiveSession, requireMfaAdmin } from './shared';

function publicAppUrl(): string {
  if (process.env.APP_URL) return process.env.APP_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return 'http://localhost:3000';
}

type Profile = { user_id: string; role: AccountRole; state: AccountState };

async function userClient() {
  const store = await cookies();
  return createServerClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (items) => {
        for (const item of items) {
          try {
            store.set(item.name, item.value, {
              ...item.options,
              httpOnly: true,
              sameSite: 'lax',
              secure: process.env.NODE_ENV === 'production',
            });
          } catch { /* Server Components cannot write cookies. */ }
        }
      },
    },
  });
}

function adminClient() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function sessionPrincipal(): Promise<SessionPrincipal | null> {
  const client = await userClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user?.email) return null;
  const { data: profile } = await client.from('profiles').select('user_id, role, state').eq('user_id', user.id).single<Profile>();
  const { data: aal } = await client.auth.mfa.getAuthenticatorAssuranceLevel();
  return {
    userId: user.id,
    email: user.email,
    role: profile?.role ?? 'user',
    state: profile?.state ?? 'active',
    mfaVerified: aal?.currentLevel === 'aal2',
  };
}

export function createSupabaseAdapter(): AuthEvaluationAdapter {
  const readiness = providerReadiness();
  if (!readiness.configured) return createUnconfiguredAdapter(readiness);

  return {
    readiness: () => readiness,
    getSession: sessionPrincipal,
    async signUp(input) {
      if (!(await verifyTurnstile(input.turnstileToken, 'signup'))) return { ok: false, message: 'Bot verification failed.' };
      try {
        const client = await userClient();
        const { error } = await client.auth.signUp({
          email: input.email,
          password: input.password,
          options: { emailRedirectTo: new URL('/account', publicAppUrl()).toString() },
        });
        if (error) throw error;
        return { ok: true, message: 'Account created. Check the mailbox if email confirmation is enabled.' };
      } catch (error) { return failure(error, 'Sign-up failed.'); }
    },
    async signIn(input) {
      try {
        const client = await userClient();
        const { error } = await client.auth.signInWithPassword(input);
        if (error) throw error;
        return { ok: true, message: 'Signed in.' };
      } catch (error) { return failure(error, 'Sign-in failed.'); }
    },
    async signOut() {
      try {
        const client = await userClient();
        const { error } = await client.auth.signOut({ scope: 'global' });
        if (error) throw error;
        return { ok: true, message: 'Signed out from all sessions.' };
      } catch (error) { return failure(error, 'Sign-out failed.'); }
    },
    async requestPasswordReset(input) {
      if (!(await verifyTurnstile(input.turnstileToken, 'password_reset'))) return { ok: false, message: 'Bot verification failed.' };
      try {
        const client = await userClient();
        const { error } = await client.auth.resetPasswordForEmail(input.email, {
          redirectTo: new URL('/account', publicAppUrl()).toString(),
        });
        if (error) throw error;
        return { ok: true, message: 'Reset requested.' };
      } catch (error) { return failure(error, 'Reset request failed.'); }
    },
    async listFavorites() {
      const session = await sessionPrincipal();
      const denied = requireActiveSession(session);
      if (denied) return denied;
      try {
        const client = await userClient();
        const { data, error } = await client.from('favorites').select('user_id, qrcode_id, created_at').order('created_at', { ascending: false });
        if (error) throw error;
        return { ok: true, message: 'Favorites loaded.', data: (data ?? []).map((row): Favorite => ({ userId: row.user_id, qrcodeId: row.qrcode_id, createdAt: row.created_at })) };
      } catch (error) { return failure(error, 'Favorites failed.'); }
    },
    async setFavorite(qrcodeId, desired) {
      const session = await sessionPrincipal();
      const denied = requireActiveSession(session);
      if (denied || !session) return denied ?? { ok: false, message: 'Authentication required.' };
      try {
        const client = await userClient();
        const operation = desired
          ? client.from('favorites').upsert({ user_id: session.userId, qrcode_id: qrcodeId }, { onConflict: 'user_id,qrcode_id' })
          : client.from('favorites').delete().eq('user_id', session.userId).eq('qrcode_id', qrcodeId);
        const { error } = await operation;
        if (error) throw error;
        return { ok: true, message: desired ? 'Favorite added.' : 'Favorite removed.' };
      } catch (error) { return failure(error, 'Favorite mutation failed.'); }
    },
    async listUsers(search) {
      const session = await sessionPrincipal();
      const denied = requireMfaAdmin(session);
      if (denied) return denied;
      try {
        const admin = adminClient();
        const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 100 });
        if (error) throw error;
        const ids = data.users.map((user) => user.id);
        const { data: profiles, error: profileError } = await admin.from('profiles').select('user_id, role, state').in('user_id', ids);
        if (profileError) throw profileError;
        const byId = new Map((profiles ?? []).map((profile) => [profile.user_id, profile as Profile]));
        const needle = search.trim().toLowerCase();
        const users: AdminUserSummary[] = data.users
          .filter((user) => !needle || user.email?.toLowerCase().includes(needle))
          .map((user) => ({ userId: user.id, email: user.email ?? '', role: byId.get(user.id)?.role ?? 'user', state: byId.get(user.id)?.state ?? 'active', createdAt: user.created_at, lastSignInAt: user.last_sign_in_at ?? null }));
        return { ok: true, message: 'Users loaded.', data: users };
      } catch (error) { return failure(error, 'Admin listing failed.'); }
    },
    async mutateUser(userId: string, action: AdminAccountAction) {
      const session = await sessionPrincipal();
      const denied = requireMfaAdmin(session);
      if (denied) return denied;
      try {
        const { data, error } = await adminClient().rpc('admin_mutate_user', { target_user_id: userId, requested_action: action });
        if (error) throw error;
        return { ok: true, message: String(data ?? 'User updated.') };
      } catch (error) { return failure(error, 'Admin mutation failed.'); }
    },
    async beginTotpEnrollment() {
      const session = await sessionPrincipal();
      const denied = requireActiveSession(session);
      if (denied) return denied;
      try {
        const client = await userClient();
        const { data, error } = await client.auth.mfa.enroll({ factorType: 'totp' });
        if (error) throw error;
        return { ok: true, message: 'Scan the TOTP URI, then verify a code.', data: { factorId: data.id, secret: data.totp.secret, uri: data.totp.uri } };
      } catch (error) { return failure(error, 'TOTP enrollment failed.'); }
    },
    async verifyTotp(factorId, code) {
      try {
        const client = await userClient();
        const challenge = await client.auth.mfa.challenge({ factorId });
        if (challenge.error) throw challenge.error;
        const verification = await client.auth.mfa.verify({ factorId, challengeId: challenge.data.id, code });
        if (verification.error) throw verification.error;
        return { ok: true, message: 'TOTP verified; this session is now AAL2.' };
      } catch (error) { return failure(error, 'TOTP verification failed.'); }
    },
  };
}
