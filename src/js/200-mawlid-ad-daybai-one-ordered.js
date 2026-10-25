/* ── Mawlid ad-Daybaʿi: one ordered section ──────────────────────
   The mawlid's pieces live in two arrays: QASIDAS (its duas and qasidas)
   and SIRAH_CHAPTERS (its prose). Each carries its section number from the
   kitab in its title, e.g. "13b · …". We merge both and sort by that number
   so the tab follows the book's own order. A qasida with NO section number
   didn't come from the mawlid — it belongs under the Qasidas tab. */
const SECTION_RE = /^(\d+)(b?)\s*·\s*(.*)$/;

function sectionOf(title){
  const m = SECTION_RE.exec(title || '');
  if(!m) return null;
  return { num: +m[1] + (m[2] ? 0.5 : 0), label: m[1] + m[2], rest: m[3] };
}

function mawlidItems(){
  const items = [];
  QASIDAS.forEach((qa, i) => {
    const sec = sectionOf(qa.titleEnglish);
    if(sec) items.push({ sec, kind:'q', idx:i, piece:qa });
  });
  SIRAH_CHAPTERS.forEach((c, n) => {
    const sec = sectionOf(c.titleEnglish);
    if(sec) items.push({ sec, kind:'s', idx:n, piece:c });
  });
  items.sort((a,b) => a.sec.num - b.sec.num);
  /* Number them 1..N by their place in the kitab's order. The badge is a
     running position, not the kitab's own number, so the list never skips
     even though some of the kitab's sections aren't in the app yet. Adding a
     missing section later slots it in and renumbers everything automatically. */
  items.forEach((it, n) => { it.pos = n + 1; });
  return items;
}

function mawlidCards(){
  /* Position is assigned before filtering, so searching never renumbers. */
  const items = mawlidItems().filter(x => matchesQuery(x.piece, state.query));
  if(items.length === 0) return '';
  return items.map(({pos, kind, idx, piece}) => `
        <button class="qcard" onclick="${kind==='s' ? 'openSirah' : 'openQasida'}(${idx})">
          <span class="num">${toArNum(pos)}</span>
          <span class="titles">
            <span class="t-ar">${piece.titleArabic}</span>
            <span class="t-en">${sectionOf(piece.titleEnglish).rest}</span>
          </span>
          <span class="chev">›</span>
        </button>` + hitList(kind, idx)).join('');
}

/* Qasidas that did not come from the Mawlid ad-Daybaʿi */
/* Qasidas that did not come from the mawlid — the source of truth for both
   the Qasidas tab and the landing page's count. */
function additionalQasidaItems(){
  return QASIDAS.map((qa,i) => ({q:qa, i}))
    .filter(x => x.q.group === 'qasidas' && !sectionOf(x.q.titleEnglish));
}

function additionalQasidaCards(){
  const items = additionalQasidaItems().filter(x => matchesQuery(x.q, state.query));
  if(items.length === 0) return '';
  return items.map(({q:qa, i}, n) => `
        <button class="qcard" onclick="openQasida(${i})">
          <span class="num">${toArNum(n+1)}</span>
          <span class="titles">
            <span class="t-ar">${qa.titleArabic}</span>
            <span class="t-en">${qa.titleEnglish}</span>
          </span>
          <span class="chev">›</span>
        </button>` + hitList('q', i)).join('');
}

function groupCards(group){
  const q = state.query;
  let items = QASIDAS.map((qa,i)=>({q:qa,i}))
    .filter(x=>x.q.group===group)
    .filter(x=>matchesQuery(x.q, q));
  if(q){
    const nq = normalize(q);
    const titleHit = (qa) => {
      const t = normalize(qa.titleEnglish + ' ' + qa.titleArabic);
      return (nq && t.includes(nq)) || (qa.titleEnglish + qa.titleArabic).toLowerCase().includes(q.toLowerCase().trim());
    };
    items.sort((a,b)=> (titleHit(b.q)?1:0) - (titleHit(a.q)?1:0));
  }
  if(items.length === 0) return '';
  return items.map(({q:qa,i},n)=>`
        <button class="qcard" onclick="openQasida(${i})">
          <span class="num">${toArNum(n+1)}</span>
          <span class="titles">
            <span class="t-ar">${qa.titleArabic}</span>
            <span class="t-en">${qa.titleEnglish}</span>
          </span>
          <span class="chev">›</span>
        </button>` + hitList('q', i)).join('');
}

