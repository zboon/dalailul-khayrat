/* ── Landing page ────────────────────────────────────────────────
   The app opens here rather than dropping straight into the mawlid, so the
   calligraphy has room and each section can introduce itself. Counts are
   computed live, so they stay right as content is added. */
const HOME_CARDS = [
  { id:'dalail',   ar:'دلائل الْخيرات', en:'Dalāʾil al-Khayrāt', desc:'Imam al-Jazūlī’s book of blessings upon the Prophet ﷺ, divided for the week.' },
  { id:'litanies', ar:'الْأَحْزَابُ', en:'Al-Aḥzāb', desc:'The aḥzāb, each read straight through.' },
];

function sectionCount(id){
  return id === 'mawlids' ? MAWLID_COLLECTIONS.length
       : id === 'praises' ? PRAISE_SECTIONS.length
       : id === 'nasheeds'? NASHEED_CHAPTERS.length
       : id === 'litanies'? LITANY_CHAPTERS.filter((c,n)=>c.verses && c.verses.length && !isAzamDay(n) && !isIstighfarDay(n)).length + (azamFilledDays().length ? 1 : 0) + (istighfarFilledDays().length ? 1 : 0)
       : id === 'azam'    ? azamFilledDays().length
       : id === 'istighfar'? istighfarFilledDays().length
       : id === 'qawwalis'? 0
       : id === 'mawlid'  ? mawlidItems().length
       : id === 'qasidas' ? additionalQasidaItems().length
       : id === 'burdah'  ? BURDAH_CHAPTERS.length
       : id === 'dalail'  ? DALAIL_CHAPTERS.length
       : id === 'barzanji'? BARZANJI_CHAPTERS.length
       : id === 'diya'    ? DIYA_CHAPTERS.length
       : id === 'ilahis'  ? ILAHI_CHAPTERS.length
       : favItems().length;
}
function countLabel(id, n){
  if(id === 'favs')    return n ? n + (n === 1 ? ' bookmark' : ' bookmarks') : 'Nothing saved yet';
  if(id === 'mawlids') return n + (n === 1 ? ' collection' : ' collections'); /* includes Burdah */
  if(id === 'praises') return n + (n === 1 ? ' section' : ' sections');
  if(id === 'nasheeds')return n ? n + (n === 1 ? ' nasheed' : ' nasheeds') : 'Coming soon';
  if(id === 'litanies')return n + (n === 1 ? ' ḥizb' : ' aḥzāb');
  if(id === 'qawwalis') return n ? n + (n === 1 ? ' qawwali' : ' qawwalis') : 'Coming soon';
  if(id === 'mawlid')  return n + ' sections';
  if(id === 'burdah')  return n + ' chapters';
  if(id === 'dalail')  return n + ' parts';
  if(id === 'barzanji')return n + ' sections';
  if(id === 'diya')    return n + ' sections';
  if(id === 'qasidas') return n + (n === 1 ? ' qasida' : ' qasidas');
  return n + (n === 1 ? ' ilahi' : ' ilahis');
}

/* Header artwork, embedded so it needs no network and can't go missing.
   HOME shows the app's name; inner pages show the محمد calligraphy. */
/* Zellige frieze on the header seam (home only): blue khatam stars with gold
   outlines on a deep-green field, ruled with a gold hairline above and below. */
const BISMILLAH_MARK = 'data:image/png;base64,{{inline:img/bismillah-mark.png}}';
const LOGO_INNER = 'data:image/png;base64,{{inline:img/logo-inner.png}}';

function homeCards(){
  return `<div class="home-grid">${HOME_CARDS.map(c => `
      <button class="home-card" onclick="selectTab('${c.id}')">
        <span class="hc-ar">${c.ar}</span>
        <span class="hc-en">${c.en}</span>
        <span class="hc-count">${countLabel(c.id, sectionCount(c.id))}</span>
      </button>`).join('')}
</div>`;
}

/* Each section introduces itself at the top of its own page, rather than
   crowding the landing page. */
function sectionIntro(id){
  const c = HOME_CARDS.find(x => x.id === id) || MAWLID_COLLECTIONS.find(x => x.id === id)
         || PRAISE_SECTIONS.find(x => x.id === id);
  return c ? `<div class="section-intro">${c.desc}</div>` : '';
}

function goHome(){
  setImmersive(false);
  leftTheLeader();
  state.tab = 'home';
  state.query = '';
  renderIndex();
  pushLoc();
}

