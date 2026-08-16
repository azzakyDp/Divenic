import { fetchData, qs, el, staggerReveal, isMobile, initImageSkeletons, createLoadMoreButton, animateStaggeredReveal } from './utils.js';
import { buildMemberCard } from './components/member-card.js';
import { buildMentorCard } from './components/mentor-card.js';

const MEMBER_PATH = 'data/members.json';
const MENTOR_PATH = 'data/mentors.json';
const BATCH = 10;

function initMobileTap(grid) {
  if (!isMobile()) return;
  grid.addEventListener('click', e => {
    const card = e.target.closest('.member-card');
    if (!card) return;
    card.classList.toggle('panel-open');
  });
}

function setNickAttr(card, data) {
  const nick = data.nickname || data.name?.split(' ')[0] || data.name || '';
  card.dataset.nick = nick;
}

function initLazyGrid({ gridId, data, builder, mobileHref, section, forceFull = false }) {
  const grid = qs(`#${gridId}`);
  if (!grid) return;
  grid.innerHTML = '';

  const buildAndTag = (item, i) => {
    const card = builder(item, i);
    setNickAttr(card, item);
    card.setAttribute('data-reveal', '');
    initImageSkeletons(card);
    return card;
  };

  if (forceFull) {
    data.forEach((item, i) => grid.appendChild(buildAndTag(item, i)));
    staggerReveal([...grid.children]);
    initMobileTap(grid);
    return;
  }

  if (isMobile() && mobileHref) {
    data.slice(0, BATCH).forEach((item, i) => grid.appendChild(buildAndTag(item, i)));
    staggerReveal([...grid.children]);
    initMobileTap(grid);
    if (data.length > BATCH) {
      grid.parentElement.appendChild(
        createLoadMoreButton(`Lihat Semua ${data.length} ${section} →`,
          () => { window.location.href = mobileHref; })
      );
    }
    return;
  }

  let offset = 0;

  const renderBatch = () => {
    const batch = data.slice(offset, offset + BATCH);
    const newCards = batch.map((item, i) => {
      const card = buildAndTag(item, offset + i);
      grid.appendChild(card);
      return card;
    });
    offset += batch.length;

    animateStaggeredReveal(newCards, 55);

    const old = grid.parentElement.querySelector('.view-more-wrap');
    if (old) old.remove();
    if (offset < data.length) {
      const rem = data.length - offset;
      grid.parentElement.appendChild(
        createLoadMoreButton(`Muat ${Math.min(rem, BATCH)} Lagi (sisa ${rem})`, renderBatch)
      );
    }
  };

  renderBatch();
}

export async function initMembers({ _forceFull = false } = {}) {
  const members = await fetchData(MEMBER_PATH);
  if (!members) return;
  initLazyGrid({
    gridId: 'member-grid',
    data: members,
    builder: buildMemberCard,
    mobileHref: 'member.html',
    section: 'Member',
    forceFull: _forceFull,
  });
}

export async function initMentors({ _forceFull = false } = {}) {
  const mentors = await fetchData(MENTOR_PATH);
  if (!mentors) return;
  initLazyGrid({
    gridId: 'mentor-grid',
    data: mentors,
    builder: buildMentorCard,
    mobileHref: 'mentor.html',
    section: 'Mentor',
    forceFull: _forceFull,
  });
}
