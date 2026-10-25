/* ── Passing the mic ──────────────────────────────────────────────────────
   The leader releases; the session then has no leader and anyone may claim it.
   Simultaneous taps are settled deterministically: claims are gathered for a
   short window and the lowest client id wins, so every device reaches the same
   answer without needing a server to arbitrate. */
/* ── Liveness ─────────────────────────────────────────────────────────────
   A leader who passes the mic says so. A leader whose phone locks, loses
   signal or closes the app says nothing at all, and the session used to sit
   there for ever with no one able to take over. So the leader beats quietly
   and followers give up on him after a while, which opens the mic through the
   claim machinery that already exists. */
const PROBE_TRIES = [400, 1100, 2200, 3600];  /* re-ask at these marks */
/* The probe must outlast a whole heartbeat, or a joiner can decide a busy room
   is empty without that being detectable. It used to be 2800ms against a
   4000ms beat: the window shut 1200ms BEFORE the next natural beat could
   arrive, so discovery rested entirely on a 'where' packet AND its reply both
   surviving. With two phones that nearly always happened; with a hall full it
   often didn't, and the joiner was offered the mic while someone was leading.
   At 5200 the ambient beat alone settles it even if every 'where' is lost. */
const PROBE_MS = 5200;        /* only then is the room really empty */
const BEAT_MS = 4000;         /* leader's heartbeat */
const BEAT_LOST_MS = 14000;   /* followers wait this long before opening the mic */
let beatTimer = null, beatWatch = null;

const LEADER_PENDING_MS = 9000;  /* keep listening this long before opening the mic */

function noteLeaderAlive(){ session.lastBeat = Date.now(); }

/* A leader turned up while this device was still marked leaderless. Named for
   a `leaderPending` flag that no longer exists — nothing ever set it, so it
   was removed; this is now reached only down the leaderless path. */
function clearLeaderPending(msg){
  session.leaderless = false;
  noteLeaderAlive();
  stopBeating(); startWatchingLeader();
  setSessionStatus(msg);
  renderSessionBanner();
}

function sendAlive(){
  if(!session.channel) return;
  try{ session.channel.send({ type:'broadcast', event:'alive',
    payload:{ term: session.term, id: session.id } }); }catch(e){}
}
/* Every path that puts the mic in this device's hands runs through here.
   It used to be written out three times, and the copy for "start a new
   session" — the ordinary case — left out startBeating() altogether. That
   leader never sent a heartbeat, and once the position sampler was hung off
   the same call it never sent its place either: followers landed on the
   leader's page and then sat there. Taking the mic and handing it back goes
   through one of the other two copies, which is why one pass appeared to
   fix it. */
/* A probe is a question: "is anyone leading here?" Once this device has
   answered it by ACTING — claiming the mic, or being handed it — the question
   is moot, and the timer still counting down must not be allowed to answer it
   later. It was: the probe fired a second after a won claim and reset the
   device to "No one is leading here yet", losing the lead the user had just
   taken. */
function cancelProbe(){
  if(session.probing){ session.probing = false; slog('probe cancelled by action'); }
}

function becomeLeader(code){
  slog('becomeLeader');
  cancelProbe();
  session.role = 'leader';
  session.leaderless = false;
  session.paused = false;
  stopWatchingLeader();
  startBeating();
  if(code) rememberVenue(code);
}

function startBeating(){
  stopBeating();
  startSpotTicker();
  beatTimer = setInterval(() => {
    if(session.role !== 'leader' || !session.channel) return;
    sendAlive();
    /* Re-state the position every beat. Any single dropped 'spot' used to
       leave a follower stranded until the leader next moved; now the worst a
       lost message costs is one beat. */
    sendSpotNow();
  }, BEAT_MS);
}
function stopBeating(){
  stopSpotTicker(); if(beatTimer){ clearInterval(beatTimer); beatTimer = null; } }

function startWatchingLeader(){
  stopWatchingLeader();
  beatWatch = setInterval(() => {
    if(session.role !== 'follower' || session.leaderless || !session.channel) return;
    if(!session.lastBeat) return;
    if(Date.now() - session.lastBeat < BEAT_LOST_MS) return;
    session.leaderless = true;
    session.paused = false;
    setSessionStatus('The leader dropped out — the mic is open.');
  }, 3000);
}
function stopWatchingLeader(){ if(beatWatch){ clearInterval(beatWatch); beatWatch = null; } }

/* A locked phone suspends both the timers and the socket. On waking, the
   watchdog measures a clock that stopped minutes ago and declares the mic open
   while the leader is still reciting. So on waking we reset the clock and ask
   where everyone is, rather than trusting a measurement taken across a gap. */
