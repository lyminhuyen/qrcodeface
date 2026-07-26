'use client';

import { useMemo } from 'react';
import type { QRCode } from '@/types';
import { buildGalleryAuthorIndex } from '@/lib/qrcodes/author-identity';
export type { GalleryAuthor } from '@/lib/qrcodes/author-identity';

export interface GalleryFilterValues {
  year: string;
  month: string;
  authorKey: string;
}

export function useGalleryFilters(qrcodes: QRCode[], filters: GalleryFilterValues) {
  const availableYears = useMemo(() => {
    const years = new Set(qrcodes.map((qrcode) => String(new Date(qrcode.createTime).getFullYear())));
    return [...years].sort().reverse();
  }, [qrcodes]);

  const availableMonths = useMemo(() => {
    const months = new Set(
      qrcodes.map((qrcode) => String(new Date(qrcode.createTime).getMonth() + 1).padStart(2, '0'))
    );
    return [...months].sort();
  }, [qrcodes]);

  const authorIndex = useMemo(() => buildGalleryAuthorIndex(qrcodes), [qrcodes]);
  const availableAuthors = useMemo(() => {
    return authorIndex.authors.slice(0, 50);
  }, [authorIndex]);

  const filteredQRCodes = useMemo(() => {
    return qrcodes
      .filter((qrcode) => {
        const date = new Date(qrcode.createTime);
        if (filters.year !== 'all' && String(date.getFullYear()) !== filters.year) return false;
        if (
          filters.month !== 'all' &&
          String(date.getMonth() + 1).padStart(2, '0') !== filters.month
        ) return false;
        return (
          filters.authorKey === 'all' ||
          authorIndex.authorKeyByQRCodeId.get(qrcode.id) === filters.authorKey
        );
      })
      .sort((a, b) => b.createTime - a.createTime);
  }, [authorIndex, qrcodes, filters.year, filters.month, filters.authorKey]);

  return { availableYears, availableMonths, availableAuthors, filteredQRCodes };
}