function favCards(){
  const items = favItems();
  if(items.length === 0) return '';
  return items.map(({kind, idx, piece}, n) => `
        <button class="qcard" onclick="${openFnOf(kind)}(${idx})">
          <span class="num">${toArNum(n+1)}</span>
          <span class="titles">
            <span class="t-ar"${kind === 'i' ? ` style="font-family:'Crimson Pro',serif;direction:ltr;text-align:left"` : ''}>${piece.titleArabic}</span>
            <span class="t-en">${displayTitle(piece)}</span>
          </span>
          <span class="chev">›</span>
        </button>`).join('');
}

function label(txt, top){
  return `<div class="index-label"${top?' style="margin-top:1.8rem"':''}>${txt}</div>`;
}

/* Content for the currently selected tab. */
function renderResults(){
  const tab = state.tab;
  const q = state.query;

  // ---- SEARCH MODE: search the whole app, from whichever tab you're on ----
  if(q){
    let html = '';
    const mawlid = mawlidCards();
    if(mawlid) html += label('Mawlid ad-Daybaʿi · مولد الدّيبعي') + mawlid;
    const barz = barzanjiCards();
    if(barz) html += label('Mawlid al-Barzanjī · مولد الْبرزنجي', !!mawlid) + barz;
    const diya = diyaCards();
    if(diya) html += label('The Shimmering Light · الضّياء اللّامع', !!mawlid || !!barz) + diya;
    const burd = burdahCards();
    if(burd) html += label('Qasida Burdah · قصيدة الْبردة', !!mawlid || !!barz || !!diya) + burd;
    const qas = additionalQasidaCards();
    if(qas) html += label('More Qasidas · قصائد أخرى', !!mawlid || !!barz || !!burd) + qas;
    const dal = dalailCards();
    if(dal) html += label('Dalāʾil al-Khayrāt · دلائل الْخيرات', !!mawlid || !!barz || !!burd || !!qas) + dal;
    const nash = nasheedCards();
    if(nash) html += label('Nasheeds · أناشيد', !!mawlid || !!barz || !!burd || !!qas || !!dal) + nash;
    const ilahis = ilahiCards();
    if(ilahis) html += label('Ilahis · الْإلهيات', !!mawlid || !!barz || !!burd || !!qas || !!dal || !!nash) + ilahis;
    /* The aḥzāb are a section of their own in this edition, so they belong in
       the results too — the Mawalid app hides them, this one does not. */
    const lit = litanyCards();
    if(lit) html += label('Al-Aḥzāb · الْأَحْزَابُ', !!mawlid || !!barz || !!burd || !!qas || !!dal || !!nash || !!ilahis) + lit;
    if(!html) return `<div class="no-results">No matches for "${q.replace(/</g,'&lt;')}". Try a different spelling.</div>`;
    return html;
  }

  // ---- BROWSE MODE: just the current tab ----
  /* The home tab needs a branch here too, not only in renderIndex(): typing and
     then deleting a search calls updateSearch(), which re-renders this alone.
     Without it, clearing the query left the page blank with no way back. */
  if(tab === 'home')    return homeCards();
  if(tab === 'mawlids') return sectionIntro('mawlids') + label('Choose a mawlid · اختر مولداً') + `<div class="home-grid">${mawlidsHub()}</div>`;
  if(tab === 'mawlid')  return backToMawlids() + sectionIntro('mawlid') + label('Follow the mawlid in order · على ترتيب الْمولد') + mawlidCards();
  if(tab === 'praises') return sectionIntro('praises') + label('Choose a section · اختر قسماً') + `<div class="home-grid">${praisesHub()}</div>`;
  if(tab === 'nasheeds')return backToPraises() + sectionIntro('nasheeds') + (nasheedCards() || placeholder('Nasheeds'));
  if(tab === 'qasidas') return backToPraises() + sectionIntro('qasidas') + (additionalQasidaCards() || placeholder('Qasidas'));
  if(tab === 'ilahis')  return backToPraises() + sectionIntro('ilahis') + label('Select an ilahi · ilahi seçin') + ilahiCards();
  if(tab === 'litanies')return sectionIntro('litanies') + label('Select a ḥizb · اختر حزباً') + litanyCards();
  if(tab === 'before')  return backToDalail() + label('Before the reading · قَبْلَ الْقِرَاءَةِ') + dalailBeforeCards();
  if(tab === 'downloads') return downloadsScreen();
  if(tab === 'azam')    return backToLitanies() + collectionLabel(AZAM_TITLE_IDX) + azamIndex();
  if(tab === 'istighfar') return backToLitanies() + collectionLabel(ISTIGHFAR_TITLE_IDX) + istighfarIndex();
  if(tab === 'qawwalis') return backToPraises() + sectionIntro('qawwalis') + placeholder('Qawwalis');
  if(tab === 'favs'){
    const cards = favCards();
    return cards
      ? sectionIntro('favs') + label('Your favorites · الْمفضلة') + cards
      : `<div class="no-results">No favorites yet.<br><br>Open any piece and tap the bookmark beside its title to save it here.<br><br>Favorites are kept on this device only — they aren't shared with anyone else using the app.</div>`;
  }
  if(tab === 'burdah'){
    return backToMawlids() + sectionIntro('burdah') + label('Select a chapter · اختر فصلاً') + burdahCards();
  }
  if(tab === 'barzanji'){
    return backToMawlids() + sectionIntro('barzanji') + barzanjiResponseNote() + label('Select a section · اختر فصلاً') + barzanjiCards();
  }
  if(tab === 'diya'){
    return backToMawlids() + sectionIntro('diya') + label('Select a section · اختر فصلاً') + diyaCards();
  }
  if(tab === 'dalail'){
    return dalailIndex();
  }
  return '';
}

