#!/usr/bin/env node
/* build.js — stitches src/ into the two files GitHub Pages serves.
 *
 *   node build.js            write index.html and sw.js
 *   node build.js --check    exit 1 if the committed index.html / sw.js are not
 *                            exactly what src/ builds (run before every commit)
 *
 * The app is still ONE self-contained page — offline-first, nothing to fetch —
 * so this only changes how it is *edited*: src/css and src/js are read in
 * filename order (directories recursed) and inlined into src/index.template.html.
 * The texts live in content/<section>/*.json (order in each index.json) and are
 * pulled in by {{content:section}}; {{version}} comes from src/version.txt and
 * {{inline:fonts/x}} is the base64 of that file, relative to the repo root. Never edit the
 * generated index.html or sw.js by hand: the next build overwrites them.
 */
const fs = require('fs');
const path = require('path');

function walk(dir) {
  return fs.readdirSync(dir).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0)).map(n => {
    const p = path.join(dir, n);
    return fs.statSync(p).isDirectory() ? walk(p) : fs.readFileSync(p, 'utf8');
  }).join('');
}

/* content/<section>/index.json lists the piece files in reading order. {{content:x}}
   becomes the JSON array of those pieces; {{content-map:x}} merges them into one object
   (the Mughlay alternates). Every .json in the folder must be listed, and vice versa. */
function content(root, section, map) {
  const D = path.join(root, 'content', section);
  const order = JSON.parse(fs.readFileSync(path.join(D, 'index.json'), 'utf8'));
  const on = fs.readdirSync(D).filter(f => f.endsWith('.json') && f !== 'index.json').map(f => f.slice(0, -5)).sort();
  if (JSON.stringify(on) !== JSON.stringify(order.slice().sort()) || new Set(order).size !== order.length)
    throw new Error('content/' + section + ': index.json and the files in the folder disagree');
  const items = order.map(n => JSON.parse(fs.readFileSync(path.join(D, n + '.json'), 'utf8')));
  return JSON.stringify(map ? Object.assign({}, ...items) : items);
}

function build(root) {
  const S = path.join(root, 'src');
  const version = fs.readFileSync(path.join(S, 'version.txt'), 'utf8').trim();
  const fill = t => t
    .replace(/\{\{content(-map)?:([^}]+)\}\}/g, (_, m, sec) => content(root, sec, !!m))
    .replace(/\{\{inline:([^}]+)\}\}/g, (_, f) => fs.readFileSync(path.join(root, f)).toString('base64'))
    .replace(/\{\{version\}\}/g, () => version);
  const css = walk(path.join(S, 'css'));
  const js = walk(path.join(S, 'js'));
  const html = fill(fs.readFileSync(path.join(S, 'index.template.html'), 'utf8')
    .replace('{{css}}', () => css).replace('{{js}}', () => js));
  const sw = fill(fs.readFileSync(path.join(S, 'sw.template.js'), 'utf8'));
  return { 'index.html': html, 'sw.js': sw };
}

module.exports = { build };

if (require.main === module) {
  const root = __dirname;
  const out = build(root);
  if (process.argv.includes('--check')) {
    const bad = Object.keys(out).filter(f => !fs.existsSync(path.join(root, f)) || fs.readFileSync(path.join(root, f), 'utf8') !== out[f]);
    if (bad.length) { console.error('out of date — run node build.js:', bad.join(', ')); process.exit(1); }
    console.log('up to date');
  } else {
    Object.keys(out).forEach(f => fs.writeFileSync(path.join(root, f), out[f]));
    console.log('built', Object.keys(out).map(f => f + ' ' + out[f].length).join(', '));
  }
}
