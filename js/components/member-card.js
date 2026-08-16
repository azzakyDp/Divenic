import { el } from '../utils.js';
import { getMemberAvatar } from '../services/cloudinary.service.js';
import { lazyLoadImage } from '../services/image.service.js';

export function buildMemberCard(data, index = 0) {
  const card = el('article', 'member-card');
  card.dataset.id = data.id;
  const name = data.name || 'Member Divenic';
  const nick = data.nickname || name.split(' ')[0] || 'Member';
  card.setAttribute('aria-label', `Profil ${name}`);
  card.setAttribute('data-reveal', '');

  const quote = data.quote ? `"${data.quote}"` : '';
  const ig = data.instagram?.trim();
  const avatarUrl = getMemberAvatar(data);

  card.innerHTML = `
    <div class="mc-photo">
      <img
        alt="Foto ${nick}"
        loading="lazy"
      >
    </div>
    <div class="mc-panel">
      <p class="mc-nick">${nick}</p>
      <p class="mc-full">${name}</p>
      ${data.class ? `<p class="mc-class">${data.class}</p>` : ''}
      ${quote ? `<p class="mc-quote">${quote}</p>` : ''}
      ${ig ? `
      <div class="mc-sosmed">
        <a href="https://instagram.com/${ig}" target="_blank" rel="noopener"
           class="mc-ig" aria-label="Instagram ${nick}">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
               aria-hidden="true">
            <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
            <circle cx="12" cy="12" r="4"/>
            <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/>
          </svg>
          @${ig}
        </a>
      </div>` : ''}
    </div>
  `;

  const img = card.querySelector('.mc-photo img');
  lazyLoadImage(img, avatarUrl);

  return card;
}
