/* ── The English of a rubric, on tap, in the Book Version ──────────────
   The leaf sets only Arabic, so the translation of an instruction verse has
   nowhere to live on the page. It appears in a bubble fixed to the viewport
   instead of inside the leaf, because msAutoFit measures each leaf to size it
   and anything added inside would shift where the page breaks. */
/* Instructions that sit inside a passage rather than standing as a verse of
   their own: a repeat count, the place where the gathering stands, a blank the
   reader fills with their own name. They are set in gold wherever they appear,
   in both readings, so the eye can tell at a glance what is prayer and what is
   direction. Where an instruction needs explaining, the explanation lives here
   rather than in the Arabic — the text stays as the book sets it — and in the
   Book Version, which carries no English, it can be tapped for. */
const INLINE_INSTRUCTIONS = [
  { find: /\((?:[0-9]+|[\u0660-\u0669]+)\)/g },   /* repeat counts — (3), (14) */
  { find: '(٤ مرات)' },                            /* …and the same spelled out */
  { find: /(?<=^|[\s>])ع(?=[\s<]|$)/g },         /* the Mughlay printing's marginal section sign (Saturday v20), a lone ع — not recited */
  { find: '(محل الْقيام)' },                        /* the standing */
  { find: '(اَنِّي رَسُولُكَ فِي دُعَائِهِ ﷺ)' },  /* al-Ḥizb al-Aʿẓam, Thursday — printed in coloured ink, not black */
  { find: 'وَفِي الصَّحِيحِ كَانَ اَكْثَرُ دُعَاءِ النَّبِيِّ صَلَّى اللّٰهُ تَعَالَى عَلَيْهِ وَسَلَّمَ' },  /* al-Ḥizb al-Aʿẓam, Tuesday — printed in coloured ink, not black */
  { find: 'وَفِي نُسْخَةٍ اُخْرٰى' },                 /* Ḥizb al-Istighfār, Thursday — the editorial "and in another copy", printed in coloured ink */
  { find: '(فُلَانِ بْن فُلَانٍ)',
    en:   'So-and-so, son of so-and-so — say your own name and your father’s name here.' },
];

function markInline(html, interactive){
  let out = String(html);
  INLINE_INSTRUCTIONS.forEach(g => {
    const wrap = m => (interactive && g.en)
      ? `<span class="ms-gloss has-instr" data-en="${attrEsc(g.en)}"
               onclick="showInstrBubble(event, this)">${m}</span>`
      : `<span class="ms-gloss">${m}</span>`;
    out = (typeof g.find === 'string')
      ? out.split(g.find).join(wrap(g.find))
      : out.replace(g.find, m => wrap(m));
  });
  return out;
}

