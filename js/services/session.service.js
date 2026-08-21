import { API_BASE } from '../utils.js';

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
  const handleLogout = async (e) => {
    e.preventDefault();
    if (confirm('Apakah Anda yakin ingin keluar dari Divenic?')) {
      try {
        await fetch(`${API_BASE}/auth/logout`, {
          method: 'POST',
          credentials: 'include'
        });
      } catch (err) {
        console.error('[Logout] Error calling logout API:', err);
      }
      clearSession();
      window.location.href = 'login.html';
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
export async function guardSession(key = 'gender', redirect = 'login.html') {
  const session = getSession();
  const currentPath = window.location.pathname.split('/').pop() || 'index.html';

  // 1. Cek dulu sessionStorage: jika mode === 'guest' DAN gender === 'male', izinkan
  if (session.mode === 'guest' && session.gender === 'male') {
    return;
  }

  // 2. Cek jika guard berbasis 'mode' (misalnya gender.html)
  if (key === 'mode') {
    if (!session.mode && currentPath !== redirect) {
      window.location.replace(redirect);
    }
    return;
  }

  // 3. Verifikasi sesi backend via GET /api/auth/me
  try {
    const res = await fetch(`${API_BASE}/auth/me`, { credentials: 'include' });
    const data = await res.json();

    if (res.ok && data.gender) {
      setSession({
        mode: 'account',
        gender: data.gender,
        memberId: data.memberId || null,
        nickname: data.name || ''
      });

      if (data.gender === 'female') {
        if (currentPath !== 'coming-soon.html') {
          window.location.replace('coming-soon.html');
        }
        return;
      }

      if (data.gender === 'male') {
        return;
      }
    }

    if (data && data.gender === 'female') {
      window.location.replace('coming-soon.html');
    } else if (currentPath !== redirect) {
      window.location.replace(redirect);
    }
  } catch (err) {
    console.error('[SessionGuard] Auth check error:', err);
    if (currentPath !== redirect) {
      window.location.replace(redirect);
    }
  }
}