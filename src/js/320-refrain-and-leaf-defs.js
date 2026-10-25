/* ── Repeating a refrain ─────────────────────────────────────
   A verse flagged `repeatRefrain` is followed by a marker for the chapter's
   `refrain` verse. Barzanji ch.4 is the case this was built for: the Qiyam
   refrain returns after every one of the seventeen qasida verses, and
   printing its four lines seventeen times would bury the qasida — so the
   marker is one gold line that opens to the words on a tap.

   **Every marker in the chapter opens together.** A reciter wants them one
   way or the other, not one at a time.

   Two deliberate choices:

   - **Toggling does NOT reopen the reader.** The body is always in the DOM
     and CSS hides it, so a tap flips a class and nothing re-renders. A
     `reopen()` here would scroll a reader who is fifteen verses down back to
     the top of the chapter — the same trap the text-size slider has.
   - **`state.refrainOpen` is in memory and is NOT stored**, on the owner's
     call: a chapter always opens collapsed. It still survives a re-render,
     which is what keeps a follower's own choice through a leader's
     navigation in a live session, exactly as `showTr`/`showEn` do. It is not
     broadcast either, so a leader never opens or closes anyone else's. */
function refrainRepeatHTML(q){
  const r = q.verses.find(v => v.refrain);
  if(!r) return '';
  return `<div class="refrain-repeat${state.refrainOpen ? ' open' : ''}">
      <button class="refrain-repeat-btn" onclick="toggleRefrain()"
        aria-expanded="${state.refrainOpen ? 'true' : 'false'}">↻ Repeat chorus · يُرَدَّد</button>
      <div class="refrain-repeat-body">
        <div class="v-ar">${arHTML(r.ar)}</div>
        ${r.tr ? `<div class="v-tr ${state.showTr?'':'hide'}">${r.tr.replaceAll('\n','<br>')}</div>` : ''}
        ${r.en ? `<div class="v-en ${state.showEn?'':'hide'}">${r.en.replaceAll('\n','<br>')}</div>` : ''}
      </div>
    </div>`;
}

function toggleRefrain(){
  state.refrainOpen = !state.refrainOpen;
  document.querySelectorAll('.refrain-repeat').forEach(n => {
    n.classList.toggle('open', state.refrainOpen);
    const b = n.querySelector('.refrain-repeat-btn');
    if(b) b.setAttribute('aria-expanded', state.refrainOpen ? 'true' : 'false');
  });
}
/* The piece set as it was printed: ivory leaves, ruled borders, a titled
   cartouche and the rosettes between phrases — but real text, so it can be
   selected, searched and marked, and costs nothing to download. */
/* Ornament for the manuscript leaves — drawn, not photographed, so it takes
   the theme colours and stays sharp at any size. */
