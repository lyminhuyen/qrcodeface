import Link from 'next/link';
import { signInAction } from '@/app/actions';
import { AuthForm } from '@/components/AuthForm';

export default function LoginPage() {
  return <><section className="hero"><div className="eyebrow">Identity</div><h1>Sign in</h1><p>Server action creates and validates the provider session cookie.</p></section><AuthForm kind="login" action={signInAction} /><p><Link href="/forgot-password">Forgot password?</Link></p></>;
}
