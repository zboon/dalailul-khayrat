/* ── Following the leader within a piece ──────────────────────────────────
   Page sync moves everyone between leaves; this moves them between LINES.
   The unit sent is a verse index, never a scroll offset: followers differ in
   text size, in whether translation and transliteration are showing, and in
   screen height, so the same pixel — or the same percentage down the page —
   is a different place on every device. A verse index is the same line
   everywhere, and both views already share it. */

let spotProgrammatic = false;   /* true while WE are doing the scrolling */
let spotLastSent = 0, spotLastVerse = -1, spotTimer = null;
/* Position within the top verse, 0 at its first line and 1 at its last, so a
   leader nudging the page a few lines inside one long verse still moves his
   followers. A fraction travels safely between devices where a pixel offset
   would not: font size, translation toggles and screen height all differ. */
let spotLastFrac = -1;
/* Where we last put a follower. Compared against the real scroll position to
   tell the app's own scrolling apart from the reader's — a timer can't, now
   that we scroll several times a second. */
let spotExpectedY = null;
const SPOT_PAD = 96;            /* matches topVisibleVerse's sticky-bar offset */
const SPOT_MS = 80;             /* mirror rate; was 900, then 120 */

/* The element for a verse in whichever view is open. */
function verseEl(kind, idx, n){
  /* Study first, scoped to the verse flow so a hidden Book leaf elsewhere in
     the DOM can't win and hand back a zero-height rectangle. Then the Book
     wrapper, then its first segment — the segment key is colon-separated
     (d:idx:n:sg), and this last selector had a full stop, so it never matched
     anything and Book-Version targets fell through to nothing. */
  const tries = [
    'main.verses article.verse[data-v="' + n + '"]',
    '[data-mk="' + kind + ':' + idx + ':' + n + '"]',
    '[data-mk^="' + kind + ':' + idx + ':' + n + ':"]'
  ];
  for(const sel of tries){
    const el = document.querySelector(sel);
    /* An element that isn't laid out has no position to scroll to. */
    if(el && el.offsetParent !== null) return el;
  }
  return null;
}

/* Comfortably on screen — not merely intersecting it by a pixel. Followers
   stay put while the leader is reading the same lines they are; the screen
   only moves once he has genuinely gone past. */
function verseOnScreen(kind, idx, n, slack){
  const el = verseEl(kind, idx, n);
  if(!el) return false;
  const r = el.getBoundingClientRect();
  const pad = slack || 0;
  return r.bottom > 84 - pad && r.top < window.innerHeight - 24 + pad;
}

/* Wrap any scroll we perform ourselves, so the follower's own-movement
   watcher below doesn't mistake it for the reader wandering off. */
function spotScroll(fn){
  spotProgrammatic = true;
  try { fn(); } finally { setTimeout(() => { spotProgrammatic = false; }, 700); }
}

function sendSpot(verse, frac){
  if(!session.channel || session.role !== 'leader' || !session.lastNav) return;
  session.dbgSent = (session.dbgSent || 0) + 1;
  frac = typeof frac === 'number' ? frac : 0;
  /* Resend when the line changes, or when we have slid far enough within it
     to be worth a message. */
  if(verse === spotLastVerse && Math.abs(frac - spotLastFrac) < 0.005) return;
  spotLastVerse = verse; spotLastFrac = frac; spotLastSent = Date.now();
  const k = session.lastNav.kind, i = session.lastNav.idx;
  try { session.channel.send({ type:'broadcast', event:'spot',
    payload:{ kind:k, idx:i, verse, frac, term: session.term } }); } catch(e){}
}

/* How far the viewport has travelled into the top visible verse. */
/* The leader's current line and how far into it the screen has travelled.
   One definition, used by the scroll sampler, the heartbeat and the reply to
   a joiner's 'where' — they used to disagree. */
/* Which reader is actually on the screen, as opposed to which one the user
   last asked for. state.pageView is the Dalāʾ il's Book toggle and it STAYS SET
   when you move to a piece that has no folios — a qasida, a mawlid — which
   renders in Study. The sampler trusted it, went looking for a manuscript line
   that could not exist, found nothing and fell silent, on every piece except
   the Dalāʾil. Ask the page instead. */
function renderedView(){
  if(document.querySelector('main.verses article.verse[data-v]')) return 'study';
  if(document.querySelector('.ms-v[data-mk]')) return 'book';
  return 'none';
}

