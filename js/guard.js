// js/guard.js
import { isMember, getCurrentUser } from './services/auth.service.js';

const API = 'http://localhost:3000/api';

export async function requireAuth() {
  // Local session check first
  if (isMember()) {
    return getCurrentUser();
  }

  try {
    const res = await fetch(`${API}/auth/me`, {
      credentials: 'include',
    });
    if (!res.ok) throw new Error('unauthorized');
    return await res.json();
  } catch {
    window.location.href = 'login.html';
  }
}
