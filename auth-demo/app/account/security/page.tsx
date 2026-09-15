import { SecurityPanel } from '@/components/SecurityPanel';

export default function SecurityPage() {
  return <><section className="hero"><div className="eyebrow">Privileged-session gate</div><h1>Admin TOTP</h1><p>This screen tests enrollment and proof of possession, not only whether an SDK method exists.</p></section><SecurityPanel /></>;
}
