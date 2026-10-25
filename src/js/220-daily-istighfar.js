/* ── al-Ḥizb al-Istighfār: seven daily portions ──────────────────
   Same shape as the Aʿẓam block above, but this work opens on FRIDAY in the
   printed edition (pp. 231 onward), so the week is ordered Fri → Thu and the
   getDay() map differs. [2] stays the reserved title slot, unfilled. */
/* The reserved title slots: LITANY_CHAPTERS[3] names al-Ḥizb al-Aʿẓam and
   [2] names Ḥizb al-Istighfār. They carry no verses — the seven daily
   portions of each live at [4]–[10] and [11]–[17] — so the slot's job is to
   hold the collection's own name, which the Al-Aḥzāb row and the sub-page
   header both read from here rather than repeating it as a literal. */
const AZAM_TITLE_IDX = 3;
const ISTIGHFAR_TITLE_IDX = 2;
function collectionTitle(i){
  const c = LITANY_CHAPTERS[i] || {};
  return { ar: c.titleArabic || '', en: c.titleEnglish || '' };
}

const ISTIGHFAR_FIRST = 11;
const ISTIGHFAR_DAYS = [
  { idx:11, en:'Fri', ar:'الْجُمُعَة' },
  { idx:12, en:'Sat', ar:'السَّبْت' },
  { idx:13, en:'Sun', ar:'الأَحَد' },
  { idx:14, en:'Mon', ar:'الِاثْنَيْن' },
  { idx:15, en:'Tue', ar:'الثُّلَاثَاء' },
  { idx:16, en:'Wed', ar:'الأَرْبِعَاء' },
  { idx:17, en:'Thu', ar:'الْخَمِيس' },
];
const ISTIGHFAR_TODAY_IDX = { 0:13, 1:14, 2:15, 3:16, 4:17, 5:11, 6:12 };
function istighfarTodayIdx(){ return ISTIGHFAR_TODAY_IDX[new Date().getDay()]; }
function isIstighfarDay(n){ return n >= ISTIGHFAR_FIRST && n <= ISTIGHFAR_FIRST + 6; }
function istighfarFilledDays(){
  return ISTIGHFAR_DAYS.filter(d => {
    const c = LITANY_CHAPTERS[d.idx];
    return c && c.verses && c.verses.length;
  });
}

function istighfarIndex(){
  const days = istighfarFilledDays();
  if(!days.length) return placeholder(collectionTitle(ISTIGHFAR_TITLE_IDX).en);
  const today = istighfarTodayIdx();
  const t = LITANY_CHAPTERS[today];
  const todayCard = (t && t.verses && t.verses.length)
    ? `<button class="dk-today" onclick="openLitany(${today})">
      <span class="dk-today-k">Today · ${DALAIL_WEEKDAYS[new Date().getDay()]}</span>
      <span class="dk-today-ar">${t.titleArabic}</span>
      <span class="dk-today-go">Open this portion ›</span></button>`
    : '';
  const bubbles = days.map(d =>
    `<button class="dk-bubble${d.idx === today ? ' on' : ''}" onclick="openLitany(${d.idx})"><span class="b-en">${d.en}</span><span class="b-ar">${d.ar}</span></button>`).join('');
  const rowlab = `<div class="dk-rowlab"><span class="l-en">The daily portions</span><span class="l-ar">الْأَوْرَادُ الْيَوْمِيَّةُ</span></div>`;
  return todayCard + rowlab + `<div class="dk-grid4">${bubbles}</div>`;
}

/* The collection's own name, heading its sub-page. */
function collectionLabel(i){
  const t = collectionTitle(i);
  return (t.en || t.ar) ? label(t.en + (t.ar ? ' · ' + t.ar : '')) : '';
}

function backToLitanies(){
  return `<button class="back-link" onclick="selectTab('litanies')">‹ Al-Aḥzāb</button>`;
}

/* The Dalāʾil intro line, made tappable — it opens the book's title page, which
   is otherwise unlisted (its content lives at chapter index 0). */
function dalailIntro(){
  const c = HOME_CARDS.find(x => x.id === 'dalail')
         || (typeof MAWLID_COLLECTIONS !== 'undefined' && MAWLID_COLLECTIONS.find(x => x.id === 'dalail'))
         || (typeof PRAISE_SECTIONS !== 'undefined' && PRAISE_SECTIONS.find(x => x.id === 'dalail'));
  const desc = (c && c.desc) ? c.desc : '';
  if(!desc) return sectionIntro('dalail');
  return `<button class="section-intro dalail-intro" onclick="openDalail(0)" aria-label="Open the title page of the book">${desc}<span class="di-go">›</span></button>`;
}

/* The "Before the reading" sub-page — the openings, idx 1–5. The title page
   (idx 0) is deliberately omitted; it is reached from the tappable intro. */
function dalailBeforeCards(){
  let out = '';
  for(let n = 1; n <= 5; n++) out += dalailCard(n);
  return out;
}

function ilahiCards(){
  const items = ILAHI_CHAPTERS.map((c,n)=>({c,n})).filter(x=>matchesQuery(x.c, state.query));
  if(items.length === 0) return '';
  return items.map(({c,n})=>`
        <button class="qcard" onclick="openIlahi(${n})">
          <span class="num">${toArNum(n+1)}</span>
          <span class="titles">
            <span class="t-ar" style="font-family:'Crimson Pro',serif;direction:ltr;text-align:left">${c.titleArabic}</span>
            <span class="t-en">${c.titleEnglish}</span>
          </span>
          <span class="chev">›</span>
        </button>` + hitList('i', n)).join('');
}

/* ONE table of reader openers, keyed by kind. openFnOf() and reopen() both
   read it, so the two can no longer drift — which is exactly how the Ḍiyāʾ
   ('y') came to be missing from reopen() while openFnOf() had it, sending
   every Ḍiyāʾ control and every follower in a live session into QASIDAS. */
const OPENERS = {
  q: 'openQasida',  b: 'openBurdah',   s: 'openSirah',
  i: 'openIlahi',   d: 'openDalail',   z: 'openBarzanji',
  y: 'openDiya',    n: 'openNasheed',  l: 'openLitany'
};
function openFnOf(kind){ return OPENERS[kind] || 'openQasida'; }
/* Mawlid pieces carry their kitab number in the title; drop it for display. */
function displayTitle(piece){
  const s = sectionOf(piece.titleEnglish);
  return s ? s.rest : piece.titleEnglish;
}

