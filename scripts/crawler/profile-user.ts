import type { Page } from 'puppeteer';
import type { UserInfoMap } from './types';

interface ProfileAvatarCandidate {
  dataUrl?: string | null;
  imageSrc?: string | null;
}

export function selectProfileAvatar(candidate: ProfileAvatarCandidate): string {
  return candidate.dataUrl?.trim() || candidate.imageSrc?.trim() || '';
}

export async function extractProfileAvatar(page: Page, timeoutMs = 5000): Promise<string> {
  try {
    await page.waitForSelector('.p-user-info__avatar-box .c-my-image', { timeout: timeoutMs });
    const candidate = await page.$eval('.p-user-info__avatar-box', (avatarBox) => {
      const imageContainer = avatarBox.querySelector('.c-my-image');
      const image = imageContainer?.querySelector('img');
      return {
        dataUrl: imageContainer?.getAttribute('data-url'),
        imageSrc: image?.currentSrc || image?.getAttribute('src'),
      };
    });
    return selectProfileAvatar(candidate);
  } catch {
    return '';
  }
}

export function applyProfileAvatar(
  userInfos: UserInfoMap,
  userId: string,
  avatarUrl: string
): boolean {
  const avatar = avatarUrl.trim();
  if (!avatar) return false;

  const current = userInfos[userId]?.user;
  userInfos[userId] = {
    user: {
      uid: userId,
      nick: current?.nick || '',
      icon: avatar,
    },
  };
  return current?.icon !== avatar;
}