function attrEsc(s){
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
                  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function hideInstrBubble(){
  const b = document.getElementById('instr-bubble');
  if(b) b.remove();
}

function showInstrBubble(ev, el){
  if(ev) ev.stopPropagation();
  const open = document.getElementById('instr-bubble');
  const key = el.getAttribute('data-mk') || '';
  const same = !!open && open.getAttribute('data-for') === key;
  hideInstrBubble();
  if(same) return;                 /* tapping the same rubric again closes it */
  const en = el.getAttribute('data-en') || '';
  if(!en) return;

  const b = document.createElement('div');
  b.id = 'instr-bubble';
  b.className = 'instr-bubble';
  b.setAttribute('data-for', key);
  b.innerHTML = '<div class="instr-bubble-in">' + en + '</div>';
  document.body.appendChild(b);

  const vw = document.documentElement.clientWidth;
  const vh = document.documentElement.clientHeight;
  const w = Math.min(320, vw - 24);
  b.style.width = w + 'px';
  const r = el.getBoundingClientRect();
  const h = b.offsetHeight;
  let left = r.left + r.width / 2 - w / 2;
  left = Math.max(12, Math.min(left, vw - w - 12));
  /* Above the rubric where there's room, below it where there isn't. */
  let top = r.top - h - 10;
  if(top < 12) top = Math.min(r.bottom + 10, vh - h - 12);
  if(top < 12) top = 12;
  b.style.left = left + 'px';
  b.style.top = top + 'px';
  requestAnimationFrame(() => b.classList.add('on'));
}

/* Anything that moves the page out from under the bubble dismisses it. */
document.addEventListener('click', e => {
  if(!e.target || !e.target.closest || !e.target.closest('.has-instr')) hideInstrBubble();
});
window.addEventListener('scroll', hideInstrBubble, { passive:true });
window.addEventListener('resize', hideInstrBubble);
window.addEventListener('keydown', e => { if(e.key === 'Escape') hideInstrBubble(); });

/* Full screen is done with layout rather than the Fullscreen API, which iOS
   won't grant to anything but video. Everything but the leaf steps aside. */
/* Built on open so the labels reflect the moment — which reading is showing,
   whether this leaf already holds the bookmark, which way the theme goes. */
function msMenuHTML(){
  const p = msPiece || {};
  const isD = p.kind === 'd';
  const dark = document.documentElement.classList.contains('dark');
  const saved = isD && placeIsHere(p.idx) && placeStillMarked();
  let h = '';
  h += '<button onclick="msMenuAct(\'theme\')">' + themeGlyph() +
       '<span>' + (dark ? 'Day' : 'Night') + '</span></button>';
  if(isD) h += '<button onclick="msMenuAct(\'place\')">⚑<span>' +
       (saved ? 'Place saved' : 'Save my place') + '</span>' +
       (saved ? '<span class="tick">✓</span>' : '') + '</button>';
  h += '<button onclick="msMenuAct(\'study\')">⇄<span>Study Version</span></button>';
  h += '<hr>';
  h += '<button onclick="msMenuAct(\'exit\')">✕<span>Leave full screen</span></button>';
  return h;
}

function toggleMsMenu(e){
  if(e) e.stopPropagation();
  const m = document.getElementById('ms-menu');
  if(!m) return;
  const open = !m.classList.contains('open');
  if(open) m.innerHTML = msMenuHTML();
  m.classList.toggle('open', open);
}

function closeMsMenu(){
  const m = document.getElementById('ms-menu');
  if(m) m.classList.remove('open');
}

function msMenuAct(what){
  closeMsMenu();
  const p = msPiece || {};
  if(what === 'theme') toggleTheme();
  else if(what === 'place'){ saveDalailPlace(p.idx); }
  else if(what === 'study'){ setImmersive(false); setPageView(false, p.kind, p.idx); }
  else if(what === 'exit') setImmersive(false);
}

/* A tap anywhere else closes it, including on the leaf itself. */
document.addEventListener('click', e => {
  const m = document.getElementById('ms-menu');
  if(m && m.classList.contains('open') && !e.target.closest('.ms-menu-wrap')) closeMsMenu();
}, true);

function setImmersive(on){
  closeMsMenu();
  state.immersive = !!on;
  document.documentElement.classList.toggle('immersive', state.immersive);
  /* The leaf frame changes size going in and out of full screen, so the text
     has to be measured and fitted to it again. */
  queueMsAutoFit();
  if(window.requestAnimationFrame) requestAnimationFrame(msFloatPosition);
}

window.addEventListener('keydown', e => { if(e.key === 'Escape' && state.immersive) setImmersive(false); });

/* Two ways to read the same piece: the leaves as the book sets them, or the
   same text opened out line by line with transliteration and meaning. */
function setPageView(on, kind, idx){
  if(state.pageView === on) return;
  /* Refuse to move unless the reopen can actually happen. Which view is on
     screen lives in the DOM, so flipping state without re-rendering leaves
     the page showing one view while state claims the other — and the guard
     above then turns every later tap into a no-op, stranding the reader in
     the view they asked to leave. The full-screen menu did exactly that:
     it passed the piece's index where `kind` belongs, so reopen found no
     opener and returned, and in the fork the wrong view was persisted on
     the way out. Bail before touching state, not after. */
  if(typeof window[OPENERS[kind]] !== 'function') return;
  /* Keep your place across the switch. From the Book Version that is the
     phrase the reader highlighted or bookmarked on this leaf, if any, else
     the leaf's top verse; from Study, the verse at the top of the screen. */
  const keep = state.pageView ? bookSpotForSwitch() : { n: topVisibleVerse() };
  state.pageView = on;
  saveViewPref(on);
  if(!on) setImmersive(false);
  reopen(kind, idx);
  if(window.requestAnimationFrame) requestAnimationFrame(msFloatPosition);
  afterViewScroll(kind, idx, keep.n, keep.seg);
}

function toggleEn(kind,i){ state.showEn = !state.showEn; saveCols(); reopen(kind,i); }
/* Text size. A slider each for the Arabic and the Latin, on the owner's ask;
   it replaced four −/+ chips that took most of the controls row and needed
   several taps to cross the range.

   Dragging sets the two CSS variables and deliberately does NOT reopen the
   reader, which is what the old chips did. The size lives entirely in
   --ar-size and --latin-scale, so a re-render buys nothing and costs the
   scroll position — on an `input` event, once per pixel of travel, that read
   as the page fighting the finger.

   The end glyphs are the whole label: small on the left, large on the right,
   which reads the same way round whichever script it governs. The Arabic one
   is ض and not أ — the owner could not tell the hamza apart from a bare
   alif at this size, and ض is both unmistakable and the letter the language
   names itself by.

   Percent rather than the underlying multiplier so a screen reader announces
   something meaningful, and so the step is a whole number. */
function sizeSlider(which, scale){
  const ar = which === 'ar';
  const glyph = ar ? 'ض' : 'a';
  const label = ar ? 'Arabic text size' : 'Latin text size';
  const cls   = ar ? 'sz-ar' : 'sz-la';
  const [lo, hi] = SIZE_LIMITS[which];
  const min = Math.round(lo * 100), max = Math.round(hi * 100);
  return `<label class="size-slider" title="${label}">
      <span class="sz-gl ${cls} sz-sm" aria-hidden="true">${glyph}</span>
      <input type="range" min="${min}" max="${max}" step="5"
        value="${Math.round(scale * 100)}" aria-label="${label}"
        oninput="setTextScale('${which}', this.value)">
      <span class="sz-gl ${cls} sz-lg" aria-hidden="true">${glyph}</span>
    </label>`;
}

/* The one place the two size variables are written. Every opener called this
   pair of lines verbatim, which is how they are guaranteed to stay in step. */
function applyTextScale(){
  document.documentElement.style.setProperty('--ar-size', (1.9 * state.arScale) + 'rem');
  document.documentElement.style.setProperty('--latin-scale', state.latinScale);
}

function setTextScale(which, pct){
  const v = clampSize(which, (+pct || 100) / 100);
  if(which === 'ar') state.arScale = v; else state.latinScale = v;
  applyTextScale();
  saveTextScale();
}
/* Book Version zoom: scales the whole leaf — text, borders and page together —
   so line breaks and page fills never change, only the size on screen. */
function msZoomStep(dir){
  state.msZoom = Math.min(2.4, Math.max(0.6, +(state.msZoom + dir*0.15).toFixed(2)));
  document.documentElement.style.setProperty('--ms-zoom', state.msZoom);
  /* Re-fit against the newly-sized frame so the Arabic fills the enlarged page
     without spilling past its border. */
  queueMsAutoFit();
}