function currentSpot(){
  if(!session.lastNav) return null;
  const view = renderedView();
  if(view === 'none') return null;
  const book = view === 'book' && typeof topVisibleMsVerse === 'function';
  /* Ask the DOM whether a reader is on screen rather than trusting a flag.
     readerOpen is set while BUILDING the markup and cleared by renderIndex, so
     any path that renders out of that order leaves it lying — and a stale
     false silenced this sampler entirely, while a deliberate tap on a line,
     which checks the DOM instead, went on working. Hence the reported split:
     tapping a verse moved every follower, scrolling moved none. Same question,
     asked the same way, in both places now. */
  const v = book ? topVisibleMsVerse() : topVisibleVerse();
  if(typeof v !== 'number' || v < 0) return null;
  /* A Book-Version leaf doesn't scroll, so there is no fraction to send. */
  return { verse: v, frac: book ? 0 : spotFracOf(session.lastNav.kind, session.lastNav.idx, v) };
}

/* sendSpot stays silent when the position hasn't changed, which is right for
   scrolling and WRONG for anyone who has just walked in: a leader sitting
   still on one line had nothing to say, so a joiner landed on the piece and
   then sat at the top of it. This says it anyway. */
/* The leader's position was published only from a scroll handler. If those
   events don't arrive — a momentum gesture that fires nothing until it
   settles, a view whose scrolling isn't the window's — followers never hear
   anything and sit still. A timer doesn't care how the page moved. sendSpot
   still drops unchanged positions, so a leader sitting still costs nothing. */
let spotTick = null;
function startSpotTicker(){
  stopSpotTicker();
  spotTick = setInterval(() => {
    if(session.role !== 'leader' || !session.channel || !session.lastNav) return;
    const c = currentSpot();
    if(!c){
      session.dbgWhy = !session.lastNav ? 'noNav'
        : (renderedView() === 'none' ? 'noReader' : 'noVerse');
      return;
    }
    session.dbgWhy = '';
    session.dbgSpot = c.verse + '@' + (c.frac||0).toFixed(2);
    sendSpot(c.verse, c.frac);
  }, 250);
}
function stopSpotTicker(){ if(spotTick){ clearInterval(spotTick); spotTick = null; } }

function sendSpotNow(){
  if(session.role !== 'leader') return;
  const c = currentSpot();
  if(!c) return;
  spotLastVerse = -1; spotLastFrac = -1;      /* past the no-change guard */
  sendSpot(c.verse, c.frac);
}

function spotFracOf(kind, idx, n){
  const el = verseEl(kind, idx, n);
  if(!el) return 0;
  const r = el.getBoundingClientRect();
  if(!r.height) return 0;
  return Math.max(0, Math.min(1, (SPOT_PAD - r.top) / r.height));
}

/* Where the follower's page should sit right now, recomputed from the DOM
   each frame so it stays right even if the layout shifts under us. */
let spotTarget = null, spotAnim = null;

function spotTargetY(){
  if(!spotTarget) return null;
  const el = verseEl(spotTarget.kind, spotTarget.idx, spotTarget.verse);
  if(!el) return null;
  const r = el.getBoundingClientRect();
  return Math.max(0, window.scrollY + r.top + (spotTarget.frac || 0) * r.height - SPOT_PAD);
}

/* Messages arrive in steps; the eye wants continuous motion. So rather than
   snapping to each one, ease toward the latest position every frame. Between
   two updates the page keeps gliding, which is what makes it read as the
   leader's screen rather than a slideshow of his positions. */
function spotStep(){
  spotAnim = null;
  if(session.role !== 'follower' || session.paused) return;
  const target = spotTargetY();
  if(target === null) return;
  const cur = window.scrollY;
  const d = target - cur;
  if(Math.abs(d) < 0.6){ spotExpectedY = target; return; }
  /* A big jump — a page turn, or a tap on a distant line — is taken at once;
     ordinary reading movement is eased. */
  const step = Math.abs(d) > window.innerHeight * 0.9 ? d : d * 0.34;
  const want = Math.max(0, cur + step);
  window.scrollTo(0, want);
  /* Record what we ASKED for. Reading scrollY back here is unreliable —
     Safari updates it asynchronously, so we would store the old position and
     then mistake our own scroll for the reader grabbing the page. */
  spotExpectedY = want;
  spotAnim = requestAnimationFrame(spotStep);
}

