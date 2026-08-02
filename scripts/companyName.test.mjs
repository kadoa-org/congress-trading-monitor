// Regression guard for the mangled-title bug: 2,300 ticker pages shipped titles
// and H1s built straight from the modal raw asset_name, so filing-form garbage
// went live — "apollo Medical Holdings, Inc. (aMEH) [sT]", "DR gold Trust (gLD)",
// "onsored AdR (DANoY)", and a 240-character title assembled from a custody path.
//
// Asserts the cleaner on the real shipped data, not synthetic strings: every
// name it returns must survive the same corruption checks, and the tickers that
// were visibly broken must now be right (or, where no clean variant exists in
// the filings, be dropped rather than guessed).
//
// Run: node scripts/companyName.test.mjs
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { cleanAssetName, companyName } from "./companyName.mjs";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const TICKER_DIR = path.join(ROOT, "public", "data", "ticker");

// Mechanical noise every variant may carry.
assert.equal(cleanAssetName("Aetna Inc. (AET) [ST]", "AET"), "Aetna Inc.");
assert.equal(cleanAssetName("Acme Corp - Class A Common Stock", "ACME"), "Acme Corp");
assert.equal(cleanAssetName("Family Trust > U.S. Trust Holdings Alexion Pharmaceuticals, Inc.", "ALXN"), null);
assert.equal(cleanAssetName("gfedc Rollover IRA Account (1) ABM Industries Incorporated", "ABM"), "ABM Industries Incorporated");
assert.equal(cleanAssetName("Raymond James", "GOOS"), null); // custodian, not the issuer
assert.equal(cleanAssetName("AMEH", "AMEH"), null); // the ticker itself is not a name

const trades = (ticker) => {
  const p = path.join(TICKER_DIR, `${ticker}.json`);
  return fs.existsSync(p) ? (JSON.parse(fs.readFileSync(p, "utf8")).trades ?? []) : [];
};

// The tickers whose live titles were visibly corrupt.
assert.equal(companyName(trades("AMEH"), "AMEH"), "Apollo Medical Holdings, Inc.");
assert.equal(companyName(trades("AET"), "AET"), "Aetna Inc.");
assert.equal(companyName(trades("DANOY"), "DANOY"), "Danone S.A.");
assert.equal(companyName(trades("ABMD"), "ABMD"), "ABIOMED, Inc.");
assert.equal(companyName(trades("ENLC"), "ENLC"), "EnLink Midstream, LLC");
// Every filing variant is mangled, so no name at all beats a guessed one.
assert.equal(companyName(trades("ADDYY"), "ADDYY"), null);

// Genuinely lowercase-initial brands must survive the corruption check.
assert.equal(companyName(trades("NVT"), "NVT"), "nVent Electric plc");
assert.equal(companyName(trades("IUSV"), "IUSV"), "iShares Core S&P US Value ETF");

// Whole-corpus invariants: nothing the cleaner emits may look mangled, and the
// title it feeds must stay inside a length a SERP will actually show.
const TITLE_CAP = 140;
let named = 0;
const offenders = [];
for (const file of fs.readdirSync(TICKER_DIR)) {
  const ticker = file.replace(/\.json$/, "");
  const name = companyName(trades(ticker), ticker);
  if (name == null) continue;
  named++;
  const title = `${ticker} Congress Stock Trades 2026 — ${name} | Congress Trading Monitor`;
  if (/^[a-z]/.test(name) && !/^[a-z][A-Z]/.test(name)) offenders.push(`${ticker}: leading-lowercase ${name}`);
  if (/\[[A-Za-z]{2}\]/.test(name)) offenders.push(`${ticker}: filing marker ${name}`);
  if (/\bgfedc|\bJT[A-Z]/.test(name)) offenders.push(`${ticker}: form glyph ${name}`);
  if (new RegExp(`\\(${ticker}\\)`, "i").test(name)) offenders.push(`${ticker}: ticker echo ${name}`);
  if (title.length > TITLE_CAP) offenders.push(`${ticker}: ${title.length}-char title`);
}
assert.deepEqual(offenders, [], `mangled company names survived the cleaner:\n${offenders.slice(0, 20).join("\n")}`);
assert.ok(named > 2000, `expected a name for most tickers, got ${named}`);

console.log(`companyName: ok (${named} named tickers, 0 mangled)`);
