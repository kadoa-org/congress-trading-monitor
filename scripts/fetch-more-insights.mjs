// Fetch the newest insights from Kadoa's other dataset sites for the "More from Kadoa Insights" block under each
// insight page. Source: www.kadoa.com/insights/index.json, which merges every dataset site's insights.json into one list.
//
// Writes src/more-insights.json, which the insight page imports at build time: up to LIMIT articles from other sites, the newest of each site first so the
// block spreads across sites, then the next newest. Webinars are left out; the block lists articles. The block is optional,
// so a failed fetch does not fail the build: it logs a warning and keeps the last committed file, which the daily
// refresh then commits again unchanged. A response in the wrong shape is a contract break and does fail the build.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "src", "more-insights.json");
const SOURCE = process.env.KADOA_INSIGHTS_URL ?? "https://www.kadoa.com/insights/index.json";
const SITE = "congress";
const LIMIT = 3;

export function pickMoreInsights(index, site = SITE, limit = LIMIT) {
  if (index?.version !== 1 || !Array.isArray(index.items)) throw new Error(`${SOURCE}: expected { version: 1, items: [] }`);
  const items = index.items
    .filter((i) => i.site?.key !== site && i.format !== "webinar")
    .map((i) => {
      for (const k of ["url", "title", "published"]) if (typeof i[k] !== "string") throw new Error(`${SOURCE}: item without ${k}: ${JSON.stringify(i)}`);
      return { url: i.url, title: i.title, site: i.dataset ?? i.site?.name ?? "Kadoa Insights", published: i.published, key: i.site?.key };
    })
    .sort((a, b) => b.published.localeCompare(a.published));
  const seen = new Set();
  const firsts = items.filter((i) => !seen.has(i.key) && seen.add(i.key));
  return [...firsts, ...items.filter((i) => !firsts.includes(i))].slice(0, limit).map(({ key, ...i }) => i);
}

if (import.meta.main ?? process.argv[1] === fileURLToPath(import.meta.url)) {
  let index;
  try {
    const res = await fetch(SOURCE, { signal: AbortSignal.timeout(15_000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    index = await res.json();
  } catch (error) {
    if (!fs.existsSync(OUT)) fs.writeFileSync(OUT, "[]\n");
    console.warn(`[more-insights] WARNING: ${SOURCE} unavailable (${error.message}); keeping ${path.relative(ROOT, OUT)} as it is`);
  }
  if (index) {
    const items = pickMoreInsights(index);
    fs.writeFileSync(OUT, JSON.stringify(items, null, 2) + "\n");
    console.log(`[more-insights] ${items.length} items from ${SOURCE}`);
  }
}
