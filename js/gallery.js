/* ============================================================
   DIVENIC — gallery.js  (refactored: lazy-load per batch)
   ============================================================ */

import { fetchData, qs, el, staggerReveal, isMobile, createLoadMoreButton, animateStaggeredReveal } from './utils.js';
import { buildEventCard } from './components/event-card.js';
import { buildPhotoCard, renderPhotoBatch } from './components/photo-card.js';
import { buildMemoryCard } from './components/memory-card.js';

const PHOTO_BATCH = 10;

/* ── Event Timeline ──────────────────────────── */

export async function initEventTimeline() {
  const timeline = qs('#event-timeline');
  if (!timeline) return;
  const events = await fetchData('data/events.json');
  if (!events) return;
  timeline.innerHTML = '';
  events.forEach((ev, i) => timeline.appendChild(buildEventCard(ev, i)));
  staggerReveal([...timeline.children], 0, 120);
}

/* ── Photo Gallery ───────────────────────────── */

export async function initGallery() {
  const grid = qs('#photo-grid');
  if (!grid) return;
  const albums = await fetchData('data/albums.json');
  if (!albums) return;

  const photos = albums.flatMap(a => a.photos.map(p => ({ ...p, albumTitle: a.title })));
  grid.innerHTML = '';

  // Mobile → tampil 10, tombol redirect ke gallery.html
  if (isMobile()) {
    renderPhotoBatch(photos, 0, PHOTO_BATCH, grid);
    staggerReveal([...grid.children], 0, 40);
    initLightbox(photos);

    if (photos.length > PHOTO_BATCH) {
      const wrap = createLoadMoreButton(
        `Lihat Semua ${photos.length} Foto →`,
        () => { window.location.href = 'gallery.html'; }
      );
      grid.parentElement.appendChild(wrap);
    }
    return;
  }

  // Desktop → lazy load per batch
  let offset = 0;
  offset += renderPhotoBatch(photos, 0, PHOTO_BATCH, grid);
  staggerReveal([...grid.children], 0, 40);
  initLightbox(photos);

  let btnWrap = null;

  function loadMore() {
    if (btnWrap) btnWrap.remove();
    const prevCount = grid.children.length;
    const added = renderPhotoBatch(photos, offset, PHOTO_BATCH, grid);
    const newCards = [...grid.children].slice(prevCount);
    offset += added;

    animateStaggeredReveal(newCards, 40);

    if (offset < photos.length) attachBtn();
  }

  function attachBtn() {
    const rem = photos.length - offset;
    btnWrap = createLoadMoreButton(
      `Muat ${Math.min(rem, PHOTO_BATCH)} Foto Lagi (sisa ${rem})`,
      loadMore
    );
    grid.parentElement.appendChild(btnWrap);
  }

  if (offset < photos.length) attachBtn();
}

/* ── Full gallery page (gallery.html) ───────── */

export async function initFullGallery() {
  const grid = qs('#photo-grid');
  if (!grid) return;
  const albums = await fetchData('data/albums.json');
  if (!albums) return;

  const photos = albums.flatMap(a => a.photos.map(p => ({ ...p, albumTitle: a.title })));
  grid.innerHTML = '';

  let offset = 0;
  const LIMIT = 12;

  offset += renderPhotoBatch(photos, 0, LIMIT, grid);
  staggerReveal([...grid.children], 0, 40);
  initLightbox(photos);

  const sentinel = el('div', 'gallery-sentinel');
  grid.parentElement.appendChild(sentinel);

  const obs = new IntersectionObserver(([entry]) => {
    if (!entry.isIntersecting || offset >= photos.length) return;
    const prev = grid.children.length;
    const added = renderPhotoBatch(photos, offset, LIMIT, grid);
    const newCards = [...grid.children].slice(prev);
    offset += added;
    animateStaggeredReveal(newCards, 40);
  }, { rootMargin: '200px' });

  obs.observe(sentinel);
}

/* ── Lightbox ────────────────────────────────── */

let activeLightboxKeydown = null;

function initLightbox(photos) {
  const lb = qs('#lightbox');
  const lbImg = lb?.querySelector('.lightbox-inner img');
  const lbCap = lb?.querySelector('.lightbox-caption');
  const lbClose = lb?.querySelector('.lightbox-close');
  if (!lb) return;

  let cur = 0;

  const open = i => {
    cur = i;
    const p = photos[i];
    if (!p) return;
    if (lbImg) { lbImg.src = p.url; lbImg.alt = p.caption; }
    if (lbCap) lbCap.textContent = p.caption;
    lb.classList.add('open');
    document.body.style.overflow = 'hidden';
  };

  const close = () => { lb.classList.remove('open'); document.body.style.overflow = ''; };

  const grid = qs('#photo-grid');
  if (grid && !grid.dataset.lightboxClickBound) {
    grid.dataset.lightboxClickBound = 'true';
    grid.addEventListener('click', e => {
      const item = e.target.closest('.photo-item');
      if (item) open(parseInt(item.dataset.index, 10));
    });
  }

  if (activeLightboxKeydown) {
    document.removeEventListener('keydown', activeLightboxKeydown);
  }

  activeLightboxKeydown = e => {
    if (!lb.classList.contains('open')) return;
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowRight') open((cur + 1) % photos.length);
    if (e.key === 'ArrowLeft') open((cur - 1 + photos.length) % photos.length);
  };

  document.addEventListener('keydown', activeLightboxKeydown);

  lbClose?.addEventListener('click', close);
  lb.addEventListener('click', e => { if (e.target === lb) close(); });
}

/* ── Memory Wall ─────────────────────────────── */

export async function initMemoryWall({ limit = null } = {}) {
  const grid = qs('#memory-grid');
  if (!grid) return;
  const messages = await fetchData('data/messages.json');
  if (!messages) return;

  grid.innerHTML = '';
  const active = limit === 'auto' ? (isMobile() ? 6 : 12) : (limit ?? messages.length);
  messages.slice(0, active).forEach((msg, i) => {
    const card = buildMemoryCard(msg, i);
    card.style.transitionDelay = `${i * 80}ms`;
    card.setAttribute('data-reveal', '');
    grid.appendChild(card);
  });
}
