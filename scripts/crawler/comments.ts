import type { Page } from 'puppeteer';
import type { Feed, ParsedQRCode, QRCodeImage } from './types';

const DAY_MS = 24 * 60 * 60 * 1000;
const COMMENT_HINT =
  /(?:码|数据|二维码).{0,12}(?:评论区|评论里|置顶评论)|(?:评论区|评论里|置顶评论).{0,12}(?:码|数据|二维码)/;

export interface CommentScanPolicy {
  enabled: boolean;
  feed: Feed;
  qrcode: ParsedQRCode;
  forcedFeedId?: string;
  knownAuthorIds?: ReadonlySet<string>;
  lookbackDays: number;
  now?: number;
}

export type CommentScanResult =
  | { status: 'complete'; assets: QRCodeImage[] }
  | { status: 'failed'; assets: []; reason: string };

export function hasStrongCommentHint(text: string): boolean {
  return COMMENT_HINT.test(text);
}

export function shouldScanComments(policy: CommentScanPolicy): boolean {
  if (policy.forcedFeedId === policy.feed.id) return true;
  if (!policy.enabled) return false;
  if ((policy.feed.record?.commentCount ?? 0) <= 0) return false;

  const now = policy.now ?? Date.now();
  const cutoff = now - policy.lookbackDays * DAY_MS;
  if (policy.feed.createTime < cutoff) return false;

  if (policy.knownAuthorIds?.has(policy.feed.uid)) return true;
  if (policy.qrcode.qrCodes.length === 0) return true;
  return hasStrongCommentHint(policy.qrcode.text);
}

export function getCommentScanPriority(
  policy: Pick<CommentScanPolicy, 'feed' | 'qrcode' | 'knownAuthorIds'>
): number {
  if (policy.knownAuthorIds?.has(policy.feed.uid)) return 3;
  if (hasStrongCommentHint(policy.qrcode.text)) return 2;
  if (policy.qrcode.qrCodes.length === 0) return 1;
  return 0;
}

export function createAuthorCommentQRCode(imageUrl: string): QRCodeImage {
  let localName = 'author-comment-image';
  try {
    localName = new URL(imageUrl).pathname.split('/').filter(Boolean).at(-1) ?? localName;
  } catch {}

  return {
    imgName: '作者评论二维码',
    imgLocalName: localName,
    imgBtn: '作者评论二维码',
    imgUrl: imageUrl,
    url: imageUrl,
    source: 'author-comment',
  };
}

export async function scanAuthorCommentImages(
  page: Page,
  timeoutMs: number
): Promise<CommentScanResult> {
  try {
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForSelector('.c-comment-item', { timeout: timeoutMs });

    const imageUrls = await page.$$eval('.c-comment-item', (items) => {
      const urls: string[] = [];
      for (const item of items) {
        const header = item.querySelector(':scope > .c-comment-item__header');
        const body = item.querySelector(':scope > .c-comment-item__body');
        if (!header || !body || !header.textContent?.includes('作者')) continue;

        for (const image of body.querySelectorAll('.c-comment-item__image[data-url]')) {
          const url = image.getAttribute('data-url')?.trim();
          if (url && /^https?:\/\//.test(url)) urls.push(url);
        }
      }
      return [...new Set(urls)];
    });

    return {
      status: 'complete',
      assets: imageUrls.map(createAuthorCommentQRCode),
    };
  } catch (error) {
    return {
      status: 'failed',
      assets: [],
      reason: error instanceof Error ? error.message : String(error),
    };
  }
}
