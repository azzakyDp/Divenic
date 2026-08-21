const isLocalDev = window.location.port === '5500';
export const API_BASE = isLocalDev
  ? `http://${window.location.hostname}:3000/api`
  : '/api';

const jsonCache = new Map();

// Fetch JSON data
export async function fetchData(path) {
  const isApi = path.includes('/api/');
  if (!isApi && jsonCache.has(path)) {
    return jsonCache.get(path);
  }
  try {
    const res = await fetch(path, { credentials: 'include' });
    if (!res.ok) throw new Error(`Failed to fetch ${path}: ${res.status}`);
    const data = await res.json();
    if (!isApi) jsonCache.set(path, data);
    return data;
  } catch (err) {
    console.error('[Divenic] fetchData error:', err);
    return null;
  }
}

// Format date str indonesian
export function formatDate(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
}

// Debounce
export function debounce(fn, wait = 200) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), wait);
  };
}

// Safe query selector
export function qs(selector, parent = document) {
  return parent.querySelector(selector);
}

export function qsa(selector, parent = document) {
  return [...parent.querySelectorAll(selector)];
}

// Create element
export function el(tag, className, attrs = {}) {
  const elem = document.createElement(tag);
  if (className) elem.className = className;
  for (const [key, val] of Object.entries(attrs)) {
    elem.setAttribute(key, val);
  }
  return elem;
}

// Mobile
export function isMobile() {
  return window.matchMedia('(max-width: 820px)').matches;
}

// Intersection Scroll
export function initScrollReveal() {
  const items = document.querySelectorAll('[data-reveal]');
  if (!items.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('revealed');
        observer.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.12,
    rootMargin: '0px 0px -40px 0px'
  });

  items.forEach(item => observer.observe(item));
}

// Cascade staggered reveal
export function staggerReveal(children, baseDelay = 0, step = 80) {
  children.forEach((child, i) => {
    child.style.transitionDelay = `${baseDelay + i * step}ms`;
    child.setAttribute('data-reveal', '');
  });
}

// Smooth scroll anchor links
export function initSmoothNav() {
  document.addEventListener('click', e => {
    const link = e.target.closest('a[href^="#"]');
    if (!link) return;

    const href = link.getAttribute('href');
    if (href === '#') return;

    const targetId = href.slice(1);
    const target = document.getElementById(targetId);
    if (!target) return;

    e.preventDefault();

    const nav = document.querySelector('#navbar');
    const navHeight = nav ? nav.offsetHeight : 64;
    const top = target.getBoundingClientRect().top + window.scrollY - navHeight - 16;

    window.scrollTo({ top, behavior: 'smooth' });

    // Update URL hash without reload
    history.pushState(null, '', `#${targetId}`);

    // If mobile menu is open, it is handled by the click listeners in animation.js
  });
}

// Active nav state
export function initNavActiveState() {
  const sections = [...document.querySelectorAll('section[id]')];
  const navLinks = [...document.querySelectorAll('.nav-link[href^="#"], .mobile-nav-link[href^="#"]')];

  if (!sections.length || !navLinks.length) return;

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const id = entry.target.id;
      navLinks.forEach(link => {
        const href = link.getAttribute('href');
        link.classList.toggle('active', href === `#${id}`);
      });
    });
  }, { rootMargin: '-40% 0px -55% 0px' });

  sections.forEach(s => observer.observe(s));
}

// Skeleton image loading
export function initImageSkeletons(root = document, selector = 'img') {
  root.querySelectorAll(selector).forEach(img => {
    if (img.dataset.src || img.classList.contains('img-lazy-transition')) return;
    if (img.complete) { img.classList.add('img-loaded'); return; }
    img.addEventListener('load', () => img.classList.add('img-loaded'), { once: true });
    img.addEventListener('error', () => img.classList.add('img-loaded'), { once: true });
  });
}

// Button load wrapper
export function createLoadMoreButton(label, onClick) {
  const wrap = el('div', 'view-more-wrap');
  const btn = el('button', 'btn-view-more');
  btn.textContent = label;
  btn.addEventListener('click', onClick);
  wrap.appendChild(btn);
  return wrap;
}

// Cascading staggered reveal transition delay helper
export function animateStaggeredReveal(elements, delayStep = 40) {
  requestAnimationFrame(() => {
    elements.forEach((c, i) => {
      c.style.transitionDelay = `${i * delayStep}ms`;
      c.classList.add('revealed');
    });
  });
}