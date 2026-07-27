import type { Feed, UserInfo } from './types';

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isFeed(value: unknown): value is Feed {
  return (
    isObject(value) &&
    typeof value.id === 'string' &&
    typeof value.uid === 'string' &&
    typeof value.content === 'string' &&
    typeof value.createTime === 'number'
  );
}

function isUserInfo(value: unknown): value is UserInfo {
  return (
    isObject(value) &&
    isObject(value.user) &&
    typeof value.user.uid === 'string'
  );
}

export function extractFeedsFromApiPayload(payload: unknown): Feed[] {
  if (!isObject(payload)) return [];
  const result = isObject(payload.result) ? payload.result : undefined;
  const candidates: unknown[] = [];

  if (Array.isArray(result?.feeds)) candidates.push(...result.feeds);
  if (result) {
    candidates.push(result.feed, result.feedInfo, result);
    if (isObject(result.data)) candidates.push(result.data.feed);
  }
  candidates.push(payload.feed);

  return candidates.filter(isFeed);
}

export function extractUserInfosFromApiPayload(payload: unknown): UserInfo[] {
  if (!isObject(payload)) return [];
  const result = isObject(payload.result) ? payload.result : undefined;
  const candidates: unknown[] = [];

  if (Array.isArray(result?.userInfos)) candidates.push(...result.userInfos);
  if (result) candidates.push(result.userInfo);

  return candidates.filter(isUserInfo);
}
