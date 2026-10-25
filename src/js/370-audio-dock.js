/* ── the audio dock ──────────────────────────────────────────────────── */

/* A real <audio> element rather than the YouTube frame, which buys three
   things the embed could not give: it plays with the screen off, it takes
   any playback rate (the embed's list is fixed at quarter steps and rounds
   anything else down to 1), and it works with no connection once downloaded. */
const A_RATES = [0.75, 0.9, 1, 1.15, 1.25, 1.5, 1.75];

function aRateLabel(v){ return (v === 1 ? '1' : String(v)) + '×'; }

function storedARate(){
  try{
    const v = parseFloat(localStorage.getItem(RATE_KEY));
    return A_RATES.indexOf(v) === -1 ? 1 : v;
  }catch(e){ return 1; }
}

function cycleARate(){
  if(!ytPlayer || !ytPlayer.audio) return;
  const i = A_RATES.indexOf(ytPlayer.rate);
  ytPlayer.rate = A_RATES[(i + 1) % A_RATES.length];
  try{ localStorage.setItem(RATE_KEY, String(ytPlayer.rate)); }catch(e){}
  const el = document.querySelector('#ytdock audio');
  if(el) el.playbackRate = ytPlayer.rate;
  const b = document.getElementById('ytdock-rate');
  if(b) b.textContent = aRateLabel(ytPlayer.rate);
}

function audioDockState(){
  const b = document.getElementById('aud-dl');
  if(!b || !ytPlayer || !ytPlayer.rec) return;
  audioCachedSize(ytPlayer.rec).then(sz => {
    b.textContent = sz ? 'Saved ' + fmtMB(sz) + ' ·  Remove' : 'Download ' + fmtDur(ytPlayer.rec.secs);
    b.dataset.have = sz ? '1' : '';
  });
}

async function toggleAudioDownload(){
  const b = document.getElementById('aud-dl');
  if(!b || !ytPlayer || !ytPlayer.rec || b.dataset.busy) return;
  const rec = ytPlayer.rec;
  if(b.dataset.have){
    await removeAudio(rec);
    audioDockState();
    return;
  }
  b.dataset.busy = '1';
  b.textContent = 'Starting…';
  try{
    await downloadAudio(rec, (got, total) => {
      const pct = total ? Math.min(100, Math.round(got * 100 / total)) : 0;
      b.textContent = total ? pct + '%  ' + fmtMB(got) : fmtMB(got);
    });
    b.dataset.busy = '';
    audioDockState();
    /* Swap the element over to the stored copy so the rest of the sitting
       plays from disk rather than continuing to pull from the network. */
    const el = document.querySelector('#ytdock audio');
    if(el && !el.paused){
      const at = el.currentTime;
      const src = await audioSrc(rec);
      if(src && src !== el.src){ el.src = src; el.currentTime = at; el.play().catch(()=>{}); }
    }
  }catch(e){
    b.dataset.busy = '';
    b.textContent = 'Failed — retry';
  }
}

/* A stored copy if there is one, otherwise the network. */
async function audioSrc(rec){
  const hit = await audioCached(rec);
  if(hit){
    try{
      const blob = await hit.blob();
      if(ytPlayer && ytPlayer.objUrl) URL.revokeObjectURL(ytPlayer.objUrl);
      const u = URL.createObjectURL(blob);
      if(ytPlayer) ytPlayer.objUrl = u;
      return u;
    }catch(e){}
  }
  return audioUrl(rec);
}

async function openAudioDock(kind, idx, rec){
  const a = arrayOf(kind), q = a && a[idx];
  if(!q) return;
  const cue = 'a:' + rec.file;
  if(ytPlayer && ytPlayer.cue === cue){ togglePlayerSize(); return; }
  closePlayer(true);

  ytPlayer = { audio:true, cue, rec, kind, idx, big:false, rate:storedARate(), objUrl:null };
  const who = reciterName(rec), whoAr = reciterNameAr(rec);
  const d = document.createElement('div');
  d.id = 'ytdock';
  d.className = 'ytdock audio';
  d.innerHTML =
    '<div class="ytdock-in">' +
      '<div class="ytdock-meta">' +
        '<div class="ytdock-titles">' +
          '<span class="ytdock-title">' + attrEsc(displayTitle(q)) + '</span>' +
          (who ? '<span class="ytdock-reciter">' + attrEsc(who) +
                 (whoAr ? ' <span class="r-ar">' + attrEsc(whoAr) + '</span>' : '') +
                 '</span>' : '') +
        '</div>' +
        '<button class="ytdock-btn" id="ytdock-rate" onclick="cycleARate()" ' +
          'title="Playback speed">' + aRateLabel(ytPlayer.rate) + '</button>' +
        '<button class="ytdock-btn" id="aud-dl" onclick="toggleAudioDownload()">…</button>' +
        '<button class="ytdock-btn" onclick="closePlayer()" aria-label="Close player">✕</button>' +
      '</div>' +
      '<audio id="aud-el" controls preload="metadata"></audio>' +
    '</div>';
  document.body.appendChild(d);
  document.body.classList.add('has-player');

  const el = d.querySelector('audio');
  el.src = await audioSrc(rec);
  el.playbackRate = ytPlayer.rate;
  el.play().catch(()=>{});
  audioDockState();
  setMediaSession(q, who, el);
  measurePlayer();
}

