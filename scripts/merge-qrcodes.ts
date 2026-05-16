import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// ES Module fix for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Paths
const QRCODES_DIR = path.join(__dirname, '../src/data/qrcodes');
const INDEX_FILE = path.join(QRCODES_DIR, 'index.json');

interface QRCode {
  id: string;
  createTime: number;
  createDate: string;
  characterId: string;
  characterName: string;
  images: string[];
  qrCodes: unknown[];
  text: string;
  userName?: string;
  userAvatar?: string;
}

interface SourceFile {
  lastUpdated: string;
  source: string;
  totalCount: number;
  qrcodes: QRCode[];
}

function merge() {
  console.log('=== Merging QRCode files ===');

  // Get all JSON files except index.json
  const files = fs.readdirSync(QRCODES_DIR)
    .filter(f => f.endsWith('.json') && f !== 'index.json');

  console.log(`Found ${files.length} source files`);

  const allQRCodes: QRCode[] = [];
  const sources: { file: string; count: number; lastUpdated: string }[] = [];

  for (const file of files) {
    const filePath = path.join(QRCODES_DIR, file);
    const data: SourceFile = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

    console.log(`  ${file}: ${data.totalCount} items`);

    allQRCodes.push(...data.qrcodes);
    sources.push({
      file,
      count: data.totalCount,
      lastUpdated: data.lastUpdated,
    });
  }

  // Remove duplicates by id
  const uniqueQRCodes = allQRCodes.filter(
    (qr, index, self) => index === self.findIndex((t) => t.id === qr.id)
  );

  // Sort by createTime (newest first)
  uniqueQRCodes.sort((a, b) => b.createTime - a.createTime);

  console.log(`\nTotal: ${allQRCodes.length} items`);
  console.log(`Unique: ${uniqueQRCodes.length} items`);
  console.log(`Duplicates removed: ${allQRCodes.length - uniqueQRCodes.length}`);

  // Create index file
  const index = {
    lastUpdated: new Date().toISOString(),
    totalCount: uniqueQRCodes.length,
    sources,
    qrcodes: uniqueQRCodes,
  };

  fs.writeFileSync(INDEX_FILE, JSON.stringify(index, null, 2));
  console.log(`\nSaved to ${INDEX_FILE}`);
  console.log('=== Merge complete ===');
}

merge();
