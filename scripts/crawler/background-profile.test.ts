import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveCrawlProfile } from '../crawl-background';

test('auto profile becomes monthly on the first day in Vietnam', () => {
  assert.equal(resolveCrawlProfile('auto', new Date('2026-07-31T17:30:00Z')), 'monthly');
  assert.equal(resolveCrawlProfile(undefined, new Date('2026-07-31T16:30:00Z')), 'daily');
});

test('explicit supported profile wins and invalid profile fails early', () => {
  assert.equal(resolveCrawlProfile('monthly'), 'monthly');
  assert.throws(() => resolveCrawlProfile('bootstrap'), /Unsupported CRAWL_PROFILE/);
  assert.throws(() => resolveCrawlProfile('weekly'), /Unsupported CRAWL_PROFILE/);
});
