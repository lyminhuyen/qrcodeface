import type { QRCode } from '../../types';

export interface GalleryAuthor {
  key: string;
  name: string;
  avatar: string;
  count: number;
}

export interface GalleryAuthorIndex {
  authors: GalleryAuthor[];
  authorKeyByQRCodeId: Map<string, string>;
}

const USER_ID_PREFIX = 'uid:';
const LEGACY_NAME_PREFIX = 'name:';

function normalized(value: string | undefined): string {
  return value?.trim() ?? '';
}

function collectKnownUserIdsByName(qrcodes: QRCode[]): Map<string, Set<string>> {
  const userIdsByName = new Map<string, Set<string>>();

  for (const qrcode of qrcodes) {
    const userId = normalized(qrcode.userId);
    const userName = normalized(qrcode.userName);
    if (!userId || !userName) continue;

    const userIds = userIdsByName.get(userName) ?? new Set<string>();
    userIds.add(userId);
    userIdsByName.set(userName, userIds);
  }

  return userIdsByName;
}

function resolveAuthorKey(
  qrcode: QRCode,
  knownUserIdsByName: ReadonlyMap<string, ReadonlySet<string>>
): string | null {
  const userName = normalized(qrcode.userName);
  if (!userName) return null;

  const userId = normalized(qrcode.userId);
  if (userId) return `${USER_ID_PREFIX}${userId}`;

  const matchingUserIds = knownUserIdsByName.get(userName);
  if (matchingUserIds?.size === 1) {
    const [matchingUserId] = matchingUserIds;
    return `${USER_ID_PREFIX}${matchingUserId}`;
  }

  return `${LEGACY_NAME_PREFIX}${userName}`;
}

export function buildGalleryAuthorIndex(qrcodes: QRCode[]): GalleryAuthorIndex {
  const knownUserIdsByName = collectKnownUserIdsByName(qrcodes);
  const authorKeyByQRCodeId = new Map<string, string>();
  const authorsByKey = new Map<string, GalleryAuthor & { latestPostTime: number }>();

  for (const qrcode of qrcodes) {
    const key = resolveAuthorKey(qrcode, knownUserIdsByName);
    if (!key) continue;

    authorKeyByQRCodeId.set(qrcode.id, key);
    const userName = normalized(qrcode.userName);
    const userAvatar = normalized(qrcode.userAvatar);
    const current = authorsByKey.get(key);

    if (!current) {
      authorsByKey.set(key, {
        key,
        name: userName,
        avatar: userAvatar,
        count: 1,
        latestPostTime: qrcode.createTime,
      });
      continue;
    }

    current.count++;
    if (qrcode.createTime > current.latestPostTime) {
      current.name = userName;
      current.avatar = userAvatar || current.avatar;
      current.latestPostTime = qrcode.createTime;
    } else if (!current.avatar && userAvatar) {
      current.avatar = userAvatar;
    }
  }

  const authors = [...authorsByKey.values()]
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    .map((author) => ({
      key: author.key,
      name: author.name,
      avatar: author.avatar,
      count: author.count,
    }));

  return { authors, authorKeyByQRCodeId };
}

export function countAuthors(qrcodes: QRCode[]): number {
  return buildGalleryAuthorIndex(qrcodes).authors.length;
}