const MS_DEFS = `<svg width="0" height="0" aria-hidden="true" style="position:absolute"><defs><pattern id="msGul" width="44" height="40" patternUnits="userSpaceOnUse"><rect width="44" height="40" fill="var(--ms-band-a)"/><path d="M0,20 H44" stroke="var(--ms-gold)" stroke-width="1"/><path d="M22,7.5C25.4,13.25 25.4,16 22,20C18.6,16 18.6,13.25 22,7.5Z" transform="rotate(0 22 20)" fill="var(--ms-band-b)" stroke="var(--ms-gold)" stroke-width=".7"/><path d="M22,7.5C25.4,13.25 25.4,16 22,20C18.6,16 18.6,13.25 22,7.5Z" transform="rotate(45 22 20)" fill="var(--ms-band-b)" stroke="var(--ms-gold)" stroke-width=".7"/><path d="M22,7.5C25.4,13.25 25.4,16 22,20C18.6,16 18.6,13.25 22,7.5Z" transform="rotate(90 22 20)" fill="var(--ms-band-b)" stroke="var(--ms-gold)" stroke-width=".7"/><path d="M22,7.5C25.4,13.25 25.4,16 22,20C18.6,16 18.6,13.25 22,7.5Z" transform="rotate(135 22 20)" fill="var(--ms-band-b)" stroke="var(--ms-gold)" stroke-width=".7"/><path d="M22,7.5C25.4,13.25 25.4,16 22,20C18.6,16 18.6,13.25 22,7.5Z" transform="rotate(180 22 20)" fill="var(--ms-band-b)" stroke="var(--ms-gold)" stroke-width=".7"/><path d="M22,7.5C25.4,13.25 25.4,16 22,20C18.6,16 18.6,13.25 22,7.5Z" transform="rotate(225 22 20)" fill="var(--ms-band-b)" stroke="var(--ms-gold)" stroke-width=".7"/><path d="M22,7.5C25.4,13.25 25.4,16 22,20C18.6,16 18.6,13.25 22,7.5Z" transform="rotate(270 22 20)" fill="var(--ms-band-b)" stroke="var(--ms-gold)" stroke-width=".7"/><path d="M22,7.5C25.4,13.25 25.4,16 22,20C18.6,16 18.6,13.25 22,7.5Z" transform="rotate(315 22 20)" fill="var(--ms-band-b)" stroke="var(--ms-gold)" stroke-width=".7"/><circle cx="22" cy="20" r="3" fill="var(--ms-paper)" stroke="var(--ms-gold)" stroke-width=".8"/><circle cx="0" cy="20" r="2.2" fill="var(--ms-gold)"/><circle cx="44" cy="20" r="2.2" fill="var(--ms-gold)"/></pattern></defs></svg>`;
const MS_BAND = `<svg class="ms-band-art" aria-hidden="true"><rect width="100%" height="40" fill="url(#msGul)"/><rect width="100%" height="1.4" fill="var(--ms-gold)"/><rect y="38.6" width="100%" height="1.4" fill="var(--ms-gold)"/></svg>`;
const MS_CORNER = `<svg class="ms-corner" viewBox="0 0 100 100" aria-hidden="true"><path d="M8,8 H64 M8,8 V64" fill="none" stroke="var(--ms-gold)" stroke-width="2" stroke-linecap="round"/><path d="M15,15 H48 M15,15 V48" fill="none" stroke="var(--ms-rule)" stroke-width="1" stroke-linecap="round"/><path d="M30,9C36.2,18.66 36.2,23.28 30,30C23.8,23.28 23.8,18.66 30,9Z" transform="rotate(0 30 30)" fill="var(--ms-band-b)" stroke="var(--ms-gold)" stroke-width="1"/><path d="M30,9C36.2,18.66 36.2,23.28 30,30C23.8,23.28 23.8,18.66 30,9Z" transform="rotate(45 30 30)" fill="var(--ms-band-b)" stroke="var(--ms-gold)" stroke-width="1"/><path d="M30,9C36.2,18.66 36.2,23.28 30,30C23.8,23.28 23.8,18.66 30,9Z" transform="rotate(90 30 30)" fill="var(--ms-band-b)" stroke="var(--ms-gold)" stroke-width="1"/><path d="M30,9C36.2,18.66 36.2,23.28 30,30C23.8,23.28 23.8,18.66 30,9Z" transform="rotate(135 30 30)" fill="var(--ms-band-b)" stroke="var(--ms-gold)" stroke-width="1"/><path d="M30,9C36.2,18.66 36.2,23.28 30,30C23.8,23.28 23.8,18.66 30,9Z" transform="rotate(180 30 30)" fill="var(--ms-band-b)" stroke="var(--ms-gold)" stroke-width="1"/><path d="M30,9C36.2,18.66 36.2,23.28 30,30C23.8,23.28 23.8,18.66 30,9Z" transform="rotate(225 30 30)" fill="var(--ms-band-b)" stroke="var(--ms-gold)" stroke-width="1"/><path d="M30,9C36.2,18.66 36.2,23.28 30,30C23.8,23.28 23.8,18.66 30,9Z" transform="rotate(270 30 30)" fill="var(--ms-band-b)" stroke="var(--ms-gold)" stroke-width="1"/><path d="M30,9C36.2,18.66 36.2,23.28 30,30C23.8,23.28 23.8,18.66 30,9Z" transform="rotate(315 30 30)" fill="var(--ms-band-b)" stroke="var(--ms-gold)" stroke-width="1"/><circle cx="30" cy="30" r="5.4" fill="var(--ms-paper)" stroke="var(--ms-gold)" stroke-width="1.1"/><circle cx="30" cy="30" r="2.2" fill="var(--ms-rosette)"/></svg>`;

/* The basmala opens a piece; it stands on its own line above the text rather
   than running into it. Harakat and spacing are stripped before matching, so
   it's recognised however a given printing vowels it. */
function isBasmala(ar){
  const bare = String(ar || '')
    .replace(/\u0671/g, '\u0627')                       // alif wasla -> plain alif
    .replace(/[\u064B-\u0655\u0670\u06D6-\u06ED\s]/g, ''); // vowels and Quranic marks
  /* Must BE the basmala, not merely begin with it — otherwise a sūrah that
     opens with it would be mistaken for a bare basmala and swallowed whole. */
  return bare === 'بسماللهالرحمنالرحيم';
}

