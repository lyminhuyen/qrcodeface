import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {
  appendGitHubStepSummary,
  formatDuration,
  markdownCell,
  parseCrawlerOutputMetrics,
} from './run-metrics';

test('crawler output metrics aggregate comment and post counts', () => {
  const metrics = parseCrawlerOutputMetrics(`
Selected 3 posts for author-comment scan
Comment scan feed-a: 2 author images
Comment scan feed-b failed: timeout
Comment scan feed-c: 0 author images
Parsed 12 unique posts; keeping 8 image posts
  `);

  assert.deepEqual(metrics, {
    selectedCommentPosts: 3,
    completedCommentScans: 2,
    failedCommentScans: 1,
    authorImages: 2,
    uniquePosts: 12,
    imagePosts: 8,
  });
});

test('duration and markdown values are readable in GitHub summaries', () => {
  assert.equal(formatDuration(0), '0s');
  assert.equal(formatDuration(65_000), '1m 05s');
  assert.equal(formatDuration(3_723_000), '1h 02m 03s');
  assert.equal(markdownCell('timeout | selector\nretry'), 'timeout \\| selector retry');
});

test('GitHub step summary appends markdown when the runner exposes a summary path', async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'qrcode-metrics-'));
  const summaryPath = path.join(directory, 'summary.md');
  const previousPath = process.env.GITHUB_STEP_SUMMARY;
  process.env.GITHUB_STEP_SUMMARY = summaryPath;

  try {
    assert.equal(appendGitHubStepSummary('## Runtime\n\n| Total | 1m |'), true);
    assert.equal(appendGitHubStepSummary('| Topic | 20s |', { compact: true }), true);
    assert.equal(
      await fs.readFile(summaryPath, 'utf8'),
      '## Runtime\n\n| Total | 1m |\n\n| Topic | 20s |\n'
    );
  } finally {
    if (previousPath === undefined) delete process.env.GITHUB_STEP_SUMMARY;
    else process.env.GITHUB_STEP_SUMMARY = previousPath;
    await fs.rm(directory, { recursive: true, force: true });
  }
});
