function openQasida(i){
  applyTextScale();
  app.innerHTML = readerHTML(QASIDAS[i], 'renderIndex()', 'q', i);
  queueMsAutoFit();
  window.scrollTo(0,0);
  onNavigated('q', i);
}

function openBurdah(n){
  state.burdahChapter = n;
  applyTextScale();
  app.innerHTML = readerHTML(BURDAH_CHAPTERS[n], "selectTab('burdah')", 'b', n);
  queueMsAutoFit();
  window.scrollTo(0,0);
  onNavigated('b', n);
}

function openNasheed(n){
  applyTextScale();
  app.innerHTML = readerHTML(NASHEED_CHAPTERS[n], "selectTab('nasheeds')", 'n', n);
  queueMsAutoFit();
  window.scrollTo(0,0);
  onNavigated('n', n);
}

function openLitany(n){
  applyTextScale();
  app.innerHTML = readerHTML(LITANY_CHAPTERS[n], "selectTab('" + (isAzamDay(n) ? 'azam' : isIstighfarDay(n) ? 'istighfar' : 'litanies') + "')", 'l', n);
  queueMsAutoFit();
  window.scrollTo(0,0);
  onNavigated('l', n);
}

function openDiya(n){
  applyTextScale();
  app.innerHTML = readerHTML(DIYA_CHAPTERS[n], "selectTab('diya')", 'y', n);
  queueMsAutoFit();
  window.scrollTo(0,0);
  onNavigated('y', n);
}

function openBarzanji(n){
  applyTextScale();
  app.innerHTML = readerHTML(BARZANJI_CHAPTERS[n], "selectTab('barzanji')", 'z', n);
  queueMsAutoFit();
  window.scrollTo(0,0);
  onNavigated('z', n);
}

function openDalail(n){
  applyTextScale();
  document.documentElement.style.setProperty('--ms-zoom', state.msZoom);
  app.innerHTML = readerHTML(DALAIL_CHAPTERS[n], "selectTab('dalail')", 'd', n);
  queueMsAutoFit();
  window.scrollTo(0,0);
  onNavigated('d', n);
}


/* Book Version sizing — one page size for the whole chapter, text filling each
   page, at a size that is actually readable.

   The leaves of a printed chapter hold nearly the same amount of text (Monday's
   thirteen pages vary by under ten percent), which is what lets a calligrapher
   fill every page in a fixed frame. We do the same thing: measure every leaf,
   take the fullest one as the height of ALL leaves, then scale each leaf's
   Arabic to fill that shared frame. A page therefore stands taller than the
   screen and is read by scrolling — the alternative is squeezing a whole book
   page into a phone's height, which forces the text down to an unreadable size.
   The closing leaf of a chapter is left at its natural size, as in the book,
   where the last page runs short and gives way to the tailpiece. */
function msAutoFit(){
  const book = document.getElementById('ms-book');
  if(!book) return;
  const pages = Array.from(book.querySelectorAll('.ms-page'));
  if(!pages.length) return;

  /* Release every leaf to its natural height at the base size, so we can see
     how tall each printed page actually wants to be. */
  const leaves = [];
  pages.forEach(p => {
    const t = p.querySelector('.ms-text');
    if(!t) return;
    t.style.fontSize = '';
    /* Clear the CSS floor while measuring — full screen sets min-height:100dvh,
       which would otherwise mask how tall the page's text actually is. */
    p.style.minHeight = '0px';
    p.style.height = 'auto';
    leaves.push({ p, t, base: parseFloat(getComputedStyle(t).fontSize) || 24 });
  });
  if(!leaves.length) return;
  leaves.forEach(o => { o.nat = o.p.offsetHeight; });

  /* One height for the whole chapter, taken at a high percentile rather than
     the very tallest leaf: the few densest pages give up a little size (the
     spread across a chapter is under ten percent, so it doesn't show) and no
     page is left with a gap at its foot. The closing leaf is left out so a
     short final page can't shrink the rest. */
  const shortLeaf = o => o.p.classList.contains('ms-short');
  let pool = leaves.length > 1 ? leaves.slice(0, -1) : leaves;
  /* A deliberately short leaf must not drag the chapter's height down. */
  if(pool.some(o => !shortLeaf(o))) pool = pool.filter(o => !shortLeaf(o));
  const sorted = pool.map(o => o.nat).sort((a, b) => a - b);
  let H = sorted[Math.min(sorted.length - 1, Math.round((sorted.length - 1) * 0.8))];
  /* In full screen a leaf should at least fill the screen; in the normal reader
     it sits at book proportions. */
  const immersive = document.documentElement.classList.contains('immersive');
  /* Width of one leaf, which is half the scroller in a spread. */
  const leafW = (book.firstElementChild && book.firstElementChild.clientWidth) || book.clientWidth || 360;
  H = Math.max(H, immersive ? window.innerHeight - playerHeight()
                            : Math.min(window.innerHeight * 0.72, leafW * 1.5));

  leaves.forEach(o => {
    o.p.style.minHeight = '0px';   // the fitted height is the height
    o.p.style.height = H + 'px';
  });

  /* Fit one leaf's text to the shared height, never above the cap it is given. */
  const fit = (o, MAX) => {
    const MIN = o.base * 0.6;
    /* The space still free between the foot of the text and the foot of the
       page's content box, read from what the browser actually laid out. Working
       from the rendered geometry avoids having to add up padding, borders and
       band heights by hand — an error there is exactly what leaves a stubborn
       band of blank paper under every page. */
    const room = () => {
      const cs = getComputedStyle(o.p);
      const pr = o.p.getBoundingClientRect(), tr = o.t.getBoundingClientRect();
      return (pr.bottom - parseFloat(cs.paddingBottom) - parseFloat(cs.borderBottomWidth)) - tr.bottom;
    };
    /* Text height grows roughly with the square of the font size, so one
       square-root step lands close; the loops then settle it exactly. */
    const th = o.t.offsetHeight, r0 = room();
    let size = (th > 0) ? o.base * Math.sqrt((th + r0) / th) : o.base;
    size = Math.max(MIN, Math.min(MAX, size));
    o.t.style.fontSize = size + 'px';
    let guard = 0;
    while(room() < 0 && size > MIN && guard++ < 30){
      size = Math.max(MIN, size * 0.975);
      o.t.style.fontSize = size + 'px';
    }
    guard = 0;
    while(size < MAX && guard++ < 30){
      const next = Math.min(MAX, size * 1.02);
      o.t.style.fontSize = next + 'px';
      if(room() < 0){ o.t.style.fontSize = size + 'px'; break; }
      size = next;
    }
    return size;
  };

  /* A short leaf, and the closing leaf, must not balloon to fill the paper the
     book deliberately leaves empty. They used to be capped at o.base to stop
     that — but o.base is the CSS reading size, not the size the chapter is
     actually set at, and in full screen the other leaves grow with the taller
     page while these stayed put. That is what made Friday's last leaf render
     SMALLER than every other page when maximised, marooned in a field of blank
     paper. Cap them at what the full leaves settled on instead: still no
     ballooning, but never smaller than the rest of the chapter either. */
  const held = (o, i) => shortLeaf(o) || ((i === leaves.length - 1) && leaves.length > 1);
  const settled = [];
  leaves.forEach((o, i) => { if(!held(o, i)) settled.push(fit(o, o.base * 1.9)); });
  const typical = settled.length
    ? settled.slice().sort((a, b) => a - b)[Math.floor(settled.length / 2)]
    : null;
  leaves.forEach((o, i) => {
    if(held(o, i)) fit(o, typical == null ? o.base : Math.max(o.base, typical));
  });
}
/* Fit once the leaves are painted, and again once the Arabic webfont has
   actually loaded (metrics differ from the fallback, so the first pass would
   otherwise mis-size). */
