'use client';

import Script from 'next/script';
import Link from 'next/link';
import { useActionState, useMemo, useState } from 'react';
import type { ActionResult } from '@/lib/domain';

interface AuthFormProps {
  kind: 'login' | 'register' | 'reset';
  action: (previous: ActionResult | null, formData: FormData) => Promise<ActionResult>;
  turnstileSiteKey?: string;
}

export function AuthForm({ kind, action, turnstileSiteKey }: AuthFormProps) {
  const [state, formAction, pending] = useActionState(action, null);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const needsPassword = kind !== 'reset';
  const needsTurnstile = kind !== 'login';
  const isRegister = kind === 'register';
  const requirements = useMemo(() => [
    { label: '12 characters', met: password.length >= 12 },
    { label: 'Letter', met: /[A-Za-z]/.test(password) },
    { label: 'Number', met: /\d/.test(password) },
    { label: 'Symbol', met: /[^A-Za-z0-9]/.test(password) },
  ], [password]);

  return (
    <form className="auth-form" action={formAction}>
      <div className="auth-field">
        <label className="auth-label" htmlFor={`${kind}-email`}>Email</label>
        <input id={`${kind}-email`} name="email" type="email" autoComplete="email" placeholder="you@example.com" maxLength={255} required />
      </div>
      {needsPassword && (
        <div className="auth-field">
          <div className="auth-label-row">
            <label className="auth-label" htmlFor={`${kind}-password`}>Password</label>
            {kind === 'login' && <Link className="forgot-link" href="/forgot-password">Forgot password?</Link>}
          </div>
          <span className="password-input">
            <input
              id={`${kind}-password`}
              name="password"
              type={showPassword ? 'text' : 'password'}
              minLength={12}
              maxLength={128}
              autoComplete={kind === 'login' ? 'current-password' : 'new-password'}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
            <button className="password-toggle" type="button" onClick={() => setShowPassword((visible) => !visible)}>
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </span>
        </div>
      )}
      {isRegister && (
        <>
          <div className="password-requirements" aria-label="Password requirements">
            {requirements.map((requirement) => (
              <span className={requirement.met ? 'met' : ''} key={requirement.label}>{requirement.label}</span>
            ))}
          </div>
          <div className="auth-field">
            <label className="auth-label" htmlFor="register-password-confirmation">Repeat password</label>
            <span className="password-input">
              <input id="register-password-confirmation" name="passwordConfirmation" type={showConfirmation ? 'text' : 'password'} minLength={12} maxLength={128} autoComplete="new-password" required />
              <button className="password-toggle" type="button" onClick={() => setShowConfirmation((visible) => !visible)}>
                {showConfirmation ? 'Hide' : 'Show'}
              </button>
            </span>
          </div>
        </>
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
      <button className="auth-submit" type="submit" disabled={pending || (needsTurnstile && !turnstileSiteKey)}>{pending ? 'Working…' : kind === 'login' ? 'Log in' : kind === 'register' ? 'Create account' : 'Request reset'}</button>
      {needsTurnstile && !turnstileSiteKey && <p className="danger">Turnstile is not configured for this deployment.</p>}
      {state && <div className={`message ${state.ok ? '' : 'danger'}`}>{state.message}</div>}
    </form>
  );
}
