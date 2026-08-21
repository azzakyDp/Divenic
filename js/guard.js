import { isMember, getCurrentUser } from './services/auth.service.js';
import { API_BASE } from './utils.js';

export async function requireAuth() {
  // Local session check first
  if (isMember()) {
    return getCurrentUser();
  }

  try {
    const res = await fetch(`${API_BASE}/auth/me`, {
      credentials: 'include',
    });
    if (!res.ok) throw new Error('unauthorized');
    return await res.json();
  } catch {
    window.location.href = 'login.html';
  }
}