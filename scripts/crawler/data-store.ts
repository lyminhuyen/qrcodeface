import { promises as fs } from 'fs';
import * as path from 'path';
import { mergeQRCodeImages } from './qr-code-merge';
import type { Character, ParsedQRCode } from './types';

interface QRCodeShard {
  lastUpdated: string;
  source?: string;
  totalCount: number;
  qrcodes: ParsedQRCode[];
}

interface AuthorProfileIdentity {
  userId: string;
  userName: string;
  userAvatar: string;
}

export async function loadCharacters(filePath: string): Promise<Character[]> {
  return JSON.parse(await fs.readFile(filePath, 'utf8')).characters as Character[];
}

export async function loadKnownCommentAuthorIds(qrcodesDir: string): Promise<Set<string>> {
  const authorIds = new Set<string>();
  const files = (await fs.readdir(qrcodesDir)).filter((file) => file.endsWith('.json'));

  await Promise.all(
    files.map(async (file) => {
      try {
        const shard = JSON.parse(await fs.readFile(path.join(qrcodesDir, file), 'utf8')) as QRCodeShard;
        for (const qrcode of shard.qrcodes) {
          const userId = qrcode.userId?.trim();
          if (userId && qrcode.qrCodes.some((asset) => asset.source === 'author-comment')) {
            authorIds.add(userId);
          }
        }
      } catch {
        // Invalid shards are reported by data validation; one bad file must not block discovery.
      }
    })
  );

  return authorIds;
}

export async function backfillAuthorProfileAcrossShards(
  qrcodesDir: string,
  profile: AuthorProfileIdentity
): Promise<{ updatedRecords: number; updatedShards: number; nameFallbackUsed: boolean }> {
  const userId = profile.userId.trim();
  const userName = profile.userName.trim();
  const userAvatar = profile.userAvatar.trim();
  if (!userId) throw new Error('Author profile userId is required');

  const files = (await fs.readdir(qrcodesDir)).filter((file) => file.endsWith('.json'));
  const shards = await Promise.all(
    files.map(async (file) => ({
      file,
      data: JSON.parse(await fs.readFile(path.join(qrcodesDir, file), 'utf8')) as QRCodeShard,
    }))
  );
  const hasConflictingUserId = Boolean(
    userName &&
      shards.some(({ data }) =>
        data.qrcodes.some(
          (qrcode) =>
            qrcode.userName?.trim() === userName &&
            Boolean(qrcode.userId?.trim()) &&
            qrcode.userId?.trim() !== userId
        )
      )
  );
  const allowNameFallback = Boolean(userName) && !hasConflictingUserId;
  let updatedRecords = 0;
  let updatedShards = 0;

  for (const { file, data } of shards) {
    let shardUpdated = false;
    const qrcodes = data.qrcodes.map((qrcode) => {
      const matchesUserId = qrcode.userId?.trim() === userId;
      const matchesLegacyName =
        allowNameFallback && !qrcode.userId?.trim() && qrcode.userName?.trim() === userName;
      if (!matchesUserId && !matchesLegacyName) return qrcode;

      const updated: ParsedQRCode = {
        ...qrcode,
        userId,
        userName: userName || qrcode.userName || '',
        userAvatar: userAvatar || qrcode.userAvatar || '',
      };
      if (JSON.stringify(updated) === JSON.stringify(qrcode)) return qrcode;
      shardUpdated = true;
      updatedRecords++;
      return updated;
    });

    if (!shardUpdated) continue;
    const filePath = path.join(qrcodesDir, file);
    const tempPath = `${filePath}.tmp`;
    await fs.writeFile(
      tempPath,
      JSON.stringify({ ...data, lastUpdated: new Date().toISOString(), qrcodes }, null, 2)
    );
    await fs.rename(tempPath, filePath);
    updatedShards++;
  }

  return { updatedRecords, updatedShards, nameFallbackUsed: allowNameFallback };
}

export async function mergeQRCodesIntoShards(
  qrcodesDir: string,
  qrcodes: ParsedQRCode[],
  characters: Character[],
  options: { commentScanCompletedIds?: ReadonlySet<string> } = {}
): Promise<{ characterId: string; added: number; updated: number; total: number }[]> {
  const characterById = new Map(characters.map((character) => [character.id, character]));
  const grouped = new Map<string, ParsedQRCode[]>();

  for (const qrcode of qrcodes) {
    const characterId = characterById.has(qrcode.characterId) ? qrcode.characterId : 'diverse';
    const character = characterById.get(characterId)!;
    const normalized = {
      ...qrcode,
      characterId,
      characterName: characterId === 'diverse' ? 'Diverse' : character.names.en,
    };
    const group = grouped.get(characterId) ?? [];
    group.push(normalized);
    grouped.set(characterId, group);
  }

  await fs.mkdir(qrcodesDir, { recursive: true });
  const results: { characterId: string; added: number; updated: number; total: number }[] = [];

  for (const [characterId, incoming] of grouped) {
    const character = characterById.get(characterId)!;
    const filePath = path.join(qrcodesDir, `${characterId}.json`);
    let existing: QRCodeShard = {
      lastUpdated: new Date(0).toISOString(),
      source: character.topicTag ?? characterId,
      totalCount: 0,
      qrcodes: [],
    };

    try {
      existing = JSON.parse(await fs.readFile(filePath, 'utf8')) as QRCodeShard;
    } catch {}

    const byId = new Map(existing.qrcodes.map((qrcode) => [qrcode.id, qrcode]));
    const before = byId.size;
    let updated = 0;
    for (const qrcode of incoming) {
      const previous = byId.get(qrcode.id);
      const userId = qrcode.userId?.trim() || previous?.userId?.trim();
      const mergedRecord: ParsedQRCode = {
        ...previous,
        ...qrcode,
        ...(userId ? { userId } : {}),
        userName: qrcode.userName || previous?.userName || '',
        userAvatar: qrcode.userAvatar || previous?.userAvatar || '',
        qrCodes: mergeQRCodeImages(
          previous?.qrCodes ?? [],
          qrcode.qrCodes,
          options.commentScanCompletedIds?.has(qrcode.id) ?? false
        ),
      };
      if (previous && JSON.stringify(previous) !== JSON.stringify(mergedRecord)) updated++;
      byId.set(qrcode.id, mergedRecord);
    }
    const merged = [...byId.values()].sort((a, b) => b.createTime - a.createTime);
    const output: QRCodeShard = {
      lastUpdated: new Date().toISOString(),
      source: existing.source ?? character.topicTag ?? characterId,
      totalCount: merged.length,
      qrcodes: merged,
    };
    const contentChanged =
      existing.source !== output.source ||
      existing.totalCount !== output.totalCount ||
      JSON.stringify(existing.qrcodes) !== JSON.stringify(output.qrcodes);
    if (contentChanged) {
      const tempPath = `${filePath}.tmp`;
      await fs.writeFile(tempPath, JSON.stringify(output, null, 2));
      await fs.rename(tempPath, filePath);
    }
    results.push({ characterId, added: byId.size - before, updated, total: merged.length });
  }

  return results;
}
