/* ── The docked reciter ─────────────────────────────────────────────
   Lives on <body>, so it survives every re-render of #app: the recitation
   keeps playing while you turn leaves, and while you go on into the next
   section. Everything that needs to make room for it reads --player-h. */
let ytPlayer = null;

/* Playback speed. YouTube's embedded player accepts ONLY these steps; a value
   in between is rounded DOWN TOWARDS 1, so asking for 1.15 plays at 1 while
   looking as though it worked. The finer slider in YouTube's own interface is
   not exposed to embeds. Rather than choose for the reader, the dock carries a
   speed button and remembers what they pick. */
const RATES = [0.75, 1, 1.25, 1.5, 1.75];
const RATE_KEY = 'dlk-play-rate';

function storedRate(){
  try{
    const v = parseFloat(localStorage.getItem(RATE_KEY));
    return RATES.indexOf(v) === -1 ? 1 : v;
  }catch(e){ return 1; }
}

function rateLabel(r){ return (r === 1 ? '1' : String(r)) + '×'; }

/* The rate can only be set through the player API, so the command is posted to
   the iframe. On first load it goes three times, because the player isn't
   necessarily ready the moment the frame is; later changes go once. */
function sendRate(rate){
  const frame = document.querySelector('#ytdock iframe');
  if(!frame) return;
  try{
    frame.contentWindow.postMessage(JSON.stringify({
      event: 'command', func: 'setPlaybackRate', args: [rate]
    }), 'https://www.youtube-nocookie.com');
  }catch(e){}
}

function applyPlaybackRate(frame, rate){
  if(!frame) return;
  frame.addEventListener('load', () => {
    sendRate(rate); setTimeout(() => sendRate(rate), 600); setTimeout(() => sendRate(rate), 1800);
  });
}

/* Steps through the rates the player actually supports, and keeps the choice
   for next time. */
function cycleRate(){
  if(!ytPlayer) return;
  if(ytPlayer.audio){ cycleARate(); return; }   /* the audio dock has its own finer set */
  const i = RATES.indexOf(ytPlayer.rate);
  ytPlayer.rate = RATES[(i + 1) % RATES.length];
  try{ localStorage.setItem(RATE_KEY, String(ytPlayer.rate)); }catch(e){}
  const b = document.getElementById('ytdock-rate');
  if(b) b.textContent = rateLabel(ytPlayer.rate);
  sendRate(ytPlayer.rate);
}

function ytId(url){
  const m = String(url || '').match(/(?:v=|youtu\.be\/|embed\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1] : null;
}

