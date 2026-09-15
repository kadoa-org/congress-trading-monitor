import assert from "node:assert/strict";
import fs from "node:fs";
import { createServer } from "vite";
import { renderToStaticMarkup } from "react-dom/server";
import React from "react";
import { filerEvidence } from "./filerEvidence.mjs";
import { fetchData } from "../src/data.js";

const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: "custom", logLevel: "error" });
try {
  const { renderTickerPage } = await server.ssrLoadModule("/src/renderTickerPage.jsx");
  for (const symbol of ["ETHZ", "KRC", "MSFT"]) {
    const tickerData = JSON.parse(fs.readFileSync(new URL(`../public/data/ticker/${symbol}.json`, import.meta.url), "utf8"));
    const rendered = renderTickerPage({ route: { name: "ticker", symbol, query: {} }, tickerData, filers: [] });
    assert.ok(rendered.includes(`<h1`), `${symbol} has a real heading before JavaScript`);
    assert.ok(rendered.includes(tickerData.trades[0].filer_name), `${symbol} includes disclosure data before JavaScript`);
    assert.ok(rendered.includes("<table"), `${symbol} renders the actual trade table`);
    assert.ok(!rendered.includes("Loading interactive"));
    assert.ok(!rendered.includes("seo-shell"));
    assert.ok(!/="(?:-?Infinity|NaN)"/.test(rendered));
  }
  const { default: TickerSkeleton } = await server.ssrLoadModule("/src/components/TickerSkeleton.jsx");
  const skeleton = renderToStaticMarkup(React.createElement(TickerSkeleton, { symbol: "TEST" }));
  assert.ok(skeleton.includes('role="status"'));
  assert.ok(skeleton.includes('aria-busy="true"'));
  assert.ok(skeleton.includes('aria-hidden="true"'));
  assert.ok(skeleton.includes("Loading trades for TEST"));
  const { Link, RowLink } = await server.ssrLoadModule("/src/ui.jsx");
  const { NavBar, SiteHeader } = await server.ssrLoadModule("/src/kit/index.jsx");
  const links = [{ href: "/filers", label: "Filers" }, { href: "/tickers", label: "Tickers" }, { href: "/trades", label: "Trades" }, { href: "/about", label: "About" }];
  const html = renderToStaticMarkup(React.createElement(NavBar, { items: links, LinkComponent: Link }));
  for (const { href } of links) assert.ok(html.includes(`href="/congress${href}"`), href);
  assert.ok(renderToStaticMarkup(React.createElement(SiteHeader, { brand: "Congress", LinkComponent: Link })).includes('href="/congress/"'));
  assert.ok(renderToStaticMarkup(React.createElement(RowLink, { to: "/filer/example", href: "/wrong" })).includes('href="/congress/filer/example"'));
  assert.ok(renderToStaticMarkup(React.createElement(Link, { to: "//example.com/data" })).includes('href="//example.com/data"'));
  for (const modifier of [{ metaKey: true }, { ctrlKey: true }, { shiftKey: true }, { altKey: true }, { button: 1 }, { defaultPrevented: true }]) {
    const event = { button: 0, preventDefault() { assert.fail("Native navigation must remain available"); }, ...modifier };
    Link({ to: "/filers" }).props.onClick(event);
  }
  for (const props of [{ target: "_blank" }, { download: "trades.csv" }]) {
    Link({ to: "/trades", ...props }).props.onClick({ button: 0, preventDefault() { assert.fail("Native navigation must remain available"); } });
  }
} finally { await server.close(); }

const fixture = [
  { transaction_date: "2026-01-01", filing_date: "2026-02-01", ticker: "OLD", transaction_type: "Sale", amount_range_label: "$1,001 - $15,000", doc_url: "https://example.org/old.pdf" },
  { transaction_date: "2026-03-01", filing_date: "2026-03-10", ticker: "<NEW>", transaction_type: "Purchase", amount_range_label: "$15,001 - $50,000", doc_url: "https://example.org/new.pdf?a=1&b=2" },
];
const evidence = filerEvidence(fixture);
assert.ok(evidence.indexOf("2026-03-01") < evidence.indexOf("2026-01-01"));
assert.ok(evidence.includes("2026-03-10"));
assert.ok(evidence.includes("&lt;NEW&gt;"));
assert.ok(evidence.includes('href="https://example.org/new.pdf?a=1&amp;b=2"'));
assert.ok(evidence.includes("$15,001 - $50,000"));
assert.equal(fixture[0].ticker, "OLD", "Must not reorder the authoritative input");
assert.ok(!filerEvidence([{ ...fixture[0], doc_url: 'javascript:alert(1)' }]).includes('href="javascript:'));

const http = Bun.serve({ port: 0, fetch(request) {
  if (new URL(request.url).pathname === "/good") return Response.json({ trades: fixture });
  return new Response("Unavailable", { status: 503 });
} });
try {
  assert.deepEqual(await fetchData(`http://localhost:${http.port}/good`), { trades: fixture });
  await assert.rejects(fetchData(`http://localhost:${http.port}/broken`), /HTTP 503/);
} finally { http.stop(true); }
console.log("SEO regression checks passed: prefixed rendered links, native navigation, dated source evidence and observable fetch failures");
