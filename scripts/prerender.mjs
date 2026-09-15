// Render the actual React pages and their initial data, plus route metadata and sitemap.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

import { companyName } from "./companyName.mjs";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIST = path.join(ROOT, "dist", "congress"); // vite outDir (site lives under /congress/)
const DATA = path.join(ROOT, "public", "data");
const PREFIX = "/congress"; // public path prefix behind the www.kadoa.com reverse proxy
const BASE = `https://www.kadoa.com${PREFIX}`;
const YEAR = new Date().getUTCFullYear(); // recency stamp for titles (searchers append the year)

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

// Per-ticker route with the "who traded X?" answer in static HTML. The
// aggregate row (tickers.json) only has counts; the names live in the
// per-ticker detail file, and a page can't rank for "who traded SPCX"
// unless the crawler-visible HTML actually names the filers.
function tickerRoute(t) {
  const detailPath = path.join(DATA, "ticker", `${encodeURIComponent(t.ticker)}.json`);
  const trades = JSON.parse(fs.readFileSync(detailPath, "utf8")).trades;
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

  return {
    path: `/ticker/${t.ticker}`,
    title: `${t.ticker} Congress Stock Trades ${YEAR}${company ? ` — ${company}` : ""} | Congress Trading Monitor`,
    description: `Who traded ${label}? ${who} disclosed ${t.trade_count} trade${t.trade_count === 1 ? "" : "s"} under the STOCK Act: ${t.purchases} buys, ${t.sales} sells${t.est_volume ? `, ~${fmtUsd(t.est_volume)} est. volume` : ""}.`,
    lastmod: latest?.filing_date ?? latest?.transaction_date ?? null,
    crumbs: [
      ["Overview", BASE],
      ["Tickers", `${BASE}/tickers`],
      [t.ticker, `${BASE}/ticker/${t.ticker}`],
    ],
  };
}

// ── route definitions ────────────────────────────────────────────────────────

