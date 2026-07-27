import type { GeneratedAuthor, QRCode } from '../../src/types';

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

function resolveIdentity(
  qrcode: QRCode,
  knownUserIdsByName: ReadonlyMap<string, ReadonlySet<string>>
): { key: string; userId?: string } | null {
  const userId = normalized(qrcode.userId);
  if (userId) return { key: `${USER_ID_PREFIX}${userId}`, userId };

  const userName = normalized(qrcode.userName);
  if (!userName) return null;

  const matchingUserIds = knownUserIdsByName.get(userName);
  if (matchingUserIds?.size === 1) {
    const [matchingUserId] = matchingUserIds;
    return { key: `${USER_ID_PREFIX}${matchingUserId}`, userId: matchingUserId };
  }

  return { key: `${LEGACY_NAME_PREFIX}${userName}` };
}

export function buildGeneratedAuthors(qrcodes: QRCode[]): GeneratedAuthor[] {
  const knownUserIdsByName = collectKnownUserIdsByName(qrcodes);
  const authorsByKey = new Map<
    string,
    GeneratedAuthor & {
      names: Map<string, { count: number; latestPostTime: number }>;
      avatars: Map<string, { count: number; latestPostTime: number }>;
    }
  >();

  const recordProfileValue = (
    values: Map<string, { count: number; latestPostTime: number }>,
    value: string,
    createTime: number
  ) => {
    if (!value) return;
    const current = values.get(value);
    values.set(value, {
      count: (current?.count ?? 0) + 1,
      latestPostTime: Math.max(current?.latestPostTime ?? 0, createTime),
    });
  };

  const preferredProfileValue = (
    values: Map<string, { count: number; latestPostTime: number }>
  ): string =>
    [...values.entries()].sort(
      ([valueA, a], [valueB, b]) =>
        b.count - a.count || b.latestPostTime - a.latestPostTime || valueA.localeCompare(valueB)
    )[0]?.[0] ?? '';

  for (const qrcode of qrcodes) {
    const identity = resolveIdentity(qrcode, knownUserIdsByName);
    if (!identity) continue;

    const userName = normalized(qrcode.userName);
    const userAvatar = normalized(qrcode.userAvatar);
    const hasCommentQr = qrcode.qrCodes.some((asset) => asset.source === 'author-comment');
    const current = authorsByKey.get(identity.key);

    if (!current) {
      const names = new Map<string, { count: number; latestPostTime: number }>();
      const avatars = new Map<string, { count: number; latestPostTime: number }>();
      recordProfileValue(names, userName, qrcode.createTime);
      recordProfileValue(avatars, userAvatar, qrcode.createTime);
      authorsByKey.set(identity.key, {
        key: identity.key,
        ...(identity.userId ? { userId: identity.userId } : {}),
        userName,
        userAvatar,
        postCount: 1,
        latestPostTime: qrcode.createTime,
        commentQrCount: hasCommentQr ? 1 : 0,
        names,
        avatars,
      });
      continue;
    }

    current.postCount++;
    if (hasCommentQr) current.commentQrCount++;
    current.latestPostTime = Math.max(current.latestPostTime, qrcode.createTime);
    recordProfileValue(current.names, userName, qrcode.createTime);
    recordProfileValue(current.avatars, userAvatar, qrcode.createTime);
  }

  return [...authorsByKey.values()]
    .map(({ names, avatars, ...author }) => ({
      ...author,
      userName: preferredProfileValue(names),
      userAvatar: preferredProfileValue(avatars),
    }))
    .sort(
      (a, b) =>
        b.postCount - a.postCount ||
        b.latestPostTime - a.latestPostTime ||
        a.key.localeCompare(b.key)
    );
}
