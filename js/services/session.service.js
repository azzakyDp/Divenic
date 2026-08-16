/* ============================================================
   DIVENIC — session.service.js
   Manages user/guest session state in sessionStorage
   ============================================================ */

const KEY = 'divenic_session';

/**
 * Get the current session state object
 * @returns {object}
 */
export function getSession() {
  try {
    return JSON.parse(sessionStorage.getItem(KEY)) || {};
  } catch {
    return {};
  }
}

/**
 * Merge new properties into the session state
 * @param {object} patch
 */
export function setSession(patch) {
  const current = getSession();
  sessionStorage.setItem(KEY, JSON.stringify({ ...current, ...patch }));
}

/**
 * Remove the session state entirely
 */
export function clearSession() {
  sessionStorage.removeItem(KEY);
}

/**
 * Consolidated logout handler for nav items
 */
export function bindLogoutHandler() {
  const handleLogout = (e) => {
    e.preventDefault();
    if (confirm('Apakah Anda yakin ingin keluar dari Divenic?')) {
      clearSession();
      window.location.href = 'landing.html';
    }
  };
  document.getElementById('btn-logout')?.addEventListener('click', handleLogout);
  document.getElementById('btn-logout-mobile')?.addEventListener('click', handleLogout);
}

/**
 * Centrally guards page sessions and performs redirects
 * @param {string} key - Session state key to validate
 * @param {string} redirect - Destination page URL
 */
export function guardSession(key = 'gender', redirect = 'landing.html') {
  const session = getSession();
  const currentPath = window.location.pathname.split('/').pop() || 'index.html';
  if (!session[key] && currentPath !== redirect) {
    window.location.replace(redirect);
  }
}