function searchBox(atBottom){
  /* Resting placeholder is just "Search"; the fuller hint appears once you're
     actually typing, so the bar stays quiet on the page. */
  return `
      <div class="search-wrap${atBottom ? ' at-bottom' : ''}">
        <svg class="search-icon" viewBox="0 0 16 16" fill="none" aria-hidden="true"
             stroke="currentColor" stroke-width="1.6" stroke-linecap="round">
          <circle cx="7" cy="7" r="4.4"/><line x1="10.4" y1="10.4" x2="14.2" y2="14.2"/>
        </svg>
        <input id="search" class="search" type="search" inputmode="search"
          placeholder="Search"
          onfocus="this.placeholder='e.g. ya nabi, salaam, mercy…'"
          onblur="this.placeholder='Search'"
          autocomplete="off" autocapitalize="off" autocorrect="off"
          value="${state.query.replace(/"/g,'&quot;')}"
          oninput="updateSearch(this.value)">
        ${state.query ? '<button class="search-clear" onclick="clearSearch()">✕</button>' : ''}
      </div>`;
}

function updateSearch(val){
  state.query = val;
  const results = document.getElementById('results');
  if(results) results.innerHTML = renderResults() + versionTag();
}

/* Placeholder shown for sections whose content isn't added yet. */
function placeholder(title){
  return `<div class="placeholder">
      <div class="ph-star">۞</div>
      <p><strong>${title}</strong></p>
      <p>No entries here yet. This section is ready — its contents can be added whenever you like.</p>
    </div>`;
}

function burdahCards(){
  const items = BURDAH_CHAPTERS.map((c,n)=>({c,n})).filter(x=>matchesQuery(x.c, state.query));
  if(items.length === 0) return '';
  return items.map(({c,n})=>`
        <button class="qcard" onclick="openBurdah(${n})">
          <span class="num">${toArNum(n+1)}</span>
          <span class="titles">
            <span class="t-ar">${c.titleArabic}</span>
            <span class="t-en">${c.titleEnglish}</span>
          </span>
          <span class="chev">›</span>
        </button>` + hitList('b', n)).join('');
}

function nasheedCards(){
  const items = NASHEED_CHAPTERS.map((c,n)=>({c,n})).filter(x=>matchesQuery(x.c, state.query));
  if(items.length === 0) return '';
  return items.map(({c,n})=>`
        <button class="qcard" onclick="openNasheed(${n})">
          <span class="num">${toArNum(n+1)}</span>
          <span class="titles">
            <span class="t-ar">${c.titleArabic}</span>
            <span class="t-en">${c.titleEnglish}</span>
          </span>
          <span class="chev">›</span>
        </button>` + hitList('n', n)).join('');
}

function litanyCards(){
  /* Browsing, the seven daily portions of al-Ḥizb al-Aʿẓam are folded behind a
     single row that opens their own page. A search still lists them one by one,
     so no portion becomes unreachable from the search box. */
  const grouped = !state.query && (azamFilledDays().length || istighfarFilledDays().length);
  const items = LITANY_CHAPTERS.map((c,n)=>({c,n})).filter(x=>
    x.c.verses && x.c.verses.length
    && !(grouped && (isAzamDay(x.n) || isIstighfarDay(x.n)))
    && matchesQuery(x.c, state.query));
  let out = items.map(({c,n}, i)=>`
        <button class="qcard" onclick="openLitany(${n})">
          <span class="num">${toArNum(i+1)}</span>
          <span class="titles">
            <span class="t-ar">${c.titleArabic}</span>
            <span class="t-en">${c.titleEnglish}</span>
          </span>
          <span class="chev">›</span>
        </button>` + hitList('l', n)).join('');
  if(grouped && azamFilledDays().length){
    const n = azamFilledDays().length;
    out += `
        <button class="qcard" onclick="selectTab('azam')">
          <span class="num">${toArNum(items.length + 1)}</span>
          <span class="titles">
            <span class="t-ar">${collectionTitle(AZAM_TITLE_IDX).ar}</span>
            <span class="t-en">${collectionTitle(AZAM_TITLE_IDX).en} · ${n} daily ${n === 1 ? 'portion' : 'portions'}</span>
          </span>
          <span class="chev">›</span>
        </button>`;
  }
  if(grouped && istighfarFilledDays().length){
    const n = istighfarFilledDays().length;
    const shown = items.length + (azamFilledDays().length ? 1 : 0) + 1;
    out += `
        <button class="qcard" onclick="selectTab('istighfar')">
          <span class="num">${toArNum(shown)}</span>
          <span class="titles">
            <span class="t-ar">${collectionTitle(ISTIGHFAR_TITLE_IDX).ar}</span>
            <span class="t-en">${collectionTitle(ISTIGHFAR_TITLE_IDX).en} · ${n} daily ${n === 1 ? 'portion' : 'portions'}</span>
          </span>
          <span class="chev">›</span>
        </button>`;
  }
  return out;
}