function queueMsAutoFit(){
  if(!document.getElementById('ms-book')) return;
  const run = () => msAutoFit();
  if(window.requestAnimationFrame) requestAnimationFrame(() => requestAnimationFrame(run));
  else setTimeout(run, 30);
  if(document.fonts && document.fonts.ready){ document.fonts.ready.then(run).catch(() => {}); }
  /* fonts.ready can settle before a just-chosen face has even started to load. */
  if(AR_FONTS[arFont] && document.fonts && document.fonts.load){ document.fonts.load('1em ' + AR_FONTS[arFont]).then(run).catch(() => {}); }
}
/* Re-fit when the leaf frame changes size (rotation, window resize). */
let msFitTimer = null;
window.addEventListener('resize', () => {
  clearTimeout(msFitTimer);
  msFitTimer = setTimeout(msAutoFit, 150);
});

function openSirah(n){
  applyTextScale();
  app.innerHTML = readerHTML(SIRAH_CHAPTERS[n], "selectTab('mawlid')", 's', n);
  queueMsAutoFit();
  window.scrollTo(0,0);
  onNavigated('s', n);
}

function openIlahi(n){
  applyTextScale();
  app.innerHTML = readerHTML(ILAHI_CHAPTERS[n], "selectTab('ilahis')", 'i', n);
  queueMsAutoFit();
  window.scrollTo(0,0);
  onNavigated('i', n);
}

/* Re-render the current piece (control toggles, remote applies). Signals are
   suppressed so toggling translation never counts as navigating away. */
function reopen(kind, i){
  const fn = window[OPENERS[kind]];
  /* An unrecognised kind used to fall through to openQasida(), which silently
     teleported the reader into an unrelated piece. Staying put is the safe
     failure. */
  if(typeof fn !== 'function') return;
  const prev = suppressNavSignals;
  suppressNavSignals = true;
  try { fn(i); }
  finally { suppressNavSignals = prev; }
}
function toggle(kind,i){ state.showTr = !state.showTr; saveCols(); reopen(kind,i); }
/* Flips the class and the chip in place rather than reopening, so neither
   view loses its place; the Book leaves are re-fitted, since the IndoPak
   and Naskh letters set wider and taller than the Uthmani ones. */
function setArFont(v){
  if(AR_FONTS[v] === undefined) return;
  /* A tap is a choice even on the script already showing: it is stored, so
     a version's default no longer moves it. */
  arFontChosen = v;
  try { localStorage.setItem(FONT_KEY, v); } catch(e){}
  if(v === arFont) return;
  showArFont(v);
}
function showArFont(v){
  arFont = v;
  applyArFont();
  document.querySelectorAll('.script-switch button').forEach(b => {
    b.classList.toggle('on', b.dataset.font === arFont);
    b.setAttribute('aria-pressed', String(b.dataset.font === arFont));
  });
  queueMsAutoFit();
}

