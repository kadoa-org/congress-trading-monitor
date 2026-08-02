// Human company name for a ticker, derived from the asset names on its trades.
// People search "who traded SpaceX", not "who traded SPCX" — the company name
// in the title/body is what makes these pages matchable.
//
// Asset names are free text copied off PTR/278-T filings, so the same issuer
// arrives in many forms: share-class suffixes, an appended "(TICKER) [ST]",
// custody prefixes ("… Trust > U.S. Trust Holdings Acme Inc."), the PDF form's
// checkbox glyphs ("gfedc", "JT") glued to the first word, and pervasive case
// corruption ("abIoMEd" for ABIOMED, "aetna", "onsored AdR" for "Sponsored
// ADR"). Taking the most frequent raw string put that straight into 2,300 page
// titles and H1s — "apollo Medical Holdings, Inc. (aMEH) [sT]" was live.
//
// So: strip the mechanical noise, score what survives for case corruption, and
// take the cleanest variant. If even the best one still looks mangled, return
// null — "AMEH Congress Stock Trades" is a fine title; "aMEH … [sT]" is not.
const ACCOUNT_NOISE =
  /\b(filing status|subholding|rollover ira|ira account|delaware trust|revocable trust|trust holdings|joint account|brokerage account|see endnote)\b/i;
// Custodians and brokers appear where the issuer should be; never the company.
const CUSTODIAN =
  /\b(raymond james|national financial services|fidelity|morgan stanley|charles schwab|merrill lynch|jpmorgan|j\.p\. morgan|goldman sachs|wells fargo|edward jones|pershing|ubs financial|twp parametric|vanguard brokerage|axa retirement)\b/i;
// Words that legitimately stay lowercase mid-name; anything else is corruption.
const LOWER_OK = new Set("of the and for de du van von plc ltd inc llc lp ag sa nv co a an at in on to".split(" "));

export function cleanAssetName(raw, ticker) {
  let n = String(raw ?? "");
  if (n.includes(">")) n = n.slice(n.lastIndexOf(">") + 1); // custody path prefix
  n = n.replace(/^.*\(\d+\)\s*/, ""); // "… IRA Account (1) Acme Inc."
  n = n.split(" - ")[0]; // share-class suffix
  n = n.replace(/\b(?:gfedcb?|JT)\b\s*/g, ""); // form glyphs, standalone
  n = n.replace(/\b(?:gfedcb?|JT)(?=[A-Za-z])/g, ""); // …and glued to the next word
  n = n.replace(/\s*\[[A-Za-z]{2}\]\s*/g, " "); // [ST] / [OT] filing markers
  n = n.replace(/\s*\((?:[A-Za-z.]{1,6}|NYSE|NASDAQ|AMEX)\)\s*/g, " "); // trailing (TICKER)/(NYSE)
  n = n.replace(/\s+(common|ordinary|class [a-c])\s+(stock|shares)$/i, "");
  n = n.replace(/\s{2,}/g, " ").trim();
  if (!n || n.toUpperCase() === ticker) return null;
  if (ACCOUNT_NOISE.test(n) || CUSTODIAN.test(n)) return null;
  return n;
}

function mangleScore(name, ticker) {
  let bad = 0;
  for (const t of name.split(/[\s,.]+/).filter(Boolean)) {
    if (!/^[A-Za-z]/.test(t)) continue;
    const lc = t.toLowerCase();
    if (t[0] === t[0].toLowerCase() && !LOWER_OK.has(lc)) bad++; // "aetna", "onsored"
    if (lc === ticker.toLowerCase() && t !== ticker) bad++; // "aMEH" for AMEH
    if (/^[A-Z]{2,}[a-z]/.test(t)) bad++; // "ONSOREd", "AdR"
  }
  return bad;
}

// A leading lowercase word is the tell for a chewed-off first syllable
// ("onsored", "itality"). Real lowercase brands (iShares, nVent) capitalise
// their second letter, so exempt those.
const looksMangled = (n) => /^[a-z]/.test(n) && !/^[a-z][A-Z]/.test(n);

export function companyName(trades, ticker) {
  const counts = new Map();
  for (const t of trades) {
    const name = cleanAssetName(t.asset_name, ticker);
    if (name) counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  let best = null;
  for (const [name, n] of counts) {
    const cand = { name, n, bad: mangleScore(name, ticker) };
    if (
      !best ||
      cand.bad < best.bad ||
      (cand.bad === best.bad && (cand.n > best.n || (cand.n === best.n && cand.name.length < best.name.length)))
    )
      best = cand;
  }
  // Past ~70 chars it is filing boilerplate, not a company name, and it pushes
  // the title well past what a SERP will show.
  if (!best || looksMangled(best.name) || best.name.length > 70) return null;
  return best.name;
}
