function startSession(){
  const el = document.getElementById('start-code');
  const code = normalizeCode(el ? el.value : '');
  if(!code){ connectSession(newSessionCode(), 'leader'); return; }
  if(!validCode(code)){ setSessionStatus('A venue code is 3–24 letters or numbers — or leave it blank for a random one.'); return; }
  connectSession(code, 'leader', { probe:true });
}
function joinSession(){
  const el = document.getElementById('join-code');
  const code = normalizeCode(el ? el.value : '');
  if(!validCode(code)){ setSessionStatus('Enter the code from the poster, or the one read aloud.'); return; }
  connectSession(code, 'follower');
}
function leaveSession(){
  slog('leaveSession CALLED');
  /* Hand the mic back to the room rather than leaving everyone following a ghost. */
  if(session.role === 'leader' && session.channel){
    try{ session.channel.send({ type:'broadcast', event:'lead', payload:{ t:'release', term: session.term + 1 } }); }catch(e){}
  }
  if(claimState.timer){ clearTimeout(claimState.timer); claimState.timer = null; }
  claimState = { term:0, ids:[], timer:null };
  clearSessionHash();
  try { if(session.channel) session.channel.unsubscribe(); } catch(e){}
  try { if(session.client) session.client.removeAllChannels(); } catch(e){}
  if(session.presentTimer){ clearTimeout(session.presentTimer); session.presentTimer = null; }
  session.lastWhereReply = 0;
  session.role = null; session.code = null; session.channel = null;
  session.client = null; session.paused = false; session.lastNav = null;
  session.term = 0; session.leaderless = false; session.claiming = false; session.leaderAt = null;
  session.lastBeat = 0; stopBeating(); stopWatchingLeader();
  session.probing = false; session.probeHeard = false; session.connecting = null;
  setSessionStatus('');
}
/* A follower steps out of step the moment they navigate themselves — whether
   that's opening another reading, a section list, or the home page. Pausing
   here (rather than only in the readers) means Resume is offered everywhere. */
function leftTheLeader(){
  if(suppressNavSignals) return;
  if(session.role === 'follower' && !session.leaderless) pauseFollowing();
}

function pauseFollowing(){
  spotStopAnim();
  spotExpectedY = null;
  if(session.role !== 'follower' || session.paused) return;
  session.paused = true;
  setSessionStatus('Paused — you moved on your own.');
}
function resumeFollowing(){
  if(session.role !== 'follower') return;
  session.paused = false;
  /* Go straight back to where the leader was, so Resume works even if they're
     mid-recitation and slow to answer; the 'where' reply then confirms it. */
  spotExpectedY = null;          /* or the watcher re-pauses us at once */
  const at = session.leaderAt;   /* read before applyRemoteNav rewrites it */
  if(at){
    applyRemoteNav(at.kind, at.idx);
    /* Come back to the leader's LINE, not just his chapter. */
    if(typeof at.verse === 'number') spotGoTo(at.kind, at.idx, at.verse, at.frac);
  }
  spotExpectedY = null;
  setSessionStatus('Following the leader.');
  if(session.channel) session.channel.send({ type:'broadcast', event:'where', payload:{} });
}

/* Apply a leader's move without echoing it back or counting it as manual. */
function applyRemoteNav(kind, idx, book, page){
  const arr = arrayOf(kind);
  if(!arr || !arr[idx]) return;
  suppressNavSignals = true;
  try {
    const c = arr[idx];
    const hasPages = Array.isArray(c.folios) && c.folios.length > 0;
    if(typeof book === 'boolean') state.pageView = book && hasPages;   // match the leader's view
    reopen(kind, idx);
  } finally { suppressNavSignals = false; }
  session.lastNav = { kind, idx };
  /* Keep any line/fraction we already knew for this same piece — a nav event
     that repeats the current chapter must not erase where in it he is. */
  const samePiece = session.leaderAt && session.leaderAt.kind === kind && session.leaderAt.idx === idx;
  session.leaderAt = Object.assign({}, samePiece ? session.leaderAt : {}, { kind, idx, page: page || 0 });
  /* We just moved the page ourselves, so any previous expectation is void. */
  spotExpectedY = null;
  /* Landed on his piece but with no line for it — ask, rather than waiting
     for him to move. The beat would answer within four seconds anyway; this
     makes the join feel immediate. */
  if(session.role === 'follower' && session.channel && !session.paused
     && !(session.leaderAt && typeof session.leaderAt.verse === 'number')){
    setTimeout(() => {
      if(session.role !== 'follower' || !session.channel) return;
      if(session.leaderAt && typeof session.leaderAt.verse === 'number') return;
      try{ session.channel.send({ type:'broadcast', event:'where', payload:{} }); }catch(e){}
    }, 400);
  }
  if(page) msGoToWhenReady(page);   // land on the leader's page
}

