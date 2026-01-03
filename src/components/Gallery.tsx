'use client';

import { useState, useMemo } from 'react';
import { QRCode, Character } from '@/types';
import ImageCard from './ImageCard';
import FilterBar from './FilterBar';
import Lightbox from './Lightbox';

interface GalleryProps {
  qrcodes: QRCode[];
  characters: Character[];
}

export default function Gallery({ qrcodes, characters }: GalleryProps) {
  const [selectedCharacter, setSelectedCharacter] = useState('all');
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [selectedQRCode, setSelectedQRCode] = useState<QRCode | null>(null);

  // Get available months from data
  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    qrcodes.forEach((qr) => {
      const date = new Date(qr.createTime);
      const monthStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      months.add(monthStr);
    });
    return Array.from(months).sort().reverse();
  }, [qrcodes]);

  // Filter QR codes
  const filteredQRCodes = useMemo(() => {
    return qrcodes.filter((qr) => {
      // Character filter
      if (selectedCharacter !== 'all' && qr.characterId !== selectedCharacter) {
        return false;
      }

      // Month filter
      if (selectedMonth !== 'all') {
        const date = new Date(qr.createTime);
        const monthStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        if (monthStr !== selectedMonth) {
          return false;
        }
      }

      return true;
    });
  }, [qrcodes, selectedCharacter, selectedMonth]);

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
        selectedMonth={selectedMonth}
        onCharacterChange={setSelectedCharacter}
        onMonthChange={setSelectedMonth}
        availableMonths={availableMonths}
      />

      {/* Results count */}
      <div className="container mx-auto px-4 py-4">
        <p className="text-gray-600 text-sm">
          Showing {filteredQRCodes.length} of {qrcodes.length} QR codes
        </p>
      </div>

      {/* Gallery Grid */}
      <div className="container mx-auto px-4 pb-8">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {filteredQRCodes.map((qrcode) => (
            <ImageCard
              key={qrcode.id}
              qrcode={qrcode}
              onClick={() => setSelectedQRCode(qrcode)}
            />
          ))}
        </div>

        {filteredQRCodes.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No QR codes found for this filter.</p>
          </div>
        )}
      </div>

      {/* Lightbox */}
      {selectedQRCode && (
        <Lightbox
          qrcode={selectedQRCode}
          onClose={() => setSelectedQRCode(null)}
        />
      )}
    </div>
  );
}