/* Which tabs get a search box — all of them. */
function tabHasSearch(){
  return true;
}

const HEADER_BISMILLAH = 'data:image/png;base64,{{inline:img/header-bismillah.png}}';
const HOME_ICON_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11.5 12 4l9 7.5"/><path d="M5 10v9.5a.5.5 0 0 0 .5.5H9.5v-6h5v6h4a.5.5 0 0 0 .5-.5V10"/></svg>';
const BACK_ICON_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>';
const SUN_ICON_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>';
const MOON_ICON_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>';
const SWAP_ICON_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17 4l3 3-3 3"/><path d="M20 7H9a4 4 0 0 0-4 4"/><path d="M7 20l-3-3 3-3"/><path d="M4 17h11a4 4 0 0 0 4-4"/></svg>';
const LOGO_ALT = 'مُحَمَّدٌ صَلَّى اللّٰهُ عَلَيْهِ وَسَلَّمَ';
const BISMILLAH_ALT = 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ';

function themeGlyph(){ return document.documentElement.classList.contains('dark') ? SUN_ICON_SVG : MOON_ICON_SVG; }
function liveClass(){ return session.role ? ' live' : ''; }

/* Home keeps the large logo header + subhead. */
function bigMasthead(){
  return `<header class="masthead">
      <button class="header-mark" onclick="goHome()" aria-label="Home">${HOME_ICON_SVG}</button>
      <button class="theme-toggle" onclick="toggleTheme()">${themeGlyph()}</button>
      <img class="logo home-mark" src="${LOGO_INNER}" width="330" height="452" alt="${LOGO_ALT}">
    </header>`;
}

/* Every page below home: compact bar, no large logo, no tab bar. */
function compactMasthead(){
  return `<header class="masthead compact">
      <div class="mh-left">
        <button class="header-mark" onclick="goHome()" aria-label="Home">${HOME_ICON_SVG}</button>
        <button class="back-mark" onclick="goBack()" aria-label="Back">${BACK_ICON_SVG}</button>
      </div>
      <img class="bismillah-mark" src="${HEADER_BISMILLAH}" width="640" height="114" alt="${BISMILLAH_ALT}">
      <div class="mh-right">
          <button class="theme-toggle" onclick="toggleTheme()">${themeGlyph()}</button>
      </div>
    </header>`;
}

/* Back = up one level: a section's child returns to its hub tab; a top-level
   tab (or the session screen) returns home. There is no tab bar, so Home and
   Back are the only way out of a section. */
function goBack(){
  const t = state.tab;
  let parent = null;
  for(const p in TAB_CHILDREN){ if(TAB_CHILDREN[p].indexOf(t) !== -1){ parent = p; break; } }
  if(parent) selectTab(parent);
  else goHome();
}

