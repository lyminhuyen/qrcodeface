import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Config
const DELAY_BETWEEN_CRAWLS = parseInt(process.env.CRAWL_DELAY || '30000'); // 30s default
const MAX_SCROLL = process.env.MAX_SCROLL || '100';
const CHARACTERS_FILE = path.join(__dirname, '../src/data/characters.json');
const LOG_FILE = path.join(__dirname, '../logs/crawl-all.log');

interface Character {
  id: string;
  name: string;
  nameCN: string;
  topicTag: string | null;
}

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

function crawlTopic(topicTag: string): Promise<{ success: boolean; output: string }> {
  return new Promise((resolve) => {
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
      if (code === 0) {
        log(`✓ Completed: ${topicTag}`);
        resolve({ success: true, output });
      } else {
        log(`✗ Failed: ${topicTag} (exit code: ${code})`);
        resolve({ success: false, output });
      }
    });

    child.on('error', (err) => {
      log(`✗ Error: ${topicTag} - ${err.message}`);
      resolve({ success: false, output: err.message });
    });
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  log('='.repeat(60));
  log('CRAWL ALL TOPICS - START');
  log('='.repeat(60));
  log(`MAX_SCROLL: ${MAX_SCROLL}`);
  log(`DELAY_BETWEEN_CRAWLS: ${DELAY_BETWEEN_CRAWLS}ms`);

  const characters = loadCharacters();
  const toProcess = characters.filter((c) => c.topicTag !== null);

  log(`Total characters to crawl: ${toProcess.length}`);
  log('');

  const results: { char: Character; success: boolean }[] = [];

  for (let i = 0; i < toProcess.length; i++) {
    const char = toProcess[i];
    log(`[${i + 1}/${toProcess.length}] ${char.name} (${char.topicTag})`);

    const result = await crawlTopic(char.topicTag!);
    results.push({ char, success: result.success });

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

  const successful = results.filter((r) => r.success);
  const failed = results.filter((r) => !r.success);

  log(`Total: ${results.length}`);
  log(`Success: ${successful.length}`);
  log(`Failed: ${failed.length}`);

  if (failed.length > 0) {
    log('');
    log('Failed topics (retry manually):');
    failed.forEach((r) => {
      log(`  DS163_TOPIC=${r.char.topicTag} npm run crawl`);
    });
  }

  log('');
  log('='.repeat(60));
  log('CRAWL ALL TOPICS - END');
  log('='.repeat(60));
}

main().catch((err) => {
  log(`Fatal error: ${err.message}`);
  process.exit(1);
});
