/* ── The bit stream ─────────────────────────────────────────────────────── */
function qrBitStream(bytes, v){
  const bits = [];
  const push = (val, len) => { for(let i=len-1;i>=0;i--) bits.push((val>>i)&1); };
  push(0b0100, 4);                       /* byte mode */
  push(bytes.length, v < 10 ? 8 : 16);   /* character count */
  for(const b of bytes) push(b, 8);
  const cap = qrDataCapacity(v) * 8;
  for(let i=0;i<4 && bits.length<cap;i++) bits.push(0);   /* terminator */
  while(bits.length % 8) bits.push(0);
  const pads = [0xEC, 0x11];
  for(let i=0; bits.length < cap; i++) push(pads[i%2], 8);
  const cw = [];
  for(let i=0;i<bits.length;i+=8){
    let b = 0;
    for(let j=0;j<8;j++) b = (b<<1) | bits[i+j];
    cw.push(b);
  }
  return cw;
}

/* Split into blocks, add error correction, then interleave — the spread that
   lets a torn or shadowed corner lose part of every block rather than all of
   one. */
function qrCodewords(str, v){
  const cw = qrBitStream(qrBytes(str), v);
  const [ecLen, g1, d1, g2, d2] = QR_M[v];
  const blocks = [], ecs = [];
  let at = 0;
  for(let i=0;i<g1;i++){ blocks.push(cw.slice(at, at+d1)); at += d1; }
  for(let i=0;i<g2;i++){ blocks.push(cw.slice(at, at+d2)); at += d2; }
  for(const b of blocks) ecs.push(qrEC(b, ecLen));
  const out = [];
  const maxData = Math.max(d1, d2);
  for(let i=0;i<maxData;i++) for(const b of blocks) if(i < b.length) out.push(b[i]);
  for(let i=0;i<ecLen;i++) for(const e of ecs) out.push(e[i]);
  return out;
}

/* ── The grid ───────────────────────────────────────────────────────────── */
function qrBlank(size){
  const m = [], f = [];
  for(let i=0;i<size;i++){ m.push(new Array(size).fill(0)); f.push(new Array(size).fill(0)); }
  return { m, f };
}

function qrFunctions(m, f, v, size){
  const set = (r,c,val) => { if(r<0||c<0||r>=size||c>=size) return; m[r][c]=val; f[r][c]=1; };
  /* finders + their separators */
  const finder = (R,C) => {
    for(let r=-1;r<=7;r++) for(let c=-1;c<=7;c++){
      const inner = r>=0&&r<=6&&c>=0&&c<=6;
      const on = inner && (r===0||r===6||c===0||c===6||(r>=2&&r<=4&&c>=2&&c<=4));
      set(R+r, C+c, on ? 1 : 0);
    }
  };
  finder(0,0); finder(0,size-7); finder(size-7,0);
  /* timing */
  for(let i=8;i<size-8;i++){ set(6,i,(i%2===0)?1:0); set(i,6,(i%2===0)?1:0); }
  /* alignment, skipping the three finder corners */
  const ap = QR_ALIGN[v];
  for(const r of ap) for(const c of ap){
    if((r<=8&&c<=8)||(r<=8&&c>=size-9)||(r>=size-9&&c<=8)) continue;
    for(let dr=-2;dr<=2;dr++) for(let dc=-2;dc<=2;dc++){
      const on = Math.max(Math.abs(dr),Math.abs(dc)) !== 1;
      set(r+dr, c+dc, on ? 1 : 0);
    }
  }
  /* the always-dark module, and space reserved for format info */
  set(size-8, 8, 1);
  for(let i=0;i<=8;i++){ if(i!==6) set(8,i,0); if(i!==6) set(i,8,0); }
  for(let i=0;i<8;i++){ set(8,size-1-i,0); set(size-1-i,8,0); }
  /* version blocks, v7 and up */
  if(v >= 7){
    const bits = qrVersionBits(v);
    for(let i=0;i<18;i++){
      const b = (bits >> i) & 1;
      set(Math.floor(i/3), size-11+(i%3), b);
      set(size-11+(i%3), Math.floor(i/3), b);
    }
  }
}

function qrVersionBits(v){
  let d = v << 12;
  for(let i=0;i<6;i++) if((d >> (17-i)) & 1) d ^= 0x1F25 << (5-i);
  return (v << 12) | d;
}

function qrFormatBits(mask){
  const data = (0b00 << 3) | mask;          /* 00 = level M */
  let d = data << 10;
  for(let i=0;i<5;i++) if((d >> (14-i)) & 1) d ^= 0x537 << (4-i);
  return ((data << 10) | d) ^ 0x5412;
}

function qrPlaceFormat(m, v, size, mask){
  const bits = qrFormatBits(mask);
  const bit = i => (bits >> i) & 1;
  for(let i=0;i<=5;i++) m[8][i] = bit(i);
  m[8][7] = bit(6); m[8][8] = bit(7); m[7][8] = bit(8);
  for(let i=9;i<15;i++) m[14-i][8] = bit(i);
  for(let i=0;i<8;i++) m[size-1-i][8] = bit(i);
  for(let i=8;i<15;i++) m[8][size-15+i] = bit(i);
  m[size-8][8] = 1;
}

