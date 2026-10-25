/* ── Back, and coming back ───────────────────────────────────────
   The manifest is display:standalone, so on Android there is no browser
   chrome and Back is the system gesture. The app pushed no history of its
   own, so Back had nothing to pop and closed the app outright however deep
   you were reading. Every screen here is fully described by state.tab, the
   Burdah sub-chapter and whichever piece is open, so each navigation pushes
   that descriptor and Back pops it.

   Whether a reader is open is read off the PAGE, not from msPiece: msPiece is
   set when a reader opens and is never cleared, so it still names a chapter
   long after you have gone back to an index. renderedView() documents the
   same trap — ask the page. */
const LAST_KEY = 'dlk-last';
const RESTORE_MS = 30 * 60 * 1000;   /* half an hour — long enough to take a
                                        call mid-gathering, short enough that
                                        the next morning opens fresh at home */
const HOME_LOC = { tab: 'home', burdah: null, piece: null };
let navFromHistory = false;

function currentLoc(){
  const reading = !!document.querySelector('main.verses');
  return { tab: state.tab,
           burdah: state.burdahChapter,
           piece: (reading && msPiece) ? { kind: msPiece.kind, idx: msPiece.idx } : null };
}
function sameLoc(a, b){
  if(!a || !b) return false;
  const pa = a.piece, pb = b.piece;
  if(a.tab !== b.tab || a.burdah !== b.burdah) return false;
  if(!pa && !pb) return true;
  return !!pa && !!pb && pa.kind === pb.kind && pa.idx === pb.idx;
}
/* A descriptor can outlive the corpus it names — a saved place from an older
   release, a chapter since renumbered. Never hand a missing index to an
   opener; readerHTML would throw on it and the app would come up blank. */
function locValid(loc){
  if(!loc || typeof loc.tab !== 'string') return false;
  if(!loc.piece) return true;
  const a = arrayOf(loc.piece.kind);
  return !!(a && a[loc.piece.idx]);
}
function pushLoc(){
  if(navFromHistory) return;
  const loc = currentLoc();
  const cur = history.state && history.state.loc;
  try {
    if(sameLoc(cur, loc)) history.replaceState({ loc }, '');
    else history.pushState({ loc }, '');
  } catch(e){}
}
function applyLoc(loc){
  if(!locValid(loc)) return;
  navFromHistory = true;
  const prev = suppressNavSignals;
  suppressNavSignals = true;     /* walking back is not a nav to broadcast to a
                                    session, and must not pause a follower */
  try {
    setImmersive(false);
    closeMsMenu();
    state.tab = loc.tab;
    state.query = '';
    state.burdahChapter = loc.burdah;
    const fn = loc.piece && window[openFnOf(loc.piece.kind)];
    if(typeof fn === 'function') fn(loc.piece.idx);
    else renderIndex();
  } finally { suppressNavSignals = prev; navFromHistory = false; }
}
window.addEventListener('popstate', e => {
  /* Back closes what is on top first. Each of those consumed the pop, so put
     an entry back or the next Back would skip a whole screen. */
  if(state.immersive){ setImmersive(false); pushLoc(); return; }
  const menu = document.getElementById('ms-menu');
  if(menu && menu.classList.contains('open')){ closeMsMenu(); pushLoc(); return; }
  if(e.state && e.state.loc){ applyLoc(e.state.loc); return; }
  /* Popped past our own baseline: that is the reader asking to leave, so do
     nothing and let the platform close the app. */
});

/* Where you were, for a little while. Distinct from the Dalāʾil's "Continue
   where you left off", which is an explicit bookmark and permanent; this is
   automatic and expires. */
function saveLast(){
  try {
    const loc = currentLoc();
    if(loc.tab === 'session') return;    /* a live session is not a place to
                                            silently rejoin on next open */
    localStorage.setItem(LAST_KEY, JSON.stringify({ loc, at: Date.now() }));
  } catch(e){}
}
document.addEventListener('visibilitychange', () => {
  if(document.visibilityState === 'hidden') saveLast();
});
window.addEventListener('pagehide', saveLast);

renderIndex();

/* Opened from a shared session link (…/#s=4821)? Land on the session screen and
   join straight away — the tap on the link is the person's consent, and the
   banner makes it obvious what happened. Offline, this fails quietly and the
   app behaves exactly as normal. */
(function joinFromLink(){
  const code = pendingSessionCode();
  if(!code) return;
  state.tab = 'session';
  renderIndex();
  connectSession(code, 'follower');
})();

/* The baseline entry is always home, so Back out of a restored chapter lands
   on home rather than closing the app on the first press. */
(function restoreRecent(){
  try { history.replaceState({ loc: HOME_LOC }, ''); } catch(e){}
  /* A session link decides where to land; never override it. By now
     joinFromLink has already switched the tab and may have cleared the hash,
     so test both. */
  if(state.tab === 'session' || pendingSessionCode()) return;
  let saved = null;
  try { saved = JSON.parse(localStorage.getItem(LAST_KEY)); } catch(e){}
  if(!saved || typeof saved.at !== 'number') return;
  if(Date.now() - saved.at >= RESTORE_MS) return;
  if(!locValid(saved.loc) || sameLoc(saved.loc, HOME_LOC)) return;
  applyLoc(saved.loc);
  try { history.pushState({ loc: currentLoc() }, ''); } catch(e){}
})();

/* Pause auto-scroll the moment the user scrolls by hand (wheel or drag).
   Our own window.scrollBy doesn't fire these input events, so no false stops. */
/* The bismillah heads the reading bar, then folds away as soon as you scroll in,
   leaving a slim bar with Back and the bookmark.

   Two thresholds, not one, and deliberately far apart. The bar is sticky, so it
   holds its place in the flow: folding the bismillah shortens it, everything
   below rides up, the document itself gets shorter, and scrollY falls. With a
   single line to cross, that fall can carry scrollY straight back under it —
   which unfolds the bar, pushes the page down, and crosses the line again. The
   result was the bismillah blinking in and out several times a second while the
   header scrolled away. The gap here is wider than the height the fold removes,
   so the bar can no longer scroll itself back over its own threshold. Read on a
   rAF tick as well, so a burst of scroll events settles into one measurement. */
const BAR_SLIM_ON = 88, BAR_SLIM_OFF = 32;
let barTick = false;

function updateReaderBar(){
  const bar = document.querySelector('.reader-bar');
  if(!bar) return;
  const y = window.scrollY || 0;
  const slim = bar.classList.contains('slim');
  if(!slim && y > BAR_SLIM_ON)       bar.classList.add('slim');
  else if(slim && y < BAR_SLIM_OFF)  bar.classList.remove('slim');
}

window.addEventListener('scroll', () => {
  if(barTick) return;
  barTick = true;
  requestAnimationFrame(() => { barTick = false; updateReaderBar(); });
}, { passive:true });


/* Register service worker for offline use (needs hosting over https) */
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(()=>{});
}

/* Warm the Latin font cache while online (the Arabic is bundled in this file
   and always available). Not strictly needed for Arabic any more, but keeps the
   Latin faces available offline from the first visit. */
if (document.fonts && document.fonts.ready) {
  document.fonts.ready.catch(()=>{});
}