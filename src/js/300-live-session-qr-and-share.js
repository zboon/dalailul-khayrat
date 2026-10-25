/* ── Scan to join ─────────────────────────────────────────────────────────
   In a hall, reading a code aloud is slow and a link needs a group chat that
   not everyone is in. A code on the leader's screen is the shortest path from
   "can I follow?" to following. */
function showSessionQR(){
  hideSessionQR();
  const url = sessionLink();
  const svg = qrSVG(url, 260);
  const wrap = document.createElement('div');
  wrap.id = 'qr-wrap';
  wrap.className = 'qr-wrap';
  wrap.innerHTML = `<div class="qr-card">
      <div class="qr-t">Scan to join</div>
      <div class="qr-code">${svg || '<div class="qr-fail">Show the code instead.</div>'}</div>
      <div class="qr-num">${attrEsc(session.code || '')}</div>
      <div class="qr-link">${attrEsc(url)}</div>
      <div class="qr-btns">
        <button class="session-btn" onclick="copySessionLink()">Copy link</button>
        ${navigator.share ? '<button class="session-btn" onclick="nativeShare()">Share\u2026</button>' : ''}
        <button class="session-btn primary" onclick="hideSessionQR()">Done</button>
      </div>
    </div>`;
  wrap.addEventListener('click', e => { if(e.target === wrap) hideSessionQR(); });
  document.body.appendChild(wrap);
}
function hideSessionQR(){
  const el = document.getElementById('qr-wrap');
  if(el) el.remove();
}
document.addEventListener('keydown', e => { if(e.key === 'Escape') hideSessionQR(); });

function sessionLink(code){
  const c = code || session.code;
  return location.origin + location.pathname + '#s=' + c;
}
/* Share now shows the code on screen; the phone's own share sheet is one tap
   further in, for sending it to someone who isn't in the room. */
function shareSession(){ showSessionQR(); }
function nativeShare(){
  const url = sessionLink();
  if(navigator.share){
    navigator.share({ title: 'Mawlid session', text: 'Follow along with the gathering:', url })
      .catch(() => {});   // the person simply dismissed the share sheet
  } else {
    copySessionLink();
  }
}
function copySessionLink(){
  const url = sessionLink();
  if(navigator.clipboard && navigator.clipboard.writeText){
    navigator.clipboard.writeText(url)
      .then(() => setSessionStatus('Link copied — paste it to the group.'))
      .catch(() => setSessionStatus('Copy failed. The code is ' + session.code + '.'));
  } else {
    setSessionStatus('Share the code: ' + session.code);
  }
}
/* Everything about this device's session in one screenful, so a fault can be
   reported by screenshot instead of squinting at a banner and retyping it.
   Each line answers one of the conditions that has to hold for the leader's
   position to reach anybody at all. */
function sessionReport(){
  const n = s => { try { return document.querySelectorAll(s).length; } catch(e){ return -1; } };
  let spot = null, spotErr = '';
  try { spot = currentSpot(); } catch(e){ spotErr = String((e && e.message) || e); }
  return [
    'Mawalid ' + APP_VERSION + '  —  session report',
    'role      ' + (session.role || '—') + '   code ' + (session.code || '—') + '   term ' + session.term,
    'paused    ' + !!session.paused + '   leaderless ' + !!session.leaderless,
    'channel   ' + (session.channel ? 'yes' : 'NO')
      + '   beat ' + (beatTimer ? 'on' : 'OFF')
      + '   tick ' + (spotTick ? 'on' : 'OFF'),
    'lastNav   ' + (session.lastNav ? session.lastNav.kind + ':' + session.lastNav.idx : 'NONE'),
    'leaderAt  ' + (session.leaderAt ? JSON.stringify(session.leaderAt) : 'NONE'),
    'view      rendered ' + renderedView() + '   pageView ' + !!state.pageView
      + '   tab ' + state.tab + '   readerOpen ' + readerOpen,
    'dom       study ' + n('main.verses article.verse[data-v]')
      + '   book ' + n('.ms-v[data-mk]'),
    'spot      ' + (spotErr ? 'THREW ' + spotErr : JSON.stringify(spot))
      + '   why ' + (session.dbgWhy || '—'),
    'counts    sent ' + (session.dbgSent || 0) + '   recv ' + (session.dbgRecv || 0)
      + '   last ' + (session.dbgLast || '—'),
    'target    ' + JSON.stringify(spotTarget || null),
    '',
    'recent — newest last',
    (sesLog.length ? sesLog.join('\n') : '(nothing recorded)')
  ].join('\n');
}

