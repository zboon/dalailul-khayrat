#!/usr/bin/env node
/* build.js — stitches src/ into the two files GitHub Pages serves.
 *
 *   node build.js            write index.html and sw.js
 *   node build.js --check    exit 1 if the committed index.html / sw.js are not
 *                            exactly what src/ builds (run before every commit)
 *
 * The app is still ONE self-contained page — offline-first, nothing to fetch —
 * so this only changes how it is *edited*: css/, js/ and fonts/ under src/ are
 * read in filename order (directories recursed) and inlined into
 * src/index.template.html. {{version}} comes from src/version.txt and
 * {{inline:path}} is replaced by the base64 of that file. Never edit the
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

function build(root) {
  const S = path.join(root, 'src');
  const version = fs.readFileSync(path.join(S, 'version.txt'), 'utf8').trim();
  const fill = t => t
    .replace(/\{\{inline:([^}]+)\}\}/g, (_, f) => fs.readFileSync(path.join(S, f)).toString('base64'))
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
