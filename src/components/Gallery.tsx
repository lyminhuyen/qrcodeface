'use client';

import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { ChevronUp } from 'lucide-react';
import { QRCode, Character, QRCodesData } from '@/types';
import ImageCard from './ImageCard';
import FilterBar from './FilterBar';
import Lightbox from './Lightbox';

interface GalleryProps {
  characters: Character[];
}

const ITEMS_PER_PAGE = 20;
const NEWEST_LIMIT = 100; // Số posts hiển thị trong tab "Mới nhất"

// Cache loaded data
const dataCache: Record<string, QRCode[]> = {};

export default function Gallery({ characters }: GalleryProps) {
  const [selectedCharacter, setSelectedCharacter] = useState('newest');
  const [selectedYear, setSelectedYear] = useState('all');
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [selectedQRCode, setSelectedQRCode] = useState<QRCode | null>(null);
  const [displayCount, setDisplayCount] = useState(ITEMS_PER_PAGE);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [qrcodes, setQrcodes] = useState<QRCode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Load data for a specific character
  const loadCharacterData = useCallback(async (charId: string): Promise<QRCode[]> => {
    if (dataCache[charId]) {
      return dataCache[charId];
    }

    try {
      const data: QRCodesData = await import(`@/data/qrcodes/${charId}.json`);
      const qrcodes = data.qrcodes || [];
      dataCache[charId] = qrcodes;
      return qrcodes;
    } catch (error) {
      console.error(`Failed to load data for ${charId}:`, error);
      return [];
    }
  }, []);

  // Load newest posts from all characters
  const loadNewestData = useCallback(async (): Promise<QRCode[]> => {
    if (dataCache['__newest__']) {
      return dataCache['__newest__'];
    }

    const allQrcodes: QRCode[] = [];
    const charsWithData = characters.filter(c => c.topicTag !== null);

    // Load all character data in parallel
    const promises = charsWithData.map(async (char) => {
      try {
        const data = await loadCharacterData(char.id);
        return data;
      } catch {
        return [];
      }
    });

    const results = await Promise.all(promises);
    results.forEach(data => allQrcodes.push(...data));

    // Sort by createTime DESC and take top N
    const sorted = allQrcodes
      .sort((a, b) => b.createTime - a.createTime)
      .slice(0, NEWEST_LIMIT);

    dataCache['__newest__'] = sorted;
    return sorted;
  }, [characters, loadCharacterData]);

  // Load data when character changes
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      setDisplayCount(ITEMS_PER_PAGE);

      let data: QRCode[];
      if (selectedCharacter === 'newest') {
        data = await loadNewestData();
      } else {
        data = await loadCharacterData(selectedCharacter);
      }

      setQrcodes(data);
      setIsLoading(false);
    };

    loadData();
  }, [selectedCharacter, loadCharacterData, loadNewestData]);

  // Get available years from data
  const availableYears = useMemo(() => {
    const years = new Set<string>();
    qrcodes.forEach((qr) => {
      const date = new Date(qr.createTime);
      years.add(String(date.getFullYear()));
    });
    return Array.from(years).sort().reverse();
  }, [qrcodes]);

  // Get available months from data
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
    let filtered = qrcodes.filter((qr) => {
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

    // Sort by createTime DESC
    filtered = filtered.sort((a, b) => b.createTime - a.createTime);

    return filtered;
  }, [qrcodes, selectedYear, selectedMonth]);

  // Reset display count when filter changes
  useEffect(() => {
    setDisplayCount(ITEMS_PER_PAGE);
  }, [selectedYear, selectedMonth]);

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

  // Back to Top button visibility
  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 300);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Sort characters by data availability (characters with data first)
  const sortedCharacters = useMemo(() => {
    return [...characters].filter(c => c.topicTag !== null);
  }, [characters]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
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
      <div className="max-w-[1320px] mx-auto px-4 py-4">
        <p className="text-gray-600 dark:text-gray-400 text-sm">
          {isLoading ? (
            'Loading...'
          ) : (
            `Showing ${displayedQRCodes.length} of ${filteredQRCodes.length} QR codes`
          )}
        </p>
      </div>

      {/* Gallery Grid */}
      <div className="max-w-[1320px] mx-auto px-4 pb-8">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="inline-flex items-center gap-2 text-gray-500 dark:text-gray-400">
              <svg className="w-6 h-6 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Loading data...
            </div>
          </div>
        ) : (
          <>
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
                <p className="text-gray-500 dark:text-gray-400">No QR codes found for this filter.</p>
              </div>
            )}

            {/* Load more trigger */}
            {hasMore && (
              <div ref={loadMoreRef} className="py-8 text-center">
                <div className="inline-flex items-center gap-2 text-gray-500 dark:text-gray-400">
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
              <div className="py-8 text-center text-gray-400 dark:text-gray-500 text-sm">
                — End of list —
              </div>
            )}
          </>
        )}
      </div>

      {/* Lightbox */}
      {selectedQRCode && (
        <Lightbox
          qrcode={selectedQRCode}
          qrcodes={filteredQRCodes}
          characters={characters}
          onClose={() => setSelectedQRCode(null)}
          onNavigate={setSelectedQRCode}
        />
      )}

      {/* Back to Top Button */}
      {showBackToTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-8 right-8 p-3 bg-blue-500 hover:bg-blue-600 text-white rounded-full shadow-lg transition-all duration-300 hover:scale-110 z-40"
          aria-label="Back to top"
        >
          <ChevronUp className="w-6 h-6" />
        </button>
      )}
    </div>
  );
}
