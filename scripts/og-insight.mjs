// Link preview images (1200x630) for insight pages, the same layout on every Kadoa dataset site: the site's bar, the
// insight's headline, one key line, then either up to eight labelled bars or two to four big figures, and the source.
// Shared by the dataset sites like the kit; keep the copies identical. A page with its own hand-made image (congress
// committee trades) simply points og:image elsewhere.
//
// Use as a module, renderOgImages(site, images), or from the command line with a JSON file of the same shape:
//   bun scripts/og-insight.mjs og-specs.json
// site:   { name, url, icon?, colour? }            url without https, e.g. "kadoa.com/energy-prices"
// image:  { out, title, key?, rows?, figures?, source }
//   rows:    [{ label, value, text, colour?, strong? }]  value sets the bar length, text is printed beside it
//   figures: [{ value, label, colour? }]                 value is printed as is, e.g. "17.8¢"
//   key:     one line under the title; may hold <b style="color:..."> for a colour key, nothing else
// Rendering uses the installed Google Chrome (CHROME_PATH overrides), so nothing is downloaded.
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';

const CHROME = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const esc = (s) => String(s ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
// The key may colour words, so it keeps <b> tags with a style and escapes everything else.
const keyHtml = (s) => esc(s).replace(/&lt;b(?: style=&quot;color:\s*(#[0-9a-fA-F]{3,8});?&quot;)?&gt;/g, (_, c) => (c ? `<b style="color:${c}">` : '<b>')).replaceAll('&lt;/b&gt;', '</b>');

function rowsHtml(rows) {
  // Fewer rows get taller rows and thicker bars, so a short list fills the space as a long one does.
  const shown = rows.slice(0, 8), max = Math.max(...shown.map((r) => r.value), 0) || 1;
  const h = Math.min(66, Math.floor(340 / shown.length)), bar = Math.round(h * 0.58), font = h >= 56 ? 25 : 21;
  return `<div class="rows" style="--h:${h}px;--bar:${bar}px;--font:${font}px">${shown.map((r) => `<div class="row"><span class="n${r.strong ? ' s' : ''}">${esc(r.label)}</span><span class="t"><i style="width:${(Math.max(r.value, 0) / max) * 100}%;background:${esc(r.colour ?? '#1d70b8')}"></i><em${r.strong ? ' class="s"' : ''}>${esc(r.text)}</em></span></div>`).join('')}</div>`;
}
function figuresHtml(figures) {
  return `<div class="figs">${figures.slice(0, 4).map((f) => `<div class="fig"><b${f.colour ? ` style="color:${esc(f.colour)}"` : ''}>${esc(f.value)}</b><span>${esc(f.label)}</span></div>`).join('')}</div>`;
}

export function ogHtml(site, img) {
  // Long headlines step down a size so they stay within two lines.
  const size = img.title.length > 80 ? 34 : img.title.length > 60 ? 38 : 42;
  return `<!doctype html><html><head><meta charset="utf-8"><style>
body{margin:0;width:1200px;height:630px;font-family:Arial,Helvetica,sans-serif;color:#0b0c0c;background:#fff;display:flex;flex-direction:column;overflow:hidden}
.bar{background:${esc(site.colour ?? '#1d70b8')};color:#fff;padding:18px 48px;font-size:26px;font-weight:700;display:flex;justify-content:space-between;align-items:center}.bar span{font-weight:400;font-size:21px}
h1{font-size:${size}px;line-height:1.12;margin:28px 48px 10px}
.key{margin:0 48px 18px;font-size:20px;color:#505a5f}
.body{flex:1;margin:0 48px 16px;min-height:0;display:flex;flex-direction:column;justify-content:center}
.row{display:flex;align-items:center;height:var(--h)}.n{width:280px;font-size:var(--font);text-align:right;padding-right:16px;color:#505a5f;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.s{font-weight:700;color:#0b0c0c}.t{flex:1;display:flex;align-items:center;padding-right:120px}.t i{display:block;height:var(--bar);min-width:2px}
.t em{font-style:normal;font-size:var(--font);margin-left:10px;white-space:nowrap}
.figs{display:flex;gap:28px}.fig{flex:1;background:#f3f2f1;padding:36px 32px}.fig b{display:block;font-size:84px;line-height:1.05;letter-spacing:-1px}.fig span{display:block;margin-top:12px;font-size:26px;color:#505a5f}
.foot{padding:0 48px 20px;font-size:17px;color:#505a5f}
</style></head><body>
<div class="bar">${esc(site.icon ? `${site.icon} ${site.name}` : site.name)}<span>${esc(site.url)}</span></div>
<h1>${esc(img.title)}</h1>
${img.key ? `<div class="key">${keyHtml(img.key)}</div>` : ''}
<div class="body">${img.rows?.length ? rowsHtml(img.rows) : img.figures?.length ? figuresHtml(img.figures) : ''}</div>
<div class="foot">Source: ${esc(img.source)}. Built by Kadoa.</div></body></html>`;
}

export function renderOgImages(site, images) {
  if (!existsSync(CHROME)) throw new Error(`Chrome not found at ${CHROME}; set CHROME_PATH to render link previews`);
  const dir = mkdtempSync(join(tmpdir(), 'og-insight-'));
  try {
    for (const img of images) {
      const out = resolve(img.out);
      mkdirSync(dirname(out), { recursive: true });
      const page = join(dir, 'og.html');
      writeFileSync(page, ogHtml(site, img));
      const run = spawnSync(CHROME, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--window-size=1200,630', '--force-device-scale-factor=1', '--virtual-time-budget=3000', `--screenshot=${out}`, `file://${page}`], { stdio: 'pipe' });
      if (run.status !== 0 || !existsSync(out)) throw new Error(`Chrome could not render ${img.out}: ${run.stderr?.toString().slice(0, 300)}`);
      console.log(`Wrote ${img.out}`);
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

if (import.meta.main ?? process.argv[1] === new URL(import.meta.url).pathname) {
  const file = process.argv[2];
  if (!file) throw new Error('Usage: og-insight.mjs <specs.json>');
  const { site, images } = JSON.parse(readFileSync(file, 'utf8'));
  renderOgImages(site, images);
}
