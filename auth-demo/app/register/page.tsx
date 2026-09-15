import Link from 'next/link';
import { signUpAction } from '@/app/actions';
import { AuthForm } from '@/components/AuthForm';
import { turnstileSiteKey } from '@/lib/turnstile';

export default function RegisterPage() {
  const siteKey = turnstileSiteKey();
  return (
    <section className="auth-page">
      <div className="auth-shell">
        <Link className="auth-brand" href="/">QRCodeFace</Link>
        <header className="auth-heading">
          <h1>Create account</h1>
          <p>Save your favorite QR faces across devices.</p>
        </header>
        <AuthForm kind="register" action={signUpAction} turnstileSiteKey={siteKey} />
        <p className="auth-switch">Already have an account? <Link href="/login">Log in</Link></p>
        <p className="auth-legal">Creating an account means you agree to our <Link href="/terms">Terms of Service</Link> and <Link href="/privacy">Privacy Policy</Link>.</p>
      </div>
    </section>
  );
}