function buildRoutes() {
  const filers = loadJson("filers.json");
  const tickers = loadJson("tickers.json");
  // Per-filer performance (avg excess return vs S&P 500). Only filers with
  // enough priced buys are scored, so this is a partial map keyed by id.
  const returnsById = new Map(loadJson("returns.json").map((r) => [r.id, r]));
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
      description: `Which stocks Congress trades most: per-ticker trade counts, buy/sell mix, and estimated volume across ${tickers.length} tickers.`,
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
    // Prefer the feed's ready-made office label ("President", "U.S.
    // Representative · CA-12") — it reads better than a reconstructed one and
    // surfaces the executive-branch roles competitors (Congress-only) miss.
    const role =
      f.office ||
      (f.branch === "executive"
        ? `${f.level ?? ""} ${f.agency ?? ""}`.trim() || "executive branch official"
        : `${f.chamber === "senate" ? "U.S. Senator" : "U.S. Representative"}${f.party ? ` (${f.party}${f.state ? `-${f.state}` : ""})` : ""}`);
    const vol = fmtUsd(f.est_volume);
    // Return vs S&P 500 (avg excess return per scored buy) is the metric this
    // niche's incumbents lead their snippets with, and the one searchers ask
    // for ("returns by year", "gains"). Only scored filers have it.
    const r = returnsById.get(f.id);
    const excess = r && Number.isFinite(r.avg_excess) ? Math.round(r.avg_excess) : null;
    const retLabel = excess != null ? `${excess >= 0 ? "+" : "−"}${Math.abs(excess)}% avg return vs S&P 500` : null;
    const late = f.late_filings ? `, ${f.late_filings} transaction rows flagged over 45 days` : "";
    routes.push({
      path: `/filer/${f.id}`,
      // Year for recency; lead with the return when the filer is a positive
      // standout (the strongest CTR hook), else the trade count.
      title:
        excess != null && excess > 0
          ? `${f.full_name} Stock Trades ${YEAR} — ${retLabel} | Congress Trading Monitor`
          : `${f.full_name} Stock Trades ${YEAR} — ${f.trade_count} Disclosed Trades | Congress Trading Monitor`,
      description: `${f.full_name}, ${role}: ${f.trade_count} stock trades disclosed under the STOCK Act${vol ? `, ~${vol} est. volume` : ""}${retLabel ? `, ${retLabel}` : ""}. ${f.purchases} buys, ${f.sales} sells${late}. Updated ${YEAR}, source filings linked.`,

      jsonLd: {
        "@context": "https://schema.org",
        "@type": "ProfilePage",
        mainEntity: { "@type": "Person", name: f.full_name, jobTitle: role },
        url: `${BASE}/filer/${f.id}`,
      },
      crumbs: [
        ["Overview", BASE],
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

  return html;
}

function injectPage(html, initialPage, renderPage) {
  const payload = JSON.stringify(initialPage).replace(/</g, "\\u003c");
  return html.replace('<div id="root"></div>', () => `<div id="root">${renderPage(initialPage)}</div><script id="page-data" type="application/json">${payload}</script>`);
}

async function buildRenderer() {
  const server = await createServer({
    configFile: false,
    base: "/congress/",
    esbuild: { jsx: "automatic" },
    root: ROOT,
    server: { middlewareMode: true, hmr: false },
    appType: "custom",
    logLevel: "error",
    optimizeDeps: { noDiscovery: true },
  });
  try {
    const mod = await server.ssrLoadModule("/src/renderPage.jsx");
    return { renderPage: mod.renderPage };
  } finally {
    await server.close();
  }
}

// ── main ─────────────────────────────────────────────────────────────────────

const template = fs.readFileSync(path.join(DIST, "index.html"), "utf8");
const { renderPage } = await buildRenderer();
const asOf = Date.now();
function routeDatasets(name) {
  const names = { overview: ["stats", "filers", "tickers", "trades", "returns", "prices"], filers: ["stats", "filers", "returns"], tickers: ["stats", "tickers", "prices"], trades: ["stats", "trades", "filers"], about: ["stats"] }[name];
  return Object.fromEntries(names.map((name) => [name, loadJson(`${name}.json`)]));
}
const filersById = new Map(loadJson("filers.json").map((f) => [f.id, f]));
const routes = buildRoutes();

let written = 0;
for (const r of routes) {
  const dir = path.join(DIST, r.path.slice(1));
  fs.mkdirSync(dir, { recursive: true });
  let html = renderRoute(template, r);
  let initialPage;
  if (r.path.startsWith("/ticker/") || r.path.startsWith("/filer/")) {
    if (r.path.startsWith("/filer/")) {
      const id = r.path.slice("/filer/".length);
      const filerData = loadJson(`filer/${id}.json`);
      initialPage = { route: { name: "filer", id, query: {} }, filerData, filers: [filerData.filer], returns: loadJson("returns.json"), asOf };
    } else {
      const symbol = r.path.slice("/ticker/".length);
      const tickerData = loadJson(`ticker/${encodeURIComponent(symbol)}.json`);
      const filerIds = [...new Set(tickerData.trades.map((t) => t.filer_id))];
      initialPage = { route: { name: "ticker", symbol, query: {} }, tickerData, filers: filerIds.map((id) => filersById.get(id)).filter(Boolean) };
    }
  } else {
    const name = r.path.slice(1);
    initialPage = { route: { name, query: {} }, datasets: routeDatasets(name) };
  }
  html = injectPage(html, { ...initialPage, asOf }, renderPage);
  fs.writeFileSync(path.join(dir, "index.html"), html);
  written++;
}

// Preserve the homepage metadata and add dataset structured data.
const stats = loadJson("stats.json");
const homeSchemas = [
  {
    "@context": "https://schema.org",
    "@type": "Dataset",
    name: "U.S. Congress & Executive Branch Stock Trades",
    description: `Every stock trade disclosed by U.S. Congress and the executive branch under the STOCK Act: ${stats.totalTrades} trades from ${stats.totalFilers} filers, updated daily. Free and open source.`,
    url: BASE,
    keywords: ["STOCK Act", "congressional stock trades", "insider trading disclosure", "OGE 278-T", "PTR filings"],
    isAccessibleForFree: true,
    license: "https://opensource.org/licenses/MIT",
    creator: { "@type": "Organization", name: "Kadoa", url: "https://www.kadoa.com" },
    temporalCoverage: `${stats.dateRange?.from ?? ""}/${stats.dateRange?.to ?? ""}`,
  },
  { "@context": "https://schema.org", "@type": "WebSite", name: "Congress Trading Monitor", url: BASE },
];
const homeHtml = injectPage(template.replace("</head>", `${homeSchemas.map((s) => `<script type="application/ld+json">${JSON.stringify(s)}</script>`).join("")}</head>`), { route: { name: "overview", query: {} }, datasets: routeDatasets("overview"), asOf }, renderPage);
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
