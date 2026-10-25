/* ── Book-Version verse bookmarking ───────────────────────
   The Study view marks a verse with a ribbon; a Book leaf has no room for one
   per phrase without disturbing the leaf-fit engine, so instead the verse you
   last tapped (highlighted) becomes the candidate and "Save my place" stores
   it. Only one place exists app-wide, shared with the Study bookmark. */
let msPlaceCandidate = null;

/* The whole-verse index from a mark key "d:idx:n" or a split chunk "d:idx:n.c". */
function mkVerseIndex(mk){
  const parts = String(mk).split(':');
  return parseInt(parts[2], 10);        // parseInt stops at the dot for "n.c"
}

/* The Book-Version span for a verse. Pass the bookmark's own mk (a seg key
   like "d:6:33.0:0") and, if the verse was split across a page turn, this
   lands on the CHUNK that seg actually sits in — not just any chunk of the
   same verse number. Without it (or if that chunk isn't in the DOM), falls
   back to the first chunk, so the bookmark lands on the leaf where the verse
   begins rather than nowhere.

   The prefix search alone can't tell chunks apart: "d:6:33." matches both
   "d:6:33.0" and "d:6:33.1", and always returns whichever is first in the
   DOM — the earlier page, even when the bookmarked phrase is on the later
   one. That silently mis-targeted both the resume scroll and the "is this
   leaf the one" check the place chip depends on. */
function msVerseEl(idx, n, mk){
  if(mk){
    const parts = String(mk).split(':');
    if(parts.length > 3){
      const chunk = document.querySelector('[data-mk="' + parts.slice(0, 3).join(':') + '"]');
      if(chunk) return chunk;
    }
  }
  const base = 'd:' + idx + ':' + n;
  return document.querySelector('[data-mk="' + base + '"]')
      || document.querySelector('[data-mk^="' + base + '."]');
}

/* Where the reader is on the current leaf, for a switch to the Study view:
   the phrase they last highlighted, else the bookmarked phrase, if either is
   on this leaf; else the top verse on the leaf. Before this the switch always
   took the top verse, so a reader who had marked words lower down — or on a
   leaf that opens mid-verse — landed on a different verse in Study.

   The phrase travels as its text plus its position among the verse's
   phrases, because the two views number phrases differently: the Book
   Version restarts the count on each page a verse spans, and a page turn
   inside a phrase splits it in two there but not in Study. */
function bookSpotForSwitch(){
  const book = document.getElementById('ms-book');
  if(!book) return { n: null };
  const sheet = book.children[msCurrentPage()];
  let el = null;
  if(msPlaceCandidate && msPiece && msPlaceCandidate.idx === msPiece.idx && msPlaceCandidate.mk){
    const c = book.querySelector('.seg[data-mk="' + msPlaceCandidate.mk + '"]');
    if(c && sheet && sheet.contains(c)) el = c;
  }
  if(!el && sheet) el = sheet.querySelector('.seg.placed[data-mk]');
  if(!el) return { n: topVisibleMsVerse() };
  const mk = el.getAttribute('data-mk');
  const n = mkVerseIndex(mk);
  const base = mk.split(':').slice(0, 2).join(':') + ':' + n;
  const all = Array.from(book.querySelectorAll('.seg[data-mk^="' + base + ':"], .seg[data-mk^="' + base + '."]'));
  return { n, seg: { text: el.textContent, est: Math.max(0, all.indexOf(el)) } };
}

/* The Study phrase matching a phrase carried over from the Book Version: the
   one containing its words, nearest its position if the words recur. */
function studySegFor(art, spot){
  const segs = Array.from(art.querySelectorAll('.seg[data-sg]'));
  const norm = t => String(t).replace(/[\s،]+/g, '');
  const want = norm(spot.text);
  let best = null, bestD = Infinity;
  segs.forEach((sg, i) => {
    if(want && norm(sg.textContent).indexOf(want) !== -1){
      const d = Math.abs(i - spot.est);
      if(d < bestD){ bestD = d; best = sg; }
    }
  });
  return best || segs[Math.min(spot.est, segs.length - 1)] || null;
}

