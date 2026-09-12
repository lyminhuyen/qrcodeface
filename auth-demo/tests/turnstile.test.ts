import assert from 'node:assert/strict';
import test from 'node:test';
import { isTurnstileTestMode } from '../lib/turnstile';

test('Turnstile test mode is available in development', () => {
  assert.equal(isTurnstileTestMode({ NODE_ENV: 'development' }), true);
});

test('Turnstile test mode requires the explicit Vercel Preview gate', () => {
  assert.equal(isTurnstileTestMode({ NODE_ENV: 'production', VERCEL_ENV: 'preview', TURNSTILE_TEST_MODE: 'true' }), true);
  assert.equal(isTurnstileTestMode({ NODE_ENV: 'production', VERCEL_ENV: 'preview' }), false);
  assert.equal(isTurnstileTestMode({ NODE_ENV: 'production', VERCEL_ENV: 'production', TURNSTILE_TEST_MODE: 'true' }), false);
});
