'use client';

import { useState } from 'react';
import Image from 'next/image';
import { QRCode } from '@/types';

interface LightboxProps {
  qrcode: QRCode;
  onClose: () => void;
}

export default function Lightbox({ qrcode, onClose }: LightboxProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const images = qrcode.images.filter((img) => !img.includes('.mp4'));

  const handlePrev = () => {
    setCurrentImageIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
  };

  const handleNext = () => {
    setCurrentImageIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
  };

  const handleDownload = async () => {
    const imageUrl = images[currentImageIndex];
    if (!imageUrl) return;

    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `qrcode-${qrcode.id}-${currentImageIndex + 1}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
      // Fallback: open in new tab
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
        <div className="relative aspect-[4/3] bg-gray-900 rounded-lg overflow-hidden">
          {images[currentImageIndex] && (
            <Image
              src={images[currentImageIndex]}
              alt={qrcode.text || 'QRCode Face'}
              fill
              className="object-contain"
              unoptimized
            />
          )}
        </div>

        {/* Navigation arrows */}
        {images.length > 1 && (
          <>
            <button
              onClick={handlePrev}
              className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-black/50 text-white rounded-full hover:bg-black/70"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={handleNext}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-black/50 text-white rounded-full hover:bg-black/70"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </>
        )}

        {/* Info panel */}
        <div className="mt-4 p-4 bg-gray-900 rounded-lg text-white">
          <div className="flex items-center justify-between mb-3">
            <div>
              <span className="px-3 py-1 bg-blue-500 rounded-full text-sm font-medium">
                {qrcode.characterName}
              </span>
              <span className="ml-3 text-gray-400 text-sm">{qrcode.createDate}</span>
            </div>
            <div className="flex gap-2">
              {/* Download button */}
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
          </div>

          {/* Text */}
          {qrcode.text && (
            <p className="text-gray-300 text-sm mb-3">{qrcode.text}</p>
          )}

          {/* QR Code links */}
          {qrcode.qrCodes.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {qrcode.qrCodes.map((qr, index) => (
                <a
                  key={index}
                  href={qr.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 bg-purple-500 hover:bg-purple-600 rounded-lg text-sm"
                >
                  {qr.imgBtn}
                </a>
              ))}
            </div>
          )}

          {/* Image counter */}
          {images.length > 1 && (
            <div className="mt-3 text-center text-gray-400 text-sm">
              {currentImageIndex + 1} / {images.length}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
