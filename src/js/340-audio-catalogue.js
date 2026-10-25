/* ── Local recitations ───────────────────────────────────────────────────
   The Dalāʾil recordings are hosted in a second GitHub Pages repo. Same
   origin as this app (origin is scheme+host; the path is irrelevant), which
   is what makes fetch, progress and the Cache API work at all — release
   assets on github.com send no CORS header and are blocked outright.

   Kept out of the service worker's CORE list on purpose: precaching 150MB on
   first visit would be indefensible on a phone. A portion is fetched only
   when someone asks for it, into a cache the worker is told to spare. */
const AUDIO_BASE = 'https://zboon.github.io/mawlid-audio/';
const AUDIO_CACHE = 'mawlid-audio';

const RECITERS = {
  khayzaran: { ar: 'الشيخ حكيم خيزران',  en: 'Ḥakīm Khayzarān' },
  shamali:   { ar: 'الشيخ حازم الشمالي', en: 'Ḥāzim ash-Shamālī' },
  /* A group, not a shaykh, and spelled the way they spell it themselves
     rather than put through the app's transliteration. */
  aashiq:    { ar: 'عاشق الرسول',        en: 'Aashiq al-Rasul' },
};

/* Recordings hang off the chapter, not the collection: these seven portions
   are Khayzarān's and Monday Part 2 is ash-Shamālī's, so one reciter per
   collection would already be wrong. A list, so a second reciter for the
   same portion is an append rather than a restructure.

   `secs` is measured from the files and is what the button shows before any
   download starts. Byte sizes are deliberately NOT stored — the copies on
   the server carry an extra metadata atom, so any figure recorded here would
   drift from what actually arrives. content-length is read at fetch time. */
const DALAIL_AUDIO = {
  6:  [{ reciter:'khayzaran', file:'dalail-01-monday-1.mp4',  secs:1577 }],
  7:  [{ reciter:'khayzaran', file:'dalail-02-tuesday.mp4',   secs:1348 }],
  8:  [{ reciter:'khayzaran', file:'dalail-03-wednesday.mp4', secs:1291 }],
  9:  [{ reciter:'khayzaran', file:'dalail-04-thursday.mp4',  secs:1331 }],
  10: [{ reciter:'khayzaran', file:'dalail-05-friday.mp4',    secs:1239 }],
  11: [{ reciter:'khayzaran', file:'dalail-06-saturday.mp4',  secs:1240 }],
  12: [{ reciter:'khayzaran', file:'dalail-07-sunday.mp4',    secs:1242 }],
  13: [{ reciter:'shamali',   file:'dalail-08-monday-2.mp4',  secs:553  }],
};

/* The first recording outside the Dalāʾil, which is why the lookup below is
   keyed by kind rather than reading one map. `secs` measured from the file. */
const QASIDA_AUDIO = {
  3: [{ reciter:'aashiq', file:'Ya Rabbi Salli Ala Muhammad.mp3', secs:240 }],
};

const AUDIO_BY_KIND = { d: DALAIL_AUDIO, q: QASIDA_AUDIO };

const RECITER_KEY = 'mawlid-reciter';

function storedReciter(){
  try{ return localStorage.getItem(RECITER_KEY) || null; }catch(e){ return null; }
}

/* The recordings available for a piece, preferred reciter first. */
function audioFor(kind, idx){
  const list = (AUDIO_BY_KIND[kind] || {})[idx];
  if(!list || !list.length) return [];
  const want = storedReciter();
  if(!want) return list.slice();
  return list.slice().sort((a, b) => (b.reciter === want) - (a.reciter === want));
}

/* Encoded here and nowhere else: this is the only place a URL is built, and
   the fetch and the Cache API key have to be the same string. One file name
   carries spaces, so a bare concatenation would not survive a round trip. */
function audioUrl(rec){
  return AUDIO_BASE + rec.file.split('/').map(encodeURIComponent).join('/');
}

function reciterName(rec){
  const r = RECITERS[rec && rec.reciter];
  return r ? r.en : '';
}
function reciterNameAr(rec){
  const r = RECITERS[rec && rec.reciter];
  return r ? r.ar : '';
}

function fmtDur(s){
  s = Math.round(s || 0);
  const m = Math.floor(s / 60);
  return m + ':' + String(s % 60).padStart(2, '0');
}
function fmtMB(b){ return (b / 1048576).toFixed(1) + ' MB'; }

