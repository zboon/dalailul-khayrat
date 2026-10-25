/* ── The open-book spread ────────────────────────────────────────────
   Offered on a desktop window or a tablet held sideways — screens wide enough
   that halving them still leaves a page worth reading. It was briefly offered
   on a folding phone's inner screen instead and that was DROPPED at the user's
   request: ~717px halved gives two columns too narrow to read comfortably.
   The landscape test keeps out a tablet in portrait; the width floor keeps out
   phones held sideways, and both fold screens. */
const SPREAD_MQ = window.matchMedia(
  '(min-width: 900px) and (min-height: 600px) and (orientation: landscape)');
const SPREAD_KEY = 'dlk-spread';

function spreadOffered(){ return SPREAD_MQ.matches; }

function spreadOn(){
  try{ return spreadOffered() && localStorage.getItem(SPREAD_KEY) === '1'; }
  catch(e){ return false; }
}

function toggleSpread(kind, idx){
  try{ localStorage.setItem(SPREAD_KEY, spreadOn() ? '0' : '1'); }catch(e){}
  reopen(kind, idx);
}

/* Fold or unfold the phone and the offer appears or disappears; if the spread
   was on and there is no longer room for it, the reader falls back to one leaf. */
if(SPREAD_MQ.addEventListener) SPREAD_MQ.addEventListener('change', () => {
  if(msPiece && state.pageView) reopen(msPiece.kind, msPiece.idx);
});

/* Which piece the reader is showing, so the last leaf can carry on into the
   next section instead of dead-ending. Set by readerHTML. */
let msPiece = null;

/* The chapter dir steps to, skipping any that carry no verses yet. Unfilled
   scaffolds (the litany title slots, the not-yet-built daily portions) are
   hidden from every index, so stepping into one would strand the reader on a
   run of blank placeholders. Takes kind/idx rather than reading msPiece,
   because readerHTML needs it while building a page — before msPiece has been
   set for that piece. */
/* The Dalāʾil is read in groups, and its own index already shows them that
   way: [1]–[5] before the reading, closing on the Names of the Prophet ☵;
   [6]–[14] the week and then the Duʿāʾ of Completion. Prev/Next stays inside
   the group, so finishing the preliminaries no longer tips a reader straight
   into Monday's portion, and the week still carries on to the Completion
   duʿāʾ. [0] is the About page and is in neither: it can lead you in (its own
   Next is unbounded) but the sequence never sends you back to it. */
const DALAIL_GROUPS = [[1, 5], [6, 14]];
function dalailGroup(idx){
  return DALAIL_GROUPS.find(g => idx >= g[0] && idx <= g[1]) || null;
}
function neighbourPiece(kind, idx, dir){
  const a = arrayOf(kind);
  if(!a) return null;
  const g = (kind === 'd') ? dalailGroup(idx) : null;
  const lo = g ? g[0] : 0, hi = g ? Math.min(g[1], a.length - 1) : a.length - 1;
  for(let n = idx + dir; n >= lo && n <= hi; n += dir){
    if(a[n] && a[n].verses && a[n].verses.length) return { kind, idx: n };
  }
  return null;
}
function nextPiece(){
  return msPiece ? neighbourPiece(msPiece.kind, msPiece.idx, 1) : null;
}

/* Study Version only — the owner's call. In the Book Version it added a second
   navigation idea to a page that already has leaf arrows and dots, and took up
   room the leaf needs; the next arrow there already carries forward from the
   last leaf, which stays. */
function chapterNav(kind, idx){
  const pv = neighbourPiece(kind, idx, -1), nx = neighbourPiece(kind, idx, 1);
  if(!pv && !nx) return '';
  const btn = (o, dir, label) => {
    const piece = arrayOf(o.kind)[o.idx];
    return `<button class="chap-${dir}" onclick="${openFnOf(o.kind)}(${o.idx})"
      aria-label="${label} chapter: ${attrEsc(displayTitle(piece))}">
      <span class="chap-dir">${label}</span>
      <span class="chap-name">${displayTitle(piece)}</span></button>`;
  };
  return `<nav class="chap-nav">
    ${pv ? btn(pv, 'prev', 'Previous') : '<span class="chap-gap"></span>'}
    ${nx ? btn(nx, 'next', 'Next') : '<span class="chap-gap"></span>'}
  </nav>`;
}

/* The one place the Book Version carries that pair too — the Dalāʾil's
   before-reading group, on the owner's call, so a reader who finishes the
   Opening Duʿāʾ can go straight to the next reading instead of returning to
   the index. Every leaf of those chapters shows it. Nowhere else: the v401
   reasoning still holds for the daily portions, where the leaf arrows and dots
   are the whole navigation. */
