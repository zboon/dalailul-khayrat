/* ── Downloaded recitations: the manage screen ───────────────────────────
   An app that can quietly put 150MB on someone's phone owes them a plain
   view of what is stored and a way to remove it. Sizes are read back from
   the cache itself rather than from any figure recorded in the data — the
   copies on the server carry an extra metadata atom, so a stored number
   would drift from what actually arrived. */

/* Every portion that has a recording, flattened for the manage list. */
function allAudioEntries(){
  const out = [];
  Object.keys(AUDIO_BY_KIND).forEach(kind => {
    const m = AUDIO_BY_KIND[kind];
    Object.keys(m).forEach(k => {
      const idx = Number(k);
      (m[k] || []).forEach(rec => out.push({ kind, idx, rec }));
    });
  });
  return out.sort((a, b) => a.kind === b.kind
    ? a.idx - b.idx
    : (a.kind < b.kind ? -1 : 1));
}

async function audioLedger(){
  const rows = [];
  let have = 0, total = 0;
  for(const e of allAudioEntries()){
    const size = await audioCachedSize(e.rec);
    if(size){ have++; total += size; }
    rows.push({ e, size });
  }
  return { rows, have, total };
}

function downloadsScreen(){
  /* Painted empty, then filled in — the sizes come from an async cache read
     and the browse dispatch is synchronous. */
  setTimeout(refreshDownloads, 0);
  return backToDalail() +
    label('Downloaded recitations · التّسجيلات الْمحفوظة') +
    '<div id="dl-list"><div class="no-results">Reading what\'s stored…</div></div>';
}

async function refreshDownloads(){
  const host = document.getElementById('dl-list');
  if(!host) return;
  const { rows, have, total } = await audioLedger();

  let html = '<div class="dl-sum">' +
    (have
      ? '<strong>' + have + ' of ' + rows.length + '</strong> saved on this device · ' + fmtMB(total)
      : 'Nothing saved yet. Download a portion to hear it with no connection.') +
    (have ? ' <button class="session-btn quiet" onclick="removeAllAudio()">Remove all</button>' : '') +
    '</div>';

  rows.forEach(({ e, size }) => {
    const q = (arrayOf(e.kind) || [])[e.idx] || {};
    const who = reciterName(e.rec), whoAr = reciterNameAr(e.rec);
    const id = 'dlrow-' + e.rec.file.replace(/[^a-z0-9]/gi, '');
    html +=
      '<div class="dl-row" id="' + id + '">' +
        '<div class="dl-meta">' +
          '<div class="dl-title">' + attrEsc(q.titleEnglish || '') + '</div>' +
          '<div class="dl-sub">' + attrEsc(who) +
            (whoAr ? ' <span class="r-ar">' + attrEsc(whoAr) + '</span>' : '') +
            ' · ' + fmtDur(e.rec.secs) + '</div>' +
        '</div>' +
        '<button class="session-btn quiet dl-act" ' +
          'onclick="rowAction(' + attrEsc(JSON.stringify(e.rec.file)) + ')">' +
          (size ? 'Remove · ' + fmtMB(size) : 'Download') +
        '</button>' +
      '</div>';
  });
  host.innerHTML = html;
}

function recByFile(file){
  const e = allAudioEntries().filter(x => x.rec.file === file)[0];
  return e ? e.rec : null;
}

async function rowAction(file){
  const rec = recByFile(file);
  if(!rec) return;
  const id = 'dlrow-' + file.replace(/[^a-z0-9]/gi, '');
  const btn = document.querySelector('#' + id + ' .dl-act');
  if(!btn || btn.dataset.busy) return;

  if(await audioCached(rec)){
    await removeAudio(rec);
    refreshDownloads();
    audioDockState();
    return;
  }
  btn.dataset.busy = '1';
  btn.textContent = 'Starting…';
  try{
    await downloadAudio(rec, (got, tot) => {
      btn.textContent = tot ? Math.min(100, Math.round(got * 100 / tot)) + '%' : fmtMB(got);
    });
    btn.dataset.busy = '';
    refreshDownloads();
    audioDockState();
  }catch(err){
    btn.dataset.busy = '';
    btn.textContent = 'Failed — retry';
  }
}

async function removeAllAudio(){
  if(!confirm('Remove every downloaded recitation from this device?')) return;
  for(const e of allAudioEntries()) await removeAudio(e.rec);
  refreshDownloads();
  audioDockState();
}

