/* ============================================================
   DIVENIC — cloudinary.service.js
   Cloudinary URL builder, cloud parsing, presets, and transformations.
   ============================================================ */

import { getPlaceholder } from './asset.service.js';

const DEFAULT_CLOUD = 'dzbvomjmq';

/**
 * Extracts publicId and cloudName from a full Cloudinary URL.
 * Falls back to default values if not a Cloudinary URL.
 * @param {string} url
 * @returns {{ publicId: string, cloudName: string }}
 */
export function parseCloudinaryUrl(url) {
  if (!url) return { publicId: '', cloudName: DEFAULT_CLOUD };
  
  const match = url.match(/res\.cloudinary\.com\/([^/]+)\/(image|video)\/upload\/(?:v\d+\/)?(.+)/);
  if (match) {
    return {
      cloudName: match[1],
      publicId: match[3]
    };
  }
  return {
    cloudName: DEFAULT_CLOUD,
    publicId: url
  };
}

/**
 * Generates an optimized Cloudinary delivery URL with presets & options
 * @param {string} publicIdOrUrl
 * @param {object} [opts]
 * @returns {string}
 */
export function buildCloudinaryUrl(publicIdOrUrl, opts = {}) {
  if (!publicIdOrUrl) return getPlaceholder();

  // If it's a non-Cloudinary external URL, return it directly
  if (publicIdOrUrl.startsWith('http') && !publicIdOrUrl.includes('res.cloudinary.com')) {
    return publicIdOrUrl;
  }

  let { publicId, cloudName } = parseCloudinaryUrl(publicIdOrUrl);

  // Auto DPR detection if supported
  const dpr = typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1;
  const dprVal = dpr > 1 ? Math.min(Math.round(dpr * 10) / 10, 3) : null;

  const finalOpts = {
    q: 'auto',
    f: 'auto',
    ...(dprVal ? { dpr: dprVal } : {}),
    ...opts
  };

  const transform = Object.entries(finalOpts)
    .map(([k, v]) => `${k}_${v}`)
    .join(',');

  return `https://res.cloudinary.com/${cloudName}/image/upload/${transform ? transform + '/' : ''}${publicId}`;
}

/**
 * Contextual image preset builders
 */

export function getHeroImage(publicId, opts = {}) {
  return buildCloudinaryUrl(publicId, { w: 1200, ...opts });
}

export function getMemberAvatar(member, opts = {}) {
  const avatar = typeof member === 'string' ? member : member?.avatar;
  return buildCloudinaryUrl(avatar, { w: 300, h: 400, c: 'fill', g: 'face', ...opts });
}

export function getMentorPhoto(mentor, opts = {}) {
  const avatar = typeof mentor === 'string' ? mentor : mentor?.avatar;
  return buildCloudinaryUrl(avatar, { w: 300, h: 400, c: 'fill', ...opts });
}

export function getGalleryPhoto(photo, opts = {}) {
  const url = typeof photo === 'string' ? photo : photo?.url;
  return buildCloudinaryUrl(url, { w: 600, ...opts });
}

export function getThumbnail(publicId, opts = {}) {
  return buildCloudinaryUrl(publicId, { w: 150, h: 150, c: 'thumb', ...opts });
}

export function getBackground(publicId, opts = {}) {
  return buildCloudinaryUrl(publicId, { w: 1440, q: 75, ...opts });
}

export function getVideoPoster(publicId, opts = {}) {
  return buildCloudinaryUrl(publicId, { w: 800, ...opts });
}

/**
 * Builds a dynamic video URL from Cloudinary.
 * @param {string} publicIdOrUrl
 * @returns {string}
 */
export function getVideoUrl(publicIdOrUrl) {
  if (!publicIdOrUrl) return '';

  let parsedId = publicIdOrUrl;
  let cloudName = DEFAULT_CLOUD;
  
  const match = publicIdOrUrl.match(/res\.cloudinary\.com\/([^/]+)\/video\/upload\/(?:v\d+\/)?(.+)/);
  if (match) {
    cloudName = match[1];
    parsedId = match[2];
  } else if (publicIdOrUrl.startsWith('http://') || publicIdOrUrl.startsWith('https://')) {
    return publicIdOrUrl;
  }

  return `https://res.cloudinary.com/${cloudName}/video/upload/${parsedId}`;
}
