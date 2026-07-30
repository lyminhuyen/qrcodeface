import { spawn } from 'node:child_process';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildGeneratedAuthors } from './crawler/author-index';
import { selectAuthorsForRefresh } from './crawler/author-selector';
import {
  appendGitHubStepSummary,
  formatDuration,
  markdownCell,
} from './crawler/run-metrics';
import type { QRCode, QRCodesData } from '../src/types';

type CrawlProfile = 'daily' | 'monthly';
type BackgroundMode = CrawlProfile | 'manual-feed' | 'manual-user';

interface BackgroundMetrics {
  mode?: BackgroundMode;
  status: 'success' | 'failed';
  totalDurationMs: number;
  topicDurationMs: number;
  authorDurationMs: number;
  manualDurationMs: number;
  authorsSelected: number;
  authorsAttempted: number;
  authorsSucceeded: number;
  error?: string;
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.join(__dirname, '..');
const QRCODES_DIR = path.join(ROOT_DIR, 'src/data/qrcodes');
const FEED_ID = process.env.DS163_FEED_ID?.trim() ?? '';
const USER_ID = process.env.DS163_USER_ID?.trim() ?? '';

function positiveInteger(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function vietnamDate(now = new Date()): { day: number; key: string } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).formatToParts(now);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value ?? '';
  const day = Number.parseInt(part('day'), 10);
  return { day, key: `${part('year')}-${part('month')}-${part('day')}` };
}

export function resolveCrawlProfile(
  configuredProfile: string | undefined,
  now = new Date()
): CrawlProfile {
  const normalized = configuredProfile?.trim().toLowerCase() || 'auto';
  if (normalized === 'auto') return vietnamDate(now).day === 1 ? 'monthly' : 'daily';
  if (normalized === 'daily' || normalized === 'monthly') {
    return normalized;
  }
  throw new Error(`Unsupported CRAWL_PROFILE: ${configuredProfile}`);
}

function childEnvironment(overrides: Record<string, string | undefined>): NodeJS.ProcessEnv {
  const environment = { ...process.env };
  delete environment.DS163_FEED_ID;
  delete environment.DS163_USER_ID;
  delete environment.DS163_TOPIC;
  delete environment.CRAWL_COMMENTS;
  return { ...environment, ...overrides };
}

function runScript(script: string, environment: NodeJS.ProcessEnv): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn('npx', ['--no-install', 'tsx', script], {
      cwd: ROOT_DIR,
      env: environment,
      stdio: 'inherit',
    });

    child.on('error', reject);
    child.on('close', (code, signal) => {
      if (code === 0) resolve();
      else reject(new Error(`${script} failed (${signal ? `signal ${signal}` : `exit ${code}`})`));
    });
  });
}

async function loadCanonicalQRCodes(): Promise<QRCode[]> {
  const files = (await fs.readdir(QRCODES_DIR)).filter((file) => file.endsWith('.json'));
  const shards = await Promise.all(
    files.map(async (file) =>
      JSON.parse(await fs.readFile(path.join(QRCODES_DIR, file), 'utf8')) as QRCodesData
    )
  );
  const byId = new Map<string, QRCode>();
  for (const qrcode of shards.flatMap((shard) => shard.qrcodes)) byId.set(qrcode.id, qrcode);
  return [...byId.values()];
}

