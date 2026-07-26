'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { QRCode } from '@/types';

export const ITEMS_PER_PAGE = 20;

export function useInfiniteGallery(qrcodes: QRCode[], resetKey: string) {
  const [pagination, setPagination] = useState({ resetKey, count: ITEMS_PER_PAGE });
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const displayCount = pagination.resetKey === resetKey ? pagination.count : ITEMS_PER_PAGE;
  const displayedQRCodes = useMemo(
    () => qrcodes.slice(0, displayCount),
    [qrcodes, displayCount]
  );
  const hasMore = displayCount < qrcodes.length;

  const loadMore = useCallback(() => {
    if (!hasMore) return;
    setPagination((current) => ({
      resetKey,
      count: (current.resetKey === resetKey ? current.count : ITEMS_PER_PAGE) + ITEMS_PER_PAGE,
    }));
  }, [hasMore, resetKey]);

  useEffect(() => {
    const target = loadMoreRef.current;
    if (!target) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) loadMore();
      },
      { threshold: 0.1 }
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [loadMore]);

  return { displayedQRCodes, hasMore, loadMoreRef };
}
