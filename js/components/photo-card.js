/* ============================================================
   DIVENIC — components/photo-card.js
   Builder untuk satu photo/album card.
   ============================================================ */

import { el } from '../utils.js';
import { getGalleryPhoto } from '../services/cloudinary.service.js';
import { lazyLoadImage } from '../services/image.service.js';

/**
 * @param {object} data - { url, caption }
 * @param {number} index - indeks posisi foto dalam album (untuk data-index lightbox)
 * @returns {HTMLElement}
 */
export function buildPhotoCard(data, index = 0) {
  const item = el('div', 'photo-item');
  item.dataset.index = index;
  item.setAttribute('data-reveal', '');

  const photoUrl = getGalleryPhoto(data);

  item.innerHTML = `
    <img
      alt="${data.caption || 'Foto Yearbook'}"
      loading="lazy"
    >
    <div class="photo-overlay">
      <p class="photo-caption">${data.caption || ''}</p>
    </div>
  `;

  const img = item.querySelector('img');
  lazyLoadImage(img, photoUrl);

  return item;
}

/**
 * Render satu batch foto ke grid. Dipanggil ulang dengan offset baru
 * saat scroll mendekati bawah.
 * @param {Array} allPhotos - seluruh data foto (sudah di-fetch sekali di awal)
 * @param {number} offset
 * @param {number} limit
 * @param {HTMLElement} grid
 * @returns {number} jumlah foto yang baru ditambahkan (0 = habis)
 */
export function renderPhotoBatch(allPhotos, offset, limit, grid) {
  const batch = allPhotos.slice(offset, offset + limit);
  batch.forEach((photo, i) => grid.appendChild(buildPhotoCard(photo, offset + i)));
  return batch.length;
}
