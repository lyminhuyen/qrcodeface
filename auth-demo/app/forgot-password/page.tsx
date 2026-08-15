import { passwordResetAction } from '@/app/actions';
import { AuthForm } from '@/components/AuthForm';

const TEST_SITE_KEY = '1x00000000000000000000AA';

export default function ForgotPasswordPage() {
  const siteKey = process.env.TURNSTILE_SITE_KEY || (process.env.NODE_ENV === 'development' ? TEST_SITE_KEY : undefined);
  return <><section className="hero"><div className="eyebrow">Recovery</div><h1>Reset password</h1><p>The response stays generic to prevent email enumeration.</p></section><AuthForm kind="reset" action={passwordResetAction} turnstileSiteKey={siteKey} /></>;
}
