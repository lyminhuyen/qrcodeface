import Link from 'next/link';
import { passwordResetAction } from '@/app/actions';
import { AuthForm } from '@/components/AuthForm';
import { turnstileSiteKey } from '@/lib/turnstile';

export default function ForgotPasswordPage() {
  const siteKey = turnstileSiteKey();
  return (
    <section className="auth-page">
      <div className="auth-shell">
        <Link className="auth-brand" href="/">QRCodeFace</Link>
        <header className="auth-heading">
          <h1>Reset password</h1>
          <p>Enter your email and we&apos;ll send reset instructions if the account exists.</p>
        </header>
        <AuthForm kind="reset" action={passwordResetAction} turnstileSiteKey={siteKey} />
        <p className="auth-switch"><Link href="/login">Back to login</Link></p>
      </div>
    </section>
  );
}
