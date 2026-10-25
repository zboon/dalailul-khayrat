/* ── storage ─────────────────────────────────────────────────────────── */

async function audioCached(rec){
  try{
    const c = await caches.open(AUDIO_CACHE);
    const r = await c.match(audioUrl(rec));
    return r ? r : null;
  }catch(e){ return null; }
}

async function audioCachedSize(rec){
  const r = await audioCached(rec);
  if(!r) return 0;
  try{ return (await r.clone().blob()).size; }catch(e){ return 0; }
}

/* Streamed so the bar moves against real bytes rather than a spinner. Note
   content-length is the ENCODED length; on a plain response it matches the
   decoded stream, but the total is treated as a hint and the bar is clamped,
   because a server that compresses would otherwise push it past 100%. */
async function downloadAudio(rec, onProgress){
  const url = audioUrl(rec);
  const resp = await fetch(url);
  if(!resp.ok) throw new Error('HTTP ' + resp.status);
  const total = Number(resp.headers.get('content-length')) || 0;
  if(!resp.body){                      /* no streaming: fall back to one gulp */
    const blob = await resp.blob();
    const c = await caches.open(AUDIO_CACHE);
    await c.put(url, new Response(blob, { headers:{ 'Content-Type':'video/mp4' } }));
    if(onProgress) onProgress(blob.size, blob.size);
    return blob.size;
  }
  const reader = resp.body.getReader();
  const chunks = []; let got = 0;
  for(;;){
    const { done, value } = await reader.read();
    if(done) break;
    chunks.push(value); got += value.length;
    if(onProgress) onProgress(got, total);
  }
  const blob = new Blob(chunks, { type:'video/mp4' });
  const c = await caches.open(AUDIO_CACHE);
  await c.put(url, new Response(blob, { headers:{ 'Content-Type':'video/mp4' } }));
  return blob.size;
}

async function removeAudio(rec){
  try{
    const c = await caches.open(AUDIO_CACHE);
    await c.delete(audioUrl(rec));
  }catch(e){}
}

