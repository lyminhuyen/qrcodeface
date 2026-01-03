import puppeteer from 'puppeteer';
import * as fs from 'fs';
import * as path from 'path';

// Config
const USER_ID = 'abe6cbb14ebd4cba9ff2aa0c7af97734';
const TARGET_URL = `https://ds.163.com/user/${USER_ID}/`;
const MAX_SCROLL_COUNT = 20; // Số lần scroll để load thêm posts
const SCROLL_DELAY = 2000; // ms

// Paths
const DATA_DIR = path.join(__dirname, '../src/data');
const QRCODES_FILE = path.join(DATA_DIR, 'qrcodes.json');
const CHARACTERS_FILE = path.join(DATA_DIR, 'characters.json');
const LOG_FILE = path.join(__dirname, '../logs/crawler.log');

// Types
interface QRCodeImage {
  imgName: string;
  imgLocalName: string;
  url: string;
  imgBtn: string;
}

interface MediaItem {
  name: string;
  url: string;
  mimeType: string;
  width: number;
  height: number;
}

interface Feed {
  id: string;
  uid: string;
  createTime: number;
  content: string;
  topicInfoList?: { topicName: string }[];
  attributeInfoList?: {
    type: string;
    externalData?: {
      importQrCodeData?: {
        imgList?: QRCodeImage[];
      };
    };
  }[];
}

interface ParsedQRCode {
  id: string;
  createTime: number;
  createDate: string;
  characterId: string;
  characterName: string;
  images: string[];
  qrCodes: QRCodeImage[];
  text: string;
}

interface Character {
  id: string;
  name: string;
  nameCN: string;
  topicTag: string | null;
}

// Logger
function log(message: string) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}\n`;
  console.log(message);
  fs.appendFileSync(LOG_FILE, logMessage);
}

// Load characters mapping
function loadCharacters(): Character[] {
  const data = fs.readFileSync(CHARACTERS_FILE, 'utf-8');
  return JSON.parse(data).characters;
}

// Extract character from topic tags
function extractCharacter(
  topics: { topicName: string }[] | undefined,
  characters: Character[]
): { id: string; name: string } {
  if (!topics) return { id: 'untagged', name: 'Chưa phân loại' };

  for (const topic of topics) {
    const char = characters.find(
      (c) => c.topicTag && topic.topicName.includes(c.topicTag.replace('捏脸', ''))
    );
    if (char) {
      return { id: char.id, name: char.name };
    }
  }

  return { id: 'untagged', name: 'Chưa phân loại' };
}

// Extract images from content
function extractImages(content: string): string[] {
  try {
    const parsed = JSON.parse(content);
    return parsed.body?.media?.map((m: MediaItem) => m.url) || [];
  } catch {
    return [];
  }
}

// Extract text from content
function extractText(content: string): string {
  try {
    const parsed = JSON.parse(content);
    return parsed.body?.text || '';
  } catch {
    return '';
  }
}

// Extract QR codes from attributes
function extractQRCodes(
  attrs: Feed['attributeInfoList']
): QRCodeImage[] {
  if (!attrs) return [];

  const qrAttr = attrs.find((a) => a.type === 'QR_CODE');
  return qrAttr?.externalData?.importQrCodeData?.imgList || [];
}

// Format timestamp to date string
function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toISOString().split('T')[0]; // YYYY-MM-DD
}

// Main crawler function
async function crawl() {
  log('=== Starting crawler ===');
  log(`Target URL: ${TARGET_URL}`);

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  const feedsData: Feed[] = [];

  // Intercept API responses
  page.on('response', async (response) => {
    const url = response.url();
    if (
      (url.includes('/feed/') || url.includes('/v1/web/')) &&
      response.status() === 200
    ) {
      try {
        const json = await response.json();
        if (json.result?.feeds) {
          log(`Captured ${json.result.feeds.length} feeds from API`);
          feedsData.push(...json.result.feeds);
        }
      } catch {
        // Ignore non-JSON responses
      }
    }
  });

  log('Opening page...');
  await page.goto(TARGET_URL, { waitUntil: 'networkidle0', timeout: 60000 });
  log('Page loaded');

  // Scroll to load more posts
  log(`Scrolling to load more posts (max ${MAX_SCROLL_COUNT} times)...`);
  for (let i = 0; i < MAX_SCROLL_COUNT; i++) {
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await new Promise((resolve) => setTimeout(resolve, SCROLL_DELAY));
    log(`Scroll ${i + 1}/${MAX_SCROLL_COUNT} - Total feeds: ${feedsData.length}`);
  }

  await browser.close();
  log('Browser closed');

  // Load characters for mapping
  const characters = loadCharacters();
  log(`Loaded ${characters.length} characters`);

  // Parse feeds
  log('Parsing feeds...');
  const parsedQRCodes: ParsedQRCode[] = feedsData.map((feed) => {
    const character = extractCharacter(feed.topicInfoList, characters);
    return {
      id: feed.id,
      createTime: feed.createTime,
      createDate: formatDate(feed.createTime),
      characterId: character.id,
      characterName: character.name,
      images: extractImages(feed.content),
      qrCodes: extractQRCodes(feed.attributeInfoList),
      text: extractText(feed.content),
    };
  });

  // Remove duplicates by id
  const uniqueQRCodes = parsedQRCodes.filter(
    (qr, index, self) => index === self.findIndex((t) => t.id === qr.id)
  );

  log(`Parsed ${uniqueQRCodes.length} unique QR codes`);

  // Stats
  const stats = {
    total: uniqueQRCodes.length,
    byCharacter: {} as Record<string, number>,
    untagged: 0,
  };

  uniqueQRCodes.forEach((qr) => {
    if (qr.characterId === 'untagged') {
      stats.untagged++;
    } else {
      stats.byCharacter[qr.characterName] =
        (stats.byCharacter[qr.characterName] || 0) + 1;
    }
  });

  log('Stats:');
  log(`  Total: ${stats.total}`);
  log(`  Untagged: ${stats.untagged}`);
  Object.entries(stats.byCharacter).forEach(([name, count]) => {
    log(`  ${name}: ${count}`);
  });

  // Save to file
  const output = {
    lastUpdated: new Date().toISOString(),
    totalCount: uniqueQRCodes.length,
    qrcodes: uniqueQRCodes,
  };

  fs.writeFileSync(QRCODES_FILE, JSON.stringify(output, null, 2));
  log(`Saved to ${QRCODES_FILE}`);

  log('=== Crawler finished ===');
}

// Run
crawl().catch((error) => {
  log(`Error: ${error.message}`);
  process.exit(1);
});
