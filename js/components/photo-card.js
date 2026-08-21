import { el } from '../utils.js';
import { getGalleryPhoto } from '../services/cloudinary.service.js';
import { lazyLoadImage } from '../services/image.service.js';

// Render caption photo
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

// Render photo
export function renderPhotoBatch(allPhotos, offset, limit, grid) {
  const batch = allPhotos.slice(offset, offset + limit);
  batch.forEach((photo, i) => grid.appendChild(buildPhotoCard(photo, offset + i)));
  return batch.length;
}