/* A passage may open with the basmala — sometimes after the taʿawwudh. Lift it
   onto its own line so it heads what follows rather than running into it. */
function splitBasmala(ar){
  const parts = String(ar || '').split('۞').map(s => s.trim()).filter(Boolean);
  const i = parts.findIndex(isBasmala);
  if(i === -1) return null;
  return {
    pre:     parts.slice(0, i).join(' ۞ '),
    basmala: parts[i],
    rest:    parts.slice(i + 1).join(' ۞ '),
  };
}

function manuscriptPages(q, kind, idx){
  const marks = loadMarks();
  const place = loadPlace();
  const placedN = (place && place.view === 'book' && place.idx === idx && place.verse != null) ? place.verse : null;
  const placedSeg = (placedN != null && place && place.seg != null) ? place.seg : null;

  const phrase = (v, n, sub) => {
    /* Split chunks of one verse get a unique key (n.sub) so marking or the
       stored-mark highlight applies to just that chunk, not every page the
       verse spills onto. Whole verses keep the plain key. */
    const k = markKey(kind, idx, sub == null ? n : n + '.' + sub);
    /* The manuscript sets no commas, so the Book Version drops them — except in
       the Dalāʾil, where the user asked for them back: those chapters run as
       long unbroken litanies and the commas are what make them followable.
       Taken straight from the Study Arabic, which is the same `ar` string. */
    const arDisplay = (kind === 'd' || kind === 'l')
      ? String(v.ar)
      : String(v.ar).replace(/\s*،\s*/g, ' ');
    const sp = splitBasmala(arDisplay);
    let inner = (sp && (sp.pre || sp.rest))
      ? `${sp.pre ? sp.pre + '<br>' : ''}${sp.basmala}<br>${sp.rest}`
      : arDisplay;
    if(v.instruction){
      inner = `<span class="ms-instruction">${inner}</span>`;
    }
    inner = inner.replaceAll('\n', '<br>');
    if(kind === 'd' && !v.instruction){ inner = segWrapMark(inner, 'ms-r ms-r-in', kind, idx, (sub == null ? n : n + '.' + sub), marks, (placedN != null && Number(n) === placedN && (sub == null || sub === 0)), placedSeg); }
    else { inner = inner.replaceAll('۞', '<span class="ms-r ms-r-in">۞</span>'); }
    /* Directions embedded in the passage go gold, and the ones that carry an
       explanation become tappable — the leaf sets no English of its own. */
    inner = markInline(inner, true);
    /* A rubric is not a passage anyone wants to highlight, so its tap is given
       over to showing the English — the leaf itself carries only Arabic. */
    if(v.instruction){
      return `<span class="ms-v has-instr" data-mk="${k}" data-en="${attrEsc(v.en || '')}"
                  onclick="showInstrBubble(event, this)">${inner}</span>`;
    }
    if(kind === 'd'){ return `<span class="ms-v" data-mk="${k}">${inner}</span>`; }
    const placed = (placedN != null && Number(n) === placedN && (sub == null || sub === 0)) ? ' placed' : '';
    return `<span class="ms-v${marks[k] ? ' marked' : ''}${placed}" data-mk="${k}"
                  onclick="markVerse('${kind}',${idx},'${sub == null ? n : n + '.' + sub}')">${inner}</span>`;
  };

  /* ── One app leaf per printed page — a straight digitisation ──────────
     The chapter text carries a ‖ marker at each spot the printed book turns
     the page (taken from the PDF). We cut the leaves there and nowhere else,
     so every leaf holds exactly what the book page holds — a sentence may run
     on to the next page, just as it does in the book. Chunks of a split verse
     get a sub-index so marking one page-chunk doesn't light up the others. */
  const PAGE_BREAK = '‖';

  const rawFolios = q.folios.map(f => ({
    band: f.band || null,
    items: q.verses.slice(f.from, f.to + 1).map((v, j) => ({ v, n: f.from + j })),
  }));

  const expandedFolios = [];
  rawFolios.forEach(f => {
    let items = [];
    let band = f.band;
    let shortNext = false;
    const flush = () => { if(items.length){ expandedFolios.push({ band, items, short: shortNext }); band = null; items = []; shortNext = false; } };
    f.items.forEach(({ v, n }) => {
      if(v.omit) return;
      /* A leaf the book itself leaves part-empty (a section opening on the next
         page) is marked so msAutoFit sets it at the base size and lets it stop
         short, instead of growing the type to fill the sheet. */
      if(v.shortPage){ shortNext = true; }
      if(isBasmala(v.ar)){ items.push({ v, n, isBasmala: true, sub: null, bandBefore: v.band || null }); return; }
      if(v.ar.indexOf(PAGE_BREAK) === -1){ items.push({ v, n, isBasmala: false, sub: null, bandBefore: v.band || null }); return; }
      /* Keep empty segments' positions: a ‖ at the very end of a verse means the
         page turns right after this verse, so we must still flush there. */
      const raw = v.ar.split(PAGE_BREAK);
      const chunks = raw.map(s => s.trim());
      const nonEmpty = chunks.filter(Boolean);
      const multi = nonEmpty.length > 1;
      /* The verse's rosette marks its END, so only the final non-empty chunk
         carries it. A chunk that leaves the reader mid-verse (the page turns
         and the verse carries on) gets no rosette — matching the book, which
         sets no mark where a sentence simply runs to the next page. */
      let lastNE = -1;
      chunks.forEach((c, ci) => { if(c) lastNE = ci; });
      let subIdx = 0;
      chunks.forEach((chunk, ci) => {
        if(chunk){
          items.push({ v: { ...v, ar: chunk }, n, isBasmala: false, sub: multi ? subIdx++ : null, cont: ci < lastNE, bandBefore: (ci === 0 && v.band) ? v.band : null });
        }
        /* A break marker sits between chunk ci and ci+1 (including when a chunk
           is empty, e.g. a trailing ‖). Turn the page for every marker. */
        if(ci < chunks.length - 1) flush();
      });
    });
    flush();
  });

  const last = expandedFolios.length - 1;

  const sheet = (f, i) => {
    let items = f.items;
    let head = '';
    if(items.length && items[0].isBasmala) {
      const first = items[0];
      head = `<div class="ms-basmala">${phrase(first.v, first.n, first.sub)}</div>`;
      items = items.slice(1);
    }
    /* A divider band can fall in the middle of a printed page (the thulth and
       rubʿ marks do), so it is drawn inline before the verse it introduces
       rather than only at the head of a leaf. */
    const body = items.map(({ v, n, sub, cont, bandBefore }) => {
      const mark = bandBefore
        ? `<span class="ms-band ms-band-div ms-band-inline">${MS_BAND}<span class="ms-cartouche ms-cartouche-div">${bandBefore}</span></span>`
        : '';
      return mark + ((cont || v.noRosette)
        ? phrase(v, n, sub)
        : `${phrase(v, n, sub)}<span class="ms-r${v.sep ? ' salawat' : ''}">${v.sep || '۞'}</span>`);
    }).join(' ');
    const closing = i === last;
    return `<div class="ms-sheet">
      <div class="ms-runhead">${q.cartouche || q.titleArabic}</div>
      <div class="ms-page${closing ? ' ms-closing' : ''}${f.short ? ' ms-short' : ''}">
        ${i === 0 ? `<div class="ms-band">${MS_BAND}<span class="ms-cartouche">${q.cartouche || q.titleArabic}</span></div>` : ''}
        ${f.band ? `<div class="ms-band ms-band-div">${MS_BAND}<span class="ms-cartouche ms-cartouche-div">${f.band}</span></div>` : ''}
        ${closing ? `<div class="ms-orn tl">${MS_CORNER}</div><div class="ms-orn tr">${MS_CORNER}</div>
                     <div class="ms-orn bl">${MS_CORNER}</div><div class="ms-orn br">${MS_CORNER}</div>` : ''}
        <div class="ms-text">${head}${body}</div>
        <div class="ms-folio">${i + 1}</div>
      </div>
    </div>`;
  };

  /* One dot per spread when two leaves show at once, and it goes to the leaf
     that opens the spread. */
  const two = spreadOn();
  const dots = expandedFolios.map((f, i) => (two && i % 2) ? '' :
    `<button class="ms-dot${i === 0 ? ' on' : ''}" data-pg="${i}" onclick="msGoTo(${i})"
             aria-label="${two ? 'Pages ' + (i + 1) + '\u2013' + (i + 2) : 'Page ' + (i + 1)}"></button>`).join('');
  return `${readerActions(q, kind, idx, true)}
    <p class="ms-hint">Turn the leaf right to left · tap a phrase to mark your place</p>
    ${MS_DEFS}
    <div class="ms-book${two ? ' spread' : ''}" id="ms-book" onscroll="msSyncDots()">${expandedFolios.map(sheet).join('')}</div>
    <div class="ms-nav">
      <button class="ms-arrow next" onclick="msStep(1)" aria-label="Next page">‹</button>
      <div class="ms-dots">${dots}</div>
      <button class="ms-arrow prev" onclick="msStep(-1)" disabled aria-label="Previous page">›</button>
    </div>
    ${msChapNav(kind, idx)}
    <div class="ms-bar">
      <button class="ms-rnd" onclick="goHome()" aria-label="Home">⌂</button>
      <div class="ms-menu-wrap">
        <button class="ms-rnd" onclick="toggleMsMenu(event)" aria-label="More">⋮</button>
        <div class="ms-menu" id="ms-menu"></div>
      </div>
    </div>
    <div class="ms-float" id="ms-float">
      <button class="ms-arrow next" onclick="msStep(1)" aria-label="Next page">‹</button>
      <button class="ms-arrow prev" onclick="msStep(-1)" disabled aria-label="Previous page">›</button>
    </div>`;
}

