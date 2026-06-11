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
const DIST = path.join(ROOT, "dist");
const DATA = path.join(ROOT, "public", "data");
const BASE = "https://congress.kadoa.com";

const esc = (s) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const fmtUsd = (n) => {
  if (!n) return null;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  return `$${Math.round(n / 1e3)}K`;
};

function loadJson(name) {
  return JSON.parse(fs.readFileSync(path.join(DATA, name), "utf8"));
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
    },
    {
      path: "/tickers",
      title: "Most-Traded Stocks by Congress | Congress Trading Monitor",
      description:
        "Which stocks Congress trades most: per-ticker trade counts, buy/sell mix, and estimated volume across 500+ tickers.",
    },
    {
      path: "/trades",
      title: "Latest Congressional Stock Trades - Updated Daily | Congress Trading Monitor",
      description:
        "Every disclosed trade as it's filed: filer, ticker, amount, dates, filing lag, and performance vs SPY. Searchable and filterable.",
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
    });
  }

  for (const t of tickers) {
    routes.push({
      path: `/ticker/${t.ticker}`,
      title: `${t.ticker} - Congress Stock Trades & Disclosures | Congress Trading Monitor`,
      description: `${t.ticker} has been traded ${t.trade_count} times by ${t.filer_count} members of Congress and executive officials: ${t.purchases} buys, ${t.sales} sells${t.est_volume ? `, ~${fmtUsd(t.est_volume)} est. volume` : ""}.`,
      h1: `${t.ticker}: Congressional Trading Activity`,
      body: `<p>${esc(t.ticker)} appears in ${t.trade_count} STOCK Act disclosures from ${t.filer_count} filers (${t.purchases} purchases, ${t.sales} sales).</p>`,
    });
  }

  return routes;
}

// ── templating ───────────────────────────────────────────────────────────────

function renderRoute(template, route) {
  const url = `${BASE}${route.path}`;
  let html = template
    .replace(/<title>[^<]*<\/title>/, `<title>${esc(route.title)}</title>`)
    .replace(/(<meta\s+name="description"\s+content=")[^"]*(")/s, `$1${esc(route.description)}$2`)
    .replace(/(<link rel="canonical" href=")[^"]*(")/, `$1${url}$2`)
    .replace(/(<meta property="og:url" content=")[^"]*(")/, `$1${url}$2`)
    .replace(/(<meta property="og:title" content=")[^"]*(")/, `$1${esc(route.title)}$2`)
    .replace(/(<meta\s+property="og:description"\s+content=")[^"]*(")/s, `$1${esc(route.description)}$2`)
    .replace(/(<meta name="twitter:title" content=")[^"]*(")/, `$1${esc(route.title)}$2`)
    .replace(/(<meta\s+name="twitter:description"\s+content=")[^"]*(")/s, `$1${esc(route.description)}$2`);

  if (route.jsonLd) {
    html = html.replace(
      "</head>",
      `<script type="application/ld+json">${JSON.stringify(route.jsonLd)}</script></head>`,
    );
  }

  // Crawler-visible content; React replaces it on hydration.
  if (route.h1) {
    html = html.replace(
      /(<div id="root">)(<\/div>)/,
      `$1<main><h1>${esc(route.h1)}</h1>${route.body ?? ""}<p><a href="/">Congress Trading Monitor home</a></p></main>$2`,
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

const today = new Date().toISOString().slice(0, 10);
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
<url><loc>${BASE}/</loc><lastmod>${today}</lastmod><changefreq>daily</changefreq><priority>1.0</priority></url>
${routes
  .map(
    (r) =>
      `<url><loc>${BASE}${r.path}</loc><lastmod>${today}</lastmod><changefreq>daily</changefreq><priority>${r.path.split("/").length > 2 ? "0.7" : "0.9"}</priority></url>`,
  )
  .join("\n")}
</urlset>
`;
fs.writeFileSync(path.join(DIST, "sitemap.xml"), sitemap);
fs.writeFileSync(path.join(DIST, "robots.txt"), `User-agent: *\nAllow: /\n\nSitemap: ${BASE}/sitemap.xml\n`);

console.log(`prerendered ${written} routes + sitemap.xml (${routes.length + 1} urls) + robots.txt`);
