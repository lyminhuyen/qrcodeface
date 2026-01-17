import puppeteer from 'puppeteer';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// ES Module fix for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Config - Support both USER and TOPIC modes
const USER_ID = process.env.DS163_USER_ID || '';
const TOPIC_NAME = process.env.DS163_TOPIC || '';

let TARGET_URL: string;
let CRAWL_MODE: 'user' | 'topic';

if (TOPIC_NAME) {
  // Topic mode - crawl from topic page
  TARGET_URL = `https://ds.163.com/topic/${encodeURIComponent(TOPIC_NAME)}/`;
  CRAWL_MODE = 'topic';
} else if (USER_ID) {
  // User mode - crawl from user profile
  TARGET_URL = `https://ds.163.com/user/${USER_ID}/`;
  CRAWL_MODE = 'user';
} else {
  console.error('Error: DS163_USER_ID or DS163_TOPIC environment variable is required');
  console.error('Usage:');
  console.error('  DS163_USER_ID=xxx npx ts-node scripts/crawler.ts');
  console.error('  DS163_TOPIC=刘炼捏脸 npx ts-node scripts/crawler.ts');
  process.exit(1);
}

const MAX_SCROLL_COUNT = 100; // Số lần scroll để load thêm posts
const SCROLL_DELAY = 2000; // ms

// Paths
const DATA_DIR = path.join(__dirname, '../src/data');
const QRCODES_DIR = path.join(DATA_DIR, 'qrcodes');
const CHARACTERS_FILE = path.join(DATA_DIR, 'characters.json');
const LOG_FILE = path.join(__dirname, '../logs/crawler.log');

// Ensure qrcodes directory exists
if (!fs.existsSync(QRCODES_DIR)) {
  fs.mkdirSync(QRCODES_DIR, { recursive: true });
}

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

// Get character ID from topic name (e.g., "刘炼捏脸" → "liu-lian")
function getCharacterIdFromTopic(topicName: string, characters: Character[]): string {
  for (const char of characters) {
    if (char.topicTag === topicName) {
      return char.id;
    }
    // Also check without 捏脸 suffix
    const charName = topicName.replace('捏脸', '');
    if (char.nameCN === charName) {
      return char.id;
    }
  }
  return 'unknown';
}

// Extract character name from topic pattern "X捏脸"
function extractCharNameFromTopic(topicName: string): string | null {
  const match = topicName.match(/^(.+)捏脸$/);
  return match ? match[1] : null;
}

// Extended Character type with aliases
interface CharacterWithAliases extends Character {
  aliases?: string[];
}

// Fuzzy match character name with aliases
function fuzzyMatchCharacter(
  name: string,
  characters: Character[]
): Character | null {
  // Normalize name for comparison
  const normalizedName = name.toLowerCase().trim();

  for (const char of characters) {
    const charWithAliases = char as CharacterWithAliases;

    // Match by nameCN (exact)
    if (char.nameCN === name) return char;

    // Match by aliases
    if (charWithAliases.aliases) {
      for (const alias of charWithAliases.aliases) {
        if (alias === name || name.includes(alias) || alias.includes(name)) {
          return char;
        }
      }
    }

    // Match by nameCN (partial - for variations)
    if (char.nameCN && name.includes(char.nameCN)) return char;
    if (char.nameCN && char.nameCN.includes(name)) return char;

    // Match by English name (case insensitive)
    if (char.name.toLowerCase() === normalizedName) return char;

    // Match by topicTag prefix
    if (char.topicTag) {
      const tagName = char.topicTag.replace('捏脸', '');
      if (tagName === name || name.includes(tagName) || tagName.includes(name)) {
        return char;
      }
    }
  }

  return null;
}

// Track unknown characters found
const unknownCharacters = new Set<string>();

