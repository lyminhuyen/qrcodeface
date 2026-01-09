'use client';

import { useState, useEffect } from 'react';
import { QRCode } from '@/types';

interface LightboxProps {
  qrcode: QRCode;
  qrcodes: QRCode[]; // Full list for navigation
  onClose: () => void;
  onNavigate: (qrcode: QRCode) => void; // Navigate to different post
}

export default function Lightbox({ qrcode, qrcodes, onClose, onNavigate }: LightboxProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const images = qrcode.images.filter((img) => !img.includes('.mp4'));

  // Reset image index and loading state when post changes
  useEffect(() => {
    setCurrentImageIndex(0);
    setIsLoading(true);
  }, [qrcode.id]);

  // Set loading when image index changes
  useEffect(() => {
    setIsLoading(true);
  }, [currentImageIndex]);

  // Preload adjacent images for faster navigation
  useEffect(() => {
    const preloadImages = [
      images[currentImageIndex - 1],
      images[currentImageIndex + 1],
    ].filter(Boolean);

    preloadImages.forEach((src) => {
      const img = new Image();
      img.src = src;
    });
  }, [currentImageIndex, images]);

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

  // Direct download - open in new tab (no fetch delay)
  const handleDownload = () => {
    const imageUrl = images[currentImageIndex];
    if (imageUrl) {
      window.open(imageUrl, '_blank');
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
          {/* Loading spinner */}
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <svg className="w-10 h-10 animate-spin text-white/50" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            </div>
          )}
          {images[currentImageIndex] ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={images[currentImageIndex]}
              alt="QRCode Face"
              className={`max-w-full max-h-full object-contain transition-opacity ${isLoading ? 'opacity-0' : 'opacity-100'}`}
              referrerPolicy="no-referrer"
              onLoad={() => setIsLoading(false)}
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
                {qrcode.characterName}
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
              Download
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
