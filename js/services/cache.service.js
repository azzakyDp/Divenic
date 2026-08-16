/* ============================================================
   DIVENIC — cache.service.js
   In-memory cache structures for generated URLs and preloaded media elements.
   ============================================================ */

export const UrlCache = new Map();
export const ElementCache = new WeakMap();
export const PrefetchCache = new Map();

/**
 * Resolves a URL from the in-memory cache, or generates and registers it.
 * @param {string} key - Cache lookup key
 * @param {function} generator - Callback function generating the URL if missing
 * @returns {string}
 */
export function getOrCacheUrl(key, generator) {
  if (UrlCache.has(key)) {
    return UrlCache.get(key);
  }
  const url = generator();
  UrlCache.set(key, url);
  return url;
}

/**
 * Prefetches an image and caches the Image object in memory to ensure instant delivery.
 * @param {string} url
 */
export function prefetchImage(url) {
  if (!url || PrefetchCache.has(url)) return;

  const img = new Image();
  img.src = url;
  PrefetchCache.set(url, img);
}
