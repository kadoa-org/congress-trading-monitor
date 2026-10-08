// One entry per insight page (/insights/<slug>). The index lists them as cards; each page reads its datasets from the
// shared data load and is prerendered with its own title and description so a link shares well.
export const INSIGHTS = [
  {
    slug: "weekly-trading",
    title: "Weekly buying and selling",
    summary: "Weekly purchases minus sales by members of Congress, alongside the S&P 500.",
    seoTitle: "Stock Trading by Members of Congress, Week by Week",
    seoDescription: "How much members of Congress buy and sell each week, alongside the S&P 500. Counted from every House and Senate periodic transaction report, updated daily.",
  },
  {
    slug: "lobbying-vs-market-cap",
    title: "Lobbying spend vs market cap",
    summary: "What companies spent on federal lobbying in 2025, against their size.",
    seoTitle: "Company Lobbying Spend vs Market Cap, 2025",
    seoDescription: "Federal lobbying spend in 2025 against market cap for 543 US companies traded by members of Congress. Tech spends the least for its size, defense the most.",
  },
];
export const insightBySlug = (slug) => INSIGHTS.find((i) => i.slug === slug);
