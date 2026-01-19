'use client';

import { useState, useMemo, useEffect } from 'react';
import { QRCode, Character, getCharacterName } from '@/types';
import { useLanguage } from '@/contexts/LanguageContext';
import Lightbox from './Lightbox';

interface FeaturedCardProps {
  qrcodes: QRCode[];
  characters: Character[];
}

export default function FeaturedCard({ qrcodes, characters }: FeaturedCardProps) {
  const { locale, t } = useLanguage();
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [showLightbox, setShowLightbox] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  // Get latest posts (excluding untagged)
  const latestPosts = useMemo(() => {
    return qrcodes
      .filter((qr) => qr.characterId !== 'untagged')
      .sort((a, b) => b.createTime - a.createTime)
      .slice(0, 10);
  }, [qrcodes]);

  // Auto-play carousel
  useEffect(() => {
    if (isPaused || latestPosts.length <= 1) return;

    const interval = setInterval(() => {
      setSelectedImageIndex((prev) => (prev + 1) % latestPosts.length);
    }, 1500); // Change slide every 1.5 seconds

    return () => clearInterval(interval);
  }, [isPaused, latestPosts.length]);

  const selectedPost = latestPosts[selectedImageIndex];

  if (!selectedPost) return null;

  const character = characters.find((c) => c.id === selectedPost.characterId);
  const characterName = character
    ? getCharacterName(character, locale)
    : selectedPost.characterName;

  return (
    <section className="w-full max-w-4xl mx-auto px-4">
      <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-4">
        {t('featured.title')}
      </h2>

      {/* Glassmorphism Container */}
      <div
        className="relative bg-white/10 dark:bg-white/5 backdrop-blur-lg rounded-2xl border border-white/20 dark:border-white/10 p-6 shadow-xl"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        <div className="flex flex-col md:flex-row gap-6">
          {/* Main Image */}
          <div
            className="flex-shrink-0 w-full md:w-64 aspect-square rounded-xl overflow-hidden cursor-pointer group"
            onClick={() => setShowLightbox(true)}
          >
            {selectedPost.images[0] ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={selectedPost.images[0]}
                alt={characterName}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-full h-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                <span className="text-gray-400">No image</span>
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                {selectedPost.userAvatar ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={selectedPost.userAvatar}
                    alt={selectedPost.userName || 'User'}
                    className="w-10 h-10 rounded-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold">
                    {(selectedPost.userName || characterName).charAt(0)}
                  </div>
                )}
                <div>
                  <h3 className="font-semibold text-gray-800 dark:text-gray-200">
                    {selectedPost.userName || characterName}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {selectedPost.createDate}
                  </p>
                </div>
              </div>

              {selectedPost.text && (
                <p className="text-gray-600 dark:text-gray-300 text-sm mt-4 line-clamp-3">
                  {selectedPost.text}
                </p>
              )}
            </div>

            <div className="mt-4">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {selectedPost.images.length} {t('lightbox.images')}
              </span>
            </div>
          </div>
        </div>

        {/* Thumbnail Slider */}
        <div className="mt-6 flex gap-2 overflow-x-auto pb-2">
          {latestPosts.map((post, index) => {
            const postChar = characters.find((c) => c.id === post.characterId);
            return (
              <button
                key={post.id}
                onClick={() => setSelectedImageIndex(index)}
                className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${index === selectedImageIndex
                  ? 'border-blue-500 scale-105'
                  : 'border-transparent opacity-70 hover:opacity-100'
                  }`}
                title={postChar ? getCharacterName(postChar, locale) : post.characterName}
              >
                {post.images[0] ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={post.images[0]}
                    alt=""
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-full h-full bg-gray-300 dark:bg-gray-600" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Lightbox */}
      {showLightbox && (
        <Lightbox
          qrcode={selectedPost}
          qrcodes={latestPosts}
          characters={characters}
          onClose={() => setShowLightbox(false)}
          onNavigate={(qr) => {
            const index = latestPosts.findIndex((p) => p.id === qr.id);
            if (index !== -1) setSelectedImageIndex(index);
          }}
        />
      )}
    </section>
  );
}
