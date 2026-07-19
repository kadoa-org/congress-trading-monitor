/**
 * Build-time prerender for SEO.
 *
 * The app is a client-rendered SPA, so without this every route serves the
 * identical homepage HTML and deep pages (filers, tickers) are invisible to
 * search engines. This script runs after `vite build` and writes a static
 * `dist/<route>/index.html` per route with:
 *   - unique <title>, meta description, canonical, og/twitter tags
 *   - JSON-LD (Person for filers, Dataset for the site)
 *   - a crawler-visible content block inside #root (replaced on hydration)
 * plus dist/sitemap.xml and dist/robots.txt.
 *
 * No browser involved: routes are enumerated from public/data/*.json, so the
 * whole pass is string templating and runs in seconds. Vercel serves the
 * static file (filesystem pass precedes the SPA rewrite).
 *
 * Usage: node scripts/prerender.mjs   (wired into `npm run build`)
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIST = path.join(ROOT, "dist", "congress"); // vite outDir (site lives under /congress/)
const DATA = path.join(ROOT, "public", "data");
const PREFIX = "/congress"; // public path prefix behind the www.kadoa.com reverse proxy
const BASE = `https://www.kadoa.com${PREFIX}`;

const esc = (s) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

// BreadcrumbList JSON-LD from [label, absoluteUrl] pairs. Must mirror the
// visible breadcrumb trail (Overview › Filers/Tickers › Name) exactly.
const crumbLd = (crumbs) => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: crumbs.map(([name, item], i) => ({ "@type": "ListItem", position: i + 1, name, item })),
});

const fmtUsd = (n) => {
  if (!n) return null;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  return `$${Math.round(n / 1e3)}K`;
};

function loadJson(name) {
  return JSON.parse(fs.readFileSync(path.join(DATA, name), "utf8"));
}

const fmtDate = (iso) =>
  iso
    ? new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        timeZone: "UTC",
      })
    : "";

// Human company name for a ticker, derived from the asset names on its
// trades. Asset names vary per filing ("Space Exploration Technologies
// Corp. - Class A Common Stock", "SpaceX"), so: strip the share-class
// suffix after " - ", then take the most frequent cleaned form. People
// search "who traded SpaceX", not "who traded SPCX" — the company name in
// the title/body is what makes these pages matchable.
function companyName(trades, ticker) {
  const counts = new Map();
  for (const t of trades) {
    const name = String(t.asset_name ?? "")
      .split(" - ")[0]
      .replace(/\s+(common|ordinary|class [a-c])\s+(stock|shares)$/i, "")
      .trim();
    if (!name || name.toUpperCase() === ticker) continue;
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  let best = null;
  for (const [name, n] of counts) {
    if (!best || n > best.n || (n === best.n && name.length < best.name.length)) best = { name, n };
  }
  return best?.name ?? null;
}

// Per-ticker route with the "who traded X?" answer in static HTML. The
// aggregate row (tickers.json) only has counts; the names live in the
// per-ticker detail file, and a page can't rank for "who traded SPCX"
// unless the crawler-visible HTML actually names the filers.
function tickerRoute(t) {
  const detailPath = path.join(DATA, "ticker", `${t.ticker}.json`);
  const trades = fs.existsSync(detailPath) ? (JSON.parse(fs.readFileSync(detailPath, "utf8")).trades ?? []) : [];
  const company = companyName(trades, t.ticker);
  const label = company ? `${t.ticker} (${company})` : t.ticker;

  // Distinct filers, most recent trade first (trades arrive date-desc).
  const filerOrder = [];
  const filerById = new Map();
  for (const tr of trades) {
    let f = filerById.get(tr.filer_id);
    if (!f) {
      f = { id: tr.filer_id, name: tr.filer_name ?? tr.filer_id, count: 0, latest: tr.transaction_date };
      filerById.set(tr.filer_id, f);
      filerOrder.push(f);
    }
    f.count++;
  }

  const namePreview = filerOrder.slice(0, 3).map((f) => f.name);
  const moreCount = filerOrder.length - namePreview.length;
  const who =
    namePreview.length > 0
      ? `${namePreview.join(", ")}${moreCount > 0 ? ` and ${moreCount} more` : ""}`
      : `${t.filer_count} members of Congress and executive officials`;
  const latest = trades[0];

  const whoList = filerOrder
    .map(
      (f) =>
        `<li><a href="${PREFIX}/filer/${esc(f.id)}">${esc(f.name)}</a> — ${f.count} trade${f.count === 1 ? "" : "s"}, last on ${esc(fmtDate(f.latest))}</li>`,
    )
    .join("");

  const MAX_ROWS = 100;
  const rows = trades
    .slice(0, MAX_ROWS)
    .map(
      (tr) =>
        `<tr><td><a href="${PREFIX}/filer/${esc(tr.filer_id)}">${esc(tr.filer_name ?? tr.filer_id)}</a></td><td>${esc(fmtDate(tr.transaction_date))}</td><td>${esc(tr.transaction_type ?? "")}</td><td>${esc(tr.amount_range_label ?? "")}</td></tr>`,
    )
    .join("");
  const tableNote =
    trades.length > MAX_ROWS ? `<p>Showing the ${MAX_ROWS} most recent of ${trades.length} trades.</p>` : "";

  return {
    path: `/ticker/${t.ticker}`,
    title: `Who Traded ${t.ticker}? ${company ? `${company} ` : ""}Congress Stock Trades | Congress Trading Monitor`,
    description: `Who traded ${label}? ${who} disclosed ${t.trade_count} trade${t.trade_count === 1 ? "" : "s"} under the STOCK Act: ${t.purchases} buys, ${t.sales} sells${t.est_volume ? `, ~${fmtUsd(t.est_volume)} est. volume` : ""}.`,
    h1: `${label}: Congressional Trading Activity`,
    lastmod: latest?.filing_date ?? latest?.transaction_date ?? null,
    body: [
      `<h2>Who traded ${esc(t.ticker)}?</h2>`,
      `<p>${esc(label)} appears in ${t.trade_count} STOCK Act disclosures from ${t.filer_count} filer${t.filer_count === 1 ? "" : "s"} (${t.purchases} purchases, ${t.sales} sales)${latest ? `, most recently ${esc(latest.filer_name ?? "")} on ${esc(fmtDate(latest.transaction_date))}` : ""}.</p>`,
      whoList ? `<ul>${whoList}</ul>` : "",
      rows
        ? `<h2>Disclosed trades</h2><table><thead><tr><th>Filer</th><th>Trade date</th><th>Type</th><th>Amount</th></tr></thead><tbody>${rows}</tbody></table>${tableNote}`
        : "",
    ].join(""),
    crumbs: [
      ["Overview", `${BASE}/`],
      ["Tickers", `${BASE}/tickers`],
      [t.ticker, `${BASE}/ticker/${t.ticker}`],
    ],
  };
}

// ── route definitions ────────────────────────────────────────────────────────

function buildRoutes() {
  const filers = loadJson("filers.json");
  const tickers = loadJson("tickers.json");
  const routes = [];

  routes.push(
    {
      path: "/filers",
      title: "All Filers - Congress & Executive Branch Stock Trades | Congress Trading Monitor",
      description: `Stock-trade disclosures for ${filers.length} filers: U.S. House, Senate, and executive branch officials. Ranked by trades, volume, and returns vs SPY.`,
      h1: "All Filers: Congress & Executive Branch Stock Trades",
      // Crawler-visible link to EVERY filer page (ranked by trade count) so no
      // filer page is orphaned (sitemap-only). ~437 links keeps the page sane.
      body: `<p>Stock-trade disclosures from ${filers.length} U.S. House, Senate, and executive branch filers under the STOCK Act. Ranked below by number of disclosed trades.</p><ul>${[
        ...filers,
      ]
        .sort((a, b) => (b.trade_count ?? 0) - (a.trade_count ?? 0))
        .map(
          (f) =>
            `<li><a href="${PREFIX}/filer/${esc(f.id)}">${esc(f.full_name)}</a> — ${f.trade_count} trade${f.trade_count === 1 ? "" : "s"}</li>`,
        )
        .join("")}</ul>`,
    },
    {
      path: "/tickers",
      title: "Most-Traded Stocks by Congress | Congress Trading Monitor",
      description: `Which stocks Congress trades most: per-ticker trade counts, buy/sell mix, and estimated volume across ${tickers.length} tickers.`,
      h1: "Most-Traded Stocks by Congress",
      // Crawler-visible link to EVERY ticker page (ranked by volume, so it still
      // reads "most-traded" first) — the long tail was orphaned (sitemap-only).
      body: `<ul>${[...tickers]
        .sort((a, b) => (b.est_volume ?? 0) - (a.est_volume ?? 0))
        .map(
          (t) => `<li><a href="${PREFIX}/ticker/${esc(t.ticker)}">${esc(t.ticker)}</a> — ${t.trade_count} trades</li>`,
        )
        .join("")}</ul>`,
    },
    {
      path: "/trades",
      title: "Latest Congressional Stock Trades - Updated Daily | Congress Trading Monitor",
      description:
        "Every disclosed trade as it's filed: filer, ticker, amount, dates, filing lag, and performance vs SPY. Searchable and filterable.",
      h1: "Latest Congressional Stock Trades",
      body: `<p>Every stock trade disclosed by U.S. Congress and the executive branch under the STOCK Act, as it's filed: filer, ticker, amount, transaction and filing dates, filing lag, and performance vs SPY. Browse the full list of <a href="${PREFIX}/tickers">most-traded stocks</a> or <a href="${PREFIX}/filers">all filers</a>.</p>`,
    },
    {
      path: "/about",
      title: "About the Data - STOCK Act Disclosures Explained | Congress Trading Monitor",
      description:
        "How the STOCK Act works, the 45-day disclosure deadline, OGE 278-T executive filings, and where this open dataset comes from.",
    },
  );

  for (const f of filers) {
    const role =
      f.branch === "executive"
        ? `${f.level ?? ""} ${f.agency ?? ""}`.trim() || "executive branch official"
        : `${f.chamber === "senate" ? "U.S. Senator" : "U.S. Representative"}${f.party ? ` (${f.party}${f.state ? `-${f.state}` : ""})` : ""}`;
    const vol = fmtUsd(f.est_volume);
    routes.push({
      path: `/filer/${f.id}`,
      title: `${f.full_name} Stock Trades - ${f.trade_count} Disclosed Trades | Congress Trading Monitor`,
      description: `All ${f.trade_count} stock trades disclosed by ${f.full_name}, ${role}: ${f.purchases} buys, ${f.sales} sells${vol ? `, ~${vol} est. volume` : ""}. Source filings linked.`,
      h1: `${f.full_name} Stock Trades`,
      body: `<p>${esc(f.full_name)}, ${esc(role)}, has disclosed ${f.trade_count} stock trades under the STOCK Act: ${f.purchases} purchases and ${f.sales} sales${vol ? ` with an estimated volume of ${vol}` : ""}.</p>`,
      jsonLd: {
        "@context": "https://schema.org",
        "@type": "ProfilePage",
        mainEntity: { "@type": "Person", name: f.full_name, jobTitle: role },
        url: `${BASE}/filer/${f.id}`,
      },
      crumbs: [
        ["Overview", `${BASE}/`],
        ["Filers", `${BASE}/filers`],
        [f.full_name, `${BASE}/filer/${f.id}`],
      ],
    });
  }

  for (const t of tickers) {
    routes.push(tickerRoute(t));
  }

  return routes;
}

// ── templating ───────────────────────────────────────────────────────────────

function renderRoute(template, route) {
  const url = `${BASE}${route.path}`;
  // Use function replacements throughout: values like "$210.4M" contain `$` +
  // digits, which String.replace reads as capture-group refs ($1/$2) in a
  // replacement STRING — corrupting output (a stray `</div>` closed #root and
  // spilled crawler content below the footer). A function return is emitted
  // literally, so `$` is never special.
  let html = template
    .replace(/<title>[^<]*<\/title>/, () => `<title>${esc(route.title)}</title>`)
    .replace(/(<meta\s+name="description"\s+content=")[^"]*(")/s, (_m, a, b) => `${a}${esc(route.description)}${b}`)
    .replace(/(<link rel="canonical" href=")[^"]*(")/, (_m, a, b) => `${a}${url}${b}`)
    .replace(/(<meta property="og:url" content=")[^"]*(")/, (_m, a, b) => `${a}${url}${b}`)
    .replace(/(<meta property="og:title" content=")[^"]*(")/, (_m, a, b) => `${a}${esc(route.title)}${b}`)
    .replace(
      /(<meta\s+property="og:description"\s+content=")[^"]*(")/s,
      (_m, a, b) => `${a}${esc(route.description)}${b}`,
    )
    .replace(/(<meta name="twitter:title" content=")[^"]*(")/, (_m, a, b) => `${a}${esc(route.title)}${b}`)
    .replace(
      /(<meta\s+name="twitter:description"\s+content=")[^"]*(")/s,
      (_m, a, b) => `${a}${esc(route.description)}${b}`,
    );

  const schemas = [route.jsonLd, route.crumbs && crumbLd(route.crumbs)].filter(Boolean);
  if (schemas.length) {
    const tags = schemas.map((s) => `<script type="application/ld+json">${JSON.stringify(s)}</script>`).join("");
    html = html.replace("</head>", `${tags}</head>`);
  }

  // Crawler-visible content; React replaces it on hydration.
  if (route.h1) {
    html = html.replace(
      /(<div id="root">)(<\/div>)/,
      (_m, open, close) =>
        `${open}<main><h1>${esc(route.h1)}</h1>${route.body ?? ""}<p><a href="${PREFIX}/">Congress Trading Monitor home</a></p></main>${close}`,
    );
  }
  return html;
}

// ── main ─────────────────────────────────────────────────────────────────────

const template = fs.readFileSync(path.join(DIST, "index.html"), "utf8");
const routes = buildRoutes();

let written = 0;
for (const r of routes) {
  const dir = path.join(DIST, r.path.slice(1));
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "index.html"), renderRoute(template, r));
  written++;
}

// Homepage: keep its hand-written <head> (title/canonical/OG) but add the
// site-level Dataset + WebSite JSON-LD the template lacks. Not a route object,
// so it stays out of the sitemap loop and the URL count is unchanged.
const stats = loadJson("stats.json");
const homeSchemas = [
  {
    "@context": "https://schema.org",
    "@type": "Dataset",
    name: "U.S. Congress & Executive Branch Stock Trades",
    description: `Every stock trade disclosed by U.S. Congress and the executive branch under the STOCK Act: ${stats.totalTrades} trades from ${stats.totalFilers} filers, updated daily. Free and open source.`,
    url: `${BASE}/`,
    keywords: ["STOCK Act", "congressional stock trades", "insider trading disclosure", "OGE 278-T", "PTR filings"],
    isAccessibleForFree: true,
    license: "https://opensource.org/licenses/MIT",
    creator: { "@type": "Organization", name: "Kadoa", url: "https://www.kadoa.com" },
    temporalCoverage: `${stats.dateRange?.from ?? ""}/${stats.dateRange?.to ?? ""}`,
  },
  { "@context": "https://schema.org", "@type": "WebSite", name: "Congress Trading Monitor", url: `${BASE}/` },
];
const homeHtml = template.replace(
  "</head>",
  `${homeSchemas.map((s) => `<script type="application/ld+json">${JSON.stringify(s)}</script>`).join("")}</head>`,
);
fs.writeFileSync(path.join(DIST, "index.html"), homeHtml);

const today = new Date().toISOString().slice(0, 10);
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
<url><loc>${BASE}</loc><lastmod>${today}</lastmod><changefreq>daily</changefreq><priority>1.0</priority></url>
${routes
  .map(
    (r) =>
      `<url><loc>${BASE}${r.path}</loc><lastmod>${r.lastmod ?? today}</lastmod><changefreq>daily</changefreq><priority>${r.path.split("/").length > 2 ? "0.7" : "0.9"}</priority></url>`,
  )
  .join("\n")}
</urlset>
`;
fs.writeFileSync(path.join(DIST, "sitemap.xml"), sitemap);
fs.writeFileSync(path.join(DIST, "robots.txt"), `User-agent: *\nAllow: /\n\nSitemap: ${BASE}/sitemap.xml\n`);

console.log(`prerendered ${written} routes + sitemap.xml (${routes.length + 1} urls) + robots.txt`);
