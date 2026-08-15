'use client';

import Script from 'next/script';
import Link from 'next/link';
import { useActionState, useMemo, useState, type FormEvent } from 'react';
import type { ActionResult } from '@/lib/domain';

interface AuthFormProps {
  kind: 'login' | 'register' | 'reset';
  action: (previous: ActionResult | null, formData: FormData) => Promise<ActionResult>;
  turnstileSiteKey?: string;
}

export function AuthForm({ kind, action, turnstileSiteKey }: AuthFormProps) {
  const [state, formAction, pending] = useActionState(action, null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [credentialsChanged, setCredentialsChanged] = useState(false);
  const needsPassword = kind !== 'reset';
  const needsTurnstile = kind !== 'login';
  const isRegister = kind === 'register';
  const requirements = useMemo(() => [
    { label: '12 characters', met: password.length >= 12 },
    { label: 'Letter', met: /[A-Za-z]/.test(password) },
    { label: 'Number', met: /\d/.test(password) },
    { label: 'Symbol', met: /[^A-Za-z0-9]/.test(password) },
  ], [password]);
  const visibleState = credentialsChanged ? null : state;
  const loginCredentialError = kind === 'login' && visibleState?.ok === false;

  function validateForm(event: FormEvent<HTMLFormElement>) {
    const errors: Record<string, string> = {};
    const normalizedEmail = email.trim();
    if (!normalizedEmail) errors.email = 'Email is required.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) errors.email = 'Enter a valid email address.';

    if (needsPassword && !password) errors.password = 'Password is required.';
    if (isRegister && password) {
      if (password.length < 12) errors.password = 'Use at least 12 characters.';
      else if (!/[A-Za-z]/.test(password)) errors.password = 'Add at least one letter.';
      else if (!/\d/.test(password)) errors.password = 'Add at least one number.';
      else if (!/[^A-Za-z0-9]/.test(password)) errors.password = 'Add at least one symbol.';
      if (!passwordConfirmation) errors.passwordConfirmation = 'Repeat your password.';
      else if (password !== passwordConfirmation) errors.passwordConfirmation = 'Passwords do not match.';
    }

    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      event.preventDefault();
      return;
    }
    setCredentialsChanged(false);
  }

  return (
    <form className="auth-form" action={formAction} onSubmit={validateForm} noValidate>
      <div className="auth-field">
        <label className="auth-label" htmlFor={`${kind}-email`}>Email</label>
        <input
          id={`${kind}-email`}
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          maxLength={255}
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
            setCredentialsChanged(true);
            setFieldErrors((current) => ({ ...current, email: '' }));
          }}
          aria-invalid={Boolean(fieldErrors.email) || loginCredentialError}
          required
        />
        {fieldErrors.email && <p className="auth-field-error" role="alert"><span aria-hidden="true">*</span> {fieldErrors.email}</p>}
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
              minLength={isRegister ? 12 : undefined}
              maxLength={128}
              autoComplete={kind === 'login' ? 'current-password' : 'new-password'}
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                setCredentialsChanged(true);
                setFieldErrors((current) => ({ ...current, password: '' }));
              }}
              aria-invalid={Boolean(fieldErrors.password) || loginCredentialError}
              required
            />
            <button className="password-toggle" type="button" onClick={() => setShowPassword((visible) => !visible)}>
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </span>
          {fieldErrors.password && <p className="auth-field-error" role="alert"><span aria-hidden="true">*</span> {fieldErrors.password}</p>}
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
              <input
                id="register-password-confirmation"
                name="passwordConfirmation"
                type={showConfirmation ? 'text' : 'password'}
                maxLength={128}
                autoComplete="new-password"
                value={passwordConfirmation}
                onChange={(event) => {
                  setPasswordConfirmation(event.target.value);
                  setCredentialsChanged(true);
                  setFieldErrors((current) => ({ ...current, passwordConfirmation: '' }));
                }}
                aria-invalid={Boolean(fieldErrors.passwordConfirmation)}
                required
              />
              <button className="password-toggle" type="button" onClick={() => setShowConfirmation((visible) => !visible)}>
                {showConfirmation ? 'Hide' : 'Show'}
              </button>
            </span>
            {fieldErrors.passwordConfirmation && <p className="auth-field-error" role="alert"><span aria-hidden="true">*</span> {fieldErrors.passwordConfirmation}</p>}
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
      {needsTurnstile && !turnstileSiteKey && <p className="auth-feedback error" role="alert"><span aria-hidden="true">*</span> Turnstile is not configured for this deployment.</p>}
      {visibleState && <p className={`auth-feedback ${visibleState.ok ? 'success' : 'error'}`} role={visibleState.ok ? 'status' : 'alert'}>{!visibleState.ok && <span aria-hidden="true">*</span>} {visibleState.message}</p>}
      <button className="auth-submit" type="submit" disabled={pending || (needsTurnstile && !turnstileSiteKey)}>{pending ? 'Working…' : kind === 'login' ? 'Log in' : kind === 'register' ? 'Create account' : 'Request reset'}</button>
    </form>
  );
}