function praisesHub(){
  return PRAISE_SECTIONS.map(c=>`
      <button class="home-card" onclick="selectTab('${c.id}')">
        <span class="hc-ar">${c.ar}</span>
        <span class="hc-en">${c.en}</span>
        <span class="hc-count">${countLabel(c.id, sectionCount(c.id))}</span>
      </button>`).join('');
}

function backToPraises(){
  return `<button class="back-link" onclick="selectTab('praises')">‹ Nasheeds & Qasidas</button>`;
}

function backToDalail(){
  return `<button class="back-link" onclick="selectTab('dalail')">‹ Dalāʾil al-Khayrāt</button>`;
}

function mawlidsHub(){
  return MAWLID_COLLECTIONS.map(c=>`
      <button class="home-card" onclick="selectTab('${c.id}')">
        <span class="hc-ar">${c.ar}</span>
        <span class="hc-en">${c.en}</span>
        <span class="hc-count">${countLabel(c.id, sectionCount(c.id))}</span>
      </button>`).join('');
}

function backToMawlids(){
  return `<button class="back-link" onclick="selectTab('mawlids')">‹ Mawlid Collections</button>`;
}

/* The gathering's response is a practice, not part of the text, so it is
   stated once here rather than printed after every verse. */
function barzanjiResponseNote(){
  return `<div class="barz-note">${noteBlock("It is common practice for the gathering to respond with ṣallā Allāhu ʿalayh or Allāh after each verse the reciter reads.<span class=\"qnote-ar\">صَلَّى اللّٰهُ عَلَيْهِ · اللّٰه</span>")}</div>`;
}

function barzanjiCards(){
  const items = BARZANJI_CHAPTERS.map((c,n)=>({c,n})).filter(x=>matchesQuery(x.c, state.query));
  if(items.length === 0) return '';
  return items.map(({c,n})=>`
        <button class="qcard" onclick="openBarzanji(${n})">
          <span class="num">${toArNum(n+1)}</span>
          <span class="titles">
            <span class="t-ar">${c.titleArabic}</span>
            <span class="t-en">${c.titleEnglish}</span>
          </span>
          <span class="chev">›</span>
        </button>` + hitList('z', n)).join('');
}

function diyaCards(){
  const items = DIYA_CHAPTERS.map((c,n)=>({c,n})).filter(x=>matchesQuery(x.c, state.query));
  if(items.length === 0) return '';
  return items.map(({c,n})=>`
        <button class="qcard" onclick="openDiya(${n})">
          <span class="num">${toArNum(n+1)}</span>
          <span class="titles">
            <span class="t-ar">${c.titleArabic}</span>
            <span class="t-en">${c.titleEnglish}</span>
          </span>
          <span class="chev">›</span>
        </button>` + hitList('y', n)).join('');
}

/* One Dalāʾil chapter as an index card. Shared by the flat search list and the
   grouped browse index below, so both stay in step. */
function dalailCard(n){
  const c = DALAIL_CHAPTERS[n];
  return `
        <button class="qcard" onclick="openDalail(${n})">
          <span class="num">${toArNum(n+1)}</span>
          <span class="titles">
            <span class="t-en lead">${c.titleEnglish}</span>
            <span class="t-ar">${c.titleArabic}</span>
          </span>
          <span class="chev">›</span>
        </button>`;
}