/* Lock-screen controls and the correct title while the screen is off. */
function setMediaSession(q, who, el){
  if(!('mediaSession' in navigator)) return;
  try{
    navigator.mediaSession.metadata = new MediaMetadata({
      title: displayTitle(q),
      artist: who || '',
      album: 'Dalāʾil al-Khayrāt',
    });
    navigator.mediaSession.setActionHandler('play',  () => el.play());
    navigator.mediaSession.setActionHandler('pause', () => el.pause());
    navigator.mediaSession.setActionHandler('seekbackward', () => { el.currentTime = Math.max(0, el.currentTime - 15); });
    navigator.mediaSession.setActionHandler('seekforward',  () => { el.currentTime = el.currentTime + 15; });
  }catch(e){}
}

/* Called from the gold pill. Taking kind+idx rather than the URL keeps the
   quoting out of the onclick attribute — titles carry apostrophes. */
function openPlayerFor(kind, idx, which){
  /* A local recording wins over the embed: it plays offline once downloaded,
     survives the screen going off, and takes any playback rate. The YouTube
     path stays for everything that has no file. */
  if(which !== 2){
    const recs = audioFor(kind, idx);
    if(recs.length){ openAudioDock(kind, idx, recs[0]); return; }
  }
  const a = arrayOf(kind), q = a && a[idx];
  if(!q) return;
  const url = which === 2 ? q.video2 : q.video;
  const id = ytId(url);
  if(!id){ if(url) window.open(url, '_blank', 'noopener'); return; }
  /* A chapter may be one slice of a longer recitation. Its end is simply where
     the next chapter begins, so only the starts have to be recorded. */
  const from = which === 2 ? q.video2Start : q.videoStart;
  const to   = which === 2 ? q.video2End   : q.videoEnd;
  const cue  = id + ':' + (from || 0) + ':' + (to || 0);
  if(ytPlayer && ytPlayer.cue === cue){ togglePlayerSize(); return; }

  closePlayer(true);
  /* Opens small: the recitation is the point, and a full frame eats the page. */
  ytPlayer = { id, url, cue, big: false, rate: storedRate() };
  /* The watch page honours a start but ignores an end, so handing off to
     YouTube lands in the right place and then plays on into the next day. */
  const outUrl = url + (from ? (url.indexOf('?') === -1 ? '?' : '&') + 't=' + from + 's' : '');
  const d = document.createElement('div');
  d.id = 'ytdock';
  d.className = 'ytdock';
  /* Autoplay is permitted here because opening the dock is itself a tap. */
  d.innerHTML =
    '<div class="ytdock-in">' +
      '<div class="ytdock-frame"><iframe title="Recitation" allowfullscreen ' +
        'referrerpolicy="strict-origin-when-cross-origin" ' +
        'allow="autoplay; encrypted-media; picture-in-picture" ' +
        'src="https://www.youtube-nocookie.com/embed/' + id +
        '?autoplay=1&playsinline=1&rel=0&enablejsapi=1&origin=' + encodeURIComponent(location.origin) +
        (from ? '&start=' + from : '') + (to ? '&end=' + to : '') +
        '"></iframe></div>' +
      '<div class="ytdock-meta">' +
        '<span class="ytdock-title">' + attrEsc(displayTitle(q)) + '</span>' +
        '<button class="ytdock-btn" id="ytdock-rate" onclick="cycleRate()" ' +
          'title="Playback speed">' + rateLabel(ytPlayer.rate) + '</button>' +
        '<button class="ytdock-btn" id="ytdock-size" onclick="togglePlayerSize()">Enlarge</button>' +
        '<a class="ytdock-btn" href="' + outUrl + '" target="_blank" rel="noopener">YouTube</a>' +
        '<button class="ytdock-btn" onclick="closePlayer()" aria-label="Close player">✕</button>' +
      '</div>' +
    '</div>';
  document.body.appendChild(d);
  document.body.classList.add('has-player');
  applyPlaybackRate(d.querySelector('iframe'), ytPlayer.rate);
  measurePlayer();
}

function togglePlayerSize(){
  const d = document.getElementById('ytdock');
  if(!d || !ytPlayer) return;
  ytPlayer.big = !ytPlayer.big;
  d.classList.toggle('big', ytPlayer.big);
  const b = document.getElementById('ytdock-size');
  if(b) b.textContent = ytPlayer.big ? 'Minimise' : 'Enlarge';
  measurePlayer();
}

function closePlayer(quiet){
  const d = document.getElementById('ytdock');
  if(d) d.remove();
  /* A blob URL pins the whole file in memory until it is revoked; opening a
     few portions in a sitting would otherwise hold hundreds of MB. */
  if(ytPlayer && ytPlayer.objUrl){ try{ URL.revokeObjectURL(ytPlayer.objUrl); }catch(e){} }
  ytPlayer = null;
  document.body.classList.remove('has-player');
  document.documentElement.style.setProperty('--player-h', '0px');
  if(!quiet){ queueMsAutoFit(); msFloatPosition(); }
}

/* Publish the dock's real rendered height, then let the leaves re-fit around
   it. This is what makes full screen work: msAutoFit floors a leaf at the
   window height, and that floor now subtracts the dock. */
function measurePlayer(){
  const d = document.getElementById('ytdock');
  document.documentElement.style.setProperty('--player-h', (d ? d.offsetHeight : 0) + 'px');
  queueMsAutoFit();
  msFloatPosition();
}
window.addEventListener('resize', () => { if(ytPlayer) measurePlayer(); });

function playerHeight(){
  return parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--player-h')) || 0;
}

