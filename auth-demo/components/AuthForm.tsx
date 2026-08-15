'use client';

import Script from 'next/script';
import { useActionState } from 'react';
import type { ActionResult } from '@/lib/domain';

interface AuthFormProps {
  kind: 'login' | 'register' | 'reset';
  action: (previous: ActionResult | null, formData: FormData) => Promise<ActionResult>;
  turnstileSiteKey?: string;
}

export function AuthForm({ kind, action, turnstileSiteKey }: AuthFormProps) {
  const [state, formAction, pending] = useActionState(action, null);
  const needsPassword = kind !== 'reset';
  const needsTurnstile = kind !== 'login';
  return (
    <form className="form card" action={formAction}>
      <label>Email<input name="email" type="email" autoComplete="email" required /></label>
      {needsPassword && (
        <label>Password<input name="password" type="password" minLength={12} maxLength={128} autoComplete={kind === 'login' ? 'current-password' : 'new-password'} required /></label>
      )}
      {needsTurnstile && turnstileSiteKey && (
        <>
          <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" strategy="afterInteractive" />
          <div
            className="cf-turnstile"
            data-sitekey={turnstileSiteKey}
            data-theme="dark"
            data-action={kind === 'register' ? 'signup' : 'password_reset'}
            data-response-field-name="turnstileToken"
          />
        </>
      )}
      <button type="submit" disabled={pending || (needsTurnstile && !turnstileSiteKey)}>{pending ? 'Working…' : kind === 'login' ? 'Sign in' : kind === 'register' ? 'Create account' : 'Request reset'}</button>
      {needsTurnstile && !turnstileSiteKey && <p className="danger">Turnstile is not configured for this deployment.</p>}
      {state && <div className={`message ${state.ok ? '' : 'danger'}`}>{state.message}</div>}
    </form>
  );
}