/* Which leaf is showing. Worked out from where each sheet actually sits rather
   than from scrollLeft, whose sign differs between browsers in a right-to-left
   container. */
function msCurrentPage(){
  const book = document.getElementById('ms-book');
  if(!book) return 0;
  const mid = book.getBoundingClientRect().left + book.clientWidth / 2;
  let best = 0, bestD = Infinity;
  [].forEach.call(book.children, (s, i) => {
    const r = s.getBoundingClientRect();
    const d = Math.abs(r.left + r.width / 2 - mid);
    if(d < bestD){ bestD = d; best = i; }
  });
  return best;
}

let msLastPage = 0;
function msSyncDots(){
  const book = document.getElementById('ms-book');
  const n = book ? book.children.length : 0;
  const cur = msCurrentPage();
  [].forEach.call(document.querySelectorAll('.ms-dot'), (d, i) => d.classList.toggle('on', i === cur));
  /* Offered from the first leaf only. Toggled here, not in the page-change
     branch below: that one is skipped when the leaf has not changed, which
     would leave the button wrong on the first paint after opening a piece. */
  const tune = document.getElementById('ms-tune');
  if(tune) tune.classList.toggle('off', cur !== 0);
  msFloatPosition();
  /* Two sets now — the floating pair and the pair by the dots — so keep them
     in step rather than only the first one found. */
  const onLast = cur >= n - 1, carriesOn = onLast && !!nextPiece();
  [].forEach.call(document.querySelectorAll('.ms-arrow.next'), b => {
    b.disabled = onLast && !carriesOn;
    b.title = carriesOn ? 'Next section' : 'Next page';
    b.setAttribute('aria-label', b.title);
  });
  [].forEach.call(document.querySelectorAll('.ms-arrow.prev'), b => b.disabled = cur <= 0);
  /* When a swipe lands on a different leaf, return to the top of that leaf so
     a tall page never opens scrolled halfway down. */
  if(cur !== msLastPage){
    msLastPage = cur;
    /* The place chip reads "here" per leaf now, so it has to be told a page
       turn happened — nothing else calls it on a swipe. */
    if(typeof refreshPlaceBtn === 'function') refreshPlaceBtn();
    if(!suppressNavSignals && session.role === 'leader' && session.channel && session.lastNav){
      try { session.channel.send({ type:'broadcast', event:'page', payload:{ kind: session.lastNav.kind, idx: session.lastNav.idx, page: cur, term: session.term } }); } catch(e){}
    }
    if(book){
      const top = book.getBoundingClientRect().top + window.scrollY - 8;
      if(window.scrollY > top + 4) window.scrollTo({ top: Math.max(0, top), behavior:'smooth' });
    }
  }
}

/* Pinch-zoom moves the visible area without moving the layout viewport, so a
   plain fixed position drifts off screen exactly when the arrows are needed
   most. Track the visual viewport instead, and hold the buttons at a constant
   size so they stay thumb-sized however far the text is magnified. */
function msFloatPosition(){
  const f = document.getElementById('ms-float');
  if(!f) return;
  const vv = window.visualViewport;
  if(!vv) return;                      // older browser: the CSS default is right
  f.style.top   = (vv.offsetTop + (vv.height - playerHeight()) / 2) + 'px';
  f.style.left  = vv.offsetLeft + 'px';
  f.style.width = vv.width + 'px';
  f.style.right = 'auto';
  const s = 1 / (vv.scale || 1);
  [].forEach.call(f.querySelectorAll('.ms-arrow'), b => { b.style.transform = 'scale(' + s + ')'; });
}

if(window.visualViewport){
  window.visualViewport.addEventListener('resize', msFloatPosition);
  window.visualViewport.addEventListener('scroll', msFloatPosition);
}
window.addEventListener('scroll', msFloatPosition, { passive:true });

