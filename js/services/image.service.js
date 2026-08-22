import { getPlaceholder } from './asset.service.js';
import { buildCloudinaryUrl, getVideoUrl } from './cloudinary.service.js';
import { getOrCacheUrl } from './cache.service.js';

// Single IntersectionObserver 
let centralizedObserver = null;

// Before user 200px scroll
function getObserverInstance() {
  if (!centralizedObserver) {
    centralizedObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target;
          triggerImageLoad(img);
          centralizedObserver.unobserve(img);
        }
      });
    }, {
      rootMargin: '200px 0px',
      threshold: 0.01
    });
  }
  return centralizedObserver;
}

/**
 * Triggers loading & decoding of the observed offscreen image before revealing it.
 * @param {HTMLImageElement} img
 */
function triggerImageLoad(img) {
  const targetSrc = img.dataset.src;
  if (!targetSrc) return;

  // Create an offscreen image to load and decode
  const tempImg = new Image();
  tempImg.src = targetSrc;

  // Set visual loading state
  img.classList.add('img-loading');

  const reveal = () => {
    img.style.opacity = '0.5';

    setTimeout(() => {
      img.src = targetSrc;
      img.removeAttribute('data-src');

      requestAnimationFrame(() => {
        img.classList.remove('img-loading');
        img.classList.add('img-loaded');
        img.style.opacity = '1';
      });
    }, 40);

    tempImg.onload = null;
    tempImg.onerror = null;
  };

  if ('decode' in tempImg) {
    tempImg.decode()
      .then(reveal)
      .catch(() => {
        reveal();
      });
  } else {
    tempImg.onload = reveal;
    tempImg.onerror = reveal;
  }
}

/**
 * Register an image element for progressive lazy loading
 * @param {HTMLImageElement} img
 * @param {string} src
 */
export function lazyLoadImage(img, src) {
  if (!img) return;

  // Attach progressive rendering CSS class
  img.classList.add('img-lazy-transition');

  // Set default placeholder while loading
  img.src = getPlaceholder();
  img.dataset.src = src;

  // Observe element
  getObserverInstance().observe(img);
}

/**
 * Scan the DOM for elements with data-public-id and resolve them to optimized Cloudinary URLs
 */
export function resolveStaticAssets() {
  // Resolve all images with data-public-id
  document.querySelectorAll('img[data-public-id]').forEach(img => {
    const publicId = img.getAttribute('data-public-id');
    const optimizedUrl = getOrCacheUrl(`img:${publicId}`, () => buildCloudinaryUrl(publicId));

    // Eager images (like hero slides) load instantly, others are lazy-loaded progressive
    if (img.getAttribute('loading') === 'eager') {
      img.src = optimizedUrl;
      img.classList.add('img-loaded');
    } else {
      lazyLoadImage(img, optimizedUrl);
    }
  });

  // Resolve video poster
  document.querySelectorAll('video[data-public-id]').forEach(vid => {
    const publicId = vid.getAttribute('data-public-id');
    const optimizedUrl = getOrCacheUrl(`poster:${publicId}`, () => buildCloudinaryUrl(publicId));
    vid.poster = optimizedUrl;
  });

  // Resolve source elements in video
  document.querySelectorAll('source[data-public-id]').forEach(source => {
    const publicId = source.getAttribute('data-public-id');
    source.src = getVideoUrl(publicId);
    source.parentElement?.load();
  });
}

// Global capture-phase error listener for images to serve fallback placeholders
window.addEventListener('error', e => {
  if (e.target && e.target.tagName === 'IMG') {
    const img = e.target;
    if (img.dataset.fallbackTriggered) return;
    img.dataset.fallbackTriggered = 'true';
    img.src = getPlaceholder();
  }
}, true);