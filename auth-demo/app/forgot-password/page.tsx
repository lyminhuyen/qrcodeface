import Link from 'next/link';
import { passwordResetAction } from '@/app/actions';
import { AuthForm } from '@/components/AuthForm';

const TEST_SITE_KEY = '1x00000000000000000000AA';

export default function ForgotPasswordPage() {
  const siteKey = process.env.TURNSTILE_SITE_KEY || (process.env.NODE_ENV === 'development' ? TEST_SITE_KEY : undefined);
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
