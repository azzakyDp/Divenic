import { isGuest, isMember, getCurrentUser } from './auth.service.js';
import { getMemberIntroSeen, setMemberIntroSeen } from './storage.service.js';

// Spesial intro
export function shouldPlayIntro() {
  // Intro for guest always on
  if (isGuest()) {
    return true;
  }

  // Intro for member only on first login
  if (isMember()) {
    const { memberId } = getCurrentUser();
    const hasSeen = getMemberIntroSeen(memberId);
    return !hasSeen;
  }

  return true;
}

// mark intro for member
export function markIntroCompleted() {
  if (isMember()) {
    const { memberId } = getCurrentUser();
    setMemberIntroSeen(memberId);
  }
}