/* The top-most verse still on screen on the current leaf — the fallback when
   the reader saves without having tapped a verse. */
function topVisibleMsVerse(){
  const book = document.getElementById('ms-book');
  if(!book) return null;
  const sheet = book.children[msCurrentPage()];
  if(!sheet) return null;
  const vs = sheet.querySelectorAll('.ms-v[data-mk]');
  for(let i=0;i<vs.length;i++){
    if(vs[i].getBoundingClientRect().bottom > 96) return mkVerseIndex(vs[i].getAttribute('data-mk'));
  }
  return vs.length ? mkVerseIndex(vs[vs.length-1].getAttribute('data-mk')) : null;
}

/* Show which verse holds the bookmark — one at a time. */
/* Mark exactly the word group that was tapped — the .seg span carrying that
   data-mk, and nothing wider.

   This used to fall back to msVerseEl(), which returns the whole .ms-v verse
   element. A Dalāʾil verse can hold several ۞ internally, so that lit up
   rosette after rosette instead of the phrase the reader chose, and when the
   fallback fired it marked the top verse of the leaf — a highlight that began
   earlier than the tap and stopped before reaching it. Marking by exact key
   makes both impossible. */
function markPlacedMsVerse(idx, n, seg, mk){
  [].forEach.call(document.querySelectorAll('.placed'), el => el.classList.remove('placed'));
  const key = mk || (seg != null ? 'd:' + idx + ':' + n + ':' + seg : null);
  if(!key) return;
  const s = document.querySelector('[data-mk="' + key + '"]');
  if(s) s.classList.add('placed');
}

/* The place is shown as saved only while the word group holding it is still
   highlighted. Lift the highlight and the bookmark goes with it. */
function placeStillMarked(){
  const p = loadPlace();
  if(!p || !p.mk) return false;
  try { return !!loadMarks()[p.mk]; } catch(e){ return false; }
}
function placeBtnLabel(idx){
  return (placeIsHere(idx) && placeStillMarked()) ? 'Place saved' : 'Save my place';
}
function refreshPlaceBtn(){
  const btn = document.querySelector('.place-btn');
  if(!btn) return;
  const idx = Number(btn.dataset.idx);
  const on = placeIsHere(idx) && placeStillMarked();
  btn.textContent = on ? 'Place saved' : 'Save my place';
  btn.classList.toggle('on', on);
}

function saveDalailPlace(idx){
  const c = DALAIL_CHAPTERS[idx];
  if(!c) return;
  /* Ask the page which reader is showing rather than trusting the flag.
     When the two disagree the flag saves the wrong kind of place, and it is
     silent about it: a Book leaf on screen with state claiming Study stores
     verse 0 with no phrase key, so nothing highlights, the chip never lights
     and the bookmark points at the top of the chapter instead of where the
     reader was. That is what the full-screen menu produced by flipping the
     view without re-rendering. renderedView() documents the same trap. */
  const rv = (typeof renderedView === 'function') ? renderedView() : 'none';
  const p = { idx, title: c.titleEnglish || '', at: Date.now(),
              view: rv === 'none' ? (state.pageView ? 'book' : 'study') : rv };
  if(p.view === 'book'){
    /* The verse the reader last tapped in this chapter, else the top of the
       page they are on. Only fall back to a bare leaf if no verse is found. */
    const cand = (msPlaceCandidate && msPlaceCandidate.idx === idx) ? msPlaceCandidate : null;
    /* Tapping Save again with nothing newly highlighted must not move the
       bookmark. It used to: the candidate was cleared on every save, so the
       second tap fell through to the top verse of the leaf and quietly
       overwrote a good mark. A standing place is now left alone. */
    if(!cand && placeIsHere(idx) && placeStillMarked()){ refreshPlaceBtn(); return; }
    let n  = cand ? cand.n   : null;
    let sg = cand ? cand.seg : null;
    let mk = cand ? cand.mk  : null;
    if(n == null) n = topVisibleMsVerse();
    if(n == null) p.leaf = msCurrentPage();
    else { p.verse = n; if(sg != null) p.seg = sg; if(mk) p.mk = mk; markPlacedMsVerse(idx, n, sg, mk); }
  } else {
    p.verse = topVisibleVerse();
  }
  writePlace(p);
  refreshPlaceBtn();
}

