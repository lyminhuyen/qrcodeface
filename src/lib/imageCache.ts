// Global image cache - stores blob URLs
const cache: Record<string, string> = {};
const pending: Record<string, Promise<string>> = {};
const listeners: Set<() => void> = new Set();

export async function preloadImage(src: string): Promise<string> {
  if (src in cache) return cache[src];
  if (src in pending) return pending[src];

  pending[src] = fetch(src, { referrerPolicy: 'no-referrer', credentials: 'omit' })
    .then(res => res.blob())
    .then(blob => {
      const blobUrl = URL.createObjectURL(blob);
      cache[src] = blobUrl;
      delete pending[src];
      notifyListeners();
      return blobUrl;
    })
    .catch(() => {
      delete pending[src];
      return src;
    });

  return pending[src];
}

export function preloadImages(urls: string[]): void {
  urls.forEach(url => preloadImage(url));
}

export function getCachedUrl(src: string): string {
  return cache[src] || src;
}

export function isImageCached(src: string): boolean {
  return !!cache[src];
}

export function onCacheUpdate(callback: () => void): () => void {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

function notifyListeners(): void {
  listeners.forEach(cb => cb());
}