function showSessionReport(){
  hideSessionQR();
  const wrap = document.createElement('div');
  wrap.id = 'qr-wrap';
  wrap.className = 'qr-wrap';
  wrap.innerHTML = '<div class="qr-card"><div class="qr-t">Session report</div>'
    + '<pre class="rep">' + attrEsc(sessionReport()) + '</pre>'
    + '<div class="qr-btns">'
    + '<button class="session-btn" onclick="copySessionReport()">Copy</button>'
    + '<button class="session-btn primary" onclick="hideSessionQR()">Done</button>'
    + '</div></div>';
  wrap.addEventListener('click', e => { if(e.target === wrap) hideSessionQR(); });
  document.body.appendChild(wrap);
}

function copySessionReport(){
  const txt = sessionReport();
  if(navigator.clipboard && navigator.clipboard.writeText){
    navigator.clipboard.writeText(txt)
      .then(() => setSessionStatus('Report copied — paste it into the chat.'))
      .catch(() => setSessionStatus('Copy failed — screenshot the report instead.'));
  } else {
    setSessionStatus('Screenshot the report — this browser blocks copying.');
  }
}

/* A session code arriving in the URL, e.g. …/#s=4821 */
function pendingSessionCode(){
  const m = /[#&?]s=([A-Za-z0-9._-]{3,30})/.exec(location.hash || '');
  const c = m ? normalizeCode(m[1]) : null;
  return validCode(c || '') ? c : null;
}
function clearSessionHash(){
  if(location.hash && /[#&?]s=/.test(location.hash)){
    try { history.replaceState(null, '', location.pathname + location.search); } catch(e){}
  }
}

/* The link is just the code — it says nothing about who's leading — so anyone
   in the session can pass it on. Followers get the same buttons as the leader,
   which means a latecomer can be pulled in without interrupting whoever is
   reciting. */
function shareRow(){
  return `<div class="session-share">
    <button class="session-btn primary" onclick="shareSession()">Share link</button>
    <button class="session-btn" onclick="copySessionLink()">Copy link</button>
    <button class="session-btn" onclick="showSessionReport()">Report</button>
  </div>`;
}

function sessionPanel(){
  if(!sessionConfigured()){
    return `<div class="no-results">Live sessions aren't set up yet.<br><br>
      They need a free Supabase project — see the README for the two values to paste in.<br><br>
      Everything else in the app works without it.</div>`;
  }
  const note = session.status ? `<div class="session-status">${session.status}</div>` : '';
  if(session.connecting && !session.role){
    return `<div class="session-panel">
      <div class="session-code">${session.connecting}</div>
      <p>Joining…</p>
      ${note}
      <button class="session-btn quiet" onclick="leaveSession()">Cancel</button>
    </div>`;
  }
  if(session.role === 'leader'){
    return `<div class="session-panel">
      <div class="session-code">${session.code}</div>
      <p>Send the link to your group — tapping it joins them straight away. Or read the code aloud for anyone who can't open it.</p>
      ${shareRow()}
      ${note}
      <button class="session-btn" onclick="releaseLead()">Pass the mic</button>
      <button class="session-btn quiet" onclick="leaveSession()">End session</button>
    </div>`;
  }
  if(session.role === 'follower' && session.leaderless){
    return `<div class="session-panel">
      <div class="session-code">${session.code}</div>
      <p>No one is leading right now. Whoever takes the mic chooses what the gathering reads next.</p>
      <button class="session-btn primary" onclick="takeLead()">Take the lead</button>
      <p class="session-hint">If several people tap at once, one is chosen and the rest keep following — nobody has to sort it out.</p>
      ${shareRow()}
      ${note}
      <button class="session-btn quiet" onclick="leaveSession()">Leave session</button>
    </div>`;
  }
  if(session.role === 'follower'){
    return `<div class="session-panel">
      <div class="session-code">${session.code}</div>
      <p>You're following the leader. Open anything yourself and you'll take over — tap Resume in the banner to follow again.</p>
      ${session.paused
        ? `<button class="session-btn" onclick="takeLead()">Take the lead</button>
      <p class="session-hint">The leader has gone quiet — their phone may have dropped out. Take the lead if the gathering needs to carry on.</p>`
        : `<p class="session-hint">Someone is leading right now, so the mic isn't offered here. If they go quiet, a Take the lead button will appear.</p>`}
      <p class="session-hint">Someone just arrived? Send them the link yourself — no need to interrupt the leader.</p>
      ${shareRow()}
      ${note}
      <button class="session-btn quiet" onclick="leaveSession()">Leave session</button>
    </div>`;
  }
  const last = lastSession();
  const rejoin = last ? `
    <button class="session-btn primary" onclick="rejoinLast()">Rejoin ${last.code}</button>
    <p class="session-hint">You were in this session ${agoLabel(last.at)}. If it's still running you'll rejoin it; if not, you can take the lead yourself. <button class="link-btn" onclick="forgetLastSession()">Forget it</button></p>` : '';
  return `<div class="session-panel">
    <p>Everyone's screen follows whoever is leading. Needs internet — without it, the app still works and you navigate by hand.</p>
    ${rejoin}
    <div class="session-join">
      <input id="start-code" maxlength="24" placeholder="venue name" aria-label="Venue code" value="${lastVenue()}">
      <button class="session-btn${last ? '' : ' primary'}" onclick="startSession()">Start a session</button>
    </div>
    <p class="session-hint">Leave it blank for a random number. Or give the venue a name of its own — <em>alnoor</em>, <em>masjidtaqwa</em> — and it stays the same every week, so a QR printed at the door always joins that night's session. Names are far safer than numbers: two gatherings could both pick 1111, but not both pick your masjid's name.</p>
    <div class="session-join">
      <input id="join-code" maxlength="24" placeholder="code" aria-label="Session code">
      <button class="session-btn" onclick="joinSession()">Join</button>
    </div>
    ${note}
  </div>`;
}

/* The green chapter note. Anything past a couple of lines is folded behind a
   disclosure so the reader meets the prayer first and opens the background only
   if they want it; short notes are left showing, since hiding a single line
   costs a tap and saves nothing. Length is measured on the text, not the
   markup, because some notes carry an Arabic line in a span. */
const NOTE_FOLD_AT = 160;

/* The top of a Dalāʾil or ḥizb reader (the other collections keep noteBlock
   and their full-width bars).

   The chapter note is HIDDEN for now (owner's call, v428 / v99): the owner
   may want it back, so it is switched off here rather than removed. Set
   SHOW_CHAPTER_NOTES to true and it returns as a small "About · نُبْذَة"
   button that opens the note beneath it (a short note simply shows). The
   notes themselves are untouched in the data.

   Listen is the full-width bar again ("wider again", owner's call — v427
   had shrunk it to a small button beside About). In the Book Version it
   sits in #ms-tune, offered from the opening leaf only, as before. */
const SHOW_CHAPTER_NOTES = false;
function readerActions(q, kind, idx, book){
  const note = (SHOW_CHAPTER_NOTES && q.note) ? String(q.note) : '';
  const plain = note.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const folds = plain.length > NOTE_FOLD_AT;
  const shortNote = (note && !folds) ? `<div class="qnote">${note}</div>` : '';
  const about = folds ? `<div class="reader-actions"><button class="ra-btn" onclick="toggleAbout(this)" aria-expanded="false">About · نُبْذَة</button></div>
    <div class="qnote about-body" hidden>${note}</div>` : '';
  const listen = `${(q.video || audioFor(kind, idx).length) ? `<button class="qtune" onclick="openPlayerFor('${kind}',${idx},1)">▶ Listen to this ḥizb</button>` : ''}
    ${q.video2 ? `<button class="qtune" onclick="openPlayerFor('${kind}',${idx},2)">▶ Listen — alternate version</button>` : ''}`;
  const block = about + listen;
  if(!block.trim()) return shortNote;
  return shortNote + (book ? `<div class="ms-tune" id="ms-tune">${block}</div>` : block);
}
function toggleAbout(btn){
  const body = btn.parentElement && btn.parentElement.nextElementSibling;
  if(!body || !body.classList.contains('about-body')) return;
  const open = body.hidden;
  body.hidden = !open;
  btn.classList.toggle('on', open);
  btn.setAttribute('aria-expanded', open ? 'true' : 'false');
}
/* Opens and closes in place — like the refrain markers and the size sliders,
   never through reopen(), so the reader keeps its scroll. state.aaOpen is in
   memory only, so it survives the re-render a column toggle makes but a
   chapter still opens with the panel shut. */
function toggleAa(){
  state.aaOpen = !state.aaOpen;
  document.querySelectorAll('.aa-panel').forEach(p => p.classList.toggle('open', !!state.aaOpen));
  document.querySelectorAll('.aa-btn').forEach(b => {
    b.classList.toggle('on', !!state.aaOpen);
    b.setAttribute('aria-expanded', state.aaOpen ? 'true' : 'false');
  });
}
function noteBlock(note){
  if(!note) return '';
  const plain = String(note).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  if(plain.length <= NOTE_FOLD_AT) return `<div class="qnote">${note}</div>`;
  return `<details class="qnote">
      <summary>About this section · نُبْذَة <span class="qnote-chev">›</span></summary>
      <div class="qnote-body">${note}</div>
    </details>`;
}

/* Opening a reader swaps #app's contents without touching state.tab, so a
   follower who joined from the session tab still counts as being "on" it.
   Session-status updates used to re-render the index on that basis and paint
   over the piece the leader had just sent them to — about a second after they
   arrived. This flag lets those re-renders tell the difference. */
let readerOpen = false;
function readerHTML(q, backOnclick, kind, idx){
  readerOpen = true;
  msPiece = { kind, idx };
  const empty = !q.verses || q.verses.length === 0;
  /* Turkish ilahis carry their own name in both title fields, so the subheader
     would read it twice — keep only the translation after the dash. */
  const enTitle = (q.latin && q.titleEnglish && q.titleEnglish.indexOf(' \u2014 ') !== -1)
    ? q.titleEnglish.split(' \u2014 ').slice(1).join(' \u2014 ')
    : q.titleEnglish;
  const controlsTarget = `'${kind}',${idx}`;
  /* Some pieces ship the illuminated pages they were transcribed from. Those are
     read as they were printed — no transliteration or translation over them. */
  const hasPages = Array.isArray(q.folios) && q.folios.length > 0;
  const pageView = hasPages && state.pageView;
  /* The compact top — Aa panel, slim About · Listen row — is for the Dalāʾil
     and the aḥzāb only (owner's call); every other collection keeps its
     settings in the open and its full-width bars. The Aa panel holds the
     script in both views, the columns and the text size in the Study view. */
  const compact = kind === 'd' || kind === 'l';
  const aaHas = compact && (!pageView || !q.latin);
  return `
    <div class="reader-bar">
      <div class="rside"><button class="back" onclick="${backOnclick}">‹ Back</button></div>
      <img class="reader-bismillah" src="${HEADER_BISMILLAH}" width="640" height="114"
           alt="\u0628\u0650\u0633\u0652\u0645\u0650 \u0627\u0644\u0644\u0647\u0650 \u0627\u0644\u0631\u0651\u064e\u062d\u0652\u0645\u0670\u0646\u0650 \u0627\u0644\u0631\u0651\u064e\u062d\u0650\u064a\u0645\u0650">
      <div class="rside end"><button class="theme-toggle bar-theme" onclick="toggleTheme()" aria-label="Day or night">${themeGlyph()}</button>${(hasPages && !empty) ? `<button class="view-swap" onclick="setPageView(${!pageView},${controlsTarget})" aria-label="Switch to ${pageView?'Study':'Book'} Version">${SWAP_ICON_SVG}<span>${pageView?'Study':'Book'}</span></button>` : ''}</div>
    </div>
    <div class="piece-head">
      <div class="piece-title-ar">${q.titleArabic}</div>
      ${enTitle ? `<div class="piece-title-en">${enTitle}</div>` : ''}
    </div>
    ${empty ? '' : `<div class="controls">
      ${kind === 'd' && pageView ? `<button class="chip place-btn ${placeIsHere(idx)&&placeStillMarked()?'on':''}"
        data-idx="${idx}" onclick="saveDalailPlace(${idx})">${placeBtnLabel(idx)}</button>` : ''}
      ${hasPages ? `<span class="view-switch" role="group" aria-label="How to read this">
        <button class="${pageView?'on':''}" onclick="setPageView(true,${controlsTarget})">Book Version</button>
        <button class="${pageView?'':'on'}" onclick="setPageView(false,${controlsTarget})">Study Version</button>
        </span>
      ${pageView && spreadOffered() ? `<button class="chip ${spreadOn()?'on':'off'}"
        onclick="toggleSpread(${controlsTarget})">Two pages</button>` : ''}
      ${pageView ? `<button class="chip icon" onclick="setImmersive(true)" aria-label="Full screen">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M9 3H3v6M15 3h6v6M9 21H3v-6M15 21h6v-6"/></svg>
      </button>` : ''}` : ''}
      ${aaHas ? `<button class="chip aa-btn${state.aaOpen?' on':''}" onclick="toggleAa()" aria-expanded="${state.aaOpen?'true':'false'}"
        aria-label="Reading settings">Aa</button>
      <div class="aa-panel${state.aaOpen?' open':''}">
        ${q.latin ? '' : `<div class="aa-row"><span class="view-switch script-switch" role="group" aria-label="Arabic script">${[['uthmani','Uthmani'],['indopak','IndoPak'],['naskh','Naskh']].map(([v,l]) =>
          `<button data-font="${v}" class="${arFont===v?'on':''}" aria-pressed="${arFont===v}" onclick="setArFont('${v}')">${l}</button>`).join('')}</span></div>`}
        ${pageView ? '' : `<div class="aa-row">
        ${q.latin ? '' : `<button class="chip ${state.showTr?'':'off'}" onclick="toggle(${controlsTarget})">Transliteration</button>`}
        <button class="chip ${state.showEn?'':'off'}" onclick="toggleEn(${controlsTarget})">Translation</button></div>
        <div class="size-row">
          ${q.latin ? '' : sizeSlider('ar', state.arScale)}
          ${sizeSlider('latin', state.latinScale)}
        </div>`}
      </div>` : compact ? '' : `
      ${q.latin ? '' : `<span class="view-switch script-switch" role="group" aria-label="Arabic script">${[['uthmani','Uthmani'],['indopak','IndoPak'],['naskh','Naskh']].map(([v,l]) =>
        `<button data-font="${v}" class="${arFont===v?'on':''}" aria-pressed="${arFont===v}" onclick="setArFont('${v}')">${l}</button>`).join('')}</span>`}
      ${pageView ? '' : `
      ${q.latin ? '' : `<button class="chip ${state.showTr?'':'off'}" onclick="toggle(${controlsTarget})">Transliteration</button>`}
      <button class="chip ${state.showEn?'':'off'}" onclick="toggleEn(${controlsTarget})">Translation</button>
      <div class="size-row">
        ${q.latin ? '' : sizeSlider('ar', state.arScale)}
        ${sizeSlider('latin', state.latinScale)}
      </div>`}
      `}
    </div>`}
    <main class="verses${pageView ? ' ms-view' : ''}${(kind === 'd' || kind === 'l') ? ' paper' : ''}">
      ${pageView ? manuscriptPages(q, kind, idx) : empty ? placeholder(q.titleEnglish) : `
      ${compact ? readerActions(q, kind, idx, false) : `${noteBlock(q.note)}
      ${(q.video || audioFor(kind, idx).length) ? `<button class="qtune" onclick="openPlayerFor('${kind}',${idx},1)">▶ Listen to the tune</button>` : ''}
      ${q.video2 ? `<button class="qtune" onclick="openPlayerFor('${kind}',${idx},2)">▶ Listen — alternate version</button>` : ''}`}
      ${q.verses.map((v,n)=> v.omit ? '' : `
        <article class="verse ${v.refrain?'refrain':''} ${v.instruction?'v-instruction':''}${kind==='d'&&placedVerse(idx,n)?' placed':''}" data-v="${n}">
          ${kind === 'd' ? `<button class="verse-place ${placedVerse(idx,n)?'on':''}"
            onclick="placeVerse(${idx},${n})"
            aria-label="${placedVerse(idx,n)?'Remove my place':'Mark my place here'}"
            title="${placedVerse(idx,n)?'Remove my place':'Mark my place here'}">${bookmarkIcon(placedVerse(idx,n))}</button>` : ''}
          <div class="v-num">${toArNum(verseNo(kind, idx, n))}</div>
          ${v.refrain?'<div class="refrain-note">Chorus · يُرَدَّد</div>':''}
          ${v.instruction?'<div class="instruction-note">Instruction · إِرْشَاد</div>':''}
          ${v.note?`<div class="v-note">${v.note}</div>`:''}
          ${q.latin
            ? `<div class="v-latin">${stripBreaks(v.ar).replaceAll('\n','<br>')}</div>`
            : `${(() => {
                const sp = splitBasmala(stripBreaks(v.ar));
                if(!sp) return `<div class="v-ar">${arHTML(v.ar, kind==='d')}${v.sep ? ` <span class="v-salawat">${v.sep}</span>` : ''}</div>`;
                return `${sp.pre ? `<div class="v-ar">${arHTML(sp.pre)}</div>` : ''}
                        <div class="v-ar v-basmala">${arHTML(sp.basmala)}</div>
                        ${sp.rest ? `<div class="v-ar">${arHTML(sp.rest)}</div>` : ''}`;
              })()}
          ${v.tr ? `<div class="v-tr ${state.showTr?'':'hide'}">${v.tr.replaceAll('\n','<br>')}</div>` : ''}`}
          ${v.en ? `<div class="v-en ${state.showEn?'':'hide'}">${v.en.replaceAll('\n','<br>')}</div>` : ''}
        </article>${v.repeatRefrain ? refrainRepeatHTML(q) : ''}`).join('')}`}
      ${pageView ? '' : chapterNav(kind, idx)}
    </main>
`;
}

