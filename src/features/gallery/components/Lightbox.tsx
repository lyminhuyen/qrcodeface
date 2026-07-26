'use client';

import { useState, useEffect, useMemo } from 'react';
import { getCharacterName } from '@/types';
import type { QRCode, Character } from '@/types';
import { useLanguage } from '@/contexts/LanguageContext';
import { getCachedUrl, preloadImages, onCacheUpdate } from '@/features/gallery/lib/imageCache';
import { getGalleryImages } from '@/features/gallery/lib/galleryImages';
import { downloadQrAssets } from '@/features/gallery/lib/downloadQrAssets';
import { useLightboxNavigation } from '@/features/gallery/hooks/useLightboxNavigation';
import ShareButton from './ShareButton';

interface LightboxProps {
  qrcode: QRCode;
  qrcodes: QRCode[]; // Full list for navigation
  characters: Character[];
  onClose: () => void;
  onNavigate: (qrcode: QRCode) => void; // Navigate to different post
}

export default function Lightbox({ qrcode, qrcodes, characters, onClose, onNavigate }: LightboxProps) {
  const { locale, t } = useLanguage();
  const [loadedImage, setLoadedImage] = useState<{ postId: string; url: string } | null>(null);
  const [, forceUpdate] = useState(0);
  const displayImages = useMemo(() => getGalleryImages(qrcode), [qrcode]);
  const images = useMemo(() => displayImages.map((image) => image.url), [displayImages]);
  const { currentImageIndex, currentPostIndex, previousImage, nextImage } =
    useLightboxNavigation({
      qrcode,
      qrcodes,
      imageCount: images.length,
      onClose,
      onNavigate,
    });

  const character = characters.find((c) => c.id === qrcode.characterId);
  const characterName = character
    ? getCharacterName(character, locale)
    : qrcode.characterName;

  // Preload images and update when ready
  useEffect(() => {
    preloadImages(images);

    const unsubscribe = onCacheUpdate(() => {
      forceUpdate(n => n + 1);
    });

    return unsubscribe;
  }, [images]);

  // Get current image URL from cache
  const loadedUrl = loadedImage?.postId === qrcode.id ? loadedImage.url : null;
  const currentSrc = images[currentImageIndex];
  const currentImage = displayImages[currentImageIndex];
  const currentImageUrl = getCachedUrl(currentSrc);
  const isCurrentLoading = currentImageUrl !== loadedUrl;

  const handleDownload = () => downloadQrAssets(qrcode, images, currentImageIndex);

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

          {currentImage?.source === 'author-comment' && (
            <div className="absolute top-4 left-4 z-20 px-3 py-1.5 rounded-full bg-amber-500 text-black text-sm font-semibold">
              Author comment QR
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
              onLoad={() => setLoadedImage({ postId: qrcode.id, url: currentImageUrl })}
            />
          ) : (
            <span className="text-gray-500">No image</span>
          )}
        </div>

        {/* Left/Right arrows - navigate images in same post */}
        {images.length > 1 && (
          <>
            <button
              onClick={previousImage}
              className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-black/50 text-white rounded-full hover:bg-black/70"
              title="Previous image (←)"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={nextImage}
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
            <div className="flex items-center gap-2">
              <ShareButton qrcode={qrcode} />
              <button
                onClick={handleDownload}
                className="px-4 py-2 bg-green-500 hover:bg-green-600 rounded-lg text-sm font-medium flex items-center gap-2 min-h-[44px]"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                {(() => {
                  const qrCount = qrcode.qrCodes.filter(qr => qr.imgUrl).length;
                  return qrCount > 0 ? `${t('lightbox.download')} (${qrCount})` : t('lightbox.download');
                })()}
              </button>
            </div>
          </div>

          {/* QR Code links - always show section */}
          <div className="mt-3 pt-3 border-t border-gray-700">
            <div className="text-xs text-gray-500 mb-2">QR Codes:</div>
            {qrcode.qrCodes.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {qrcode.qrCodes.map((qr, index) => (
                  <a
                    key={index}
                    href={qr.url || qr.imgUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`px-3 py-1.5 rounded-lg text-sm flex items-center gap-2 ${
                      qr.source === 'author-comment'
                        ? 'bg-amber-500 hover:bg-amber-600 text-black'
                        : 'bg-purple-500 hover:bg-purple-600'
                    }`}
                  >
                    {qr.source === 'author-comment' && qr.imgUrl && (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={qr.imgUrl}
                        alt="Author comment QR"
                        className="w-8 h-8 rounded object-cover bg-white"
                        referrerPolicy="no-referrer"
                      />
                    )}
                    <span>
                      {qr.source === 'author-comment'
                        ? 'Comment QR'
                        : qr.imgBtn || `QR ${index + 1}`}
                    </span>
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
