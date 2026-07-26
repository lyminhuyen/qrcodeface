'use client';

import { useEffect, useState } from 'react';
import type { QRCode, QRCodesData } from '@/types';

const NEWEST_LIMIT = 100;
const dataCache: Record<string, QRCode[]> = {};

async function loadCharacterData(characterId: string): Promise<QRCode[]> {
  if (dataCache[characterId]) return dataCache[characterId];

  try {
    const data = (await import(
      `@/data/qrcodes/${characterId}.json`
    )) as unknown as QRCodesData;
    const qrcodes = data.qrcodes || [];
    dataCache[characterId] = qrcodes;
    return qrcodes;
  } catch (error) {
    console.error(`Failed to load data for ${characterId}:`, error);
    return [];
  }
}

async function loadNewestData(): Promise<QRCode[]> {
  if (dataCache.__newest__) return dataCache.__newest__;
  const data = (await import('@/data/generated/newest.json')) as unknown as QRCodesData;
  const newest = (data.qrcodes || []).slice(0, NEWEST_LIMIT);
  dataCache.__newest__ = newest;
  return newest;
}

export function useGalleryData(selectedCharacter: string) {
  const [loaded, setLoaded] = useState<{ characterId: string; qrcodes: QRCode[] } | null>(null);

  useEffect(() => {
    let cancelled = false;

    const request = selectedCharacter === 'newest'
      ? loadNewestData()
      : loadCharacterData(selectedCharacter);

    request.then((data) => {
      if (cancelled) return;
      setLoaded({ characterId: selectedCharacter, qrcodes: data });
    });

    return () => {
      cancelled = true;
    };
  }, [selectedCharacter]);

  const current = loaded?.characterId === selectedCharacter ? loaded : null;
  return { qrcodes: current?.qrcodes ?? [], isLoading: current === null };
}
