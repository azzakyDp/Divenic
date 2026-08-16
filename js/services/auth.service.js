/* ============================================================
   DIVENIC — auth.service.js
   Auth Service for validating user role & session mode
   ============================================================ */

import { getSession } from './session.service.js';

/**
 * Get current session user details
 * @returns {{ mode: string, gender: string, memberId: string|null, nickname: string }}
 */
export function getCurrentUser() {
  const session = getSession();
  return {
    mode: session.mode || 'guest',
    gender: session.gender || 'male',
    memberId: session.memberId || null,
    nickname: session.nickname || 'Tamu'
  };
}

/**
 * Checks if current user is browsing in Guest mode
 * @returns {boolean}
 */
export function isGuest() {
  const user = getCurrentUser();
  return user.mode === 'guest' || !user.memberId;
}

/**
 * Checks if current user is logged in as an authenticated Member
 * @returns {boolean}
 */
export function isMember() {
  const user = getCurrentUser();
  return user.mode === 'account' && Boolean(user.memberId);
}
