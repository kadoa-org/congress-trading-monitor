import React from "react";

const STEPS = [
  {
    title: "The STOCK Act",
    summary: "Why this data exists",
    body: `The Ethics in Government Act of 1978 created public financial disclosure requirements for senior federal officials. The Stop Trading on Congressional Knowledge Act of 2012 ("STOCK Act") extended those rules to periodic transaction reporting, requiring officials to disclose individual stock trades over $1,000 within days, not just annually. The law covers both Congress and the executive branch.`,
  },
  {
    title: "The 45-day deadline",
    summary: "When trades must be disclosed",
    body: `House and Senate members must file a Periodic Transaction Report ("PTR") within 30 days of being notified of a trade, and no later than 45 days after the transaction itself. The 45-day mark is the hard backstop. Anything filed beyond it counts as a late filing.`,
  },
  {
    title: "The 278-T report",
    summary: "The executive branch equivalent",
    body: `Senior executive branch officials file OGE Form 278-T for every reportable transaction over $1,000. Same 30/45-day window. Unlike congressional PTRs, 278-T filings are archived at the U.S. Office of Government Ethics instead of the Clerk of the House.`,
  },
  {
    title: "Extensions",
    summary: "The narrow exceptions",
    body: `Filers can request an extension from their ethics committee (45 days, renewable once to 90 days total) for hardship. Congressional extensions are tracked by the Clerk; executive branch extensions show up in OGE records.`,
  },
  {
    title: "Late filings",
    summary: "What late means here",
    body: `Any PTR / 278-T filed more than 45 days after the transaction (without an approved extension) is late. The STOCK Act sets a $200 flat penalty per late filing, often waived. The far bigger penalty is the public-record flag, which is what this dataset exposes.`,
  },
  {
    title: "Accountability",
    summary: "What this data is for",
    body: `Individual disclosures become searchable when aggregated. You can see who routinely files late, which tickers move with which committees, and whether disclosed holdings reconcile with public statements. This is a tool for journalists, researchers, and interested citizens. Not investment advice.`,
  },
];

export default function AboutPage() {
  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 pt-8 pb-20">
      <div className="max-w-3xl">
        <h1 className="govuk-heading-l">About the data</h1>
        <p className="govuk-body">
          An open dataset that parses congressional and executive branch financial disclosures into a searchable,
          sortable, visual format. Filings are sourced and monitored with{" "}
          <a href="https://kadoa.com" target="_blank" rel="noopener noreferrer" className="govuk-link">
            kadoa.com
          </a>{" "}
          and code is open source on{" "}
          <a
            href="https://github.com/kadoa-org/congress-trading-monitor"
            target="_blank"
            rel="noopener noreferrer"
            className="govuk-link"
          >
            GitHub
          </a>
          . Every transaction links back to the original filing PDF so any claim on this site can be verified against
          the source document.
        </p>

        <div id="law" className="scroll-mt-20" style={{ marginTop: 40 }}>
          <h2 className="govuk-heading-m">The law and the deadlines</h2>
          <p className="govuk-body">
            What the STOCK Act requires, how disclosure windows work, and what "late" means when you see that flag on a
            trade.
          </p>
        </div>

        {STEPS.map((s, i) => (
          <section key={s.title} style={{ marginTop: 30 }}>
            <h2 className="govuk-heading-m" style={{ marginBottom: 5 }}>
              {i + 1}. {s.title}
            </h2>
            <p className="govuk-hint">{s.summary}</p>
            <p className="govuk-body">{s.body}</p>
          </section>
        ))}

        <div className="govuk-inset-text" style={{ marginTop: 40 }}>
          For informational and journalism purposes only. Not investment advice. Dataset licensed for open use.
        </div>
      </div>
    </div>
  );
}
