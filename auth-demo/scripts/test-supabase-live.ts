import { createHmac, randomBytes } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

function requiredEnvironment(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment: ${name}`);
  return value;
}

const url = requiredEnvironment('SUPABASE_URL');
const publishableKey = requiredEnvironment('SUPABASE_PUBLISHABLE_KEY');
const secretKey = requiredEnvironment('SUPABASE_SECRET_KEY');

const admin = createClient(url, secretKey, { auth: { autoRefreshToken: false, persistSession: false } });
const password = `Qrf!${randomBytes(18).toString('base64url')}`;
const runId = `${Date.now()}-${randomBytes(3).toString('hex')}`;
const emails = {
  user: `qrf-eval-user-${runId}@example.com`,
  admin: `qrf-eval-admin-${runId}@example.com`,
};
const createdUserIds: string[] = [];
const results: Array<{ check: string; passed: boolean; detail: string }> = [];

function record(check: string, passed: boolean, detail: string) {
  results.push({ check, passed, detail });
  process.stdout.write(`${passed ? 'PASS' : 'FAIL'} ${check}: ${detail}\n`);
}

function decodeBase32(value: string): Buffer {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = '';
  for (const character of value.toUpperCase().replace(/=+$/g, '')) {
    const index = alphabet.indexOf(character);
    if (index < 0) throw new Error('Invalid TOTP secret.');
    bits += index.toString(2).padStart(5, '0');
  }
  const bytes: number[] = [];
  for (let index = 0; index + 8 <= bits.length; index += 8) bytes.push(Number.parseInt(bits.slice(index, index + 8), 2));
  return Buffer.from(bytes);
}

function totp(secret: string, timestamp = Date.now()): string {
  const counter = Math.floor(timestamp / 30_000);
  const buffer = Buffer.alloc(8);
  buffer.writeBigUInt64BE(BigInt(counter));
  const digest = createHmac('sha1', decodeBase32(secret)).update(buffer).digest();
  const offset = digest[digest.length - 1] & 0x0f;
  const number = (digest.readUInt32BE(offset) & 0x7fffffff) % 1_000_000;
  return number.toString().padStart(6, '0');
}

async function createSyntheticUser(email: string) {
  const response = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (response.error || !response.data.user) throw response.error ?? new Error('Synthetic user was not created.');
  createdUserIds.push(response.data.user.id);
  return response.data.user;
}

async function main() {
  try {
    const user = await createSyntheticUser(emails.user);
    const adminUser = await createSyntheticUser(emails.admin);
    record('profile trigger', true, 'Both synthetic auth users were created.');

    const roleUpdate = await admin.from('profiles').update({ role: 'admin' }).eq('user_id', adminUser.id);
    if (roleUpdate.error) throw roleUpdate.error;

    const userClient = createClient(url, publishableKey, { auth: { autoRefreshToken: false, persistSession: false } });
    const adminClient = createClient(url, publishableKey, { auth: { autoRefreshToken: false, persistSession: false } });
    const [userLogin, adminLogin] = await Promise.all([
      userClient.auth.signInWithPassword({ email: emails.user, password }),
      adminClient.auth.signInWithPassword({ email: emails.admin, password }),
    ]);
    record('email/password sessions', !userLogin.error && !adminLogin.error, 'Both synthetic users obtained sessions.');
    if (userLogin.error || adminLogin.error) throw userLogin.error ?? adminLogin.error;

    const userInsert = await userClient.from('favorites').insert({ user_id: user.id, qrcode_id: 'evaluation-user-owned' });
    record('favorite owner write', !userInsert.error, userInsert.error?.message ?? 'User created own Favorite.');

    const adminReadUser = await adminClient.from('favorites').select('qrcode_id').eq('user_id', user.id);
    const visibleRows = adminReadUser.data?.length ?? 0;
    record('cross-user favorite read blocked', !adminReadUser.error && visibleRows === 0, adminReadUser.error?.message ?? `Visible rows: ${visibleRows}`);

    const impersonatedInsert = await adminClient.from('favorites').insert({ user_id: user.id, qrcode_id: 'evaluation-impersonated' });
    record('cross-user favorite write blocked', Boolean(impersonatedInsert.error), impersonatedInsert.error ? 'RLS rejected the write.' : 'Unexpected write succeeded.');

    const noMfaMutation = await adminClient.rpc('admin_mutate_user', { target_user_id: user.id, requested_action: 'suspend' });
    record('admin without MFA blocked', Boolean(noMfaMutation.error), noMfaMutation.error?.message ?? 'Unexpected admin mutation succeeded.');

    const enrollment = await adminClient.auth.mfa.enroll({ factorType: 'totp', friendlyName: `qrf-eval-${runId}` });
    if (enrollment.error) throw enrollment.error;
    const verification = await adminClient.auth.mfa.challengeAndVerify({ factorId: enrollment.data.id, code: totp(enrollment.data.totp.secret) });
    record('TOTP enrollment and verification', !verification.error, verification.error?.message ?? 'Admin session reached AAL2.');
    if (verification.error) throw verification.error;

    const mfaMutation = await adminClient.rpc('admin_mutate_user', { target_user_id: user.id, requested_action: 'suspend' });
    record('MFA admin suspension', !mfaMutation.error, mfaMutation.error?.message ?? 'Synthetic user was suspended.');

    const suspendedWrite = await userClient.from('favorites').insert({ user_id: user.id, qrcode_id: 'evaluation-after-suspend' });
    record('suspended access token blocked', Boolean(suspendedWrite.error), suspendedWrite.error ? 'RLS rejected the stale access token.' : 'Stale access token still wrote a Favorite.');

    const audit = await admin.from('audit_log').select('action').eq('target_user_id', user.id).eq('action', 'suspend');
    const auditRows = audit.data?.length ?? 0;
    record('admin audit evidence', !audit.error && auditRows === 1, audit.error?.message ?? `Audit rows: ${auditRows}`);
  } finally {
    if (createdUserIds.length) {
      await admin.from('audit_log').delete().in('actor_user_id', createdUserIds);
      await admin.from('audit_log').delete().in('target_user_id', createdUserIds);
    }
    let removedUsers = 0;
    for (const userId of createdUserIds.reverse()) {
      const deletion = await admin.auth.admin.deleteUser(userId);
      if (deletion.error) {
        process.stderr.write(`Cleanup warning: ${deletion.error.message}\n`);
      } else {
        removedUsers += 1;
      }
    }
    record('synthetic user cleanup', removedUsers === createdUserIds.length, `Removed ${removedUsers}/${createdUserIds.length} users.`);
  }

  const failures = results.filter((result) => !result.passed);
  process.stdout.write(`SUMMARY ${results.length - failures.length}/${results.length} checks passed.\n`);
  if (failures.length) process.exitCode = 1;
}

void main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Unknown live-test error.';
  process.stderr.write(`LIVE TEST ERROR: ${message}\n`);
  process.exitCode = 1;
});