async function sleep(ms: number): Promise<void> {
  if (ms <= 0) return;
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function crawlManualTarget(metrics: BackgroundMetrics): Promise<boolean> {
  if (FEED_ID && USER_ID) throw new Error('Use only one of DS163_FEED_ID or DS163_USER_ID');
  if (FEED_ID) {
    metrics.mode = 'manual-feed';
    const startedAt = Date.now();
    console.log(`[background] Manual feed recovery: ${FEED_ID}`);
    try {
      await runScript(
        'scripts/crawler.ts',
        childEnvironment({ DS163_FEED_ID: FEED_ID, CRAWL_COMMENTS: 'true' })
      );
    } finally {
      metrics.manualDurationMs = Date.now() - startedAt;
    }
    return true;
  }
  if (USER_ID) {
    metrics.mode = 'manual-user';
    const startedAt = Date.now();
    console.log(`[background] Manual author refresh: ${USER_ID}`);
    try {
      await runScript('scripts/crawler.ts', childEnvironment({ DS163_USER_ID: USER_ID }));
    } finally {
      metrics.manualDurationMs = Date.now() - startedAt;
    }
    return true;
  }
  return false;
}

async function main(metrics: BackgroundMetrics) {
  if (await crawlManualTarget(metrics)) return;

  const profile = resolveCrawlProfile(process.env.CRAWL_PROFILE);
  metrics.mode = profile;
  const { key: rotationKey } = vietnamDate();
  const commentMode = profile === 'monthly';
  console.log(`[background] Profile: ${profile}`);
  console.log(
    `[background] Topic discovery${commentMode ? ' + author-comment enrichment' : ''}`
  );
  const topicStartedAt = Date.now();
  try {
    await runScript(
      'scripts/crawl-all.ts',
      childEnvironment({
        CRAWL_COMMENTS: commentMode ? 'true' : 'false',
        COMMENT_MAX_POSTS: String(positiveInteger(process.env.COMMENT_MAX_POSTS, 5)),
        FAIL_ON_CRAWL_ERROR: 'true',
      })
    );
  } finally {
    metrics.topicDurationMs = Date.now() - topicStartedAt;
  }

  const authorStartedAt = Date.now();
  try {
    const allQRCodes = await loadCanonicalQRCodes();
    const authors = buildGeneratedAuthors(allQRCodes);
    const batchSize = positiveInteger(process.env.AUTHOR_BATCH_SIZE, 10);
    const lookbackDays = positiveInteger(process.env.AUTHOR_LOOKBACK_DAYS, 180);
    const authorScroll = String(positiveInteger(process.env.AUTHOR_MAX_SCROLL, 15));
    const authorDelay = positiveInteger(process.env.AUTHOR_CRAWL_DELAY, 5000);
    const selected = selectAuthorsForRefresh(authors, {
      batchSize,
      lookbackDays,
      rotationKey,
      prioritizeCommentAuthors: commentMode,
    });
    metrics.authorsSelected = selected.length;

    console.log(
      `[background] Author refresh: ${selected.length}/${authors.filter((author) => author.userId).length} identified authors`
    );
    for (const [index, author] of selected.entries()) {
      console.log(
        `[background] Author ${index + 1}/${selected.length}: ${author.userName || author.userId}`
      );
      metrics.authorsAttempted++;
      await runScript(
        'scripts/crawler.ts',
        childEnvironment({
          DS163_USER_ID: author.userId,
          MAX_SCROLL: authorScroll,
          CRAWL_COMMENTS: 'false',
        })
      );
      metrics.authorsSucceeded++;
      if (index < selected.length - 1) await sleep(authorDelay);
    }
  } finally {
    metrics.authorDurationMs = Date.now() - authorStartedAt;
  }
}

function buildBackgroundSummary(metrics: BackgroundMetrics): string {
  const authorAttemptRow = metrics.manualDurationMs
    ? ''
    : `| Authors attempted | ${metrics.authorsAttempted}/${metrics.authorsSelected} |`;
  const phases = metrics.manualDurationMs
    ? `| Manual target | ${formatDuration(metrics.manualDurationMs)} | 1 target |`
    : `| Topic discovery | ${formatDuration(metrics.topicDurationMs)} | See topic metrics above |\n| Author refresh | ${formatDuration(metrics.authorDurationMs)} | ${metrics.authorsSucceeded}/${metrics.authorsSelected} successful |`;

  return `
## Background crawler result

| Field | Value |
|---|---|
| Status | ${metrics.status === 'success' ? 'Success' : 'Failed'} |
| Mode | ${metrics.mode ?? 'unresolved'} |
| Total duration | ${formatDuration(metrics.totalDurationMs)} |
${authorAttemptRow}
${metrics.error ? `| Error | ${markdownCell(metrics.error)} |` : ''}

### Phase timing

| Phase | Duration | Result |
|---|---:|---|
${phases}
  `;
}

async function run() {
  const startedAt = Date.now();
  const metrics: BackgroundMetrics = {
    status: 'success',
    totalDurationMs: 0,
    topicDurationMs: 0,
    authorDurationMs: 0,
    manualDurationMs: 0,
    authorsSelected: 0,
    authorsAttempted: 0,
    authorsSucceeded: 0,
  };

  try {
    await main(metrics);
  } catch (error) {
    metrics.status = 'failed';
    metrics.error = error instanceof Error ? error.message : String(error);
    throw error;
  } finally {
    metrics.totalDurationMs = Date.now() - startedAt;
    console.log(
      `[background] Result: ${metrics.status}; mode: ${metrics.mode ?? 'unresolved'}; ` +
        `total: ${formatDuration(metrics.totalDurationMs)}; topic: ${formatDuration(metrics.topicDurationMs)}; ` +
        `author: ${formatDuration(metrics.authorDurationMs)}; authors: ${metrics.authorsSucceeded}/${metrics.authorsSelected}`
    );
    appendGitHubStepSummary(buildBackgroundSummary(metrics));
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  run().catch((error) => {
    console.error(`[background] ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  });
}
