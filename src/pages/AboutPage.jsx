import React from "react";
import { AboutPage as KitAboutPage } from "../kit";
import { METHODS } from "../methodology";

const REPO = "https://github.com/kadoa-org/congress-trading-monitor";

export default function AboutPage() {
  return (
    <div className="dk-container">
      <KitAboutPage
        dataset="congress"
        lede="Every stock trade that members of Congress and senior officials must disclose under the STOCK Act, in one place."
        sources={[
          { name: "House Clerk", href: "https://disclosures-clerk.house.gov/", what: "Trade reports filed by representatives" },
          { name: "Senate eFD", href: "https://efdsearch.senate.gov/", what: "Trade reports filed by senators" },
          { name: "Office of Government Ethics", href: "https://www.oge.gov/", what: "Trade reports from senior executive branch officials" },
          { name: "LDA.gov", href: "https://lda.gov/", what: "Lobbying filings, for the Lobbying tab" },
          { name: "congress-legislators", href: "https://github.com/unitedstates/congress-legislators", what: "Member names and committee seats" },
        ]}
        steps={[
          { title: "Monitor", text: "Kadoa checks every source for new filings each day." },
          { title: "Extract", text: "It reads each filing, including scanned PDFs, and pulls out every trade." },
          { title: "Match", text: "Each trade is matched to its ticker, price and member." },
          { title: "Link", text: "Every trade links back to its original filing." },
        ]}
        methods={METHODS}
        corrections={
          <>
            Not investment advice. Found an error? <a href={`${REPO}/issues`}>Open an issue on GitHub</a>.
          </>
        }
      />
    </div>
  );
}
