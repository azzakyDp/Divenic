/* ============================================================
   DIVENIC — intro.service.js
   Intro Service for evaluating whether intro is played or skipped
   ============================================================ */

import { isGuest, isMember, getCurrentUser } from './auth.service.js';
import { getMemberIntroSeen, setMemberIntroSeen } from './storage.service.js';

/**
 * Determines if the intro welcome animation should play.
 * - Guest Mode: Always returns true (intro plays every time).
 * - Member Mode: Returns true on first login, false on subsequent logins.
 * @returns {boolean}
 */
export function shouldPlayIntro() {
  if (isGuest()) {
    // Guest mode: always play intro, do not check persistent status
    return true;
  }

  if (isMember()) {
    const { memberId } = getCurrentUser();
    // Member mode: check if this member ID has already seen the intro
    const hasSeen = getMemberIntroSeen(memberId);
    return !hasSeen;
  }

  return true; // Fallback
}

/**
 * Saves intro completion status.
 * - Guest Mode: No-op (never saves status).
 * - Member Mode: Persists intro seen flag for current member ID.
 */
export function markIntroCompleted() {
  if (isMember()) {
    const { memberId } = getCurrentUser();
    setMemberIntroSeen(memberId);
  }
}
