// Link preview images (1200x630) for the pages of a Kadoa dataset site, one layout on every site: the headline as
// the largest thing on the card, one line under it, one simple visual, and the site's name with the Kadoa logo at
// the foot. Shared by the dataset sites like the kit; keep the copies identical, with scripts/og-assets beside it.
// A page with its own hand-made image simply points og:image elsewhere.
//
// What the card is built for: most people see it at a third of its size in a feed, so nothing is set below 24px,
// the headline runs to three lines at most and the line under it to two, and the visual carries a handful of marks
// with no axes or gridlines, sized to the room the text leaves.
// Everything that matters stays inside a 64px margin, since some apps crop the edges.
//
// Use as a module, renderOgImages(site, images), or from the command line with a JSON file of the same shape:
//   bun scripts/og-insight.mjs og-specs.json
// site:   { name, url, colour? }                   url without https, e.g. "kadoa.com/energy-prices"
// image:  { out, title, key?, rows? | figures? | lines? }
//   rows:    [{ label, value, text, colour?, strong? }]  up to eight bars; value sets the length, text is printed
//            beside it; a strong row is drawn in the site colour and the rest in grey, so one row is the story
//   figures: [{ value, label, colour? }]                 two to four big numbers, printed as given ("17.8¢")
//   lines:   { series: [{ label, values, text?, colour? }], from?, to? }   one to three lines over the same
//            points, each named at its end with `text` (its latest value); from and to label the ends of the axis
//   key:     one line under the title; may hold <b style="color:..."> for a colour key, nothing else
// `source` on an image is accepted and not drawn: at card size it is too small to read, and the page carries it.
// Rendering uses the installed Google Chrome (CHROME_PATH overrides), so nothing is downloaded.
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const CHROME = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const ASSETS = join(dirname(fileURLToPath(import.meta.url)), 'og-assets');
const b64 = (name) => readFileSync(join(ASSETS, name)).toString('base64');
const W = 1200, H = 630, M = 64;
const INK = '#0b0c0c', MUTED = '#505a5f', GREY = '#c9cfd4', RULE = '#dfe3e6', BRAND = '#1d70b8', ACCENT = '#D55E00';
const esc = (s) => String(s ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
// The key may colour words, so it keeps <b> tags with a style and escapes everything else.
const keyHtml = (s) => esc(s).replace(/&lt;b(?: style=&quot;color:\s*(#[0-9a-fA-F]{3,8});?&quot;)?&gt;/g, (_, c) => (c ? `<b style="color:${c}">` : '<b>')).replaceAll('&lt;/b&gt;', '</b>');

// Up to eight bars in the `room` the headline leaves. Fewer rows get taller rows and larger type, so a short list
// fills the space as a long one does; rows that would not fit at the smallest size (24px type) are left off the end.
function rowsHtml(rows, colour, room) {
  const shown = rows.slice(0, Math.min(8, Math.floor(room / 34))), max = Math.max(...shown.map((r) => r.value), 0) || 1;
  const h = Math.min(64, Math.floor(room / shown.length)), font = h >= 56 ? 30 : h >= 46 ? 27 : 24;
  const anyStrong = shown.some((r) => r.strong);
  return `<div class="rows" style="--h:${h}px;--bar:${Math.round(h * 0.56)}px;--font:${font}px">${shown.map((r) => {
    const fill = r.colour ?? (!anyStrong || r.strong ? colour : GREY);
    return `<div class="row"><span class="n${r.strong ? ' s' : ''}">${esc(r.label)}</span><span class="t"><i style="width:${(Math.max(r.value, 0) / max) * 100}%;background:${esc(fill)}"></i><em${r.strong ? ' class="s"' : ''}>${esc(r.text)}</em></span></div>`;
  }).join('')}</div>`;
}

// Two to four numbers side by side, each under a short rule in its colour. The size steps down with the longest
// number and the count, so "$70-$78" beside two others still fits its column.
function figuresHtml(figures) {
  const shown = figures.slice(0, 4);
  const col = (W - 2 * M - 40 * (shown.length - 1)) / shown.length;
  const longest = Math.max(...shown.map((f) => String(f.value).length));
  const size = Math.max(56, Math.min(112, Math.floor(col / (longest * 0.6))));
  return `<div class="figs">${shown.map((f) => `<div class="fig" style="border-top-color:${esc(f.colour ?? INK)}"><b style="font-size:${size}px${f.colour ? `;color:${esc(f.colour)}` : ''}">${esc(f.value)}</b><span>${esc(f.label)}</span></div>`).join('')}</div>`;
}

// One to three lines over the same points, with no axes: a baseline, each line named at its end, and the first and
// last points labelled under the baseline. The last series listed is drawn on top.
function linesHtml({ series, from, to }, colour, room) {
  const palette = [colour, ACCENT, MUTED];
  const w = W - 2 * M, h = Math.min(270, room), right = 300, top = 16, bottom = from || to ? 44 : 10;
  const all = series.flatMap((s) => s.values).filter((v) => v != null);
  const max = Math.max(...all, 0) || 1, n = Math.max(...series.map((s) => s.values.length));
  const x = (i) => (i / Math.max(1, n - 1)) * (w - right), y = (v) => top + (1 - v / max) * (h - top - bottom);
  // End labels sit at their line's last point, pushed apart when two lines end close together.
  const ends = series.map((s, k) => ({ k, y: y(s.values.at(-1)) })).sort((a, b) => a.y - b.y);
  for (let i = 1; i < ends.length; i++) ends[i].y = Math.max(ends[i].y, ends[i - 1].y + 68);
  const over = Math.max(0, (ends.at(-1)?.y ?? 0) + 34 - (h - bottom));
  for (const e of ends) e.y -= over;
  const svg = series.map((s, k) => {
    const c = s.colour ?? palette[k % palette.length], e = ends.find((q) => q.k === k);
    const d = s.values.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join('');
    return `<path d="${d}" fill="none" stroke="${esc(c)}" stroke-width="6" stroke-linejoin="round" stroke-linecap="round"/>`
      + `<circle cx="${x(s.values.length - 1).toFixed(1)}" cy="${y(s.values.at(-1)).toFixed(1)}" r="9" fill="${esc(c)}"/>`
      + `<text x="${w - right + 22}" y="${e.y.toFixed(1)}" class="lv" fill="${esc(c)}">${esc(s.text ?? '')}</text>`
      + `<text x="${w - right + 22}" y="${(e.y + 30).toFixed(1)}" class="ln">${esc(s.label)}</text>`;
  }).join('');
  const base = h - bottom;
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><line x1="0" x2="${w - right}" y1="${base}" y2="${base}" stroke="${RULE}" stroke-width="2"/>${svg}`
    + (from ? `<text x="0" y="${h - 8}" class="ax">${esc(from)}</text>` : '')
    + (to ? `<text x="${w - right}" y="${h - 8}" class="ax" text-anchor="end">${esc(to)}</text>` : '')
    + '</svg>';
}

export function ogHtml(site, img) {
  const colour = site.colour ?? BRAND;
  // The headline is the largest thing on the card; a longer one steps down so it stays within three lines.
  const size = img.title.length <= 30 ? 76 : img.title.length <= 48 ? 64 : img.title.length <= 76 ? 54 : 46;
  // The room left for the visual: the card less its strip and padding, the headline's lines, the key's and the foot.
  // Line counts are estimated from the text length, at about half an em a character.
  const linesOf = (text, px, most) => Math.min(most, Math.max(1, Math.ceil((String(text).length * px * 0.5) / (W - 2 * M))));
  const keyText = String(img.key ?? '').replace(/<[^>]+>/g, '');
  const room = H - 12 - 52 - 40 - linesOf(img.title, size, 3) * size * 1.08 - (img.key ? 14 + linesOf(keyText, 28, 2) * 35 : 0) - 28 - 56;
  const body = img.lines?.series?.length ? linesHtml(img.lines, colour, room) : img.rows?.length ? rowsHtml(img.rows, colour, room) : img.figures?.length ? figuresHtml(img.figures) : '';
  return `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{font-family:"Atkinson Hyperlegible";font-weight:400;src:url(data:font/woff2;base64,${b64('atkinson-400.woff2')}) format("woff2")}
@font-face{font-family:"Atkinson Hyperlegible";font-weight:700;src:url(data:font/woff2;base64,${b64('atkinson-700.woff2')}) format("woff2")}
*{box-sizing:border-box}
body{margin:0;width:${W}px;height:${H}px;padding:52px ${M}px 40px;font-family:"Atkinson Hyperlegible",Arial,sans-serif;font-feature-settings:"tnum";color:${INK};background:#fff;display:flex;flex-direction:column;overflow:hidden;border-top:12px solid ${esc(colour)}}
h1{font-size:${size}px;line-height:1.08;letter-spacing:-0.5px;margin:0;max-height:${Math.ceil(size * 1.08 * 3)}px;overflow:hidden}
.key{margin:14px 0 0;font-size:28px;line-height:1.25;color:${MUTED};display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden}
.body{flex:1;min-height:0;display:flex;flex-direction:column;justify-content:center;padding:18px 0 10px}
.row{display:flex;align-items:center;height:var(--h)}.n{width:330px;font-size:var(--font);padding-right:20px;color:${MUTED};white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.s{font-weight:700;color:${INK}}.t{flex:1;display:flex;align-items:center;padding-right:190px}.t i{display:block;height:var(--bar);min-width:3px}
.t em{font-style:normal;font-size:var(--font);font-weight:700;margin-left:14px;white-space:nowrap}
.figs{display:flex;gap:40px}.fig{flex:1;min-width:0;border-top:6px solid ${INK};padding-top:18px}.fig b{display:block;line-height:1;letter-spacing:-1.5px;white-space:nowrap}.fig span{display:block;margin-top:14px;font-size:28px;line-height:1.2;color:${MUTED}}
svg{display:block;overflow:visible}svg text{font-family:"Atkinson Hyperlegible",Arial,sans-serif;font-feature-settings:"tnum"}
.lv{font-size:44px;font-weight:700}.ln{font-size:26px;fill:${MUTED}}.ax{font-size:24px;fill:${MUTED}}
.foot{display:flex;justify-content:space-between;align-items:center;border-top:2px solid ${RULE};padding-top:18px;font-size:26px}
.foot b{font-weight:700}.foot span{color:${MUTED}}.foot img{height:34px;display:block}
</style></head><body>
<h1>${esc(img.title)}</h1>
${img.key ? `<div class="key">${keyHtml(img.key)}</div>` : ''}
<div class="body">${body}</div>
<div class="foot"><div><b>${esc(site.name)}</b> <span>· ${esc(site.url)}</span></div><img src="data:image/svg+xml;base64,${b64('kadoa-logo.svg')}" alt=""></div></body></html>`;
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
      const run = spawnSync(CHROME, ['--headless=new', '--disable-gpu', '--hide-scrollbars', `--window-size=${W},${H}`, '--force-device-scale-factor=1', '--virtual-time-budget=3000', `--screenshot=${out}`, `file://${page}`], { stdio: 'pipe' });
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
