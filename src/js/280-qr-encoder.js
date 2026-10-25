/* ── QR encoder ───────────────────────────────────────────────────────────
   Byte mode, error-correction level M, versions 1–10 (up to 216 bytes) —
   ample for a session link. Written out in full because the app must work
   with no network at all, so a CDN library is not an option. */

const QR_TOTAL = [0,26,44,70,100,134,172,196,242,292,346];
/* per version: [EC codewords per block, blocks in group 1, data codewords in
   each, blocks in group 2, data codewords in each] — level M only. */
const QR_M = [null,
  [10,1,16,0,0], [16,1,28,0,0], [26,1,44,0,0], [18,2,32,0,0], [24,2,43,0,0],
  [16,4,27,0,0], [18,4,31,0,0], [22,2,38,2,39], [22,3,36,2,37], [26,4,43,1,44]];
const QR_ALIGN = [null,[],[6,18],[6,22],[6,26],[6,30],[6,34],
  [6,22,38],[6,24,42],[6,26,46],[6,28,50]];

/* GF(256) with the QR primitive polynomial 0x11D. */
const GF_EXP = new Uint8Array(512), GF_LOG = new Uint8Array(256);
(function(){
  let x = 1;
  for(let i=0;i<255;i++){
    GF_EXP[i] = x; GF_LOG[x] = i;
    x <<= 1; if(x & 0x100) x ^= 0x11D;
  }
  for(let i=255;i<512;i++) GF_EXP[i] = GF_EXP[i-255];
})();
function gfMul(a,b){ return (a===0||b===0) ? 0 : GF_EXP[GF_LOG[a]+GF_LOG[b]]; }

/* Generator polynomial for n error-correction codewords. */
function qrGenPoly(n){
  let p = [1];
  for(let i=0;i<n;i++){
    const q = new Array(p.length+1).fill(0);
    for(let j=0;j<p.length;j++){
      q[j] ^= gfMul(p[j], 1);
      q[j+1] ^= gfMul(p[j], GF_EXP[i]);
    }
    p = q;
  }
  return p;
}

/* Remainder of the data polynomial divided by the generator. */
function qrEC(data, n){
  const gen = qrGenPoly(n);
  const rem = new Array(data.length + n).fill(0);
  for(let i=0;i<data.length;i++) rem[i] = data[i];
  for(let i=0;i<data.length;i++){
    const c = rem[i];
    if(!c) continue;
    for(let j=0;j<gen.length;j++) rem[i+j] ^= gfMul(gen[j], c);
  }
  return rem.slice(data.length);
}

function qrBytes(str){
  const out = [];
  for(let i=0;i<str.length;i++){
    let c = str.codePointAt(i);
    if(c > 0xFFFF) i++;
    if(c < 0x80) out.push(c);
    else if(c < 0x800){ out.push(0xC0|(c>>6), 0x80|(c&63)); }
    else if(c < 0x10000){ out.push(0xE0|(c>>12), 0x80|((c>>6)&63), 0x80|(c&63)); }
    else { out.push(0xF0|(c>>18), 0x80|((c>>12)&63), 0x80|((c>>6)&63), 0x80|(c&63)); }
  }
  return out;
}

function qrDataCapacity(v){
  const s = QR_M[v];
  return s[1]*s[2] + s[3]*s[4];
}