// Extract character from topic tags and text content
function extractCharacter(
  topics: { topicName: string }[] | undefined,
  text: string,
  characters: Character[]
): { id: string; name: string; detectedName?: string } {
  // 1. Check topicInfoList for "X捏脸" pattern
  if (topics) {
    for (const topic of topics) {
      const charName = extractCharNameFromTopic(topic.topicName);
      if (charName) {
        const matched = fuzzyMatchCharacter(charName, characters);
        if (matched) {
          return { id: matched.id, name: matched.name };
        } else {
          // Found a character topic but not in our list - track it
          unknownCharacters.add(charName);
          return { id: 'untagged', name: 'Chưa phân loại', detectedName: charName };
        }
      }
    }
  }

  // 2. Check text content for character names
  if (text) {
    // Look for #X捏脸# pattern in text
    const hashtagMatches = text.match(/#([^#]+捏脸)#/g);
    if (hashtagMatches) {
      for (const match of hashtagMatches) {
        const charName = match.replace(/#/g, '').replace('捏脸', '');
        const matched = fuzzyMatchCharacter(charName, characters);
        if (matched) {
          return { id: matched.id, name: matched.name };
        } else {
          unknownCharacters.add(charName);
          return { id: 'untagged', name: 'Chưa phân loại', detectedName: charName };
        }
      }
    }

    // Direct character name search in text
    for (const char of characters) {
      if (char.nameCN && text.includes(char.nameCN)) {
        return { id: char.id, name: char.name };
      }
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
  log(`Mode: ${CRAWL_MODE.toUpperCase()}`);
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
      (url.includes('/feed/') || url.includes('/v1/web/') || url.includes('/topic/')) &&
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
  await page.goto(TARGET_URL, { waitUntil: 'networkidle2', timeout: 60000 });
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
    const text = extractText(feed.content);
    const character = extractCharacter(feed.topicInfoList, text, characters);
    return {
      id: feed.id,
      createTime: feed.createTime,
      createDate: formatDate(feed.createTime),
      characterId: character.id,
      characterName: character.name,
      images: extractImages(feed.content),
      qrCodes: extractQRCodes(feed.attributeInfoList),
      text: text,
    };
  });

  // Remove duplicates by id
  const uniqueQRCodes = parsedQRCodes.filter(
    (qr, index, self) => index === self.findIndex((t) => t.id === qr.id)
  );

  // Filter out video-only posts (no images, only .mp4)
  const imageOnlyQRCodes = uniqueQRCodes.filter((qr) => {
    const hasImages = qr.images.some((img) => !img.includes('.mp4'));
    return hasImages;
  });

  log(`Parsed ${uniqueQRCodes.length} unique QR codes`);
  log(`Filtered to ${imageOnlyQRCodes.length} image-only posts (removed ${uniqueQRCodes.length - imageOnlyQRCodes.length} video-only)`);

  // Stats
  const stats = {
    total: imageOnlyQRCodes.length,
    byCharacter: {} as Record<string, number>,
    untagged: 0,
  };

  imageOnlyQRCodes.forEach((qr) => {
    if (qr.characterId === 'untagged') {
      stats.untagged++;
    } else {
      stats.byCharacter[qr.characterName] =
        (stats.byCharacter[qr.characterName] || 0) + 1;
    }
  });

  // Log unknown characters found
  if (unknownCharacters.size > 0) {
    log('Unknown characters found (consider adding to characters.json):');
    unknownCharacters.forEach((name) => log(`  - ${name}`));
  }

  log('Stats:');
  log(`  Total: ${stats.total}`);
  log(`  Untagged: ${stats.untagged}`);
  Object.entries(stats.byCharacter).forEach(([name, count]) => {
    log(`  ${name}: ${count}`);
  });

  // Determine output filename
  let outputFile: string;
  if (CRAWL_MODE === 'topic') {
    const characterId = getCharacterIdFromTopic(TOPIC_NAME, characters);
    outputFile = path.join(QRCODES_DIR, `${characterId}.json`);
  } else {
    // User mode - save to user-{id}.json
    outputFile = path.join(QRCODES_DIR, `user-${USER_ID.slice(0, 8)}.json`);
  }

  // Save to file
  const output = {
    lastUpdated: new Date().toISOString(),
    source: CRAWL_MODE === 'topic' ? TOPIC_NAME : `user:${USER_ID}`,
    totalCount: imageOnlyQRCodes.length,
    qrcodes: imageOnlyQRCodes,
  };

  fs.writeFileSync(outputFile, JSON.stringify(output, null, 2));
  log(`Saved to ${outputFile}`);

  log('=== Crawler finished ===');
}

// Run
crawl().catch((error) => {
  log(`Error: ${error.message}`);
  process.exit(1);
});
