import { el, formatDate } from '../utils.js';
import { getGalleryPhoto } from '../services/cloudinary.service.js';
import { lazyLoadImage } from '../services/image.service.js';

/**
 * @param {object} data - { date, category, title, description, image }
 * @param {number} index - posisi dalam list (untuk stagger reveal)
 * @returns {HTMLElement}
 */
export function buildEventCard(data, index = 0) {
  const item = el('div', 'timeline-item');
  item.setAttribute('data-reveal', index % 2 === 0 ? 'left' : 'right');

  const title = data.title || 'Kisah Perjalanan';
  const category = data.category || 'Event';
  const desc = data.description || '';
  const imageUrl = getGalleryPhoto(data.image);

  item.innerHTML = `
    <div class="timeline-media">
      <img
        alt="${title}"
        loading="lazy"
      >
    </div>
    <div class="timeline-info">
      <span class="timeline-date">${formatDate(data.date)}</span>
      <span class="timeline-category">${category}</span>
      <h3 class="timeline-title">${title}</h3>
      <p class="timeline-desc">${desc}</p>
    </div>
  `;

  const img = item.querySelector('img');
  lazyLoadImage(img, imageUrl);

  return item;
}
