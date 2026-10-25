/* ── Where you left off (Dalāʾil only) ───────────────────────────
   A ribbon, not a shelf: exactly one place is kept, and saving a new one
   replaces it. This is deliberately separate from favourites — a favourite
   marks a piece you want to find again, a place marks how far you have read
   through a long portion you mean to finish. */
const PLACE_KEY = 'dlk-dalail-place';
/* One saved place per version of the Dalāʾil. The Mughlay Version divides
   its text where the Mughlay printing does, so a phrase (and so a saved
   place) in one version is not the same phrase in the other. The Istanbul
   place keeps the original key, so places saved before there were two
   versions are still found. Read through a try because a place can be
   looked up before dalailEdition is declared further down. */
function placeKey(){
  let ed = 'istanbul';
  try { ed = dalailEdition; } catch(e){}
  return ed === 'sayyidina' ? PLACE_KEY + '-mughlay' : PLACE_KEY;
}

function loadPlace(){
  try {
    const p = JSON.parse(localStorage.getItem(placeKey()));
    return (p && typeof p.idx === 'number') ? p : null;
  } catch(e){ return null; }
}
function writePlace(p){ try { localStorage.setItem(placeKey(), JSON.stringify(p)); } catch(e){} }

/* The saved place is tied to the chapter's title as well as its index, so a
   place doesn't silently point at the wrong portion if the order ever changes. */
function placeChapter(){
  const p = loadPlace();
  if(!p) return null;
  const c = DALAIL_CHAPTERS[p.idx];
  if(!c) return null;
  if(p.title && c.titleEnglish !== p.title) return null;
  return { p, c };
}
/* True only while the CURRENT leaf is the one the bookmark actually sits on —
   not merely "this chapter has a bookmark somewhere." It used to be the
   latter, so "Place saved" stayed lit across the whole chapter as you paged
   forward, with nothing to say the bookmark was still back on the page you
   left. Book-Version only: a Study-view place has no leaf to compare against,
   so it never reads as "here" for the Book-Version button. */
function placeIsHere(idx){
  const cur = placeChapter();
  if(!cur || cur.p.idx !== idx || cur.p.view !== 'book') return false;
  const book = document.getElementById('ms-book');
  if(!book) return false;
  const p = cur.p;
  let sheet = null;
  if(p.verse != null){
    const vEl = msVerseEl(idx, p.verse, p.mk);
    if(vEl) sheet = vEl.closest('.ms-sheet');
  }
  if(!sheet && p.leaf != null) sheet = book.children[p.leaf];
  if(!sheet) return false;
  return Array.from(book.children).indexOf(sheet) === msCurrentPage();
}

/* The first verse still on screen — where the eye is, not where the page
   happens to begin. */
function topVisibleVerse(){
  const arts = document.querySelectorAll('main.verses article.verse[data-v]');
  for(let i=0;i<arts.length;i++){
    if(arts[i].getBoundingClientRect().bottom > 96) return +arts[i].dataset.v;
  }
  return arts.length ? +arts[arts.length-1].dataset.v : 0;
}

/* Bookmark one exact verse in the Study view. Tapping the ribbon on a verse
   moves the bookmark there; tapping the same verse again lifts it. Only one
   verse is ever marked, so the ribbon shows you precisely where you stopped
   rather than roughly how far down the page you were. */
function placeVerse(idx, n){
  const cur = loadPlace();
  const same = cur && cur.idx === idx && cur.view === 'study' && cur.verse === n;
  const prev = document.querySelector('article.verse.placed');
  if(prev) prev.classList.remove('placed');
  const btnPrev = document.querySelector('.verse-place.on');
  if(btnPrev) btnPrev.classList.remove('on');

  if(same){                       // tapping the marked verse lifts the bookmark
    try { localStorage.removeItem(placeKey()); } catch(e){}
    return;
  }
  const c = DALAIL_CHAPTERS[idx];
  if(!c) return;
  writePlace({ idx, title: c.titleEnglish || '', at: Date.now(), view: 'study', verse: n });
  const el = document.querySelector('article.verse[data-v="' + n + '"]');
  if(el){
    el.classList.add('placed');
    const b = el.querySelector('.verse-place');
    if(b) b.classList.add('on');
  }
}

/* Is this the verse currently bookmarked? */
function placedVerse(idx, n){
  const cur = loadPlace();
  return !!cur && cur.idx === idx && cur.view === 'study' && cur.verse === n;
}

