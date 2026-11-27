import assert from "node:assert/strict";
import { pickMoreInsights } from "./fetch-more-insights.mjs";

const item = (key, published, title = `${key} ${published}`) => ({ site: { key, name: key.toUpperCase() }, url: `https://www.kadoa.com/${key}/insights/x`, title, published });
const index = { version: 1, items: [item("congress", "2026-11-20"), item("energy-prices", "2026-11-01"), item("companies", "2026-11-18"), item("food-prices", "2026-11-10"), item("potus", "2026-10-01")] };

// Leaves out this site's own insights and keeps the three newest from the others, newest first.
assert.deepEqual(pickMoreInsights(index).map((i) => i.title), ["companies 2026-11-18", "food-prices 2026-11-10", "energy-prices 2026-11-01"]);
assert.equal(pickMoreInsights(index)[0].site, "COMPANIES");
// A response in another shape fails the build instead of rendering an empty block.
assert.throws(() => pickMoreInsights({ items: [] }), /version: 1/);
assert.throws(() => pickMoreInsights({ version: 1, items: [{ site: { key: "x" }, title: "t", published: "2026-01-01" }] }), /without url/);
// One per site before a second from any site, so the block points at several sites; webinars are left out.
const crowded = { version: 1, items: [item("companies", "2026-11-21"), item("companies", "2026-11-20"), item("companies", "2026-11-19"), item("food-prices", "2026-11-01"), { ...item("webinars", "2026-11-25"), format: "webinar" }] };
assert.deepEqual(pickMoreInsights(crowded).map((i) => i.title), ["companies 2026-11-21", "food-prices 2026-11-01", "companies 2026-11-20"]);
console.log("moreInsights.test: ok");
