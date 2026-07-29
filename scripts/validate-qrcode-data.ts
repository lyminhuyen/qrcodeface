import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { qrCodeImageKey } from './crawler/qr-code-merge';
import { countAuthors } from '../src/lib/qrcodes/author-identity';
import { buildGeneratedAuthors } from './crawler/author-index';
import type {
  CharactersData,
  GeneratedAuthorsData,
  QRCode,
  QRCodesData,
} from '../src/types/index';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.join(__dirname, '..');
const QRCODES_DIR = path.join(ROOT_DIR, 'src/data/qrcodes');
const GENERATED_DIR = path.join(ROOT_DIR, 'src/data/generated');
const CHARACTERS_FILE = path.join(ROOT_DIR, 'src/data/characters.json');

function invariant(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function readJson<T>(filePath: string): Promise<T> {
  return JSON.parse(await fs.readFile(filePath, 'utf8')) as T;
}

async function main() {
  const charactersData = await readJson<CharactersData>(CHARACTERS_FILE);
  const expectedFiles = new Set(charactersData.characters.map((character) => `${character.id}.json`));
  const actualFiles = (await fs.readdir(QRCODES_DIR)).filter((file) => file.endsWith('.json'));

  invariant(actualFiles.length === expectedFiles.size, 'QRCode shard count does not match characters');
  for (const file of actualFiles) invariant(expectedFiles.has(file), `Unexpected QRCode shard: ${file}`);

  const byId = new Map<string, QRCode>();
  for (const character of charactersData.characters) {
    const filePath = path.join(QRCODES_DIR, `${character.id}.json`);
    const shard = await readJson<QRCodesData>(filePath);
    invariant(shard.totalCount === shard.qrcodes.length, `Invalid totalCount: ${character.id}`);

    for (const qrcode of shard.qrcodes) {
      invariant(qrcode.characterId === character.id, `Wrong shard for ${qrcode.id}: ${character.id}`);
      invariant(!byId.has(qrcode.id), `Duplicate QRCode id: ${qrcode.id}`);
      invariant(
        qrcode.userId === undefined ||
          (typeof qrcode.userId === 'string' && Boolean(qrcode.userId.trim())),
        `Invalid userId for ${qrcode.id}`
      );
      const assetKeys = new Set<string>();
      for (const image of qrcode.qrCodes) {
        invariant(
          image.source === undefined ||
            image.source === 'feed-attribute' ||
            image.source === 'author-comment',
          `Invalid QRCode source for ${qrcode.id}`
        );
        if (image.source === 'author-comment') {
          invariant(Boolean(image.imgUrl?.trim()), `Missing comment imgUrl for ${qrcode.id}`);
          invariant(Boolean(image.url?.trim()), `Missing comment url for ${qrcode.id}`);
        }
        const assetKey = qrCodeImageKey(image);
        invariant(!assetKeys.has(assetKey), `Duplicate QRCode asset for ${qrcode.id}`);
        assetKeys.add(assetKey);
      }
      byId.set(qrcode.id, qrcode);
    }
  }

  const allQRCodes = [...byId.values()].sort((a, b) => b.createTime - a.createTime);
  const newest = await readJson<QRCodesData>(path.join(GENERATED_DIR, 'newest.json'));
  invariant(newest.totalCount === newest.qrcodes.length, 'Invalid newest totalCount');
  invariant(newest.qrcodes.length === Math.min(100, allQRCodes.length), 'Invalid newest length');
  invariant(
    newest.qrcodes.every((qrcode, index) => qrcode.id === allQRCodes[index]?.id),
    'newest.json is stale'
  );

  const stats = await readJson<{
    totalCount: number;
    characterCounts: Record<string, number>;
    authorCount: number;
    dayCount: number;
  }>(path.join(GENERATED_DIR, 'stats.json'));
  invariant(stats.totalCount === allQRCodes.length, 'stats.json is stale');
  for (const character of charactersData.characters) {
    const expectedCount = allQRCodes.filter(
      (qrcode) => qrcode.characterId === character.id
    ).length;
    invariant(
      stats.characterCounts[character.id] === expectedCount,
      `Invalid stats count: ${character.id}`
    );
  }
  invariant(
    stats.authorCount === countAuthors(allQRCodes),
    'Invalid stats authorCount'
  );
  invariant(
    stats.dayCount === new Set(allQRCodes.map((qrcode) => qrcode.createDate)).size,
    'Invalid stats dayCount'
  );

  const expectedAuthors = buildGeneratedAuthors(allQRCodes);
  const authors = await readJson<GeneratedAuthorsData>(path.join(GENERATED_DIR, 'authors.json'));
  invariant(authors.totalCount === authors.authors.length, 'Invalid authors totalCount');
  invariant(
    authors.identifiedCount === authors.authors.filter((author) => author.userId).length,
    'Invalid authors identifiedCount'
  );
  invariant(
    JSON.stringify(authors.authors) === JSON.stringify(expectedAuthors),
    'authors.json is stale'
  );
  const authorKeys = new Set<string>();
  for (const author of authors.authors) {
    invariant(Boolean(author.key.trim()), 'Invalid generated author key');
    invariant(!authorKeys.has(author.key), `Duplicate generated author key: ${author.key}`);
    invariant(author.postCount > 0, `Invalid author postCount: ${author.key}`);
    invariant(author.commentQrCount >= 0, `Invalid author commentQrCount: ${author.key}`);
    invariant(
      author.commentQrCount <= author.postCount,
      `Author commentQrCount exceeds postCount: ${author.key}`
    );
    if (author.userId) {
      invariant(author.key === `uid:${author.userId}`, `Invalid uid author key: ${author.key}`);
    }
    authorKeys.add(author.key);
  }
  console.log(`Validated ${actualFiles.length} shards and ${allQRCodes.length} unique QR codes`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
