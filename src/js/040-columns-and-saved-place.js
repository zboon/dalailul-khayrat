/* ── Transliteration and Translation ────────────────────────────
   **Both off for a reader who has never chosen**, on the owner's call — the
   page opens as the Arabic alone, the way the book reads, and either column
   is one tap away. They used to default on, which is why the first screen of
   every chapter arrived three deep.

   Once either is turned on it stays on, across sessions. Written ONLY from
   `toggle` and `toggleEn`, the reader's own chips — the same discipline the
   size and `dlk-view` follow. Nothing else assigns showTr or showEn today;
   in particular a live session does NOT sync them, so a follower keeps their
   own columns, and nothing a leader does should start rewriting them. */
const COLS_KEY = 'dlk-cols';

function loadCols(which){
  try {
    const v = JSON.parse(localStorage.getItem(COLS_KEY));
    return !!(v && v[which]);
  } catch(e){ return false; }
}
function saveCols(){
  try {
    localStorage.setItem(COLS_KEY, JSON.stringify({ tr: state.showTr, en: state.showEn }));
  } catch(e){}
}

/* Which of the two readers opens. Book is the standard view — an unset
   preference means Book — and Study is the alternative, but whichever one was
   last chosen is what you come back to, so leaving the app in Study does not
   silently drop you back into Book next time.

   Written only from setPageView, which is the reader's own toggle. The two
   other places that assign state.pageView must NOT persist: applyRemoteNav
   forces a follower into the leader's view, and resumeDalail takes it from the
   saved bookmark — neither is a preference this reader expressed, and storing
   either would let a session you joined, or a place you resumed, quietly
   rewrite how the app opens afterwards. */
const VIEW_KEY = 'dlk-view';
function loadViewPref(){
  try { return localStorage.getItem(VIEW_KEY) !== 'study'; } catch(e){ return true; }
}
function saveViewPref(on){
  try { localStorage.setItem(VIEW_KEY, on ? 'book' : 'study'); } catch(e){}
}

/* Which script the Arabic is set in: 'uthmani' (the standard, KFGQPC Hafs),
   'indopak' (DigitalKhatt IndoPak) or 'naskh' (Scheherazade New). Unset, or
   anything unrecognised, means the version's own default: IndoPak in the
   Mughlay Version, Uthmani in Istanbul (owner's call) — so a reader who
   has never chosen a script sees the Mughlay text in the script of its
   Indo-Pak printing, and switching versions carries the default with it.
   Once a script is chosen it holds in both versions. Written only from
   setArFont, the reader's own switch — like the size, the columns and the
   view, and for the same reason: a live session does not carry it, so a
   follower keeps their own script and nothing a leader does rewrites it.
   Only the font changes; the text is the same bytes either way. */
const FONT_KEY = 'dlk-font';
const AR_FONTS = { uthmani: null, indopak: 'DKIndoPak', naskh: 'SchNew' };
let arFontChosen = (() => { try { const v = localStorage.getItem(FONT_KEY); return AR_FONTS[v] !== undefined ? v : null; } catch(e){ return null; } })();
/* dalailEdition is declared further down, so on the first call the stored
   version is read directly (the same key and rule as its initialiser). */
function defaultArFont(){
  let ed;
  try { ed = dalailEdition; }
  catch(e){ try { ed = localStorage.getItem('dlk-edition') === 'sayyidina' ? 'sayyidina' : 'istanbul'; } catch(e2){ ed = 'istanbul'; } }
  return ed === 'sayyidina' ? 'indopak' : 'uthmani';
}
let arFont = arFontChosen || defaultArFont();
function applyArFont(){
  document.documentElement.classList.toggle('ar-indopak', arFont === 'indopak');
  document.documentElement.classList.toggle('ar-naskh', arFont === 'naskh');
}
applyArFont();