function clearDalailPlace(){
  /* Guard against a stray tap: this wipes the saved place and every Dalāʾil
     verse bookmark. Favorites (mawlid-favs) are a separate store, untouched. */
  if(typeof confirm === 'function' &&
     !confirm('Clear your Dalāʾil bookmarks?\n\nThis removes your saved place and every verse bookmark in the Dalāʾil. Your favorites are not affected.')) return;
  try { localStorage.removeItem(PLACE_KEY); localStorage.removeItem(PLACE_KEY + '-mughlay'); } catch(e){}
  /* Clear every Book-Version verse bookmark in the Dalāʾil too (mark keys are
     "kind:idx:n", so Dalāʾil marks start "d:"), so Clear wipes the resume place
     and all gold-ring verse bookmarks together. */
  try {
    const m = readMarkStore('dlk-marks');     // both versions' Dalāʾil highlights go
    let changed = false;
    Object.keys(m).forEach(k => { if(k.slice(0, 2) === 'd:'){ delete m[k]; changed = true; } });
    if(changed) localStorage.setItem('dlk-marks', JSON.stringify(m));
    localStorage.removeItem('dlk-marks-mughlay');
  } catch(e){}
  msPlaceCandidate = null;
  renderIndex();
}

/* Reopen the saved chapter in the view it was saved from and go to the spot.
   The jump is repeated once after a moment because the leaves are measured and
   fitted after the fonts land, which moves everything below them. */
function resumeDalail(){
  const cur = placeChapter();
  if(!cur) return;
  const { p, c } = cur;
  const hasPages = Array.isArray(c.folios) && c.folios.length > 0;
  state.pageView = (p.view === 'book') && hasPages;
  openDalail(p.idx);
  const go = (flash) => {
    if(state.pageView){
      const book = document.getElementById('ms-book');
      if(!book) return;
      let sheet = null, vEl = null;
      if(p.verse != null){
        vEl = msVerseEl(p.idx, p.verse, p.mk);
        if(vEl) sheet = vEl.closest('.ms-sheet');
      }
      if(!sheet && p.leaf != null) sheet = book.children[p.leaf];   // older page-level bookmark
      if(sheet){
        sheet.scrollIntoView({ block:'nearest', inline:'center' });
        if(typeof msSyncDots === 'function') msSyncDots();
      }
      if(vEl){
        markPlacedMsVerse(p.idx, p.verse, p.seg, p.mk);
        /* Aim at the saved phrase itself — the words between two rosettes —
           not the start of its verse. A long verse fills most of a leaf, so
           scrolling to where the verse begins left the phrase below the
           screen; and a verse that runs on from the previous page begins
           on a page the reader is not on. */
        const segEl = p.mk ? book.querySelector('.seg[data-mk="' + p.mk + '"]') : null;
        const target = segEl || vEl;
        const r = target.getBoundingClientRect();
        /* Low on the screen counts as out of view: the fixed leaf arrows sit
           over the bottom of it. */
        if(r.top < 84 || r.bottom > window.innerHeight * 0.75){
          window.scrollTo({ top: Math.max(0, r.top + window.scrollY - 160) });
        }
        if(flash){
          const cls = segEl ? 'seg-flash' : 'ms-flash';
          target.classList.remove(cls); void target.offsetWidth; target.classList.add(cls);
        }
      }
    } else if(p.verse != null){
      const el = document.querySelector('article.verse[data-v="' + p.verse + '"]');
      if(el) window.scrollTo({ top: Math.max(0, el.getBoundingClientRect().top + window.scrollY - 84) });
    }
  };
  if(window.requestAnimationFrame) requestAnimationFrame(() => requestAnimationFrame(() => go(false)));
  else setTimeout(() => go(false), 40);
  setTimeout(() => go(true), 320);
}

