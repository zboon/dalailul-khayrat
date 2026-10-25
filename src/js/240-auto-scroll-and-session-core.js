/* ── Auto-scroll engine ─────────────────────────────
   Smoothly scrolls the reader while reciting. Speed is adjustable.
   Reads SPEEDS[idx] each frame, so speed changes apply live. */
/* ── Live session (optional) ─────────────────────────────────────────────
   Lets a gathering follow whoever is leading: when they open a piece, every
   joined device opens it too.

   This is the ONLY part of the app that touches the network. It is designed
   so it can never harm the rest:
     • The Supabase library is fetched only when someone taps Join/Start.
       Nothing is downloaded otherwise, so an offline launch never waits on it.
     • If it fails, it fails alone — browsing, search, bookmarks and
       auto-scroll are untouched and still work with no connection.
     • Losing signal just stops the following; you keep reading and navigate
       by hand exactly as before, and it resumes if you reconnect.

   To switch it on, paste your own Supabase project's URL and anon key below
   (see the README). Left blank, the feature simply stays off. */
const SESSION_CONFIG = {
  url: 'https://heduxokhztwdqcfamdfd.supabase.co',
  key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhlZHV4b2toenR3ZHFjZmFtZGZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQxNDMzMjIsImV4cCI6MjA5OTcxOTMyMn0.8blm9OG4cHyHxsjMcnEVWjS2-dHRlPxFMda-ihCKTcI'
  // anon / public key — safe to publish. Never put the service_role key here.
};
const SUPABASE_CDN = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';

/* A stable per-device id, so leadership claims can be resolved the same way
   on every phone. Random, local, never sent anywhere but the session channel. */
function myClientId(){
  try{
    let id = localStorage.getItem('dlk-client-id');
    if(!id){ id = Math.random().toString(36).slice(2,10); localStorage.setItem('dlk-client-id', id); }
    return id;
  }catch(e){ return Math.random().toString(36).slice(2,10); }
}

/* term: increments on every handoff. Every message carries it, and anything
   with an older term is ignored — that's what stops a phone that dropped out
   while leading from fighting the new leader when it wakes up. */
const session = { role:null, code:null, client:null, channel:null, paused:false, status:'',
                  lastNav:null, leaderAt:null, id:myClientId(), term:0, leaderless:false, claiming:false, probing:false, probeHeard:false, connecting:null,
                  presentTimer:null, lastWhereReply:0 };
let claimState = { term:0, ids:[], timer:null };

/* A short history of what the session machinery actually did. The faults left
   are transient — by the time anyone can open a panel to look, the moment has
   passed — so record as it happens and read it afterwards. Forty lines is
   about a minute of ordinary activity. */
const sesLog = [];
function slog(msg){
  try{
    const d = new Date();
    sesLog.push(String(d.getMinutes()).padStart(2,'0') + ':'
      + String(d.getSeconds()).padStart(2,'0') + '.'
      + String(d.getMilliseconds()).padStart(3,'0') + '  ' + msg);
    if(sesLog.length > 40) sesLog.shift();
  }catch(e){}
}
/* An exception inside a click handler kills the rest of that handler silently.
   If that is what is happening, it will show up here and nowhere else. */
try{
  window.addEventListener('error', e => slog('ERROR ' + (e.message || '?')
    + ' @' + (e.lineno || '?') + ':' + (e.colno || '?')));
  window.addEventListener('unhandledrejection', e => slog('REJECT '
    + String((e.reason && e.reason.message) || e.reason || '?')));
}catch(e){}
let suppressNavSignals = false;   // true during re-renders and remote-driven navigation

function sessionConfigured(){ return !!(SESSION_CONFIG.url && SESSION_CONFIG.key); }

/* Fetch the library on demand only. */
function loadSupabase(){
  if(window.supabase) return Promise.resolve(window.supabase);
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = SUPABASE_CDN;
    s.onload = () => window.supabase ? resolve(window.supabase) : reject(new Error('load failed'));
    s.onerror = () => reject(new Error('offline'));
    document.head.appendChild(s);
  });
}

function newSessionCode(){ return String(Math.floor(1000 + Math.random() * 9000)); }

