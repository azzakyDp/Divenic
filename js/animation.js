/* ============================================================
   DIVENIC — animation.js
   Orkestrator efek animasi, preloader/loading, dan navigasi scroll
   ============================================================ */

import { isMobile, qs } from './utils.js';
import { shouldPlayIntro, markIntroCompleted } from './services/intro.service.js';
import { getCurrentUser } from './services/auth.service.js';
import { resetMemberIntro } from './services/storage.service.js';

/**
 * Initialize the premium loading screen
 */
export function initLoadingScreen() {
  const screen = document.getElementById('loading-screen');
  if (!screen) return;

  // Global handle to hide loader when page fetches complete
  window.__hideLoading = () => {
    screen.classList.add('hidden');
  };

  // Fallback: force hide after 3 seconds
  setTimeout(() => {
    screen.classList.add('hidden');
  }, 3000);
}

/**
 * Run intro welcome animation then reveal main content
 */
export function initIntro() {
  const intro  = qs('#intro');
  const main   = qs('#main-content');
  const navbar = qs('#navbar');

  if (!intro || !main) return;

  // Check whether intro should play via IntroService
  if (!shouldPlayIntro()) {
    // Skip intro — show content immediately
    hideIntro(intro, main, navbar, false);
    return;
  }

  // Show intro welcome text
  const introDuration = isMobile() ? 2200 : 3200;

  intro.style.opacity = '1';
  main.style.opacity  = '0';

  setTimeout(() => {
    // Fade out intro
    intro.style.transition = 'opacity 0.8s ease';
    intro.style.opacity    = '0';

    setTimeout(() => {
      hideIntro(intro, main, navbar, true);
      markIntroCompleted();
    }, 800);
  }, introDuration);
}

function hideIntro(intro, main, navbar, animate) {
  intro.style.display  = 'none';
  main.style.opacity   = animate ? '0' : '1';
  main.style.display   = 'block';

  if (navbar) navbar.classList.add('visible');

  if (animate) {
    requestAnimationFrame(() => {
      main.style.transition = 'opacity 0.6s ease';
      main.style.opacity    = '1';
    });
  }
}

/**
 * Reset intro on logo click (for members testing intro reset)
 */
export function bindLogoReset() {
  const logo = qs('#nav-logo-link');
  if (!logo) return;

  logo.addEventListener('click', () => {
    const { memberId } = getCurrentUser();
    if (memberId) {
      resetMemberIntro(memberId);
    }
  });
}

/**
 * Navbar scroll visual adjustments
 */
export function initNavbar() {
  const navbar = qs('#navbar');
  if (!navbar) return;

  const update = () => {
    const y = window.scrollY;
    navbar.classList.toggle('visible',  y > 10);
    navbar.classList.toggle('scrolled', y > 60);
  };

  window.addEventListener('scroll', update, { passive: true });
  update();
}

/**
 * Mobile hamburger overlay navigation
 */
export function initMobileMenu() {
  const hamburger = qs('#hamburger');
  const mobileMenu = qs('#mobile-menu');
  const overlay   = qs('#menu-overlay');

  if (!hamburger || !mobileMenu) return;

  function openMenu() {
    hamburger.classList.add('open');
    mobileMenu.classList.add('open');
    if (overlay) overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeMenu() {
    hamburger.classList.remove('open');
    mobileMenu.classList.remove('open');
    if (overlay) overlay.classList.remove('open');
    document.body.style.overflow = '';
  }

  hamburger.addEventListener('click', () => {
    hamburger.classList.contains('open') ? closeMenu() : openMenu();
  });

  if (overlay) overlay.addEventListener('click', closeMenu);

  mobileMenu.querySelectorAll('.mobile-nav-link').forEach(link => {
    link.addEventListener('click', closeMenu);
  });
}
