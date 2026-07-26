'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { ChevronUp } from 'lucide-react';
import type { QRCode, Character } from '@/types';
import ImageCard from './ImageCard';
import FilterBar from './FilterBar';
import Lightbox from './Lightbox';
import { useDeepLink } from '@/features/gallery/hooks/useDeepLink';
import { useGalleryData } from '@/features/gallery/hooks/useGalleryData';
import { useGalleryFilters } from '@/features/gallery/hooks/useGalleryFilters';
import { ITEMS_PER_PAGE, useInfiniteGallery } from '@/features/gallery/hooks/useInfiniteGallery';

interface GalleryProps {
  characters: Character[];
}

export default function Gallery({ characters }: GalleryProps) {
  // Deep-link: ?id=&char= in the URL <-> open post
  const { pendingId, pendingChar, openUrl, syncUrl, clearUrl } = useDeepLink();

  // Init character tab from URL on cold load (avoids a wasted "newest" fetch)
  const [selectedCharacter, setSelectedCharacter] = useState(() => pendingChar || 'newest');
  const [selectedYear, setSelectedYear] = useState('all');
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [selectedAuthorKey, setSelectedAuthorKey] = useState('all');
  const [localQRCode, setLocalQRCode] = useState<QRCode | null>(null);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const { qrcodes, isLoading } = useGalleryData(selectedCharacter);
  const { availableYears, availableMonths, availableAuthors, filteredQRCodes } =
    useGalleryFilters(qrcodes, {
      year: selectedYear,
      month: selectedMonth,
      authorKey: selectedAuthorKey,
    });
  const { displayedQRCodes, hasMore, loadMoreRef } = useInfiniteGallery(
    filteredQRCodes,
    `${selectedCharacter}:${selectedYear}:${selectedMonth}:${selectedAuthorKey}`
  );
  const selectedQRCode = useMemo(() => {
    if (!pendingId) return null;
    if (localQRCode?.id === pendingId) return localQRCode;
    return qrcodes.find((qrcode) => qrcode.id === pendingId) ?? null;
  }, [localQRCode, pendingId, qrcodes]);

  // Open a post: set state + push URL (so Back closes the lightbox)
  const openPost = useCallback(
    (qr: QRCode) => {
      setLocalQRCode(qr);
      openUrl(qr);
    },
    [openUrl]
  );

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

  // Sort characters - diverse at the end
  const sortedCharacters = useMemo(() => {
    const regular = characters.filter(c => c.id !== 'diverse');
    const diverse = characters.find(c => c.id === 'diverse');
    return diverse ? [...regular, diverse] : regular;
  }, [characters]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Filter Bar */}
      <FilterBar
        characters={sortedCharacters}
        selectedCharacter={selectedCharacter}
        selectedYear={selectedYear}
        selectedMonth={selectedMonth}
        selectedAuthorKey={selectedAuthorKey}
        onCharacterChange={(characterId) => {
          setSelectedCharacter(characterId);
          setSelectedAuthorKey('all');
        }}
        onYearChange={setSelectedYear}
        onMonthChange={setSelectedMonth}
        onAuthorKeyChange={setSelectedAuthorKey}
        availableYears={availableYears}
        availableMonths={availableMonths}
        availableAuthors={availableAuthors}
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
                  onClick={() => openPost(qrcode)}
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
          onClose={() => {
            setLocalQRCode(null);
            clearUrl();
          }}
          onNavigate={(qr) => {
            setLocalQRCode(qr);
            syncUrl(qr);
          }}
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
