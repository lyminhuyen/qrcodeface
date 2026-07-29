import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { mergeQRCodeImages } from './crawler/qr-code-merge';
import type { QRCode, QRCodesData } from '../src/types/index';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const QRCODES_DIR = path.join(__dirname, '../src/data/qrcodes');

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

  console.log('=== Merge complete ===');
}

mergeRemoteQRCodes().catch(console.error);
