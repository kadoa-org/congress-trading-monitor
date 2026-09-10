export const DISCLOSURE_METHOD = [
  {
    title: "Why this data exists",
    body: "The STOCK Act requires covered officials to disclose certain purchases, sales and exchanges over $1,000. This dataset collects disclosed transactions from House, Senate and executive branch records. Source links open the original document or disclosure portal when available.",
  },
  {
    title: "Congressional transaction deadlines",
    body: "House and Senate Periodic Transaction Reports are due within 30 days of notification, and no later than 45 days after the transaction. Neither chamber permits extensions for these reports. Extensions for annual financial disclosures are a separate rule.",
    sources: [
      ["House disclosure FAQs", "https://ethics.house.gov/faqs-about-financial-disclosure/"],
      ["Senate ethics FAQs", "https://www.ethics.senate.gov/public/index.cfm/ethics-faqs"],
    ],
  },
  {
    title: "Executive branch reports",
    body: "Covered executive branch officials use OGE Form 278-T. The standard window is 30 days from notification, no later than 45 days after the transaction. Agencies may grant extensions. This dataset does not verify whether an extension was approved.",
    sources: [["OGE disclosure FAQs", "https://www2.oge.gov/web/OGE.nsf/publicresources_disclosure-faq"]],
  },
  {
    title: 'What the "late" flag measures',
    body: "The flag identifies transaction rows with more than 45 days between the recorded transaction and filing dates. It does not evaluate the 30-day notification rule or approved executive branch extensions. Counts are transaction rows, so one report can contribute multiple flags. This is a screening indicator, not an ethics finding or a calculation of penalties.",
  },
];

export const RETURN_METHOD = [
  {
    title: "Price changes and SPY comparisons",
    body: "For a priced transaction, the calculation uses the closing price on its transaction date, or the first available trading day after it, and the latest available closing price in the dataset. Excess return subtracts SPY's price change over the corresponding window. The difference is measured in percentage points. Different transactions cover different periods; these figures are not annualized.",
  },
  {
    title: "Averages and hypothetical portfolios",
    body: "The average return comparison in filer summaries gives each priced purchase equal weight. Weighted comparisons and hypothetical portfolio values use the midpoint of each disclosed amount range. These estimates assume purchases are held through the latest available price and do not reconcile subsequent sales. They do not represent actual holdings, realized gains or a filer's portfolio performance. Records without the required prices or amounts are excluded from the relevant calculation.",
  },
];
