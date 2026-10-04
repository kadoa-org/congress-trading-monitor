// Rules and calculations shown on the About page, one collapsible item each.
export const METHODS = [
  {
    title: "Limits",
    body: [
      "Members can report a trade up to 45 days after making it, so recent weeks are incomplete.",
      "Amounts are disclosed as ranges, not exact values.",
      "Extraction can make mistakes. Check the linked filing before relying on a trade.",
    ],
  },
  {
    title: "Disclosure deadlines",
    body: [
      "Members of Congress must report a trade within 30 days of learning of it, and no later than 45 days after it. Neither chamber allows extensions.",
      "Executive branch officials file OGE Form 278-T on the same rules. Agencies can grant extensions, which we cannot see.",
    ],
    sources: [
      ["House disclosure FAQs", "https://ethics.house.gov/faqs-about-financial-disclosure/"],
      ["Senate ethics FAQs", "https://www.ethics.senate.gov/public/index.cfm/ethics-faqs"],
      ["OGE disclosure FAQs", "https://www2.oge.gov/web/OGE.nsf/publicresources_disclosure-faq"],
    ],
  },
  {
    title: "Late filings",
    body: "A trade is late when it was filed more than 45 days after it was made. One filing can contain several late trades. Late does not mean a rule was broken.",
  },
  {
    title: "Returns against the S&P 500",
    body: "A trade's return runs from its closing price on the trade date to the latest close. We subtract the S&P 500's (SPY) return over the same days. Returns are not annualized.",
  },
  {
    title: "Averages and estimated portfolios",
    body: "Averages count every priced buy equally. Estimated portfolios use the midpoint of each disclosed range and assume nothing was sold. They are estimates, not actual holdings.",
  },
  {
    id: "lobbying",
    title: "Lobbying",
    body: [
      "A company lobbies on a bill. The bill goes to a committee. A member of that committee trades the stock within a year. That trade counts. Funds are not counted.",
      "This member: the share of their stock trades in companies lobbying their committees. All of Congress: the share of every member's trades in those same companies, for comparison. A match is not evidence of wrongdoing.",
      "Lobbying filings come from LDA.gov and bill referrals from govinfo.gov. Senate Office of Public Records cannot vouch for the data or analyses derived from these data after the data have been retrieved from LDA.gov.",
    ],
  },
];