function renderIndex(){
  /* The index is about to replace whatever was on screen, so no reader is
     showing any more. See readerOpen's use in setSessionStatus below. */
  readerOpen = false;
  document.documentElement.style.setProperty('--ar-size', '1.9rem');
  document.documentElement.style.setProperty('--latin-scale', 1);
  /* Landing page: shown on first open, and whenever you tap the logo.
     A search from here still runs, so the box stays useful. */
  /* onHome: the home tab, searching or not — keeps the search bar, bismillah
     and hidden nav consistent so nothing jumps when you start typing.
     home: the landing cards specifically (i.e. not showing results). */
  const onHome = state.tab === 'home';
  const home = onHome && !state.query;
  const sessionScreen = state.tab === 'session' && !state.query;
  app.innerHTML = `
    <div class="topbar">
    ${onHome ? bigMasthead() : compactMasthead()}
    ${(onHome || sessionScreen) ? '' : navBar()}
    </div>
        <main class="index">
      ${(tabHasSearch() && !sessionScreen && !onHome) ? searchBox() : ''}
      <div id="results">${(home ? homeCards() : sessionScreen ? sessionPanel() : renderResults()) + versionTag()}</div>
      ${onHome ? searchBox(true) : ''}
    </main>
    ${onHome ? `<div class="home-feedback">
      <a class="feedback-btn" href="mailto:${FEEDBACK_EMAIL}?subject=${encodeURIComponent('Dalāʾil al-Khayrāt — feedback')}">
        Spotted a correction? Send feedback
      </a>
      <div class="feedback-sub">Corrections to the Arabic or translation are welcome · جزاكم اللّٰه خيراً</div>
    </div>` : ''}
    <footer>Works offline once added to your home screen.</footer>`;
  document.documentElement.classList.toggle('is-home', state.tab === 'home');
  window.scrollTo(0,0);
  if(state.query){ const el=document.getElementById('search'); if(el){ el.focus(); el.setSelectionRange(el.value.length, el.value.length); } }
  centerActiveTab();
}

/* Collapse the sticky header (logo + home subhead) on any downward scroll of an
   index/browse page, leaving the corner buttons and the tab bar pinned. */

/* The tab strip scrolls sideways on a phone, so the highlighted section can sit
   off the edge — Favorites and Turkish Ilahis especially, being last. Bring the
   active one to the middle whenever the view is rebuilt. */
function centerActiveTab(){
  const bar = document.querySelector('.tabbar');
  if(!bar) return;
  const active = bar.querySelector('.tab.active');
  if(!active) return;
  const run = () => {
    const max = bar.scrollWidth - bar.clientWidth;
    if(max <= 0) return;                       // whole strip already fits
    const wanted = active.offsetLeft - (bar.clientWidth - active.offsetWidth) / 2;
    const left = Math.max(0, Math.min(wanted, max));
    if(Math.abs(bar.scrollLeft - left) < 2) return;
    if(bar.scrollTo) bar.scrollTo({ left, behavior:'smooth' });
    else bar.scrollLeft = left;
  };
  if(window.requestAnimationFrame) requestAnimationFrame(run); else run();
}

function clearSearch(){
  state.query = '';
  renderIndex();
}

/* Dark / light theme toggle, persisted where storage is available. */
function toggleTheme(){
  const root = document.documentElement;
  const dark = root.classList.toggle('dark');
  try { localStorage.setItem('dlk-theme', dark ? 'dark' : 'light'); } catch(e){}
  /* Only the sun/moon glyph depends on the theme in JS — every other theme
     difference is CSS keyed off <html class="dark">. Swapping the glyph in
     place is enough, and it avoids the renderIndex() this used to call: now
     that the toggle also rides in the reader bar, re-rendering the index
     would throw the reader out of the piece it has open (and would lose the
     reading position even on an index page). */
  document.querySelectorAll('.theme-toggle').forEach(function(b){ b.innerHTML = themeGlyph(); });
}
(function initTheme(){
  let saved = null;
  try { saved = localStorage.getItem('dlk-theme'); } catch(e){}
  /* Light is the standard first-open look, on the owner's call: a reader
     who has never chosen gets light whatever their phone's system setting
     says. Dark is only ever entered by tapping the toggle, and only then
     is it remembered. This deliberately does NOT consult
     prefers-color-scheme, which used to hand anyone with a dark phone a
     dark app before they had asked for one. */
  if(saved === 'dark'){
    document.documentElement.classList.add('dark');
  }
})();

