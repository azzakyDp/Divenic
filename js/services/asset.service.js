/* ============================================================
   DIVENIC — asset.service.js
   Manages local static assets, logos, and placeholders.
   ============================================================ */

export const LOCAL_ASSETS = {
  logo: 'asset/logo.png',
  placeholder: 'asset/icons/person.png'
};

/**
 * Returns the path to the default local avatar placeholder image
 * @returns {string}
 */
export function getPlaceholder() {
  return LOCAL_ASSETS.placeholder;
}

export function optimazeCloudinary(url, width = 100, height = 100) {
  if (!url || !url.includes('res.cloudinary.com')) return url;
  return url.replace(`/upload/`, `/upload/w_${width},h_${height},c_fill,q_auto,f_auto/`)
}