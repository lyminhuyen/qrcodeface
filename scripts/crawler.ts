import puppeteer from 'puppeteer';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { detectCharacter, unknownCharacters } from './crawler/character-matcher';
import {
  getCommentScanPriority,
  scanAuthorCommentImages,
  shouldScanComments,
} from './crawler/comments';
import {
  backfillAuthorProfileAcrossShards,
  loadCharacters,
  loadKnownCommentAuthorIds,
  mergeQRCodesIntoShards,
} from './crawler/data-store';
import {
  extractFeedsFromApiPayload,
  extractUserInfosFromApiPayload,
} from './crawler/feed-capture';
import { createLogger } from './crawler/logger';
import { extractImages, extractQRCodes, extractText, formatDate } from './crawler/parse-feed';
import { applyProfileAvatar, extractProfileAvatar } from './crawler/profile-user';
import type { Feed, ParsedQRCode, UserInfoMap } from './crawler/types';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const USER_ID = process.env.DS163_USER_ID || '';
const TOPIC_NAME = process.env.DS163_TOPIC || '';
const FEED_ID = process.env.DS163_FEED_ID || '';
const MAX_SCROLL_COUNT = Number.parseInt(process.env.MAX_SCROLL || '100', 10);
const SCROLL_DELAY = 2000;
const COMMENT_CRAWL_ENABLED =
  process.env.CRAWL_COMMENTS === 'true' || process.env.CRAWL_COMMENTS === '1' || Boolean(FEED_ID);
