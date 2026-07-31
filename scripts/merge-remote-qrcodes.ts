import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { mergeQRCodeImages } from './crawler/qr-code-merge';
import type { QRCode, QRCodesData } from '../src/types/index';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const QRCODES_DIR = path.join(__dirname, '../src/data/qrcodes');

interface QRCodeOccurrence {
  file: string;
  qrcode: QRCode;
}

function mergeDuplicateRecords(occurrences: QRCodeOccurrence[], keeper: QRCodeOccurrence): QRCode {
  return occurrences.reduce<QRCode>((merged, occurrence) => ({
    ...occurrence.qrcode,
    ...merged,
    userId: merged.userId || occurrence.qrcode.userId,
    userName: merged.userName || occurrence.qrcode.userName,
    userAvatar: merged.userAvatar || occurrence.qrcode.userAvatar,
    qrCodes: mergeQRCodeImages(occurrence.qrcode.qrCodes, merged.qrCodes, false),
  }), keeper.qrcode);
}

function deduplicateAcrossShards(files: string[]): number {
  const shards = new Map(
    files.map((file) => [
      file,
      JSON.parse(fs.readFileSync(path.join(QRCODES_DIR, file), 'utf8')) as QRCodesData,
    ])
  );
  const occurrencesById = new Map<string, QRCodeOccurrence[]>();

  for (const [file, shard] of shards) {
    for (const qrcode of shard.qrcodes) {
      const occurrences = occurrencesById.get(qrcode.id) ?? [];
      occurrences.push({ file, qrcode });
      occurrencesById.set(qrcode.id, occurrences);
    }
  }

  const keepers = new Map<string, QRCodeOccurrence>();
  for (const [id, occurrences] of occurrencesById) {
    if (occurrences.length < 2) continue;
    const keeper =
      occurrences.find(({ file, qrcode }) => file === `${qrcode.characterId}.json`) ??
      occurrences.find(({ file }) => file === 'diverse.json') ??
      occurrences[0];
    keepers.set(id, { ...keeper, qrcode: mergeDuplicateRecords(occurrences, keeper) });
  }

  if (keepers.size === 0) return 0;
  const now = new Date().toISOString();
  for (const [file, shard] of shards) {
    const qrcodes = shard.qrcodes
      .filter((qrcode) => !keepers.has(qrcode.id) || keepers.get(qrcode.id)!.file === file)
      .map((qrcode) => keepers.get(qrcode.id)?.qrcode ?? qrcode)
      .sort((a, b) => b.createTime - a.createTime);
    if (qrcodes.length === shard.qrcodes.length && JSON.stringify(qrcodes) === JSON.stringify(shard.qrcodes)) {
      continue;
    }
    fs.writeFileSync(
      path.join(QRCODES_DIR, file),
      JSON.stringify({ ...shard, lastUpdated: now, totalCount: qrcodes.length, qrcodes }, null, 2)
    );
  }
  return keepers.size;
}

async function mergeRemoteQRCodes() {
  console.log('=== Merging local and remote data ===');

  // Get list of JSON files
  const files = fs.readdirSync(QRCODES_DIR).filter(f => f.endsWith('.json') && f !== 'index.json');

  for (const file of files) {
    const filePath = path.join(QRCODES_DIR, file);

    // Read local data
    let localData: QRCodesData;
    try {
      localData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    } catch {
      console.log(`${file}: No local data, skipping`);
      continue;
    }

    // Get remote data
    let remoteData: QRCodesData | null = null;
    try {
      const remoteContent = execSync(`git show origin/main:src/data/qrcodes/${file}`, { encoding: 'utf-8' });
      remoteData = JSON.parse(remoteContent);
    } catch {
      console.log(`${file}: No remote data, keeping local only`);
      continue;
    }

    // Merge by unique ID
    const mergedMap = new Map<string, QRCode>();

    // Add remote first
    for (const qr of remoteData!.qrcodes) {
      mergedMap.set(qr.id, qr);
    }

    // Add local fields while preserving comment enrichment from either side.
    for (const qr of localData.qrcodes) {
      const remote = mergedMap.get(qr.id);
      mergedMap.set(qr.id, {
        ...remote,
        ...qr,
        userId: qr.userId || remote?.userId,
        userName: qr.userName || remote?.userName,
        userAvatar: qr.userAvatar || remote?.userAvatar,
        qrCodes: mergeQRCodeImages(remote?.qrCodes ?? [], qr.qrCodes, false),
      });
    }

    // Sort by createTime DESC
    const merged = Array.from(mergedMap.values()).sort((a, b) => b.createTime - a.createTime);

    const output: QRCodesData = {
      lastUpdated: new Date().toISOString(),
      source: localData.source ?? file.replace(/\.json$/, ''),
      totalCount: merged.length,
      qrcodes: merged,
    };

    fs.writeFileSync(filePath, JSON.stringify(output, null, 2));
    console.log(`${file}: ${remoteData!.qrcodes.length} remote + ${localData.qrcodes.length} local → ${merged.length} merged`);
  }

  const deduplicated = deduplicateAcrossShards(files);
  console.log(`Removed cross-shard duplicates for ${deduplicated} QRCode IDs`);

  console.log('=== Merge complete ===');
}

mergeRemoteQRCodes().catch(console.error);
