/* ── Al-Ḥizb al-Aʿẓam: the seven daily portions ──
   They sit at LITANY_CHAPTERS[4]…[10] in the book's own order, Saturday first.
   JS getDay(): 0=Sun … 6=Sat. */
const AZAM_FIRST = 4;
const AZAM_DAYS = [
  { idx:4,  en:'Sat', ar:'السَّبْت' },
  { idx:5,  en:'Sun', ar:'الأَحَد' },
  { idx:6,  en:'Mon', ar:'الِاثْنَيْن' },
  { idx:7,  en:'Tue', ar:'الثُّلَاثَاء' },
  { idx:8,  en:'Wed', ar:'الأَرْبِعَاء' },
  { idx:9,  en:'Thu', ar:'الْخَمِيس' },
  { idx:10, en:'Fri', ar:'الْجُمُعَة' },
];
const AZAM_TODAY_IDX = { 0:5, 1:6, 2:7, 3:8, 4:9, 5:10, 6:4 };
function azamTodayIdx(){ return AZAM_TODAY_IDX[new Date().getDay()]; }
function isAzamDay(n){ return n >= AZAM_FIRST && n <= AZAM_FIRST + 6; }
/* Only the portions that actually carry text — an unfilled day stays hidden,
   and reappears by itself once its verses are in. */
function azamFilledDays(){
  return AZAM_DAYS.filter(d => {
    const c = LITANY_CHAPTERS[d.idx];
    return c && c.verses && c.verses.length;
  });
}

/* The Aʿẓam sub-page: today's portion, then the week. Deliberately the same
   furniture as the Dalāʾil index — .dk-today and the 4-column bubble grid. */
function azamIndex(){
  const days = azamFilledDays();
  if(!days.length) return placeholder(collectionTitle(AZAM_TITLE_IDX).en);
  const today = azamTodayIdx();
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


