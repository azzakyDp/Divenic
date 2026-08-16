import { el } from '../utils.js';
import { getMentorPhoto } from '../services/cloudinary.service.js';
import { lazyLoadImage } from '../services/image.service.js';

export function buildMentorCard(data, index = 0) {
  const card = el('article', 'member-card mentor-card');
  card.dataset.id = data.id;
  const name = data.name || 'Mentor Divenic';
  const nick = data.nickname || data.nick || name.split(' ')[0] || 'Mentor';
  card.setAttribute('aria-label', `Profil mentor ${name}`);
  card.setAttribute('data-reveal', '');

  const avatarUrl = getMentorPhoto(data);

  card.innerHTML = `
    <div class="mc-photo">
      <img
        alt="Foto ${name}"
        loading="lazy"
      >
    </div>
    <div class="mc-panel">
      <p class="mc-nick">${nick}</p>
      <p class="mc-full">${name}</p>
      ${data.role ? `<p class="mc-class mc-role">${data.role}</p>` : ''}
    </div>
  `;

  const img = card.querySelector('.mc-photo img');
  lazyLoadImage(img, avatarUrl);

  return card;
}