function msChapNav(kind, idx){
  if(kind !== 'd') return '';
  const g = dalailGroup(idx);
  if(!g || g[0] !== DALAIL_GROUPS[0][0]) return '';
  const nav = chapterNav(kind, idx);
  return nav ? `<div class="ms-chap" id="ms-chap">${nav}</div>` : '';
}


/* +1 turns to the next leaf, which sits to the left. Turning past the last
   leaf opens the next section — the reader carries on through the book rather
   than having to go back to the index between every part. */
function msStep(d){
  const book = document.getElementById('ms-book');
  if(!book) return;
  const n = book.children.length;
  const cur = msCurrentPage();
  /* A spread turns two leaves at a time, and the last spread of an odd-length
     chapter is reached once its first leaf is showing. */
  if(book.classList.contains('spread')){
    const from = cur - (cur % 2);
    const next = from + d * 2;
    if(d > 0 && next >= n){
      const nx = nextPiece();
      const fn = nx && window[openFnOf(nx.kind)];
      if(typeof fn === 'function') fn(nx.idx);
      return;
    }
    msGoTo(Math.max(0, Math.min(next, n - 1)));
    return;
  }
  if(d > 0 && cur >= n - 1){
    const nx = nextPiece();
    const fn = nx && window[openFnOf(nx.kind)];
    if(typeof fn === 'function') fn(nx.idx);
    return;
  }
  msGoTo(Math.max(0, Math.min(cur + d, n - 1)));
}

function msGoTo(i){
  const book = document.getElementById('ms-book');
  if(book && book.classList.contains('spread')) i = i - (i % 2);
  if(!book || !book.children[i]) return;
  book.children[i].scrollIntoView({ behavior:'smooth', block:'nearest', inline:'center' });
  /* Land at the top of the leaf, not wherever the previous page was scrolled to. */
  const goTop = () => {
    const top = book.getBoundingClientRect().top + window.scrollY - 8;
    window.scrollTo({ top: Math.max(0, top), behavior:'smooth' });
  };
  requestAnimationFrame(goTop);
}

/* Marks are kept per phrase, on the device. The Dalāʾil's own ("d:" keys)
   are kept per version: the Mughlay Version divides phrases where its own
   printing does, so a highlight made in one version would light a
   different phrase in the other. Istanbul's stay in the original store, so
   highlights made before there were two versions are still found; the
   Mughlay Version's sit beside it under '-mughlay'. Every other collection
   shares one store whichever version is chosen. Function declarations, not
   consts, because marks can be read before this point in the script. */
function readMarkStore(key){
  try { return JSON.parse(localStorage.getItem(key)) || {}; }
  catch(e){ return {}; }
}
function mughlayNow(){ try { return dalailEdition === 'sayyidina'; } catch(e){ return false; } }
function markStoreFor(kind){ return (kind === 'd' && mughlayNow()) ? 'dlk-marks-mughlay' : 'dlk-marks'; }
function loadMarks(){
  const m = readMarkStore('dlk-marks');
  if(!mughlayNow()) return m;
  Object.keys(m).forEach(k => { if(k.slice(0, 2) === 'd:') delete m[k]; });
  return Object.assign(m, readMarkStore('dlk-marks-mughlay'));
}

function markKey(kind, idx, n, seg){ return kind + ':' + idx + ':' + n + (seg != null && seg !== '' ? ':' + seg : ''); }

function markVerse(kind, idx, n, seg){
  const k = markKey(kind, idx, n, seg), store = markStoreFor(kind);
  const m = readMarkStore(store);
  const on = !m[k];
  if(m[k]) delete m[k]; else m[k] = 1;
  try { localStorage.setItem(store, JSON.stringify(m)); } catch(e){}
  const el = document.querySelector('[data-mk="' + k + '"]');
  if(el) el.classList.toggle('marked', on);
  /* In the Dalāʾil, the phrase you last highlight is the one "Save my place"
     will bookmark. */
  if(kind === 'd'){
    const vi = parseInt(n, 10), sv = (seg != null ? seg : null);
    if(on) msPlaceCandidate = { idx, n: vi, seg: sv, mk: k };
    else if(msPlaceCandidate && msPlaceCandidate.idx === idx && msPlaceCandidate.n === vi && msPlaceCandidate.seg === sv) msPlaceCandidate = null;
    /* Un-highlighting the bookmarked group clears the place, so the mark can
       be lifted from the leaf itself rather than only from the index. */
    if(!on){
      const pl = loadPlace();
      if(pl && pl.mk === k){
        try { localStorage.removeItem(placeKey()); } catch(e){}
        const was = document.querySelector('.placed');
        if(was) was.classList.remove('placed');
      }
    }
    refreshPlaceBtn();
  }
}

