'use client';

import { useActionState } from 'react';
import { beginTotpAction, verifyTotpAction } from '@/app/actions';

export function SecurityPanel() {
  const [enrollment, enroll, enrolling] = useActionState(beginTotpAction, null);
  const [verification, verify, verifying] = useActionState(verifyTotpAction, null);
  return (
    <div className="grid">
      <form className="card form" action={enroll}>
        <h2>1. Enroll authenticator</h2>
        <p>Admin access remains blocked until this session proves a second factor.</p>
        <button disabled={enrolling}>{enrolling ? 'Creating…' : 'Create TOTP secret'}</button>
        {enrollment && <div className={`message ${enrollment.ok ? '' : 'danger'}`}>{enrollment.message}</div>}
        {enrollment?.data && <><label>Secret<input readOnly value={enrollment.data.secret} /></label><label>Authenticator URI<input readOnly value={enrollment.data.uri} /></label></>}
      </form>
      <form className="card form" action={verify}>
        <h2>2. Verify one code</h2>
        <input type="hidden" name="factorId" value={enrollment?.data?.factorId ?? ''} />
        <label>6-digit code<input name="code" inputMode="numeric" minLength={6} maxLength={8} required /></label>
        <button disabled={verifying || !enrollment?.data}>{verifying ? 'Verifying…' : 'Verify TOTP'}</button>
        {verification && <div className={`message ${verification.ok ? '' : 'danger'}`}>{verification.message}</div>}
      </form>
    </div>
  );
}
