/* ---------- Verse-level search: matching lines + jump-to-verse ---------- */
function escHTML(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

/* A snippet of `text` windowed around the query, the match wrapped in <mark>.
   Falls back to a plain truncation when the match was only via normalisation. */
function hitSnippet(text, q, win){
  const raw = String(text || ''); if(!raw) return '';
  win = win || 110;
  let i = -1, len = 0;
  const ql = (q||'').toLowerCase().trim();
  if(ql){ i = raw.toLowerCase().indexOf(ql); if(i>=0) len = ql.length; }
  if(i < 0 && /[\u0600-\u06ff]/.test(q||'')){ const qa=q.trim(); i = raw.indexOf(qa); if(i>=0) len = qa.length; }
  if(i < 0) return escHTML(raw.length > win ? raw.slice(0,win).trim()+'\u2026' : raw);
  const half = Math.floor(win/2);
  const a = Math.max(0, i-half), b = Math.min(raw.length, i+len+half);
  return (a>0?'\u2026':'') + escHTML(raw.slice(a,i)) + '<mark>' + escHTML(raw.slice(i,i+len)) + '</mark>' + escHTML(raw.slice(i+len,b)) + (b<raw.length?'\u2026':'');
}

/* Which lines of a chapter match the current query, and in which field. */
/* Which rosette-segment of a verse the search match sits in (Arabic = exact; tr/en = by position). */
function hitSeg(v, f, q){
  const ar = stripBreaks(v.ar || ''); const segs = segParts(ar);
  if(segs.length <= 1) return 0;
  const isAr = /[\u0600-\u06ff]/.test(q||'');
  if(f === 'ar' || isAr){ const nq = normalize(q); for(let i=0;i<segs.length;i++){ if(normalize(segs[i]).includes(nq)) return i; } }
  const field = String(v[f] || ''); const mi = field.toLowerCase().indexOf(String(q||'').toLowerCase().trim());
  if(mi < 0) return 0; const frac = field.length ? mi/field.length : 0;
  const target = frac * segs.reduce((a,p)=>a+p.length,0); let cum = 0;
  for(let i=0;i<segs.length;i++){ cum += segs[i].length; if(cum >= target) return i; } return segs.length - 1;
}
function verseHits(c){
  const q = state.query;
  if(!q || !c || !c.verses) return [];
  const nq = normalize(q), tq = tighten(nq), rawq = q.toLowerCase().trim(), isAr = /[\u0600-\u06ff]/.test(q);
  const test = raw => { if(!raw) return false; const nf = normalize(raw);
    return (nq && nf.includes(nq)) || (tq && tighten(nf).includes(tq)) || raw.toLowerCase().includes(rawq) || (isAr && raw.includes(q.trim())); };
  const out = [];
  for(let n=0; n<c.verses.length; n++){
    const v = c.verses[n], ar = stripBreaks(v.ar || '');
    if(v.omit) continue;
    let f = null;
    if(test(v.en)) f='en'; else if(test(v.tr)) f='tr'; else if(test(ar)) f='ar';
    if(!f) continue;
    out.push({ n, ar, sec: f==='ar' ? '' : (v[f]||''), seg: hitSeg(v, f, q) });
    if(out.length >= 40) break;
  }
  return out;
}

/* The matching-lines list rendered under a chapter card during a search. */
function hitList(kind, idx){
  if(!state.query) return '';
  const arr = arrayOf(kind); if(!arr) return '';
  const c = arr[idx]; if(!c) return '';
  const hits = verseHits(c); if(!hits.length) return '';
  const CAP = 6, shown = hits.slice(0, CAP);
  const rows = shown.map(h => {
    const ar = `<span class="h-ar">${hitSnippet(h.ar, state.query, 120)}</span>`;
    const tr = h.sec ? `<span class="h-tr">${hitSnippet(h.sec, state.query, 130)}</span>` : '';
    return `<button class="hit" onclick="jumpToVerse('${kind}',${idx},${h.n},${h.seg})">${ar}${tr}</button>`;
  }).join('');
  const extra = hits.length - CAP;
  const more = extra > 0 ? `<div class="hit-more">+${extra} more line${extra>1?'s':''} in this reading</div>` : '';
  return `<div class="hits">${rows}${more}</div>`;
}

/* Scroll to a specific verse in whichever view is open, and flash it. Both
   views share the verse index, so the same n lands on the same line. */
function scrollToVerse(kind, idx, n, seg){
  { const m = shownVerseN(kind, idx, n); if(m !== n){ n = m; seg = null; } }
  const book = document.getElementById('ms-book');
  if(book){
    const vEl = document.querySelector('[data-mk="'+kind+':'+idx+':'+n+'"]')
             || document.querySelector('[data-mk^="'+kind+':'+idx+':'+n+'."]');
    if(!vEl) return false;
    const sheet = vEl.closest('.ms-sheet');
    if(sheet){ sheet.scrollIntoView({ block:'nearest', inline:'center' }); if(typeof msSyncDots==='function') msSyncDots(); }
    const r = vEl.getBoundingClientRect();
    if(r.top < 84 || r.bottom > window.innerHeight - 8) window.scrollTo({ top: Math.max(0, r.top + window.scrollY - 96) });
    (()=>{ const sg=(seg!=null)?vEl.querySelector('.seg[data-sg="'+seg+'"]'):null; if(sg){ sg.classList.remove('seg-flash'); void sg.offsetWidth; sg.classList.add('seg-flash'); } else { vEl.classList.remove('ms-flash'); void vEl.offsetWidth; vEl.classList.add('ms-flash'); } })();
    return true;
  }
  const el = document.querySelector('article.verse[data-v="'+n+'"]');
  if(!el) return false;
  /* seg is a Study phrase index, or — coming from the Book Version — the
     phrase's text and position (bookSpotForSwitch). */
  const sgEl = (seg != null && typeof seg === 'object') ? studySegFor(el, seg)
             : (seg != null ? el.querySelector('.seg[data-sg="'+seg+'"]') : null);
  let y = el.getBoundingClientRect().top + window.scrollY - 84;
  /* A long verse can run several screens; keep its number in view if the
     phrase still shows, otherwise bring the phrase up. */
  if(sgEl){
    const sy = sgEl.getBoundingClientRect().top + window.scrollY;
    if(sy - y > window.innerHeight * 0.6) y = sy - 160;
  }
  window.scrollTo({ top: Math.max(0, y) });
  (()=>{ const sg=sgEl; if(sg){ sg.classList.remove('seg-flash'); void sg.offsetWidth; sg.classList.add('seg-flash'); } else { el.classList.remove('hit-flash'); void el.offsetWidth; el.classList.add('hit-flash'); } })();
  return true;
}

/* Run scrollToVerse once the (re)built leaves settle — the Book Version measures
   and fits after the fonts land, which shifts everything, so retry once. */
function afterViewScroll(kind, idx, n, seg){
  if(n == null) return;
  const run = () => { if(!scrollToVerse(kind, idx, n, seg)) setTimeout(() => scrollToVerse(kind, idx, n, seg), 280); };
  if(window.requestAnimationFrame) requestAnimationFrame(() => requestAnimationFrame(run));
  else setTimeout(run, 40);
}

/* Open a reader at a specific verse and flash it — Book or Study, any kind. */
function jumpToVerse(kind, idx, n, seg){
  const fn = window[openFnOf(kind)];
  if(typeof fn !== 'function') return;
  fn(idx);
  afterViewScroll(kind, idx, n, seg);
}

const CORNER_MOTIF = (cls, pid) => `<svg class="corner-motif ${cls}" viewBox="0 0 118 118" aria-hidden="true">
  <defs>
    <pattern id="${pid}" width="28" height="28" patternUnits="userSpaceOnUse">
      <g fill="none" stroke="currentColor" stroke-width="1">
        <rect x="7.5" y="7.5" width="13" height="13"/>
        <rect x="7.5" y="7.5" width="13" height="13" transform="rotate(45 14 14)"/>
      </g>
    </pattern>
  </defs>
  <path d="M0 0 H118 L0 118 Z" fill="url(#${pid})"/>
</svg>`;

const STAR = `<svg class="star-band" viewBox="0 0 240 24" fill="none" aria-hidden="true">
  <line x1="0" y1="12" x2="96" y2="12" stroke="#B8934A" stroke-width="1"/>
  <line x1="144" y1="12" x2="240" y2="12" stroke="#B8934A" stroke-width="1"/>
  <path d="M120 2 L123 9 L130.5 5.5 L127 12 L134 15 L126.5 15.5 L128 23 L120 18 L112 23 L113.5 15.5 L106 15 L113 12 L109.5 5.5 L117 9 Z" fill="#B8934A"/>
</svg>`;

function sectionCards(cat){
  const q = state.query;
  let items = QASIDAS.map((qa,i)=>({q:qa,i}))
    .filter(x=>x.q.category===cat)
    .filter(x=>matchesQuery(x.q, q));
  if(q){
    // rank: title matches first, then body-only matches
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
        </button>`).join('');
}

