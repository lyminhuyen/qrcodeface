'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getAdapter } from '@/lib/adapter';
import type { ActionResult, TotpEnrollment } from '@/lib/domain';
import { isAdminAccountAction, validatePassword } from '@/lib/domain';

export async function signInAction(_previous: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const adapter = await getAdapter();
  const result = await adapter.signIn({
    email: String(formData.get('email') ?? ''),
    password: String(formData.get('password') ?? ''),
  });
  if (result.ok) redirect('/account');
  return result;
}

export async function signUpAction(_previous: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const password = String(formData.get('password') ?? '');
  const invalidPassword = validatePassword(password);
  if (invalidPassword) return { ok: false, message: invalidPassword };
  const adapter = await getAdapter();
  return adapter.signUp({
    email: String(formData.get('email') ?? ''),
    password,
    turnstileToken: String(formData.get('turnstileToken') ?? ''),
  });
}

export async function passwordResetAction(_previous: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const adapter = await getAdapter();
  await adapter.requestPasswordReset({
    email: String(formData.get('email') ?? ''),
    turnstileToken: String(formData.get('turnstileToken') ?? ''),
  });
  return { ok: true, message: 'If the account exists, a password reset message has been requested.' };
}

export async function signOutAction(): Promise<void> {
  const adapter = await getAdapter();
  await adapter.signOut();
  redirect('/');
}

export async function toggleFavoriteAction(formData: FormData): Promise<void> {
  const adapter = await getAdapter();
  await adapter.setFavorite(String(formData.get('qrcodeId') ?? ''), formData.get('desired') === 'true');
  redirect('/account/favorites');
}

export async function mutateUserAction(formData: FormData): Promise<void> {
  const action = String(formData.get('action') ?? '');
  if (!isAdminAccountAction(action)) return;
  const adapter = await getAdapter();
  await adapter.mutateUser(
    String(formData.get('userId') ?? ''),
    action,
  );
  revalidatePath('/account/admin/users');
}

export async function beginTotpAction(
  _previous: ActionResult<TotpEnrollment> | null,
): Promise<ActionResult<TotpEnrollment>> {
  void _previous;
  return (await getAdapter()).beginTotpEnrollment();
}

export async function verifyTotpAction(
  _previous: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  void _previous;
  return (await getAdapter()).verifyTotp(
    String(formData.get('factorId') ?? ''),
    String(formData.get('code') ?? ''),
  );
}