function sessionWake(){
  if(!session.channel || !session.code) return;
  noteLeaderAlive();
  if(session.role === 'leader') sendAlive();
  else { try{ session.channel.send({ type:'broadcast', event:'where', payload:{} }); }catch(e){} }
}
try{
  document.addEventListener('visibilitychange', () => { if(!document.hidden) sessionWake(); });
  window.addEventListener('online', sessionWake);
}catch(e){}

function releaseLead(){
  if(session.role !== 'leader' || !session.channel) return;
  session.term += 1;
  session.role = 'follower';
  session.leaderless = true;
  session.paused = false;
  stopBeating(); stopWatchingLeader();
  try{ session.channel.send({ type:'broadcast', event:'lead', payload:{ t:'release', term: session.term } }); }catch(e){}
  setSessionStatus('You passed the mic — anyone can take the lead.');
}

function takeLead(){
  slog('takeLead tap: role=' + session.role + ' leaderless=' + session.leaderless
    + ' term=' + session.term + ' claimTerm=' + claimState.term
    + ' chan=' + !!session.channel);
  if(!session.channel || session.role === 'leader'){ slog('takeLead REFUSED'); return; }
  /* Cancel here as well as in becomeLeader: the claim window is 700ms and the
     probe could otherwise expire inside it. */
  cancelProbe();
  /* Works whether or not we heard the release: the term simply moves past
     whatever the old leader was on, and their later messages are ignored. */
  /* Past the highest term anyone has claimed, not just our own — claimState
     outlives a session, and a leftover higher term made addClaim discard the
     claim silently. */
  const term = Math.max(session.term, claimState.term) + 1;
  session.claiming = true;
  addClaim(term, session.id);
  try{ session.channel.send({ type:'broadcast', event:'lead', payload:{ t:'claim', term, id: session.id } }); }catch(e){}
  setSessionStatus('Taking the lead…');
}

function addClaim(term, id){
  if(term < claimState.term){ slog('addClaim DROPPED t=' + term + ' < ' + claimState.term); return; }
  slog('addClaim t=' + term + ' id=' + String(id).slice(0,6));
  if(term > claimState.term){ claimState.term = term; claimState.ids = []; }
  if(claimState.ids.indexOf(id) === -1) claimState.ids.push(id);
  if(claimState.timer) clearTimeout(claimState.timer);
  claimState.timer = setTimeout(settleClaims, 700);
}

function settleClaims(){
  claimState.timer = null;
  const term = claimState.term;
  const ids = claimState.ids.slice().sort();
  slog('settle t=' + term + ' ids=' + ids.length + ' winner='
    + (ids.length ? (ids[0] === session.id ? 'ME' : 'other') : 'NONE'));
  claimState.ids = [];
  if(!ids.length || !session.channel) return;
  session.term = Math.max(session.term, term);
  session.leaderless = false;
  session.claiming = false;
  if(ids[0] === session.id){
    becomeLeader();
    slog('WON lead t=' + session.term);
    try{ session.channel.send({ type:'broadcast', event:'lead', payload:{ t:'lead', term: session.term, id: session.id } }); }catch(e){}
    if(session.lastNav) sendNav(session.lastNav.kind, session.lastNav.idx);
    setSessionStatus('You have the lead.');
  } else {
    /* Every other route to follower stops the beat and starts the watchdog.
       This one didn't: the device went on holding a leader's timers while
       calling itself a follower, and never noticed if the new leader went
       quiet. */
    slog('DEMOTE settleClaims lost claim');
    session.role = 'follower';
    session.paused = false;
    stopBeating(); noteLeaderAlive(); startWatchingLeader();
    setSessionStatus('Following the leader.');
  }
}

function handleLeadMsg(p){
  slog('lead msg ' + (p && p.t) + ' t=' + (p && p.term) + ' mine=' + session.term);
  if(!p || typeof p.term !== 'number' || p.term < session.term){ slog('lead msg IGNORED'); return; }
  if(p.t === 'release'){
    if(session.role === 'leader') slog('DEMOTE release t=' + p.term);
    session.term = p.term;
    session.role = 'follower';
    session.leaderless = true;
    session.paused = false;
    stopBeating(); stopWatchingLeader();
    session.claiming = false;
    setSessionStatus('The mic is open — anyone can take the lead.');
  } else if(p.t === 'claim'){
    addClaim(p.term, p.id);
  } else if(p.t === 'lead'){
    /* If we both think we won the same term, the lower id wins — same rule
       everywhere, so the disagreement resolves itself. */
    if(session.role === 'leader' && p.term === session.term && p.id > session.id){
      slog('kept lead over ' + String(p.id).slice(0,6)); return;
    }
    if(session.role === 'leader') slog('DEMOTE lead msg from '
      + String(p.id).slice(0,6) + ' t=' + p.term + ' mine=' + session.term);
    if(claimState.timer){ clearTimeout(claimState.timer); claimState.timer = null; }
    claimState.ids = [];
    session.term = p.term;
    session.leaderless = false;
    session.claiming = false;
    session.role = 'follower';
    session.paused = false;
    /* A new leader has the mic — stop beating if we had it, and start
       watching them instead. */
    stopBeating(); noteLeaderAlive(); startWatchingLeader();
    setSessionStatus('Following the leader.');
  }
}

