/* Update the star in place, so tapping it never disturbs your scroll position */
function updateFavUI(kind, idx){
  const btn = document.querySelector('.fav-btn');
  if(!btn) return;
  const on = isFav(kind, idx);
  btn.innerHTML = bookmarkIcon(on);
  btn.classList.toggle('on', on);
  btn.setAttribute('aria-label', on ? 'Remove bookmark' : 'Bookmark this');
}
/* Resolve saved keys back to live pieces, skipping any that no longer exist */
function favItems(){
  const out = [];
  state.favs.forEach(key => {
    const kind = key.slice(0, 1);
    const title = key.slice(2);
    const arr = arrayOf(kind);
    if(!arr) return;
    const idx = arr.findIndex(p => p.titleEnglish === title);
    if(idx >= 0) out.push({ kind, idx, piece: arr[idx] });
  });
  return out;
}

/* Fuzzy-normalize transliterated Arabic so different English spellings match.
   e.g. "Qaseeda", "kasida", "qasīda" all collapse to the same key.
   Steps: lowercase → strip diacritics/accents → drop non-letters →
   fold interchangeable sounds (q/k, ph/f, etc.) → collapse doubled letters. */
function normalize(str){
  if(!str) return '';
  let s = str.toLowerCase();
  // strip combining diacritical marks (ā ṣ ḥ ʿ etc.)
  s = s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  // strip Arabic harakat/tatweel and fold letter variants, so searching Arabic
  // works whether or not the person types the vowel marks
  s = s.replace(/[\u064b-\u065f\u0670\u0640]/g, '');
  s = s.replace(/[أإآٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/ؤ/g, 'و').replace(/ئ/g, 'ي').replace(/ة/g, 'ه');
  // remove Arabic transliteration marks and punctuation, keep a-z and arabic block
  s = s.replace(/[ʿʾ'`’‘_\-.,;:!?()\[\]"۞·‖]/g, ' ');
  // sound-folding for common spelling variants
  s = s
    .replace(/ph/g, 'f')
    .replace(/ck/g, 'k')
    .replace(/q/g, 'k')      // qasida = kasida
    .replace(/dh/g, 'd')
    .replace(/th/g, 't')
    .replace(/gh/g, 'g')
    .replace(/kh/g, 'h')
    .replace(/sh/g, 's')
    .replace(/ee/g, 'i')     // nabee = nabi
    .replace(/ii/g, 'i')
    .replace(/ea/g, 'i')
    .replace(/oo/g, 'u')     // rasool = rasul
    .replace(/ou/g, 'u')
    .replace(/uu/g, 'u')
    .replace(/aa/g, 'a')     // salaam = salam
    .replace(/y/g, 'i')      // naby = nabi
    .replace(/w/g, 'u');
  // collapse any remaining doubled letters (rabbi = rabi, muhammad = muhamad)
  s = s.replace(/(.)\1+/g, '$1');
  // squeeze whitespace
  return s.replace(/\s+/g, ' ').trim();
}

/* Build a searchable haystack for each qasida (title + all verse text). */
function haystack(q){
  const parts = [q.titleEnglish, q.titleArabic];
  q.verses.forEach(v => { parts.push(v.tr, v.en, v.ar); });
  const joined = parts.join(' ');
  const norm = normalize(joined);
  return {
    norm,
    // space-free copy, so word breaks don't matter: "mawla ya" == "mawlaya".
    // Doubles are re-collapsed AFTER squeezing, since removing a space can
    // create one ("ar rahman" -> "arrahman" -> "arahman").
    tight: tighten(norm),
    raw: joined.toLowerCase(),
    ar: joined
  };
}

/* Space-free, double-free form used for spacing-insensitive matching. */
function tighten(normalized){
  return normalized.replace(/\s+/g, '').replace(/(.)\1+/g, '$1');
}

function matchesQuery(q, query){
  if(!query) return true;
  const nq = normalize(query);
  const h = haystack(q);
  // match on normalized (fuzzy) OR raw lowercase OR arabic-script substring
  if(nq && h.norm.includes(nq)) return true;
  // spacing-insensitive: "mawla ya" and "mawlaya" both find the same verse
  const tq = tighten(nq);
  if(tq && h.tight.includes(tq)) return true;
  const rawq = query.toLowerCase().trim();
  if(h.raw.includes(rawq)) return true;
  if(/[\u0600-\u06ff]/.test(query) && h.ar.includes(query.trim())) return true;
  return false;
}

