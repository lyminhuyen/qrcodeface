'use client';

import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { QRCode, Character } from '@/types';
import ImageCard from './ImageCard';
import FilterBar from './FilterBar';
import Lightbox from './Lightbox';

interface GalleryProps {
  qrcodes: QRCode[];
  characters: Character[];
}

const ITEMS_PER_PAGE = 20;

export default function Gallery({ qrcodes, characters }: GalleryProps) {
  const [selectedCharacter, setSelectedCharacter] = useState('all');
  const [selectedYear, setSelectedYear] = useState('all');
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [selectedQRCode, setSelectedQRCode] = useState<QRCode | null>(null);
  const [displayCount, setDisplayCount] = useState(ITEMS_PER_PAGE);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Get available years from data
  const availableYears = useMemo(() => {
    const years = new Set<string>();
    qrcodes.forEach((qr) => {
      const date = new Date(qr.createTime);
      years.add(String(date.getFullYear()));
    });
    return Array.from(years).sort().reverse();
  }, [qrcodes]);

  // Get available months from data (unique months across all years)
  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    qrcodes.forEach((qr) => {
      const date = new Date(qr.createTime);
      months.add(String(date.getMonth() + 1).padStart(2, '0'));
    });
    return Array.from(months).sort();
  }, [qrcodes]);

  // Filter QR codes
  const filteredQRCodes = useMemo(() => {
    return qrcodes.filter((qr) => {
      // Character filter
      if (selectedCharacter !== 'all' && qr.characterId !== selectedCharacter) {
        return false;
      }

      const date = new Date(qr.createTime);

      // Year filter
      if (selectedYear !== 'all') {
        if (String(date.getFullYear()) !== selectedYear) {
          return false;
        }
      }

      // Month filter
      if (selectedMonth !== 'all') {
        const monthStr = String(date.getMonth() + 1).padStart(2, '0');
        if (monthStr !== selectedMonth) {
          return false;
        }
      }

      return true;
    });
  }, [qrcodes, selectedCharacter, selectedYear, selectedMonth]);

  // Reset display count when filter changes
  useEffect(() => {
    setDisplayCount(ITEMS_PER_PAGE);
  }, [selectedCharacter, selectedYear, selectedMonth]);

  // Displayed items (infinite scroll)
  const displayedQRCodes = useMemo(() => {
    return filteredQRCodes.slice(0, displayCount);
  }, [filteredQRCodes, displayCount]);

  const hasMore = displayCount < filteredQRCodes.length;

  // Load more function
  const loadMore = useCallback(() => {
    if (hasMore) {
      setDisplayCount((prev) => prev + ITEMS_PER_PAGE);
    }
  }, [hasMore]);

  // Infinite scroll with Intersection Observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );

    const currentRef = loadMoreRef.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [hasMore, loadMore]);

  // Sort characters by count
  const sortedCharacters = useMemo(() => {
    const charCounts = new Map<string, number>();
    qrcodes.forEach((qr) => {
      charCounts.set(qr.characterId, (charCounts.get(qr.characterId) || 0) + 1);
    });

    return [...characters].sort((a, b) => {
      const countA = charCounts.get(a.id) || 0;
      const countB = charCounts.get(b.id) || 0;
      return countB - countA;
    });
  }, [qrcodes, characters]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Filter Bar */}
      <FilterBar
        characters={sortedCharacters}
        selectedCharacter={selectedCharacter}
        selectedYear={selectedYear}
        selectedMonth={selectedMonth}
        onCharacterChange={setSelectedCharacter}
        onYearChange={setSelectedYear}
        onMonthChange={setSelectedMonth}
        availableYears={availableYears}
        availableMonths={availableMonths}
      />

      {/* Results count */}
      <div className="container mx-auto px-4 py-4">
        <p className="text-gray-600 text-sm">
          Showing {displayedQRCodes.length} of {filteredQRCodes.length} QR codes
        </p>
      </div>

      {/* Gallery Grid */}
      <div className="container mx-auto px-4 pb-8">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {displayedQRCodes.map((qrcode) => (
            <ImageCard
              key={qrcode.id}
              qrcode={qrcode}
              onClick={() => setSelectedQRCode(qrcode)}
            />
          ))}
        </div>

        {/* Empty state */}
        {filteredQRCodes.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No QR codes found for this filter.</p>
          </div>
        )}

        {/* Load more trigger */}
        {hasMore && (
          <div ref={loadMoreRef} className="py-8 text-center">
            <div className="inline-flex items-center gap-2 text-gray-500">
              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Loading more...
            </div>
          </div>
        )}

        {/* End of list */}
        {!hasMore && filteredQRCodes.length > ITEMS_PER_PAGE && (
          <div className="py-8 text-center text-gray-400 text-sm">
            — End of list —
          </div>
        )}
      </div>

      {/* Lightbox */}
      {selectedQRCode && (
        <Lightbox
          qrcode={selectedQRCode}
          qrcodes={filteredQRCodes}
          onClose={() => setSelectedQRCode(null)}
          onNavigate={setSelectedQRCode}
        />
      )}
    </div>
  );
}
