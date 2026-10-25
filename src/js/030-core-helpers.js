/* ---------------- app logic ---------------- */
const app = document.getElementById('app');
const AR_NUMS = ['٠','١','٢','٣','٤','٥','٦','٧','٨','٩'];
// Devotion/verse number badges use standard (Western) numerals for easy reading;
// the gold-circle styling is unchanged. Swap to AR_NUMS mapping to go Arabic-script.
const toArNum = n => String(n);
/* The ‖ marker is Book-Version pagination only — it tells manuscriptPages where
   the printed page turns and must never reach the reader's eye, so the Study
   view strips it out. */
const stripBreaks = s => String(s).replace(/\s*\u2016\s*/g, ' ').trim();
/* Rosettes are always set in the same hand, whichever Arabic face the body text
   uses — otherwise a font whose ۞ is a heavy disc sits next to one whose ۞ is a
   star, and the page looks inconsistent. */
/* Dalāʾil highlight portions: break at each rosette ۞ AND comma ، (comma stays on the page, rosette drawn as its own mark). segParts=text, segWrap=HTML; both count identically so a flash targets the right portion. */
function segParts(s){ let out=[],buf=''; const push=t=>{ if(buf.trim()!=='') out.push(buf+t); buf=''; }; for(const ch of String(s)){ if(ch==='۞') push(''); else if(ch==='،') push('،'); else buf+=ch; } push(''); return out; }
function segWrap(s, rosClass){ let out='',buf='',sg=0; const emit=t=>{ if(buf.trim()!==''){ out+='<span class="seg" data-sg="'+sg+'">'+buf+t+'</span>'; sg++; } buf=''; }; for(const ch of String(s)){ if(ch==='۞'){ emit(''); out+='<span class="'+rosClass+'">۞</span>'; } else if(ch==='،'){ emit('،'); } else buf+=ch; } emit(''); return sg? out : '<span class="seg" data-sg="0">'+String(s)+'</span>'; }
function segWrapMark(s, rosClass, kind, idx, keyN, marks, placedHere, placedSeg){ let out='',buf='',sg=0; const emit=t=>{ if(buf.trim()!==''){ const k=kind+':'+idx+':'+keyN+':'+sg; const mk=marks[k]?' marked':''; const pl=(placedHere && placedSeg===sg)?' placed':''; out+='<span class="seg'+mk+pl+'" data-sg="'+sg+'" data-mk="'+k+'" onclick="markVerse(\''+kind+'\','+idx+',\''+keyN+'\','+sg+')">'+buf+t+'</span>'; sg++; } buf=''; }; for(const ch of String(s)){ if(ch==='۞'){ emit(''); out+='<span class="'+rosClass+'">۞</span>'; } else if(ch==='،'){ emit('،'); } else buf+=ch; } emit(''); if(!sg){ const k=kind+':'+idx+':'+keyN+':0'; out='<span class="seg" data-sg="0" data-mk="'+k+'" onclick="markVerse(\''+kind+'\','+idx+',\''+keyN+'\',0)">'+String(s)+'</span>'; } return out; }
const withRosettes = (s, seg) => seg ? segWrap(s, 'rosette') : String(s).split('۞').join('<span class="rosette">۞</span>');
const arHTML = (s, seg) => markInline(withRosettes(stripBreaks(s).replaceAll('\n','<br>'), seg), false);

/* ── Favourites ──────────────────────────────────────────────────
   Stored in this browser's localStorage, so they stay on the device and are
   never shared between people opening the same hosted link.
   The key is kind + titleEnglish (unique within every array) rather than an
   array index, so favourites survive adding, removing or reordering pieces.
   A favourite whose title is later edited is simply dropped. */
const FAV_KEY = 'dlk-favs';

function loadFavs(){
  try { const v = JSON.parse(localStorage.getItem(FAV_KEY)); return Array.isArray(v) ? v : []; }
  catch(e){ return []; }
}
function saveFavs(){
  try { localStorage.setItem(FAV_KEY, JSON.stringify(state.favs)); } catch(e){}
}

/* ── Text size ──────────────────────────────────────
   Remembered across sessions on the owner's ask, so someone who needs large
   Arabic sets it once rather than on every open.

   The limits live here because three places need them and they must agree:
   the slider's own min/max, the clamp when a value comes back from storage,
   and the clamp in setTextScale. A stored value outside them would otherwise
   put the thumb off the end of its track.

   Written ONLY from setTextScale, the slider's own handler — the same
   discipline the Dalāʾil fork's view preference follows. Nothing else
   assigns state.arScale or state.latinScale, and nothing else should start:
   a size arriving from a live session or a restored screen must not quietly
   rewrite how the app opens afterwards. */
const SIZE_KEY = 'dlk-size';
const SIZE_LIMITS = { ar: [0.7, 1.6], latin: [0.8, 1.8] };

function clampSize(which, v){
  const [lo, hi] = SIZE_LIMITS[which];
  v = +v;
  return isFinite(v) ? Math.min(hi, Math.max(lo, v)) : 1;
}
function loadTextScale(which){
  try {
    const v = JSON.parse(localStorage.getItem(SIZE_KEY));
    return (v && v[which] != null) ? clampSize(which, v[which]) : 1;
  } catch(e){ return 1; }
}
function saveTextScale(){
  try {
    localStorage.setItem(SIZE_KEY, JSON.stringify({ ar: state.arScale, latin: state.latinScale }));
  } catch(e){}
}

