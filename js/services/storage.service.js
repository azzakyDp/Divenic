/* ============================================================
   DIVENIC — storage.service.js
   Manages persistent local storage state (member intro status, etc.)
   ============================================================ */

const INTRO_PREFIX = 'divenic_member_intro_';

/**
 * Check if a specific member has already seen the intro animation
 * @param {string} memberId 
 * @returns {boolean}
 */
export function getMemberIntroSeen(memberId) {
  if (!memberId) return false;
  try {
    return localStorage.getItem(`${INTRO_PREFIX}${memberId}`) === 'true';
  } catch {
    return false;
  }
}

/**
 * Mark intro as seen persistently for a specific member
 * @param {string} memberId 
 */
export function setMemberIntroSeen(memberId) {
  if (!memberId) return;
  try {
    localStorage.setItem(`${INTRO_PREFIX}${memberId}`, 'true');
  } catch (err) {
    console.error('[StorageService] Error saving intro status:', err);
  }
}

/**
 * Reset intro status for a specific member or all members
 * @param {string} [memberId] 
 */
export function resetMemberIntro(memberId) {
  try {
    if (memberId) {
      localStorage.removeItem(`${INTRO_PREFIX}${memberId}`);
    } else {
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith(INTRO_PREFIX)) {
          localStorage.removeItem(key);
        }
      });
    }
  } catch (err) {
    console.error('[StorageService] Error resetting intro status:', err);
  }
}
