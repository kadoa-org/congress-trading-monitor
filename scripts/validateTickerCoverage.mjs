import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dataDir = fileURLToPath(new URL("../public/data/", import.meta.url));
const read = (name) => JSON.parse(fs.readFileSync(path.join(dataDir, name), "utf8"));
const index = new Map(read("tickers.json").map((row) => [row.ticker, row]));
const linkedTrades = new Map();
for (const name of fs.readdirSync(path.join(dataDir, "filer"))) {
  if (!name.endsWith(".json")) continue;
  for (const trade of read(`filer/${name}`).trades) {
    if (!trade.ticker) continue;
    if (!linkedTrades.has(trade.ticker)) linkedTrades.set(trade.ticker, new Set());
    linkedTrades.get(trade.ticker).add(trade.id);
  }
}
for (const trade of read("trades.json")) {
  if (!trade.ticker) continue;
  if (!linkedTrades.has(trade.ticker)) linkedTrades.set(trade.ticker, new Set());
  linkedTrades.get(trade.ticker).add(trade.id);
}
const missing = [...linkedTrades.keys()].filter((symbol) => !index.has(symbol));
assert.equal(missing.length, 0, `${missing.length} linked tickers missing from index: ${missing.slice(0, 20).join(", ")}`);
for (const symbol of index.keys()) {
  const detail = read(`ticker/${encodeURIComponent(symbol)}.json`);
  assert.equal(detail.ticker, symbol);
  const ids = new Set(detail.trades.map((trade) => trade.id));
  for (const id of linkedTrades.get(symbol) ?? []) {
    assert.ok(ids.has(id), `${symbol} detail is missing linked trade ${id}`);
  }
}
console.log(`Ticker coverage passed: ${index.size} indexed pages include all linked disclosures.`);
