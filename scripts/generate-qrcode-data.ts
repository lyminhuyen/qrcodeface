import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { countAuthors } from '../src/lib/qrcodes/author-identity';
import { buildGeneratedAuthors } from './crawler/author-index';
import type { CharactersData, QRCode, QRCodesData } from '../src/types/index';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.join(__dirname, '..');
const QRCODES_DIR = path.join(ROOT_DIR, 'src/data/qrcodes');
const GENERATED_DIR = path.join(ROOT_DIR, 'src/data/generated');
const CHARACTERS_FILE = path.join(ROOT_DIR, 'src/data/characters.json');
const NEWEST_LIMIT = 100;

function comparableGeneratedValue(value: unknown): unknown {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return value;
  const comparable = { ...(value as Record<string, unknown>) };
  delete comparable.lastUpdated;
  return comparable;
}

async function writeJson(filePath: string, value: unknown): Promise<boolean> {
  try {
    const existing = JSON.parse(await fs.readFile(filePath, 'utf8')) as unknown;
    if (
      JSON.stringify(comparableGeneratedValue(existing)) ===
      JSON.stringify(comparableGeneratedValue(value))
    ) {
      return false;
    }
  } catch {
    // Missing/invalid generated artifacts are replaced below.
  }
  const tempPath = `${filePath}.tmp`;
  await fs.writeFile(tempPath, JSON.stringify(value, null, 2));
  await fs.rename(tempPath, filePath);
  return true;
}

async function main() {
  const charactersData = JSON.parse(await fs.readFile(CHARACTERS_FILE, 'utf8')) as CharactersData;
  const shards = await Promise.all(
    charactersData.characters.map(async (character) => {
      const filePath = path.join(QRCODES_DIR, `${character.id}.json`);
      return JSON.parse(await fs.readFile(filePath, 'utf8')) as QRCodesData;
    })
  );

  const byId = new Map<string, QRCode>();
  for (const qrcode of shards.flatMap((shard) => shard.qrcodes)) {
    if (byId.has(qrcode.id)) throw new Error(`Duplicate QRCode id: ${qrcode.id}`);
    byId.set(qrcode.id, qrcode);
  }

  const allQRCodes = [...byId.values()].sort((a, b) => b.createTime - a.createTime);
  const now = new Date().toISOString();
  const characterCounts = Object.fromEntries(
    charactersData.characters.map((character) => [
      character.id,
      allQRCodes.filter((qrcode) => qrcode.characterId === character.id).length,
    ])
  );
  const authors = buildGeneratedAuthors(allQRCodes);

  await fs.mkdir(GENERATED_DIR, { recursive: true });
  const written = await Promise.all([
    writeJson(path.join(GENERATED_DIR, 'newest.json'), {
      lastUpdated: now,
      totalCount: Math.min(NEWEST_LIMIT, allQRCodes.length),
      qrcodes: allQRCodes.slice(0, NEWEST_LIMIT),
    }),
    writeJson(path.join(GENERATED_DIR, 'stats.json'), {
      lastUpdated: now,
      totalCount: allQRCodes.length,
      characterCounts,
      authorCount: countAuthors(allQRCodes),
      dayCount: new Set(allQRCodes.map((qrcode) => qrcode.createDate)).size,
    }),
    writeJson(path.join(GENERATED_DIR, 'authors.json'), {
      lastUpdated: now,
      totalCount: authors.length,
      identifiedCount: authors.filter((author) => author.userId).length,
      authors,
    }),
  ]);

  console.log(
    `Generated newest/stats/authors from ${allQRCodes.length} unique QR codes (${written.filter(Boolean).length} files updated)`
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
