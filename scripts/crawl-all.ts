import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import type { Character } from './crawler/types';
import {
  appendGitHubStepSummary,
  formatDuration,
  markdownCell,
  parseCrawlerOutputMetrics,
  type CrawlerOutputMetrics,
} from './crawler/run-metrics';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Config
const DELAY_BETWEEN_CRAWLS = parseInt(process.env.CRAWL_DELAY || '30000'); // 30s default
const MAX_SCROLL = process.env.MAX_SCROLL || '100';
const COMMENT_MODE = process.env.CRAWL_COMMENTS === 'true' || process.env.CRAWL_COMMENTS === '1';
const COMMENT_MAX_POSTS = Number.parseInt(process.env.COMMENT_MAX_POSTS || '25', 10);
const FAIL_ON_CRAWL_ERROR = process.env.FAIL_ON_CRAWL_ERROR === 'true';
const CHARACTERS_FILE = path.join(__dirname, '../src/data/characters.json');
const LOG_FILE = path.join(__dirname, '../logs/crawl-all.log');

function log(message: string) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}`;
  console.log(logMessage);
  fs.appendFileSync(LOG_FILE, logMessage + '\n');
}

function loadCharacters(): Character[] {
  const data = fs.readFileSync(CHARACTERS_FILE, 'utf-8');
  return JSON.parse(data).characters;
}

interface TopicResult {
  topicTag: string;
  success: boolean;
  durationMs: number;
  metrics: CrawlerOutputMetrics;
}

function crawlTopic(topicTag: string): Promise<TopicResult> {
  return new Promise((resolve) => {
    const startedAt = Date.now();
    log(`Starting crawl for topic: ${topicTag}`);

    const child = spawn('npx', ['tsx', 'scripts/crawler.ts'], {
      env: {
        ...process.env,
        DS163_TOPIC: topicTag,
        MAX_SCROLL: MAX_SCROLL,
      },
      cwd: path.join(__dirname, '..'),
    });

    let output = '';

    child.stdout.on('data', (data) => {
      output += data.toString();
    });

    child.stderr.on('data', (data) => {
      output += data.toString();
    });

    child.on('close', (code) => {
      const durationMs = Date.now() - startedAt;
      const metrics = parseCrawlerOutputMetrics(output);
      if (code === 0) {
        log(`✓ Completed: ${topicTag} (${formatDuration(durationMs)})`);
        resolve({ topicTag, success: true, durationMs, metrics });
      } else {
        log(`✗ Failed: ${topicTag} (exit code: ${code}, ${formatDuration(durationMs)})`);
        resolve({ topicTag, success: false, durationMs, metrics });
      }
    });

    child.on('error', (err) => {
      log(`✗ Error: ${topicTag} - ${err.message}`);
      resolve({
        topicTag,
        success: false,
        durationMs: Date.now() - startedAt,
        metrics: parseCrawlerOutputMetrics(output),
      });
    });
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const startedAt = Date.now();
  log('='.repeat(60));
  log('CRAWL ALL TOPICS - START');
  log('='.repeat(60));
  log(`MAX_SCROLL: ${MAX_SCROLL}`);
  log(`DELAY_BETWEEN_CRAWLS: ${DELAY_BETWEEN_CRAWLS}ms`);
  log(`COMMENT_MODE: ${COMMENT_MODE ? 'ON' : 'OFF'}`);

  const characters = loadCharacters();
  const toProcess = characters.filter((c) => c.topicTag !== null);

  log(`Total characters to crawl: ${toProcess.length}`);
  log('');

  appendGitHubStepSummary(
    `
## Topic crawl progress

