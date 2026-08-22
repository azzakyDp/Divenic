const INTRO_PREFIX = 'divenic_member_intro_';

/**
 * Check if a specific member has already seen the intro animation in current login session
 * @param {string} memberId 
 * @returns {boolean}
 */
export function getMemberIntroSeen(memberId) {
  if (!memberId) return false;
  try {
    return sessionStorage.getItem(`${INTRO_PREFIX}${memberId}`) === 'true';
  } catch {
    return false;
  }
}

/**
 * Mark intro as seen for current login session for a specific member
 * @param {string} memberId 
 */
export function setMemberIntroSeen(memberId) {
  if (!memberId) return;
  try {
    sessionStorage.setItem(`${INTRO_PREFIX}${memberId}`, 'true');
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
      sessionStorage.removeItem(`${INTRO_PREFIX}${memberId}`);
      localStorage.removeItem(`${INTRO_PREFIX}${memberId}`);
    } else {
      // Clear all intro keys from sessionStorage
      const sKeys = [];
      for (let i = 0; i < sessionStorage.length; i++) {
        const k = sessionStorage.key(i);
        if (k && (k.startsWith(INTRO_PREFIX) || k.startsWith('divenic_intro'))) {
          sKeys.push(k);
        }
      }
      sKeys.forEach(k => sessionStorage.removeItem(k));

      // Clear all legacy/new intro keys from localStorage
      const lKeys = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && (k.startsWith(INTRO_PREFIX) || k.startsWith('divenic_intro'))) {
          lKeys.push(k);
        }
      }
      lKeys.forEach(k => localStorage.removeItem(k));
    }
  } catch (err) {
    console.error('[StorageService] Error resetting intro status:', err);
  }
}