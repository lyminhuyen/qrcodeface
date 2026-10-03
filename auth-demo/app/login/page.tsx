import Link from 'next/link';
import { signInAction } from '@/app/actions';
import { AuthForm } from '@/components/AuthForm';

export default function LoginPage() {
  return (
    <section className="auth-page">
      <div className="auth-shell">
        <Link className="auth-brand" href="/">QRCodeFace</Link>
        <header className="auth-heading">
          <h1>Welcome back</h1>
          <p>Log in to access your saved QR faces.</p>
        </header>
        <AuthForm kind="login" action={signInAction} />
        <p className="auth-switch">New here? <Link href="/register">Create an account</Link></p>
        <p className="auth-legal">By continuing, you agree to our <Link href="/terms">Terms of Service</Link> and <Link href="/privacy">Privacy Policy</Link>.</p>
      </div>
    </section>
  );
}
