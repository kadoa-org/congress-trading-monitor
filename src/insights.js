// One entry per insight page (/insights/<slug>). The index lists them as cards; each page reads its datasets from the
// shared data load and is prerendered with its own title and description so a link shares well.
export const INSIGHTS = [
  {
    slug: "committee-trades",
    title: "Trading the companies their committees oversee",
    summary: "55 members of Congress traded stocks in companies their committees oversee since January 2025.",
    seoTitle: "1 in 10 Members of Congress Traded Stocks Their Committees Oversee",
    seoDescription: "A Kadoa analysis found that 55 lawmakers or their family members bought or sold shares over 21 months in companies overseen by a committee they sit on.",
    ogImage: "og/committee-trades.png",
    ogImageAlt: "House and Senate seating diagrams with one dot per member: 41 House members and 14 senators traded stocks in companies their committees oversee.",
  },
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
// The newest insight, announced in a banner under the navigation on every page but its own. Point it at the next
// insight when one ships, or set it to null to take the banner down. The text is written for the banner: about 50
// characters with the number first, so it fits a phone in one or two lines.
export const ANNOUNCED = {
  slug: "committee-trades",
  text: "1 in 10 lawmakers traded stocks their committees oversee",
};
