// One entry per insight page (/insights/<slug>). The index lists them as cards; each page reads its datasets from the
// shared data load and is prerendered with its own title and description so a link shares well.
// `published` (YYYY-MM-DD) is the first day the page was live. It feeds the Article structured data and insights.json,
// which the kadoa.com/insights hub reads to list this site's insights next to the other sites'.
// `format` is "research" for a multi-chart analysis with a method section, "chart" for one chart with a short lede. The
// hub shows it as a badge and filter.
export const INSIGHTS = [
  {
    slug: "trump-nvidia",
    published: "2026-11-24",
    format: "research",
    title: "Who in Washington owns and trades Nvidia stock",
    summary: "Trump held $12.5 million to $58 million of Nvidia at the end of last year and traded it 43 times since. 37 members of Congress traded it too.",
    seoTitle: "Who in Washington Owns and Trades Nvidia Stock",
    seoDescription: "Trump's Nvidia stock and 43 trades this year, and the 37 members of Congress who traded NVDA, around Jensen Huang's resignation and reinstatement.",
  },
  {
    slug: "congress-generations",
    published: "2026-11-12",
    format: "research",
    title: "Gen X will outnumber Boomers in Congress for the first time",
    summary: "The Congress elected in November 2026 has 228 Gen X members and 181 Boomers. Boomers still hold 51% of decided Senate seats, down from 62%.",
    seoTitle: "Generations in Congress After the 2026 Midterms: Boomers, Gen X, Millennials, Gen Z",
    seoDescription: "Gen X outnumbers Boomers in the Congress elected in 2026, 228 to 181. Each generation's share of Senate and House seats since 1945, by party, and against Americans old enough to serve.",
  },
  {
    slug: "trump-trades",
    published: "2026-11-05",
    format: "research",
    title: "Trump's accounts made more trades than all of Congress combined",
    summary: "31,877 disclosed trades since January 2025, against 20,973 by all of Congress, spread across hundreds of stocks.",
    seoTitle: "Trump's Stock Trades vs Congress",
    seoDescription: "Trump's investment accounts made 31,877 disclosed trades from January 2025 to August 2026, more than all 175 trading members of Congress combined. Most were stocks in big companies.",
  },
  {
    slug: "committee-trades",
    published: "2026-10-20",
    format: "research",
    title: "Trading the companies their committees oversee",
    summary: "55 members of Congress traded stocks in companies their committees oversee since January 2025.",
    seoTitle: "1 in 10 Members of Congress Traded Stocks Their Committees Oversee",
    seoDescription: "A Kadoa analysis found that 55 lawmakers or their family members bought or sold shares over 21 months in companies overseen by a committee they sit on.",
    ogImage: "og/committee-trades.png",
    ogImageAlt: "House and Senate seating diagrams with one dot per member: 41 House members and 14 senators traded stocks in companies their committees oversee.",
  },
  {
    slug: "weekly-trading",
    published: "2026-10-01",
    format: "chart",
    title: "Weekly buying and selling",
    summary: "Weekly purchases minus sales by members of Congress, alongside the S&P 500.",
    seoTitle: "Stock Trading by Members of Congress, Week by Week",
    seoDescription: "How much members of Congress buy and sell each week, alongside the S&P 500. Counted from every House and Senate periodic transaction report, updated daily.",
  },
  {
    slug: "lobbying-vs-market-cap",
    published: "2026-10-08",
    format: "chart",
    title: "Lobbying spend vs market cap",
    summary: "What companies spent on federal lobbying in 2025, against their size.",
    seoTitle: "Company Lobbying Spend vs Market Cap, 2025",
    seoDescription: "Federal lobbying spend in 2025 against market cap for 543 US companies traded by members of Congress. Tech spends the least for its size, defense the most.",
  },
];
export const insightBySlug = (slug) => INSIGHTS.find((i) => i.slug === slug);
// The newest insight, announced in a banner under the navigation on every page but its own. Point it at the next
// insight when one ships, or set it to null to take the banner down. The text is written for the banner: about 50
// characters with the number first, so it fits a phone in one or two lines.
export const ANNOUNCED = {
  slug: "trump-nvidia",
  text: "Who in Washington owns and trades Nvidia stock",
};