function qrMaskFn(k){
  return [
    (i,j)=>((i+j)%2)===0,
    (i,j)=>(i%2)===0,
    (i,j)=>(j%3)===0,
    (i,j)=>((i+j)%3)===0,
    (i,j)=>((Math.floor(i/2)+Math.floor(j/3))%2)===0,
    (i,j)=>(((i*j)%2)+((i*j)%3))===0,
    (i,j)=>((((i*j)%2)+((i*j)%3))%2)===0,
    (i,j)=>((((i+j)%2)+((i*j)%3))%2)===0
  ][k];
}

/* Walk the data up and down in pairs of columns, right to left, stepping over
   the vertical timing line. */
function qrPlaceData(m, f, size, cw){
  let bit = 0;
  const total = cw.length * 8;
  const next = () => {
    if(bit >= total) return 0;
    const b = (cw[bit >> 3] >> (7 - (bit & 7))) & 1;
    bit++;
    return b;
  };
  let upward = true;
  for(let right=size-1; right>0; right-=2){
    if(right === 6) right = 5;             /* the timing column is not data */
    for(let k=0;k<size;k++){
      const r = upward ? size-1-k : k;
      for(let c of [right, right-1]){
        if(f[r][c]) continue;
        m[r][c] = next();
      }
    }
    upward = !upward;
  }
}

function qrPenalty(m, size){
  let p = 0;
  /* runs of five or more */
  for(let i=0;i<size;i++){
    for(const row of [true,false]){
      let run = 1, prev = row ? m[i][0] : m[0][i];
      for(let j=1;j<size;j++){
        const v = row ? m[i][j] : m[j][i];
        if(v === prev) run++;
        else { if(run >= 5) p += 3 + (run-5); run = 1; prev = v; }
      }
      if(run >= 5) p += 3 + (run-5);
    }
  }
  /* solid two-by-two squares */
  for(let i=0;i<size-1;i++) for(let j=0;j<size-1;j++){
    const v = m[i][j];
    if(v===m[i][j+1] && v===m[i+1][j] && v===m[i+1][j+1]) p += 3;
  }
  /* the finder-lookalike sequence, either way round */
  const A = [1,0,1,1,1,0,1,0,0,0,0], B = [0,0,0,0,1,0,1,1,1,0,1];
  const runs = (get) => {
    for(let i=0;i<size;i++) for(let j=0;j<=size-11;j++){
      let a = true, b = true;
      for(let k=0;k<11;k++){ const v = get(i,j+k); if(v!==A[k]) a=false; if(v!==B[k]) b=false; }
      if(a) p += 40; if(b) p += 40;
    }
  };
  runs((i,j)=>m[i][j]); runs((i,j)=>m[j][i]);
  /* balance of dark to light */
  let dark = 0;
  for(let i=0;i<size;i++) for(let j=0;j<size;j++) dark += m[i][j];
  const pct = dark * 100 / (size*size);
  p += Math.floor(Math.abs(pct - 50) / 5) * 10;
  return p;
}

/* The matrix for a string: smallest version that fits, best of the eight
   masks. Returns { size, m } with m[row][col] as 0 or 1. */
function qrMatrix(str){
  const bytes = qrBytes(str);
  let v = 0;
  for(let i=1;i<=10;i++){
    const head = 4 + (i < 10 ? 8 : 16);
    if(qrDataCapacity(i)*8 >= head + bytes.length*8){ v = i; break; }
  }
  if(!v) return null;                      /* too long — caller falls back */
  const size = 17 + 4*v;
  const cw = qrCodewords(str, v);
  let best = null;
  for(let mask=0; mask<8; mask++){
    const { m, f } = qrBlank(size);
    qrFunctions(m, f, v, size);
    qrPlaceData(m, f, size, cw);
    for(let i=0;i<size;i++) for(let j=0;j<size;j++)
      if(!f[i][j] && qrMaskFn(mask)(i,j)) m[i][j] ^= 1;
    qrPlaceFormat(m, v, size, mask);
    const p = qrPenalty(m, size);
    if(!best || p < best.p) best = { p, m, mask };
  }
  return { size, m: best.m, version: v, mask: best.mask };
}

/* An SVG of the matrix, with the quiet zone the spec requires — without it
   many scanners simply will not see the code. */
function qrSVG(str, px){
  const q = qrMatrix(str);
  if(!q) return '';
  const quiet = 4, dim = q.size + quiet*2;
  let path = '';
  for(let r=0;r<q.size;r++) for(let c=0;c<q.size;c++)
    if(q.m[r][c]) path += 'M' + (c+quiet) + ' ' + (r+quiet) + 'h1v1h-1z';
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + dim + ' ' + dim + '"'
       + ' width="' + (px||220) + '" height="' + (px||220) + '" shape-rendering="crispEdges" role="img" aria-label="Session QR code">'
       + '<rect width="' + dim + '" height="' + dim + '" fill="#FAF5EA"/>'
       + '<path d="' + path + '" fill="#123528"/></svg>';
}

