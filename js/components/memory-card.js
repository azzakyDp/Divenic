/* ============================================================
   DIVENIC — components/memory-card.js
   Builder untuk satu memory-wall card.
   ============================================================ */

import { el } from '../utils.js';

/**
 * @param {object} data - { type, message, author }
 * @param {number} index
 * @returns {HTMLElement}
 */
export function buildMemoryCard(data, index = 0) {
  const card = el('article', 'memory-card');

  const typeLabels = {
    harapan:   'Harapan',
    kesan:     'Kesan',
    'cita-cita': 'Cita-cita',
    pesan:     'Pesan'
  };

  const type = data.type || 'pesan';
  const message = data.message || 'Tiada pesan.';
  const author = data.author || 'Anonim';

  card.innerHTML = `
    <span class="memory-type-badge">${typeLabels[type] || type}</span>
    <span class="memory-quote-mark" aria-hidden="true">"</span>
    <p class="memory-text">${message}</p>
    <span class="memory-author">${author}</span>
  `;

  return card;
}
