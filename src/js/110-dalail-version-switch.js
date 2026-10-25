const DALAIL_ISTANBUL = DALAIL_CHAPTERS.map(c => c.verses.map(v => ({ ar: v.ar, tr: v.tr, en: v.en, noRosette: !!v.noRosette })));
/* Where each chapter's last folio ends in Istanbul: the Mughlay appends verses to a
   chapter (Monday P2), so its folio is stretched to cover them and put back. */
const DALAIL_FOLIO_TO = DALAIL_CHAPTERS.map(c => (c.folios && c.folios.length) ? c.folios[c.folios.length - 1].to : null);
const stripArCommas = t => t.replace(/\u060C/g, '').replace(/ {2,}/g, ' ').trim();
/* 'istanbul' | 'sayyidina'; unset or unrecognised means Istanbul. Written
   only from setDalailEdition, the reader's own switch. Not synced in a live
   session: the two versions share every verse index, leaf and segment, so a
   leader and a follower on different versions still land on the same place. */
const EDITION_KEY = 'dlk-edition';
let dalailEdition = (() => { try { return localStorage.getItem(EDITION_KEY) === 'sayyidina' ? 'sayyidina' : 'istanbul'; } catch(e){ return 'istanbul'; } })();
function applyDalailEdition(){
  const alt = dalailEdition === 'sayyidina';
  DALAIL_CHAPTERS.forEach((c, ci) => {
    /* The Mughlay prints more after Monday P2's last verse (the author's
       prayers, the four ṣalawāt, the poem), so its alternates may run on past
       the Istanbul verses: "13:14", "13:15"… Those are appended here and cut
       off again on the way back, and the chapter's last folio is stretched to
       cover them, so the Duʿāʾ after the Khatm stays its own chapter and the
       reader goes on to it with Next. */
    const base = DALAIL_ISTANBUL[ci].length;
    c.verses.length = base;
    if(alt) for(let vi = base; DALAIL_WITH_SAYYIDINA[ci + ':' + vi]; vi++){
      const x = DALAIL_WITH_SAYYIDINA[ci + ':' + vi];
      const nv = { ar: stripArCommas(x.ar), tr: x.tr, en: x.en };
      if(x.instruction) nv.instruction = true;
      if(x.noRosette) nv.noRosette = true;
      c.verses.push(nv);
    }
    if(DALAIL_FOLIO_TO[ci] != null) c.folios[c.folios.length - 1].to = c.verses.length > base ? c.verses.length - 1 : DALAIL_FOLIO_TO[ci];
    c.verses.forEach((v, vi) => {
    if(vi >= base) return;
    const ist = DALAIL_ISTANBUL[ci][vi];
    const src = (alt && DALAIL_WITH_SAYYIDINA[ci + ':' + vi]) || ist;
    v.ar = alt ? stripArCommas(src.ar) : src.ar;
    v.tr = src.tr; v.en = src.en;
    /* Where a verse closes differs between the printings too (Monday v44:
       the Mughlay prints no mark after it), so an alternate may carry its
       own noRosette; one that doesn't inherits Istanbul's. */
    const nr = ('noRosette' in src) ? src.noRosette : ist.noRosette;
    if(nr) v.noRosette = true; else delete v.noRosette;
    /* A verse this printing lacks altogether (the Mughlay has no Friday
       v11) is flagged, never deleted — see verseNo below. */
    if(alt && src.omit) v.omit = true; else delete v.omit;
    });
  });
}
/* An omitted verse stays in the array, so every later verse keeps its
   index — places, highlights and live sessions all key on it — and is
   simply not drawn. The verses after it number on as the book would, and
   anything sent to it (a session, an old place) lands on the next one. */
function verseNo(kind, idx, n){
  if(kind !== 'd') return n + 1;
  const vs = (DALAIL_CHAPTERS[idx] || {}).verses || [];
  let k = n + 1;
  for(let i = 0; i < n; i++) if(vs[i] && vs[i].omit) k--;
  return k;
}
function shownVerseN(kind, idx, n){
  if(kind !== 'd' || n == null) return n;
  const vs = (DALAIL_CHAPTERS[idx] || {}).verses || [];
  let m = Number(n);
  if(!(vs[m] && vs[m].omit)) return n;
  while(vs[m] && vs[m].omit) m++;
  if(m >= vs.length){ m = Number(n); while(m > 0 && vs[m].omit) m--; }
  return m;
}
applyDalailEdition();
/* Which chapters read differently in the two versions — those with a
   restored سيدنا or an Arabic comma. Only they carry the switch. */
const DALAIL_EDITION_CHAPTERS = DALAIL_ISTANBUL.map((vs, ci) =>
  vs.some((v, vi) => v.ar.includes('\u060C') || DALAIL_WITH_SAYYIDINA[ci + ':' + vi]));
const dalailHasEditions = idx => !!DALAIL_EDITION_CHAPTERS[idx];
function editionSwitch(){
  return `<span class="view-switch edition-switch" role="group" aria-label="Version of the Dalāʾil">${
    [['istanbul', 'Istanbul'], ['sayyidina', 'Mughlay']].map(([v, l]) =>
      `<button data-ed="${v}" class="${dalailEdition === v ? 'on' : ''}" aria-pressed="${dalailEdition === v}" onclick="setDalailEdition('${v}')">${l}</button>`).join('')
  }</span>`;
}
/* Switching re-renders an open Dalāʾil reader (the words change, so the
   leaves must be rebuilt). The Book leaves break at the same ‖ in both
   versions, so the Book view keeps the leaf itself — going via the top verse
   landed one leaf early whenever a verse ran on from the previous page; the
   Study view keeps the verse at the top, as the Book/Study toggle does. */
/* A short note that the switch happened and that saved places and
   highlights don't carry across: the two versions divide the text differently, so a place saved in
   one would land on a different phrase in the other. */
function editionToast(msg){
  let t = document.getElementById('ed-toast');
  if(!t){ t = document.createElement('div'); t.id = 'ed-toast'; t.className = 'ed-toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
  t.textContent = msg;
  t.classList.remove('show'); void t.offsetWidth; t.classList.add('show');
  clearTimeout(editionToast.timer);
  editionToast.timer = setTimeout(() => t.classList.remove('show'), 3800);
}
function setDalailEdition(v){
  if((v !== 'istanbul' && v !== 'sayyidina') || v === dalailEdition) return;
  dalailEdition = v;
  try { localStorage.setItem(EDITION_KEY, v); } catch(e){}
  applyDalailEdition();
  // Never having chosen a script, the reader gets the version's own.
  if(!arFontChosen && defaultArFont() !== arFont) showArFont(defaultArFont());
  document.querySelectorAll('.edition-switch button').forEach(b => {
    b.classList.toggle('on', b.dataset.ed === v);
    b.setAttribute('aria-pressed', String(b.dataset.ed === v));
  });
  editionToast(v === 'sayyidina'
    ? 'Mughlay Version. Saved places and highlights are kept separately for each version.'
    : 'Istanbul Version. Saved places and highlights are kept separately for each version.');
  const view = renderedView();
  if(view === 'none' || !msPiece || msPiece.kind !== 'd'){
    /* On the Dalāʾil landing page the "Continue where you left off" card
       belongs to the version, so it has to be redrawn. */
    if(view === 'none' && typeof renderIndex === 'function') renderIndex();
    return;
  }
  const idx = msPiece.idx;
  if(view === 'book'){ const page = msCurrentPage(); reopen('d', idx); msGoToWhenReady(page); return; }
  const keep = topVisibleVerse();
  reopen('d', idx);
  afterViewScroll('d', idx, keep);
}

