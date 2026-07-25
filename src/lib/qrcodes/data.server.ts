import { promises as fs } from 'fs';
import path from 'path';
import charactersData from '@/data/characters.json';
import type { Character, CharactersData, QRCode, QRCodesData } from '@/types';

const DATA_DIR = path.join(process.cwd(), 'src/data/qrcodes');
const characters = (charactersData as CharactersData).characters;
const characterById = new Map(characters.map((character) => [character.id, character]));

function shardPath(characterId: string): string {
  if (!characterById.has(characterId)) throw new Error(`Unknown character: ${characterId}`);
  return path.join(DATA_DIR, `${characterId}.json`);
}

async function readShard(character: Character): Promise<QRCodesData> {
  const raw = await fs.readFile(shardPath(character.id), 'utf8');
  return JSON.parse(raw) as QRCodesData;
}

async function writeShard(character: Character, data: QRCodesData): Promise<void> {
  const filePath = shardPath(character.id);
  const tempPath = `${filePath}.tmp`;
  const nextData: QRCodesData = {
    ...data,
    lastUpdated: new Date().toISOString(),
    source: data.source ?? character.topicTag ?? character.id,
    totalCount: data.qrcodes.length,
    qrcodes: [...data.qrcodes].sort((a, b) => b.createTime - a.createTime),
  };

  await fs.writeFile(tempPath, JSON.stringify(nextData, null, 2));
  await fs.rename(tempPath, filePath);
}

export async function loadAllQRCodes(): Promise<QRCode[]> {
  const shards = await Promise.all(characters.map(readShard));
  const byId = new Map<string, QRCode>();

  for (const qrcode of shards.flatMap((shard) => shard.qrcodes)) {
    if (byId.has(qrcode.id)) throw new Error(`Duplicate QRCode id: ${qrcode.id}`);
    byId.set(qrcode.id, qrcode);
  }

  return [...byId.values()].sort((a, b) => b.createTime - a.createTime);
}

export interface CharacterUpdate {
  qrcodeId: string;
  characterId: string;
}

export async function updateQRCodeCharacters(updates: CharacterUpdate[]): Promise<number> {
  const shards = new Map<string, QRCodesData>();
  const locationById = new Map<string, string>();

  await Promise.all(
    characters.map(async (character) => {
      const shard = await readShard(character);
      shards.set(character.id, shard);
      for (const qrcode of shard.qrcodes) {
        if (locationById.has(qrcode.id)) throw new Error(`Duplicate QRCode id: ${qrcode.id}`);
        locationById.set(qrcode.id, character.id);
      }
    })
  );

  const touched = new Set<string>();
  let updatedCount = 0;

  for (const update of updates) {
    const targetCharacter = characterById.get(update.characterId);
    const sourceId = locationById.get(update.qrcodeId);
    if (!targetCharacter) throw new Error(`Unknown target character: ${update.characterId}`);
    if (!sourceId) throw new Error(`QRCode not found: ${update.qrcodeId}`);

    const sourceShard = shards.get(sourceId)!;
    const sourceIndex = sourceShard.qrcodes.findIndex((qrcode) => qrcode.id === update.qrcodeId);
    if (sourceIndex < 0) throw new Error(`QRCode not found in source shard: ${update.qrcodeId}`);

    const [qrcode] = sourceShard.qrcodes.splice(sourceIndex, 1);
    const targetShard = shards.get(update.characterId)!;
    targetShard.qrcodes.push({
      ...qrcode,
      characterId: update.characterId,
      characterName: targetCharacter.names.en,
    });

    locationById.set(update.qrcodeId, update.characterId);
    touched.add(sourceId);
    touched.add(update.characterId);
    updatedCount++;
  }

  await Promise.all(
    [...touched].map((characterId) =>
      writeShard(characterById.get(characterId)!, shards.get(characterId)!)
    )
  );

  return updatedCount;
}