function setSessionStatus(msg){
  session.status = msg;
  renderSessionBanner();                       /* the banner lives outside #app */
  /* Only paint the index when no reader is actually showing. This used to ask
     readerOpen, which is set while BUILDING reader markup and cleared by
     renderIndex — a stale false meant a status change threw the reader away
     and dropped you back on the index. Taking the mic sets a status, so the
     first tap bounced you out and the second, from the index, looked like it
     "worked". Same DOM question as everywhere else. */
  const repaint = state.tab === 'session' && renderedView() === 'none';
  slog('status "' + String(msg).slice(0,34) + '" role=' + session.role
    + ' view=' + renderedView() + ' repaint=' + repaint);
  if(repaint) renderIndex();
}

/* The last session this device joined, kept on the device. An accidental Leave
   — or the app being closed mid-gathering — shouldn't strand someone who never
   memorised the number. */
function rememberSession(code){
  try{ localStorage.setItem('dlk-last-session', JSON.stringify({ code, at: Date.now() })); }catch(e){}
}

/* A code may be a venue's name or a short number — whatever is printed on the
   poster. Normalised so "Al-Noor", "al noor" and "ALNOOR" are all the same room. */
function normalizeCode(raw){
  return String(raw || '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 24);
}

function validCode(c){ return /^[a-z0-9]{3,24}$/.test(c); }

function rememberVenue(code){
  try{ localStorage.setItem('dlk-venue-code', code); }catch(e){}
}

function lastVenue(){
  try{
    const v = localStorage.getItem('dlk-venue-code');
    return validCode(v || '') ? v : '';
  }catch(e){ return ''; }
}

function lastSession(){
  try{
    const v = JSON.parse(localStorage.getItem('dlk-last-session'));
    return (v && validCode(v.code)) ? v : null;
  }catch(e){ return null; }
}

function agoLabel(at){
  const m = Math.round((Date.now() - at)/60000);
  if(m < 1)  return 'a moment ago';
  if(m < 60) return m + (m === 1 ? ' minute ago' : ' minutes ago');
  const h = Math.round(m/60);
  if(h < 24) return h + (h === 1 ? ' hour ago' : ' hours ago');
  const d = Math.round(h/24);
  return d + (d === 1 ? ' day ago' : ' days ago');
}

function rejoinLast(){
  const v = lastSession();
  if(!v){ setSessionStatus('No recent session on this device.'); return; }
  connectSession(v.code, 'follower');
}

function forgetLastSession(){
  try{ localStorage.removeItem('dlk-last-session'); }catch(e){}
  renderIndex();
}

function connectSession(code, role, opts){
  if(!sessionConfigured()){ setSessionStatus("Sessions aren't set up yet — see the README."); return; }
  session.connecting = code;
  setSessionStatus('Connecting…');
  /* If the channel never answers, don't leave the panel stuck on "Joining…". */
  const attempt = code;
  setTimeout(() => {
    if(session.connecting !== attempt) return;
    session.connecting = null;
    setSessionStatus('Could not reach that session. Check your connection and try again.');
  }, 12000);
  loadSupabase().then(sb => {
    const client = sb.createClient(SESSION_CONFIG.url, SESSION_CONFIG.key);
    const channel = client.channel('mawlid:' + code, { config: { broadcast: { self: false } } });

    channel.on('broadcast', { event: 'nav' }, ({ payload }) => {
      noteLeaderAlive();
      if(!payload || typeof payload.idx !== 'number') return;
      if(typeof payload.term === 'number'){
        if(payload.term < session.term) return;          // a stale leader talking
        if(payload.term > session.term){                 // someone took the mic
          session.term = payload.term;
          session.leaderless = false;
          if(session.role === 'leader'){
            slog('DEMOTE nav higher term ' + payload.term + ' > ' + session.term);
            session.role = 'follower'; setSessionStatus('Following the leader.');
          }
        }
      }
      if(session.probing) session.probeHeard = true;   // someone is already here
      if(session.leaderless){ session.leaderless = false; setSessionStatus('Following the leader.'); }
      if(session.role !== 'follower' || session.paused) return;
      applyRemoteNav(payload.kind, payload.idx, payload.book, payload.page);
    });
    /* Live page-turns inside the Book Version. */
    channel.on('broadcast', { event: 'page' }, ({ payload }) => {
      noteLeaderAlive();
      if(!payload || typeof payload.page !== 'number') return;
      if(typeof payload.term === 'number' && payload.term < session.term) return;
      if(session.role !== 'follower' || session.paused) return;
      applyRemotePage(payload.kind, payload.idx, payload.page);
    });
    /* The leader's place within the piece, line by line. */
    channel.on('broadcast', { event: 'spot' }, ({ payload }) => {
      if(!payload || typeof payload.verse !== 'number') return;
      if(typeof payload.term === 'number' && payload.term < session.term) return;
      noteLeaderAlive();
      if(session.role !== 'follower') return;
      /* Note it even while paused — applyRemoteSpot records his place and
         then declines to move us. That way Resume lands on his current line. */
      applyRemoteSpot(payload.kind, payload.idx, payload.verse, payload.frac);
    });
    /* The leader's heartbeat. Any message would do, but he may sit still on
       one page for a long stretch, so he says so explicitly. */
    channel.on('broadcast', { event: 'alive' }, ({ payload }) => {
      if(payload && typeof payload.term === 'number' && payload.term < session.term) return;
      noteLeaderAlive();
      /* A beat proves someone is leading, so it ends a probe just as a nav
         does. Without this a leader sitting still on one page was invisible
         to anyone joining. */
      if(session.probing) session.probeHeard = true;
      /* Two leaders can only arise if both probed a room that sounded empty
         at the same moment. Settle it the same way a contested claim is
         settled: the lower client id keeps the mic, and both sides reach that
         answer alone. */
      if(session.role === 'leader' && payload && payload.id && payload.id < session.id
         && (typeof payload.term !== 'number' || payload.term === session.term)){
        slog('DEMOTE alive tiebreak: other=' + String(payload.id).slice(0,6)
          + ' me=' + String(session.id).slice(0,6) + ' term=' + payload.term);
        session.role = 'follower'; session.leaderless = false; session.paused = false;
        stopBeating(); startWatchingLeader();
        setSessionStatus('Following the leader.');
        return;
      }
      if(session.role === 'follower' && session.leaderless){
        clearLeaderPending('Following the leader.');
      }
    });
    /* "Someone here is following a leader." Deliberately NOT an 'alive': that
       carries a client id and would drag a real leader through the demotion
       tiebreak against a follower. This says only that the room is not empty. */
    channel.on('broadcast', { event: 'present' }, () => {
      if(session.presentTimer){ clearTimeout(session.presentTimer); session.presentTimer = null; }
      if(session.probing) session.probeHeard = true;
      /* A 'present' only vouches that the room is occupied. It deliberately
         does not clear `leaderless` — the flag it used to clear was never set,
         so this handler has never touched leader state, and making it do so
         now would be a live-session behaviour change, not a cleanup. */
    });
    channel.on('broadcast', { event: 'lead' }, ({ payload }) => {
      if(session.probing) session.probeHeard = true;
      handleLeadMsg(payload);
    });
    /* A late joiner asks where everyone is; the leader answers. */
    channel.on('broadcast', { event: 'where' }, () => {
      /* A follower corroborates. Discovery used to rest on the leader alone,
         so one dropped reply told a joiner the room was empty. Everyone who
         is following answers instead — but after a random pause, and only if
         nobody else has answered first, so a hall of thirty phones still
         produces about one reply rather than thirty. */
      if(session.role === 'follower' && !session.leaderless && !session.presentTimer){
        session.presentTimer = setTimeout(() => {
          session.presentTimer = null;
          if(session.role !== 'follower' || session.leaderless || !session.channel) return;
          try{ session.channel.send({ type:'broadcast', event:'present', payload:{} }); }catch(e){}
        }, 250 + Math.random() * 2250);   /* wide: keeps it near one reply even in a full hall */
        return;
      }
      if(session.role !== 'leader') return;
      /* Each joiner asks up to five times and every ask drew three messages
         back. Thirty phones arriving together made hundreds in a couple of
         seconds, past what the channel will carry, and the drops fell on the
         very packets discovery depends on. One answer per burst is enough. */
      const now = Date.now();
      if(session.lastWhereReply && now - session.lastWhereReply < 700) return;
      session.lastWhereReply = now;
      /* A leader that isn't beating can't be heard. Cheap net against any
         future path that sets the role without starting the clock. */
      if(!beatTimer) startBeating();
      /* Answer FIRST with a bare "I'm here". A leader who hasn't opened a
         piece yet has no lastNav and used to answer NOTHING AT ALL — which
         told the joiner the room was empty, so it offered itself the mic and
         never moved. The place, if there is one, follows. */
      sendAlive();
      if(session.lastNav){
        sendNav(session.lastNav.kind, session.lastNav.idx);
        /* …and where in it we are. Without this a joiner arrived at the top of
           the chapter and stayed there until the leader happened to move. */
        sendSpotNow();
      }
    });

    channel.subscribe(status => {
      if(status === 'SUBSCRIBED'){
        session.connecting = null;
        rememberSession(code);          /* recorded only once actually in */
        session.client = client; session.channel = channel;
        session.code = code; session.paused = false;
        /* Anyone arriving on a shared code listens first. Two phones at one hall
           must never both take the mic, and the first to arrive at an empty room
           shouldn't be left following nobody. */
        const wantsLead = role === 'leader' && !!(opts && opts.probe);
        const listens = wantsLead || role === 'follower';
        session.role = wantsLead ? 'follower' : role;
        session.probing = listens; session.probeHeard = false; session.leaderless = false;
        if(listens){
          setSessionStatus(wantsLead ? 'Checking whether anyone is already leading…' : 'Joining…');
          const askWhere = () => {
            if(!session.probing || session.code !== code) return;
            try{ channel.send({ type:'broadcast', event:'where', payload:{} }); }catch(e){}
          };
          const decide = () => {
            if(!session.probing || session.code !== code) return;
            /* Belt and braces: if anything has settled the role since the
               probe began, its answer stands, not ours. */
            if(session.role === 'leader' || session.claiming){
              session.probing = false;
              slog('probe expired — role already settled, ignoring');
              return;
            }
            session.probing = false;
            slog('probe decided: heard=' + session.probeHeard);
            if(session.probeHeard){
              session.role = 'follower'; session.leaderless = false;
              noteLeaderAlive(); stopBeating(); startWatchingLeader();
              setSessionStatus(wantsLead
                ? "Someone is already leading here — you've joined them. Take the lead if you need to."
                : 'Following the leader.');
            } else if(wantsLead){
              becomeLeader(code);
              setSessionStatus('Leading — others can join with this code.');
            } else {
              /* A silent probe now means an empty room, and the mic opens at
                 once. The extra waiting stage that used to sit here was added
                 when the probe was unreliable: it closed before a heartbeat
                 could arrive, so silence proved nothing. It spans a full beat
                 now, and any follower already in the room vouches for its
                 leader, so a probe that hears nothing across all of that has
                 genuinely found an empty room.

                 Keeping the delay after fixing the probe just meant the first
                 person into a new session waited on a leader who did not
                 exist. The watchdog stays armed either way, so a late beat
                 still pulls this device quietly back to following. */
              session.role = 'follower';
              session.leaderless = true;
              stopBeating(); startWatchingLeader();
              setSessionStatus("No one is leading here yet — take the lead when you're ready.");
            }
            renderSessionBanner();
            if(state.tab === 'session' && renderedView() === 'none') renderIndex();
          };
          /* One 'where' used to be the entire handshake. If that packet or the
             reply was dropped — routine on a phone network — the joiner
             concluded nobody was leading, which is both halves of the bug the
             user reported: the mic offered while a leader sits there, and a
             joiner left on its own page. Ask again, and settle the moment
             anyone answers. */
          askWhere();
          PROBE_TRIES.forEach(t => setTimeout(() => {
            if(!session.probing || session.code !== code) return;
            if(session.probeHeard) return decide();
            askWhere();
          }, t));
          setTimeout(decide, PROBE_MS);
        } else {
          becomeLeader(code);
          setSessionStatus('Leading — others can join with this code.');
        }
      } else if(status === 'CHANNEL_ERROR' || status === 'TIMED_OUT'){
        session.connecting = null;
        setSessionStatus('Could not connect. Check your connection and try again.');
      }
    });
  }).catch(() => {
    session.connecting = null;
    setSessionStatus("Couldn't connect — you're offline. Everything else still works; navigate by hand.");
  });
}

