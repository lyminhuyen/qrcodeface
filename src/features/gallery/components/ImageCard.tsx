'use client';

import type { QRCode } from '@/types';
import { getGalleryImages } from '@/features/gallery/lib/galleryImages';
import { preloadImages } from '@/features/gallery/lib/imageCache';

interface ImageCardProps {
  qrcode: QRCode;
  onClick: () => void;
}

export default function ImageCard({ qrcode, onClick }: ImageCardProps) {
  const displayImages = getGalleryImages(qrcode);
  const thumbnailUrl = displayImages[0]?.url;
  const commentQRCodeCount = displayImages.filter(
    (image) => image.source === 'author-comment'
  ).length;

  const handleMouseEnter = () => {
    preloadImages(displayImages.map((image) => image.url));
  };

  return (
    <div
      className="group relative bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
      onClick={onClick}
      onMouseEnter={handleMouseEnter}
    >
      {/* Thumbnail */}
      <div className="aspect-square relative">
        {thumbnailUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={thumbnailUrl}
            alt={qrcode.text || 'QRCode Face'}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-200 dark:bg-gray-700">
            <span className="text-gray-400 dark:text-gray-500">No image</span>
          </div>
        )}
      </div>

      {/* Overlay */}
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />

      {/* Character badge */}
      <div className="absolute top-2 left-2">
        <span
          className={`px-2 py-1 text-xs font-medium rounded-full ${qrcode.characterId === 'untagged'
              ? 'bg-gray-500 text-white'
              : 'bg-blue-500 text-white'
            }`}
        >
          {qrcode.characterName}
        </span>
      </div>

      {/* Date */}
      <div className="absolute bottom-2 right-2">
        <span className="px-2 py-1 text-xs bg-black/50 text-white rounded">
          {qrcode.createDate}
        </span>
      </div>

      {commentQRCodeCount > 0 && (
        <div className="absolute bottom-2 left-2">
          <span className="px-2 py-1 text-xs font-medium bg-amber-500 text-black rounded">
            Comment QR
          </span>
        </div>
      )}

      {/* Image count */}
      {displayImages.length > 1 && (
        <div className="absolute top-2 right-2">
          <span className="px-2 py-1 text-xs bg-black/50 text-white rounded">
            +{displayImages.length - 1}
          </span>
        </div>
      )}
    </div>
  );
}