function spotGoTo(kind, idx, verse, frac){
  spotTarget = { kind, idx, verse, frac: frac || 0 };
  if(!spotAnim) spotAnim = requestAnimationFrame(spotStep);
}

/* The leader's own scrolling, throttled: at most one message a second, and
   only when the top line actually changes. */
function spotOnScroll(){
  if(session.role !== 'leader' || !session.lastNav || spotProgrammatic) return;
  if(spotTimer) return;
  const wait = Math.max(0, SPOT_MS - (Date.now() - spotLastSent));
  spotTimer = setTimeout(() => {
    spotTimer = null;
    if(session.role !== 'leader' || !session.lastNav) return;
    const c = currentSpot();
    if(!c) return;
    sendSpot(c.verse, c.frac);
  }, wait);
}

function applyRemoteSpot(kind, idx, verse, frac){
  session.dbgRecv = (session.dbgRecv || 0) + 1;
  session.dbgLast = kind + ':' + idx + ':' + verse;
  /* Only meaningful if we're on the same piece; otherwise the nav event
     that brings us there will carry its own position. */
  if(!session.lastNav || session.lastNav.kind !== kind || session.lastNav.idx !== idx) return;
  session.leaderAt = Object.assign({}, session.leaderAt || {}, { kind, idx, verse, frac });
  if(session.role !== 'follower' || session.paused) return;
  /* Track him continuously rather than only when he leaves our screen — the
     old "already on screen" test let a follower sit a whole page out of step. */
  spotGoTo(kind, idx, verse, frac);
}

/* A follower who scrolls away far enough that the leader's line has left the
   screen has chosen to look elsewhere — stop dragging them back. Small
   adjustments are ignored, so glancing up a line doesn't break the link. */
function spotStopAnim(){
  if(spotAnim){ cancelAnimationFrame(spotAnim); spotAnim = null; }
  spotTarget = null;
}

function spotWatchFollower(){
  if(session.role !== 'follower' || session.paused || spotProgrammatic) return;
  if(spotExpectedY === null) return;
  /* Drifting more than half a screen from where we placed them means the
     reader took hold of the page themselves. */
  if(Math.abs(window.scrollY - spotExpectedY) > window.innerHeight * 0.5) pauseFollowing();
}

window.addEventListener('scroll', () => { spotOnScroll(); spotWatchFollower(); }, { passive:true });

/* Tap a line while leading and everyone jumps to it. Study view only: in the
   Book Version a tap already places the gold ring, and pages are synced
   anyway. Buttons inside a verse keep their own actions. */
document.addEventListener('click', (e) => {
  if(session.role !== 'leader' || !session.lastNav) return;
  if(e.target.closest('button, a')) return;
  const art = e.target.closest('main.verses article.verse[data-v]');
  if(!art) return;
  const n = +art.dataset.v;
  spotLastVerse = -1;                       // a deliberate tap always sends
  sendSpot(n);
  art.classList.remove('hit-flash'); void art.offsetWidth; art.classList.add('hit-flash');
}, true);

/* A follower turns to the leader's Book-Version page. */
function applyRemotePage(kind, idx, page){
  session.leaderAt = { kind, idx, page };
  if(!session.lastNav || session.lastNav.kind !== kind || session.lastNav.idx !== idx) return;
  msGoToWhenReady(page);
}
function msGoToWhenReady(page, tries){
  tries = tries || 0;
  const book = document.getElementById('ms-book');
  if(book && book.children[page]){
    suppressNavSignals = true;
    try { msGoTo(page); } finally { setTimeout(() => { suppressNavSignals = false; }, 400); }
  } else if(tries < 12){
    setTimeout(() => msGoToWhenReady(page, tries + 1), 120);
  }
}
function sendNav(kind, idx){
  if(!session.channel) return;
  const page = (typeof msCurrentPage === 'function') ? msCurrentPage() : 0;
  /* Tell followers what is on screen here, not what this device's Book toggle
     happens to be left on — they were being asked to switch to a Book view of
     a piece that has no folios. */
  const book = renderedView() === 'book';
  try { session.channel.send({ type:'broadcast', event:'nav', payload:{ kind, idx, page, book, term: session.term } }); } catch(e){}
}
