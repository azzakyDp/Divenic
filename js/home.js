/* ============================================================
   DIVENIC — home.js
   Orkestrator halaman utama (Hero Carousel)
   ============================================================ */

import { qs, qsa } from './utils.js';

let activeCarouselTimer = null;

/**
 * Initialize hero carousel
 */
export function initCarousel() {
  const slides  = qsa('.carousel-slide');
  const dots    = qs('.carousel-dots');
  const prevBtn = qs('.carousel-btn.prev');
  const nextBtn = qs('.carousel-btn.next');

  if (!slides.length) return;

  if (activeCarouselTimer) {
    clearInterval(activeCarouselTimer);
    activeCarouselTimer = null;
  }

  let current = 0;
  const AUTO_DELAY = 5000;

  // Build dots
  if (dots) {
    dots.innerHTML = '';
    slides.forEach((_, i) => {
      const dot = document.createElement('button');
      dot.className = 'carousel-dot' + (i === 0 ? ' active' : '');
      dot.setAttribute('aria-label', `Slide ${i + 1}`);
      dot.addEventListener('click', () => goTo(i));
      dots.appendChild(dot);
    });
  }

  function goTo(n) {
    slides[current].classList.remove('active');
    updateDot(current, false);
    current = (n + slides.length) % slides.length;
    slides[current].classList.add('active');
    updateDot(current, true);

    // Update mobile blur background
    const activeImg = slides[current].querySelector('img');
    if (activeImg) {
      updateSliderBackground(activeImg);
    }

    // Prefetch the next hero slide's image to ensure seamless transitions
    const nextIdx = (current + 1) % slides.length;
    const nextImg = slides[nextIdx]?.querySelector('img');
    if (nextImg && !nextImg.complete) {
      const src = nextImg.src;
      if (src) {
        const link = document.createElement('link');
        link.rel = 'preload';
        link.as = 'image';
        link.href = src;
        document.head.appendChild(link);
      }
    }
  }

  function updateDot(i, active) {
    if (!dots) return;
    const allDots = dots.querySelectorAll('.carousel-dot');
    if (allDots[i]) allDots[i].classList.toggle('active', active);
  }

  function startAuto() {
    if (activeCarouselTimer) clearInterval(activeCarouselTimer);
    activeCarouselTimer = setInterval(() => goTo(current + 1), AUTO_DELAY);
  }

  function resetAuto() {
    startAuto();
  }

  if (prevBtn) prevBtn.addEventListener('click', () => { goTo(current - 1); resetAuto(); });
  if (nextBtn) nextBtn.addEventListener('click', () => { goTo(current + 1); resetAuto(); });

  // Touch/swipe support
  let touchX = null;
  const hero = qs('#hero');
  if (hero) {
    hero.addEventListener('touchstart', e => { touchX = e.touches[0].clientX; }, { passive: true });
    hero.addEventListener('touchend', e => {
      if (touchX === null) return;
      const dx = e.changedTouches[0].clientX - touchX;
      if (Math.abs(dx) > 40) {
        dx < 0 ? goTo(current + 1) : goTo(current - 1);
        resetAuto();
      }
      touchX = null;
    }, { passive: true });
  }

  // Init initial active slide
  slides[0]?.classList.add('active');
  const initialImg = slides[0]?.querySelector('img');
  if (initialImg) {
    updateSliderBackground(initialImg);
  }
  startAuto();
}

/**
 * Update the blurred background for mobile carousel slider
 * @param {HTMLImageElement} activeSlideImg
 */
function updateSliderBackground(activeSlideImg) {
  const bg = document.querySelector('.slider-background');
  if (!bg) return;
  // Apply only on mobile breakpoint (e.g. <= 480px width)
  if (window.innerWidth > 480) {
    bg.style.display = 'none';
    return;
  }
  bg.style.display = 'block';
  bg.style.backgroundImage = `url(${activeSlideImg.src})`;
}
