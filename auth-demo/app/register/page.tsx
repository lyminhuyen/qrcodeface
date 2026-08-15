import { signUpAction } from '@/app/actions';
import { AuthForm } from '@/components/AuthForm';

const TEST_SITE_KEY = '1x00000000000000000000AA';

export default function RegisterPage() {
  const siteKey = process.env.TURNSTILE_SITE_KEY || (process.env.NODE_ENV === 'development' ? TEST_SITE_KEY : undefined);
  return <><section className="hero"><div className="eyebrow">Identity</div><h1>Create account</h1><p>Email verification may be required by Supabase.</p></section><AuthForm kind="register" action={signUpAction} turnstileSiteKey={siteKey} /></>;
}