/* SEARCH uses this — a flat, query-filtered list. The browse index uses
   dalailIndex() instead. Keep this filtered and flat. */
function dalailCards(){
  const items = DALAIL_CHAPTERS.map((c,n)=>({c,n})).filter(x=>x.n !== 0 && matchesQuery(x.c, state.query));
  if(items.length === 0) return '';
  return items.map(({n})=>dalailCard(n) + hitList('d', n)).join('');
}

/* The daily portion for today — Monday opens Part 1; the second Monday portion
   (Mon²) is reached from the strip. JS getDay(): 0=Sun … 6=Sat. */
const DALAIL_WEEKDAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const DALAIL_TODAY_IDX = { 1:6, 2:7, 3:8, 4:9, 5:10, 6:11, 0:12 };
function dalailTodayIdx(){ return DALAIL_TODAY_IDX[new Date().getDay()]; }

/* The week strip and the three collapsible groups. */
const DALAIL_DAYS = [
  {idx:6,  en:'Mon',        ar:'الِاثْنَيْن'},
  {idx:7,  en:'Tue',        ar:'الثُّلَاثَاء'},
  {idx:8,  en:'Wed',        ar:'الأَرْبِعَاء'},
  {idx:9,  en:'Thu',        ar:'الْخَمِيس'},
  {idx:10, en:'Fri',        ar:'الْجُمُعَة'},
  {idx:11, en:'Sat',        ar:'السَّبْت'},
  {idx:12, en:'Sun',        ar:'الأَحَد'},
  {idx:13, en:'Mon \u00B2', ar:'الِاثْنَيْن ٢'},
];
const DALAIL_ROWS = {
  before: {en:'Before the reading', ar:'قَبْلَ الْقِرَاءَةِ'},
  daily:  {en:'The daily portions', ar:'الْأَحْزَابُ الْيَوْمِيَّةُ'},
  done:   {en:'On completion',      ar:'عِنْدَ الْخَتْمِ'},
};
/* The Dalāʾil browse index — Option E: a today card, the resume ribbon, a week
   strip, then the parts in three collapsible groups. NOT used for search. */
function dalailIndex(){
  const today = dalailTodayIdx();
  const t = DALAIL_CHAPTERS[today];
  const todayCard = `<button class="dk-today" onclick="openDalail(${today})">
      <span class="dk-today-k">Today · ${DALAIL_WEEKDAYS[new Date().getDay()]}</span>
      <span class="dk-today-ar">${t.titleArabic}</span>
      <span class="dk-today-go">Open this portion ›</span></button>`;
  const rowlab = r => `<div class="dk-rowlab"><span class="l-en">${r.en}</span><span class="l-ar">${r.ar}</span></div>`;
  // The daily portions grid comes first — four to a line, Mon² last; today highlighted.
  const days = DALAIL_DAYS.map(d =>
    `<button class="dk-bubble${d.idx === today ? ' on' : ''}" onclick="openDalail(${d.idx})"><span class="b-en">${d.en}</span><span class="b-ar">${d.ar}</span></button>`).join('');
  // Secondary entries below a divider — one shared row style.
  const navRow = (action, en, ar) => `<button class="dk-nav" onclick="${action}"><span class="dk-nav-txt"><span class="b-en">${en}</span><span class="b-ar">${ar}</span></span><span class="dk-nav-go">›</span></button>`;
  const before = navRow("selectTab('before')", DALAIL_ROWS.before.en, DALAIL_ROWS.before.ar);
  const rows =
      navRow("openDalail(14)",        DALAIL_ROWS.done.en,   DALAIL_ROWS.done.ar)
    + navRow("selectTab('downloads')", 'Downloaded recitations', 'التَّسْجِيلَاتُ الْمَحْفُوظَةُ')
    + navRow("openDalail(0)",         'About Dalāʾil al-Khayrāt', 'دَلَائِلُ الْخَيْرَاتِ');
  return `<div class="edition-row"><span class="edition-k">Version</span>${editionSwitch()}</div>` + todayCard + resumeCard()
    + before
    + rowlab(DALAIL_ROWS.daily) + `<div class="dk-grid4">${days}</div>`
    + `<div class="dk-sep"></div>`
    + rows;
}

