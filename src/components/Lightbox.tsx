'use client';

import { useState, useEffect } from 'react';
import { QRCode, Character, getCharacterName } from '@/types';
import { useLanguage } from '@/contexts/LanguageContext';
import { getCachedUrl, preloadImages, isImageCached, onCacheUpdate } from '@/lib/imageCache';

interface LightboxProps {
  qrcode: QRCode;
  qrcodes: QRCode[]; // Full list for navigation
  characters: Character[];
  onClose: () => void;
  onNavigate: (qrcode: QRCode) => void; // Navigate to different post
}

export default function Lightbox({ qrcode, qrcodes, characters, onClose, onNavigate }: LightboxProps) {
  const { locale } = useLanguage();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [loadedUrl, setLoadedUrl] = useState<string | null>(null);
  const [, forceUpdate] = useState(0);
  const images = qrcode.images.filter((img) => !img.includes('.mp4'));

  const character = characters.find((c) => c.id === qrcode.characterId);
  const characterName = character
    ? getCharacterName(character, locale)
    : qrcode.characterName;

  // Preload images and update when ready
  useEffect(() => {
    setCurrentImageIndex(0);
    setLoadedUrl(null);
    preloadImages(images);

    const unsubscribe = onCacheUpdate(() => {
      forceUpdate(n => n + 1);
    });

    return unsubscribe;
  }, [qrcode.id]);

  // Get current image URL from cache
  const currentSrc = images[currentImageIndex];
  const currentImageUrl = getCachedUrl(currentSrc);
  const isCurrentLoading = currentImageUrl !== loadedUrl;

  // Current post index in the list
  const currentPostIndex = qrcodes.findIndex((qr) => qr.id === qrcode.id);

  // Navigate between images (Left/Right)
  const handlePrevImage = () => {
    setCurrentImageIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
  };

  const handleNextImage = () => {
    setCurrentImageIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
  };

  // Navigate between posts (Up/Down)
  const handlePrevPost = () => {
    if (currentPostIndex > 0) {
      onNavigate(qrcodes[currentPostIndex - 1]);
    } else {
      onNavigate(qrcodes[qrcodes.length - 1]); // Loop to end
    }
  };

  const handleNextPost = () => {
    if (currentPostIndex < qrcodes.length - 1) {
      onNavigate(qrcodes[currentPostIndex + 1]);
    } else {
      onNavigate(qrcodes[0]); // Loop to start
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowLeft':
          handlePrevImage();
          break;
        case 'ArrowRight':
          handleNextImage();
          break;
        case 'ArrowUp':
          e.preventDefault();
          handlePrevPost();
          break;
        case 'ArrowDown':
          e.preventDefault();
          handleNextPost();
          break;
        case 'Escape':
          onClose();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [images.length, currentPostIndex, qrcodes.length, onClose]);

  // Download QR codes (or current image if QR is embedded)
  const handleDownload = async () => {
    // Get QR codes that have imgUrl (separate QR code images)
    const validQRCodes = qrcode.qrCodes
      .map((qr, index) => ({ qr, originalIndex: index }))
      .filter(item => item.qr.imgUrl && item.qr.imgUrl.trim() !== '');

    // Fallback: If no separate QR code images, download current displayed image
    // (QR code might be embedded in the screenshot)
    if (validQRCodes.length === 0) {
      const currentImage = images[currentImageIndex];
      if (!currentImage) {
        alert('No images available to download');
        return;
      }

      try {
        const response = await fetch(currentImage, {
          method: 'GET',
          credentials: 'omit',
          referrerPolicy: 'no-referrer',
        });

        if (!response.ok) {
          window.open(currentImage, '_blank');
          return;
        }

        const blob = await response.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        const timestamp = Date.now();

        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = `${qrcode.characterName}_QRCode_${timestamp}.jpg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        setTimeout(() => window.URL.revokeObjectURL(blobUrl), 100);
      } catch (error) {
        console.error('Download failed:', error);
        window.open(currentImage, '_blank');
      }
      return;
    }

    // Download each separate QR code image
    for (let i = 0; i < validQRCodes.length; i++) {
      const { qr, originalIndex } = validQRCodes[i];
      const imageUrl = qr.imgUrl!;

      try {
        // Setup timeout for fetch
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

        const response = await fetch(imageUrl, {
          method: 'GET',
          credentials: 'omit',
          referrerPolicy: 'no-referrer',
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          console.error(`Failed to download QR code ${i + 1}: ${qr.imgBtn}`);
          continue;
        }

        const blob = await response.blob();
        const blobUrl = window.URL.createObjectURL(blob);

        const qrCodeName = qr.imgBtn.replace(/[/\\?%*:|"<>]/g, '-');
        const timestamp = Date.now();

        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = `${qrcode.characterName}_${qrCodeName}_${timestamp}.jpg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        setTimeout(() => window.URL.revokeObjectURL(blobUrl), 100);

        if (i < validQRCodes.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      } catch (error) {
        console.error(`Download failed for QR code "${qr.imgBtn}":`, error);
        // Fallback to opening in new tab if fetch fails/timeouts
        window.open(imageUrl, '_blank');
      }
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
      onClick={onClose}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-white hover:text-gray-300 z-10"
      >
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* Main content */}
      <div
        className="relative max-w-5xl max-h-[90vh] w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Image */}
        <div className="relative aspect-[4/3] bg-gray-900 rounded-lg overflow-hidden flex items-center justify-center">
          {/* Previous image (stays visible while new one loads) */}
          {loadedUrl && loadedUrl !== currentImageUrl && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={loadedUrl}
              alt=""
              className="absolute inset-0 w-full h-full object-contain"
              referrerPolicy="no-referrer"
            />
          )}

          {/* Loading spinner in corner */}
          {isCurrentLoading && (
            <div className="absolute top-4 right-4 z-20">
              <svg className="w-6 h-6 animate-spin text-white/70" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            </div>
          )}

          {/* Current image */}
          {currentImageUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              key={currentSrc}
              src={currentImageUrl}
              alt="QRCode Face"
              className={`max-w-full max-h-full object-contain transition-opacity duration-200 ${isCurrentLoading ? 'opacity-0' : 'opacity-100'}`}
              referrerPolicy="no-referrer"
              onLoad={() => setLoadedUrl(currentImageUrl)}
            />
          ) : (
            <span className="text-gray-500">No image</span>
          )}
        </div>

        {/* Left/Right arrows - navigate images in same post */}
        {images.length > 1 && (
          <>
            <button
              onClick={handlePrevImage}
              className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-black/50 text-white rounded-full hover:bg-black/70"
              title="Previous image (←)"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={handleNextImage}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-black/50 text-white rounded-full hover:bg-black/70"
              title="Next image (→)"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </>
        )}

        {/* Up/Down navigation - keyboard only (↑↓), no visible buttons */}

        {/* Info panel - only name/date/download */}
        <div className="mt-4 p-4 bg-gray-900 rounded-lg text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 bg-blue-500 rounded-full text-sm font-medium">
                {characterName}
              </span>
              <span className="text-gray-400 text-sm">{qrcode.createDate}</span>
              {images.length > 1 && (
                <span className="text-gray-500 text-sm">
                  img {currentImageIndex + 1}/{images.length}
                </span>
              )}
              <span className="text-gray-600 text-sm">
                post {currentPostIndex + 1}/{qrcodes.length}
              </span>
            </div>
            <button
              onClick={handleDownload}
              className="px-4 py-2 bg-green-500 hover:bg-green-600 rounded-lg text-sm font-medium flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              {(() => {
                const qrCount = qrcode.qrCodes.filter(qr => qr.imgUrl).length;
                return qrCount > 0 ? `Download QR (${qrCount})` : 'Download QR';
              })()}
            </button>
          </div>

          {/* QR Code links - always show section */}
          <div className="mt-3 pt-3 border-t border-gray-700">
            <div className="text-xs text-gray-500 mb-2">QR Codes:</div>
            {qrcode.qrCodes.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {qrcode.qrCodes.map((qr, index) => (
                  <a
                    key={index}
                    href={qr.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 bg-purple-500 hover:bg-purple-600 rounded-lg text-sm"
                  >
                    {qr.imgBtn || `QR ${index + 1}`}
                  </a>
                ))}
              </div>
            ) : (
              <span className="text-gray-600 text-sm">—</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
