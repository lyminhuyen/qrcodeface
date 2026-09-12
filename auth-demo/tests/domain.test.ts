import assert from 'node:assert/strict';
import test from 'node:test';
import { isAdminAccountAction, isSafeReturnTo, validatePassword } from '../lib/domain';

test('return path rejects absolute and protocol-relative URLs', () => {
  assert.equal(isSafeReturnTo('/account/favorites'), true);
  assert.equal(isSafeReturnTo('//attacker.example/path'), false);
  assert.equal(isSafeReturnTo('https://attacker.example/path'), false);
});

test('password boundary is enforced', () => {
  assert.match(validatePassword('too-short') ?? '', /at least 12/);
  assert.match(validatePassword('letters-only-password') ?? '', /number/);
  assert.match(validatePassword('Password123456') ?? '', /symbol/);
  assert.equal(validatePassword('Long-enough-password1'), null);
  assert.match(validatePassword('x'.repeat(129)) ?? '', /at most 128/);
});

test('admin action must pass runtime validation', () => {
  assert.equal(isAdminAccountAction('suspend'), true);
  assert.equal(isAdminAccountAction('hard_delete'), false);
});