const COMMENT_LOOKBACK_DAYS = Number.parseInt(process.env.COMMENT_LOOKBACK_DAYS || '45', 10);
const COMMENT_MAX_POSTS = Number.parseInt(process.env.COMMENT_MAX_POSTS || '25', 10);
const COMMENT_TIMEOUT_MS = Number.parseInt(process.env.COMMENT_TIMEOUT_MS || '8000', 10);
const COMMENT_DELAY_MS = Number.parseInt(process.env.COMMENT_DELAY_MS || '750', 10);
const CONFIGURED_COMMENT_AUTHOR_IDS = new Set(
  (process.env.COMMENT_AUTHOR_IDS || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
);
const DATA_DIR = path.join(__dirname, '../src/data');
const QRCODES_DIR = path.join(DATA_DIR, 'qrcodes');
const CHARACTERS_FILE = path.join(DATA_DIR, 'characters.json');
const log = createLogger(path.join(__dirname, '../logs/crawler.log'));

type CrawlTarget = { mode: 'topic' | 'user' | 'feed'; url: string };

function getTarget(): CrawlTarget {
  if (FEED_ID) return { mode: 'feed', url: `https://ds.163.com/feed/${FEED_ID}/` };
  if (TOPIC_NAME) {
    return {
      mode: 'topic',
      url: `https://ds.163.com/topic/${encodeURIComponent(TOPIC_NAME)}/?tab=投稿广场`,
    };
  }
  if (USER_ID) return { mode: 'user', url: `https://ds.163.com/user/${USER_ID}/` };
  throw new Error('DS163_FEED_ID, DS163_USER_ID or DS163_TOPIC is required');
}

const target = getTarget();

function parseFeed(
  feed: Feed,
  characters: Awaited<ReturnType<typeof loadCharacters>>,
  userInfos: UserInfoMap
): ParsedQRCode {
  const text = extractText(feed.content);
  const character = detectCharacter(feed.topicInfoList, text, characters);
  const user = userInfos[feed.uid]?.user;
  return {
    id: feed.id,
    userId: feed.uid,
    createTime: feed.createTime,
    createDate: formatDate(feed.createTime),
    characterId: character.id,
    characterName: character.name,
    images: extractImages(feed.content),
    qrCodes: extractQRCodes(feed.attributeInfoList),
    text,
    userName: user?.nick || '',
    userAvatar: user?.icon || '',
  };
}

async function crawl() {
  log('=== Starting crawler ===');
  log(`Mode: ${target.mode.toUpperCase()}`);
  log(`Target URL: ${target.url}`);
  if (COMMENT_CRAWL_ENABLED) {
    log(
      `Comment enrichment enabled (lookback: ${COMMENT_LOOKBACK_DAYS} days, max: ${COMMENT_MAX_POSTS})`
    );
  }

  const characters = await loadCharacters(CHARACTERS_FILE);
  const knownCommentAuthorIds = COMMENT_CRAWL_ENABLED
    ? await loadKnownCommentAuthorIds(QRCODES_DIR)
    : new Set<string>();
  for (const authorId of CONFIGURED_COMMENT_AUTHOR_IDS) knownCommentAuthorIds.add(authorId);
  if (COMMENT_CRAWL_ENABLED) {
    log(`Known comment-QR authors: ${knownCommentAuthorIds.size}`);
  }
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const feeds: Feed[] = [];
  const userInfos: UserInfoMap = {};
  const commentScanCompletedIds = new Set<string>();
  let profileAvatar = '';
  let parsed: ParsedQRCode[] = [];

  try {
    const page = await browser.newPage();
    const pendingResponses = new Set<Promise<void>>();

    page.on('response', (response) => {
      const task = (async () => {
        const url = response.url();
        if (
          !url.includes('/feed/') &&
          !url.includes('/v1/web/') &&
          !url.includes('/topic/')
        ) return;
        if (response.status() !== 200) return;

        try {
          const json: unknown = await response.json();
          const capturedFeeds = extractFeedsFromApiPayload(json);
          const capturedUsers = extractUserInfosFromApiPayload(json);
          feeds.push(...capturedFeeds);
          for (const info of capturedUsers) userInfos[info.user.uid] = info;
          if (capturedFeeds.length > 0) {
            log(`Captured ${capturedFeeds.length} feeds (total: ${feeds.length})`);
          }
        } catch {
          // Ignore non-JSON responses.
        }
      })();
      pendingResponses.add(task);
      void task.finally(() => pendingResponses.delete(task));
    });

    log('Opening page...');
    await page.goto(target.url, { waitUntil: 'networkidle2', timeout: 60000 });
    if (target.mode === 'user') {
      profileAvatar = await extractProfileAvatar(page);
      log(profileAvatar ? 'Captured profile avatar from DOM' : 'Profile avatar DOM fallback unavailable');
    }
    const scrollCount = target.mode === 'feed' ? 0 : MAX_SCROLL_COUNT;
    for (let index = 0; index < scrollCount; index++) {
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await new Promise((resolve) => setTimeout(resolve, SCROLL_DELAY));
      log(`Scroll ${index + 1}/${scrollCount} - Total feeds: ${feeds.length}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
    await Promise.allSettled([...pendingResponses]);
    if (target.mode === 'user' && applyProfileAvatar(userInfos, USER_ID, profileAvatar)) {
      log('Applied profile avatar over feed API user info');
    }

    const capturedUniqueFeeds = [...new Map(feeds.map((feed) => [feed.id, feed])).values()];
    if (target.mode === 'feed' && !capturedUniqueFeeds.some((feed) => feed.id === FEED_ID)) {
      throw new Error(`Feed detail response was not captured: ${FEED_ID}`);
    }
    const uniqueFeeds =
      target.mode === 'feed'
        ? capturedUniqueFeeds.filter((feed) => feed.id === FEED_ID)
        : capturedUniqueFeeds;

    parsed = uniqueFeeds.map((feed) => parseFeed(feed, characters, userInfos));
    const parsedById = new Map(parsed.map((qrcode) => [qrcode.id, qrcode]));

    if (COMMENT_CRAWL_ENABLED) {
      const candidates = uniqueFeeds
        .filter((feed) => {
          const qrcode = parsedById.get(feed.id);
          return Boolean(
            qrcode &&
              shouldScanComments({
                enabled: true,
                feed,
                qrcode,
                forcedFeedId: FEED_ID || undefined,
                knownAuthorIds: knownCommentAuthorIds,
                lookbackDays: COMMENT_LOOKBACK_DAYS,
              })
          );
        })
        .sort((a, b) => {
          const priorityDifference =
            getCommentScanPriority({
              feed: b,
              qrcode: parsedById.get(b.id)!,
              knownAuthorIds: knownCommentAuthorIds,
            }) -
            getCommentScanPriority({
              feed: a,
              qrcode: parsedById.get(a.id)!,
              knownAuthorIds: knownCommentAuthorIds,
            });
          return priorityDifference || b.createTime - a.createTime;
        })
        .slice(0, COMMENT_MAX_POSTS);

      log(`Selected ${candidates.length} posts for author-comment scan`);
      const detailPage = target.mode === 'feed' ? page : await browser.newPage();
      try {
        for (const [index, feed] of candidates.entries()) {
          const qrcode = parsedById.get(feed.id)!;
          try {
            if (target.mode !== 'feed') {
              await detailPage.goto(`https://ds.163.com/feed/${feed.id}/`, {
                waitUntil: 'domcontentloaded',
                timeout: 30000,
              });
            }

            const result = await scanAuthorCommentImages(detailPage, COMMENT_TIMEOUT_MS);
            if (result.status === 'complete') {
              qrcode.qrCodes.push(...result.assets);
              commentScanCompletedIds.add(feed.id);
              if (
                result.assets.length > 0 &&
                !qrcode.images.some((image) => !image.includes('.mp4'))
              ) {
                qrcode.images = result.assets.flatMap((asset) =>
                  asset.imgUrl ? [asset.imgUrl] : []
                );
              }
              log(`Comment scan ${feed.id}: ${result.assets.length} author images`);
            } else {
              log(`Comment scan ${feed.id} failed: ${result.reason}`);
            }
          } catch (error) {
            log(
              `Comment scan ${feed.id} failed: ${error instanceof Error ? error.message : String(error)}`
            );
          }

          if (index < candidates.length - 1 && COMMENT_DELAY_MS > 0) {
            await new Promise((resolve) => setTimeout(resolve, COMMENT_DELAY_MS));
          }
        }
      } finally {
        if (detailPage !== page) await detailPage.close();
      }
    }
  } finally {
    await browser.close();
    log('Browser closed');
  }

  const unique = [...new Map(parsed.map((qrcode) => [qrcode.id, qrcode])).values()];
  const imageOnly = unique.filter((qrcode) =>
    qrcode.images.some((image) => !image.includes('.mp4'))
  );
  log(`Parsed ${unique.length} unique posts; keeping ${imageOnly.length} image posts`);

  if (unknownCharacters.size > 0) {
    log('Unknown characters found (consider adding to characters.json):');
    unknownCharacters.forEach((name) => log(`  - ${name}`));
  }

  const results = await mergeQRCodesIntoShards(QRCODES_DIR, imageOnly, characters, {
    commentScanCompletedIds,
  });
  for (const result of results) {
    log(
      `Saved ${result.characterId}: +${result.added}, updated ${result.updated}, total ${result.total}`
    );
  }
  if (target.mode === 'user') {
    const profileUser = userInfos[USER_ID]?.user;
    if (profileUser) {
      const backfill = await backfillAuthorProfileAcrossShards(QRCODES_DIR, {
        userId: USER_ID,
        userName: profileUser.nick,
        userAvatar: profileUser.icon,
      });
      log(
        `Author profile backfill: ${backfill.updatedRecords} records across ${backfill.updatedShards} shards` +
          (backfill.nameFallbackUsed ? ' (legacy name fallback enabled)' : '')
      );
    }
  }
  log('=== Crawler finished ===');
}

crawl().catch((error) => {
  log(`Error: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
