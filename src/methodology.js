export const DISCLOSURE_METHOD = [
  {
    title: "Where the data comes from",
    body: "The STOCK Act requires members of Congress and senior officials to disclose stock trades over $1,000. We collect every disclosed trade from House, Senate and executive branch filings, and link each one to its source.",
  },
  {
    title: "Congress deadlines",
    body: "Members must report a trade within 30 days of learning of it, and no later than 45 days after it. Neither chamber allows extensions.",
    sources: [
      ["House disclosure FAQs", "https://ethics.house.gov/faqs-about-financial-disclosure/"],
      ["Senate ethics FAQs", "https://www.ethics.senate.gov/public/index.cfm/ethics-faqs"],
    ],
  },
  {
    title: "Executive branch deadlines",
    body: "Officials file OGE Form 278-T on the same 30 and 45 day rules. Agencies can grant extensions, which we cannot see.",
    sources: [["OGE disclosure FAQs", "https://www2.oge.gov/web/OGE.nsf/publicresources_disclosure-faq"]],
  },
  {
    title: "Late filings",
    body: "A trade is late when it was filed more than 45 days after it was made. One filing can contain several late trades. Late does not mean a rule was broken.",
  },
];

export const RETURN_METHOD = [
  {
    title: "Returns against the S&P 500",
    body: "A trade's return runs from its closing price on the trade date to the latest close. We subtract the S&P 500's (SPY) return over the same days. Returns are not annualized.",
  },
  {
    title: "Averages and estimated portfolios",
    body: "Averages count every priced buy equally. Estimated portfolios use the midpoint of each disclosed range and assume nothing was sold. They are estimates, not actual holdings.",
  },
];

export const LOBBYING_METHOD = [
  {
    title: "What counts",
    body: "A company lobbies on a bill. The bill goes to a committee. A member of that committee trades the stock within a year. Funds are not counted.",
  },
  {
    title: "Share and Congress average",
    body: "Share is a member's matching trades out of all their stock trades. Congress average is the same share across all members. A match is not evidence of wrongdoing.",
  },
  {
    title: "Sources",
    body: "Lobbying filings from LDA.gov. Bill referrals from govinfo.gov. Senate Office of Public Records cannot vouch for the data or analyses derived from these data after the data have been retrieved from LDA.gov.",
  },
];