/* The card that offers the place back, shown at the head of the Dalāʾil tab. */
function resumeCard(){
  const cur = placeChapter();
  if(!cur) return '';
  const { p, c } = cur;
  const where = p.view === 'book'
    ? (p.verse != null
        ? 'Book Version · verse ' + toArNum(verseNo('d', p.idx, p.verse))
        : 'Book Version · page ' + ((p.leaf || 0) + 1))
    : 'Study Version · verse ' + toArNum(verseNo('d', p.idx, p.verse || 0));
  return `<div class="resume-wrap">
      <button class="resume-card" onclick="resumeDalail()">
        <span class="resume-ribbon">${bookmarkIcon(true)}</span>
        <span class="resume-text">
          <span class="resume-label">Continue where you left off</span>
          <span class="resume-ar">${c.titleArabic}</span>
          <span class="resume-where">${where}</span>
        </span>
        <span class="chev">›</span>
      </button>
      <button class="resume-clear" onclick="clearDalailPlace()">Clear</button>
    </div>`;
}

const state = { showTr: loadCols('tr'), showEn: loadCols('en'), refrainOpen: false, arScale: loadTextScale('ar'), latinScale: loadTextScale('latin'), msZoom: 1, query: '', tab: 'home', burdahChapter: null, favs: loadFavs() , pageView:loadViewPref(), immersive:false};

/* The content arrays, keyed by the same letters as OPENERS. */
function arrayOf(kind){
  return kind === 'q' ? QASIDAS
       : kind === 'b' ? BURDAH_CHAPTERS
       : kind === 's' ? SIRAH_CHAPTERS
       : kind === 'i' ? ILAHI_CHAPTERS
       : kind === 'd' ? DALAIL_CHAPTERS
       : kind === 'z' ? BARZANJI_CHAPTERS
       : kind === 'y' ? DIYA_CHAPTERS
       : kind === 'n' ? NASHEED_CHAPTERS
       : kind === 'l' ? LITANY_CHAPTERS
       : null;
}
function pieceOf(kind, idx){ const a = arrayOf(kind); return a ? a[idx] : null; }
function favKey(kind, piece){ return kind + '|' + piece.titleEnglish; }
function isFav(kind, idx){
  const p = pieceOf(kind, idx);
  return !!p && state.favs.includes(favKey(kind, p));
}
function toggleFav(kind, idx){
  const p = pieceOf(kind, idx);
  if(!p) return;
  const key = favKey(kind, p);
  const at = state.favs.indexOf(key);
  if(at >= 0) state.favs.splice(at, 1); else state.favs.push(key);
  saveFavs();
  updateFavUI(kind, idx);
}
/* Bookmark glyph: outline when unsaved, filled when saved. Drawn as SVG so it
   takes the app's gold via currentColor instead of an emoji's fixed colour. */
function bookmarkIcon(on){
  return `<svg viewBox="0 0 24 24" width="19" height="19" aria-hidden="true"
    fill="${on ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="1.7"
    stroke-linecap="round" stroke-linejoin="round">
    <path d="M6.5 3.5h11a.9.9 0 0 1 .9.9v15.8a.5.5 0 0 1-.77.42L12 16.8l-5.63 3.82a.5.5 0 0 1-.77-.42V4.4a.9.9 0 0 1 .9-.9z"/>
  </svg>`;
}

