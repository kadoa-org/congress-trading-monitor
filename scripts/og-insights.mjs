// Link previews for the insight pages, from the same data the pages read, with the shared layout in og-insight.mjs.
// An insight that sets its own ogImage in src/insights.js keeps it and is skipped; every other insight gets
// public/og/<slug>.png from the template, which the prerender points og:image at. Run with bun (it reads the .jsx).
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { GROUPS, perMillion } from "../src/components/LobbyingScatter.jsx";
import { INSIGHTS } from "../src/insights.js";
import { renderOgImages } from "./og-insight.mjs";

const root = resolve(import.meta.dirname, "..");
const load = (name) => JSON.parse(readFileSync(join(root, "public/data", name), "utf8"));
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const day = (s) => { const d = new Date(`${s}T00:00:00Z`); return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`; };
const int = (v) => v.toLocaleString("en-US");
// The weekly chart's colours (BUY and SELL in WeeklyFlows.jsx).
const BUY = "#00703c", SELL = "#d4351c";
// The Trump trades charts' colours (C in TradeCharts.jsx), matching the POTUS Tracker's image of the same insight.
const TRUMP = "#0072B2", CONGRESS = "#505a5f";

// One builder per insight without a custom image, returning the spec for its h1 and key numbers.
const BUILDERS = {
  "weekly-trading": () => {
    const flows = load("flows.json");
    const buys = flows.reduce((s, r) => s + r.buys, 0), sells = flows.reduce((s, r) => s + r.sells, 0), net = buys - sells;
    return {
      title: "Weekly buying and selling",
      key: `Stock trades by members of Congress since January 2025, to the week starting ${day(flows.at(-1).week)}.`,
      figures: [
        { value: int(buys), label: "Purchases", colour: BUY },
        { value: int(sells), label: "Sales", colour: SELL },
        { value: `${net > 0 ? "+" : net < 0 ? "−" : ""}${int(Math.abs(net))}`, label: "Net purchases" },
      ],
      source: "House and Senate periodic transaction reports",
    };
  },
  "lobbying-vs-market-cap": () => {
    const { rows, medians, year } = load("lobbying-mcap.json");
    // The page's sector figures are these medians; check them against the rows so the image cannot drift from them.
    for (const g of Object.keys(GROUPS)) {
      const v = rows.filter((r) => r.g === g).map(perMillion).sort((a, b) => a - b), m = v.length / 2;
      const median = v.length % 2 ? v[Math.floor(m)] : (v[m - 1] + v[m]) / 2;
      if (Math.round(median) !== medians[g]) throw new Error(`lobbying-mcap.json median for ${g} is ${medians[g]}, rows give ${median}`);
    }
    return {
      title: "Tech companies spend the least on lobbying for their size, defense the most",
      key: `Median federal lobbying in ${year} per $1M of market cap, across ${rows.length} US companies traded by members of Congress.`,
      rows: Object.keys(GROUPS).sort((a, b) => medians[b] - medians[a]).map((g) => ({ label: GROUPS[g].label, value: medians[g], text: `$${medians[g]}`, colour: GROUPS[g].color })),
      source: "LDA.gov, SEC",
    };
  },
  "congress-generations": () => {
    const { asOf, chambers } = JSON.parse(readFileSync(join(root, "src/static/congress-generations.json"), "utf8"));
    const senate = chambers.find((c) => c.key === "sen"), boomers = senate.rows.find((r) => r.key === "Boomers");
    const pct = (v) => `${Math.round(v)}%`;
    return {
      title: INSIGHTS.find((i) => i.slug === "congress-generations").title,
      key: `Boomers in the Senate, with seats decided by ${day(asOf)}.`,
      figures: [
        { value: pct(boomers.share), label: "Of Senate seats", colour: "#00703c" },
        { value: pct(boomers.shareBefore), label: "Before the election" },
        { value: pct(boomers.population), label: `Of Americans ${senate.minAge} and over`, colour: CONGRESS },
      ],
      source: "congress-legislators, Wikipedia, Census Bureau",
    };
  },
  "trump-trades": () => {
    const t = JSON.parse(readFileSync(join(root, "src/static/trump-trades.json"), "utf8")).totals;
    return {
      title: INSIGHTS.find((i) => i.slug === "trump-trades").title,
      key: "Disclosed trades, January 2025 to August 2026.",
      figures: [
        { value: int(t.trump), label: `Trump's ${t.accounts} accounts`, colour: TRUMP },
        { value: int(t.congress), label: `${t.members} members of Congress`, colour: CONGRESS },
      ],
      source: "OGE, House and Senate disclosures, Truth Social",
    };
  },
};

const images = INSIGHTS.filter((i) => !i.ogImage).map((i) => {
  if (!BUILDERS[i.slug]) throw new Error(`No link preview for insight ${i.slug}: add a builder to scripts/og-insights.mjs or an ogImage to src/insights.js`);
  return { out: join(root, "public/og", `${i.slug}.png`), ...BUILDERS[i.slug]() };
});
renderOgImages({ name: "Congress Trading Monitor", icon: "🏛️", url: "kadoa.com/congress" }, images);