| Topic | Duration | Result | Comments |
|---|---:|---|---:|`,
    { compact: true }
  );

  const results: { char: Character; result: TopicResult }[] = [];

  for (let i = 0; i < toProcess.length; i++) {
    const char = toProcess[i];
    log(`[${i + 1}/${toProcess.length}] ${char.names.en} (${char.topicTag})`);

    const result = await crawlTopic(char.topicTag!);
    results.push({ char, result });
    appendGitHubStepSummary(
      `| ${markdownCell(char.names.en)} | ${formatDuration(result.durationMs)} | ${result.success ? 'Success' : 'Failed'} | ${result.metrics.completedCommentScans + result.metrics.failedCommentScans}/${result.metrics.selectedCommentPosts} attempted${result.metrics.failedCommentScans > 0 ? ` (${result.metrics.failedCommentScans} failed)` : ''} |`,
      { compact: true }
    );

    // Delay between crawls (except last one)
    if (i < toProcess.length - 1) {
      log(`Waiting ${DELAY_BETWEEN_CRAWLS / 1000}s before next crawl...`);
      await sleep(DELAY_BETWEEN_CRAWLS);
    }
  }

  // Summary
  log('');
  log('='.repeat(60));
  log('SUMMARY');
  log('='.repeat(60));

  const successful = results.filter(({ result }) => result.success);
  const failed = results.filter(({ result }) => !result.success);
  const durationMs = Date.now() - startedAt;
  const totals = results.reduce<CrawlerOutputMetrics>(
    (aggregate, { result }) => ({
      selectedCommentPosts:
        aggregate.selectedCommentPosts + result.metrics.selectedCommentPosts,
      completedCommentScans:
        aggregate.completedCommentScans + result.metrics.completedCommentScans,
      failedCommentScans: aggregate.failedCommentScans + result.metrics.failedCommentScans,
      authorImages: aggregate.authorImages + result.metrics.authorImages,
      uniquePosts: aggregate.uniquePosts + result.metrics.uniquePosts,
      imagePosts: aggregate.imagePosts + result.metrics.imagePosts,
    }),
    {
      selectedCommentPosts: 0,
      completedCommentScans: 0,
      failedCommentScans: 0,
      authorImages: 0,
      uniquePosts: 0,
      imagePosts: 0,
    }
  );

  log(`Total: ${results.length}`);
  log(`Success: ${successful.length}`);
  log(`Failed: ${failed.length}`);
  log(`Duration: ${formatDuration(durationMs)}`);
  log(`Parsed posts: ${totals.uniquePosts}; image posts: ${totals.imagePosts}`);
  if (COMMENT_MODE) {
    log(
      `Comment scans: selected ${totals.selectedCommentPosts}/${toProcess.length * COMMENT_MAX_POSTS}, ` +
        `completed ${totals.completedCommentScans}, failed ${totals.failedCommentScans}, ` +
        `author images ${totals.authorImages}`
    );
  }

  if (failed.length > 0) {
    log('');
    log('Failed topics (retry manually):');
    failed.forEach(({ char }) => {
      log(`  DS163_TOPIC=${char.topicTag} npm run crawl`);
    });
  }

  const slowestTopics = [...results]
    .sort((a, b) => b.result.durationMs - a.result.durationMs)
    .slice(0, 5);
  appendGitHubStepSummary('');
  appendGitHubStepSummary(`
## Topic crawl metrics

| Metric | Value |
|---|---:|
| Duration | ${formatDuration(durationMs)} |
| Topics | ${successful.length}/${results.length} successful |
| Parsed posts | ${totals.uniquePosts} |
| Image posts | ${totals.imagePosts} |
${
  COMMENT_MODE
    ? `| Comment candidates | ${totals.selectedCommentPosts}/${toProcess.length * COMMENT_MAX_POSTS} cap |\n| Comment scans | ${totals.completedCommentScans} completed / ${totals.failedCommentScans} failed |\n| Author images found | ${totals.authorImages} |`
    : '| Comment scan | Disabled |'
}

### Slowest topics

| Topic | Duration | Result |
|---|---:|---|
${slowestTopics
  .map(
    ({ char, result }) =>
      `| ${markdownCell(char.names.en)} | ${formatDuration(result.durationMs)} | ${result.success ? 'Success' : 'Failed'} |`
  )
  .join('\n')}
  `);

  log('');
  log('='.repeat(60));
  log('CRAWL ALL TOPICS - END');
  log('='.repeat(60));

  if (failed.length > 0 && FAIL_ON_CRAWL_ERROR) process.exitCode = 1;
}

main().catch((err) => {
  log(`Fatal error: ${err.message}`);
  process.exit(1);
});
