// One entry per insight page (/insights/<slug>). The index lists them as cards; each page reads its datasets from the
// shared data load and is prerendered with its own title and description so a link shares well.
export const INSIGHTS = [
  {
    slug: "weekly-trading",
    title: "Stock trading by members of Congress",
    summary: "Weekly purchases minus sales by members of Congress, alongside the S&P 500.",
    seoTitle: "Stock Trading by Members of Congress, Week by Week",
    seoDescription: "How much members of Congress buy and sell each week, alongside the S&P 500. Counted from every House and Senate periodic transaction report, updated daily.",
  },
  {
    slug: "committees",
    title: "Stock trades and committee assignments",
    summary: "How often members trade stocks in the sectors their own committees cover.",
    seoTitle: "Congress Stock Trades and Committee Assignments",
    seoDescription: "How often members of Congress trade stocks in sectors their committees cover, by committee and by member, against Congress as a whole. Updated daily.",
  },
];
export const insightBySlug = (slug) => INSIGHTS.find((i) => i.slug === slug);
