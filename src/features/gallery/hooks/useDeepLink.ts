'use client';

import { useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { QRCode } from '@/types';
import { buildGalleryPath } from '@/features/gallery/lib/gallery-links';

/**
 * Manage deep-link state for the gallery: read `?id=&char=` from the URL and
 * keep it in sync with the open Lightbox.
 *
 * History semantics:
 *  - openUrl  -> push   (adds 1 entry, so Back closes the lightbox)
 *  - syncUrl  -> replace (navigating between posts doesn't spam history)
 *  - clearUrl -> replace (close button returns to a clean /gallery URL)
 */
export function useDeepLink() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const pendingId = searchParams.get('id');
  const pendingChar = searchParams.get('char');

  const openUrl = useCallback(
    (qrcode: QRCode) => {
      router.push(buildGalleryPath(qrcode), { scroll: false });
    },
    [router]
  );

  const syncUrl = useCallback(
    (qrcode: QRCode) => {
      router.replace(buildGalleryPath(qrcode), { scroll: false });
    },
    [router]
  );

  const clearUrl = useCallback(() => {
    router.replace('/gallery', { scroll: false });
  }, [router]);

  return { pendingId, pendingChar, openUrl, syncUrl, clearUrl };
}
