import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import type { Character, QRCode, QRCodesData } from '../src/types/index';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const QRCODES_DIR = path.join(__dirname, '../src/data/qrcodes');
const CHARACTERS_FILE = path.join(__dirname, '../src/data/characters.json');

// Load characters
const characters: Character[] = JSON.parse(fs.readFileSync(CHARACTERS_FILE, 'utf-8')).characters;

// Build character name patterns (捏脸 tags)
const charPatterns = characters
  .filter(c => c.topicTag && c.id !== 'diverse')
  .map(c => ({
    id: c.id,
    name: c.names.en,
    pattern: c.topicTag!.replace('捏脸', ''),
  }));

// Count character tags in text
function countCharacterTags(text: string): Set<string> {
  const found = new Set<string>();

  // Look for #X捏脸# pattern
  const matches = text.match(/#([^#]+捏脸)#/g) || [];
  for (const match of matches) {
    const charName = match.replace(/#/g, '').replace('捏脸', '');
    const char = charPatterns.find(c => c.pattern === charName);
    if (char) {
      found.add(char.id);
    }
  }

  return found;
}

async function reprocess() {
  console.log('=== Re-processing character tags ===');

  const files = fs.readdirSync(QRCODES_DIR).filter(f => f.endsWith('.json') && f !== 'index.json');

  let totalDiverse = 0;
  const diverseQrcodes: QRCode[] = [];

  for (const file of files) {
    if (file === 'diverse.json') continue;

    const filePath = path.join(QRCODES_DIR, file);
    const data: QRCodesData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

    let movedCount = 0;
    const remaining: QRCode[] = [];

    for (const qr of data.qrcodes) {
      const tags = countCharacterTags(qr.text || '');

      if (tags.size > 1) {
        // Multiple character tags → move to diverse
        qr.characterId = 'diverse';
        qr.characterName = 'Diverse';
        diverseQrcodes.push(qr);
        movedCount++;
      } else {
        remaining.push(qr);
      }
    }

    if (movedCount > 0) {
      // Update file with remaining qrcodes
      data.qrcodes = remaining;
      data.totalCount = remaining.length;
      data.lastUpdated = new Date().toISOString();
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
      console.log(`${file}: moved ${movedCount} to diverse, ${remaining.length} remaining`);
      totalDiverse += movedCount;
    } else {
      console.log(`${file}: no changes`);
    }
  }

  // Save diverse.json
  if (diverseQrcodes.length > 0) {
    // Load existing diverse if exists
    const diversePath = path.join(QRCODES_DIR, 'diverse.json');
    let existingDiverse: QRCode[] = [];
    try {
      const existing = JSON.parse(fs.readFileSync(diversePath, 'utf-8'));
      existingDiverse = existing.qrcodes || [];
    } catch {}

    // Merge by unique ID
    const mergedMap = new Map<string, QRCode>();
    for (const qr of existingDiverse) mergedMap.set(qr.id, qr);
    for (const qr of diverseQrcodes) mergedMap.set(qr.id, qr);

    const merged = Array.from(mergedMap.values()).sort((a, b) => b.createTime - a.createTime);

    const diverseData: QRCodesData = {
      lastUpdated: new Date().toISOString(),
      source: 'diverse',
      totalCount: merged.length,
      qrcodes: merged,
    };

    fs.writeFileSync(diversePath, JSON.stringify(diverseData, null, 2));
    console.log(`\nTotal moved to diverse.json: ${totalDiverse} (total: ${merged.length})`);
  }

  console.log('=== Done ===');
}

reprocess().catch(console.error);