/* Called by every open*() — the single place navigation is signalled. */
function onNavigated(kind, idx){
  if(suppressNavSignals) return;
  pushLoc();   /* after the gate: reopen() and remote navs must not push */
  /* Recorded even before a session exists: a leader who opened the piece
     first and started the session second would otherwise have nothing to
     answer a joiner's 'where' with. */
  session.lastNav = { kind, idx };
  if(session.role === 'leader'){ sendNav(kind, idx); }
  else if(session.role === 'follower' && !session.leaderless){ pauseFollowing(); }
}

/* The banner lives on <body>, outside #app, so re-rendering never wipes it. */
function renderSessionBanner(){
  let el = document.getElementById('session-banner');
  if(!session.role){ if(el) el.remove(); return; }
  if(!el){ el = document.createElement('div'); el.id = 'session-banner'; document.body.appendChild(el); }
  el.className = 'session-banner' + (session.paused && !session.leaderless ? ' paused' : '') + (session.leaderless ? ' open-mic' : '');
  const label = session.leaderless ? 'Mic open'
              : session.role === 'leader' ? 'Leading'
              : (session.paused ? 'Paused' : 'Following');
  const mic = session.leaderless
    ? `<button class="mic" onclick="takeLead()">Take the lead</button>`
    : session.role === 'leader'
      ? `<button onclick="releaseLead()">Pass the mic</button>` : '';
  el.innerHTML = `
    <span class="dot"></span>
    <span class="txt" onclick="toggleSessionDbg()">${label} · ${session.code}</span>
    ${session.dbg ? `<span class="txt dbg" id="session-dbg">${dbgLine()}</span>` : ''}
    ${mic}
    ${(session.paused && !session.leaderless) ? `<button onclick="resumeFollowing()">Resume</button>` : ''}
    <button onclick="shareSession()" aria-label="Share this session">Share</button>
    <button onclick="leaveSession()">Leave</button>`;
}

/* Tapping the banner's status shows the counters. Two people on two phones
   can then say exactly where the chain breaks — sent but not received is the
   network, received but not moved is the target lookup. */
let dbgTimer = null;
function toggleSessionDbg(){
  session.dbg = !session.dbg;
  if(dbgTimer){ clearInterval(dbgTimer); dbgTimer = null; }
  /* These were a snapshot taken at the moment of the tap, which made a leader
     that hadn't sent anything YET look identical to one that could never send
     — two very different faults reading as the same zero. Keep them moving. */
  if(session.dbg) dbgTimer = setInterval(() => {
    const el = document.getElementById('session-dbg');
    if(el) el.textContent = dbgLine(); else renderSessionBanner();
  }, 500);
  renderSessionBanner();
}
function dbgLine(){
  const view = renderedView();
  if(session.role === 'leader'){
    return 's' + (session.dbgSent||0)
         + ' · at ' + (session.dbgSpot || '—')
         + (session.dbgWhy ? '(' + session.dbgWhy + ')' : '')
         + ' · ' + (spotTick ? 'tick' : 'NO TICK')
         + ' · ' + view;
  }
  const mine = session.lastNav ? (session.lastNav.kind + ':' + session.lastNav.idx) : '—';
  const t = spotTarget ? (spotTarget.verse + '@' + (spotTarget.frac||0).toFixed(2)) : '—';
  const el = spotTarget ? (verseEl(spotTarget.kind, spotTarget.idx, spotTarget.verse) ? 'found' : 'MISSING') : '—';
  return 'r' + (session.dbgRecv||0)
       + ' · got ' + (session.dbgLast||'—')
       + ' · mine ' + mine
       + ' · tgt ' + t + ' ' + el
       + (session.paused ? ' · PAUSED' : '')
       + ' · ' + view;
}

/* A shareable link that drops someone straight into the session — the code
   lives in the URL fragment, so it never reaches a server. Sending this over
   WhatsApp reaches the whole room at once, which a QR code can't do. */
