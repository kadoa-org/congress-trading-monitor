import React from "react";
import { Card } from "../ui";

const LAW = [
  {
    title: "Why this data exists",
    body: `The STOCK Act of 2012 requires members of Congress and senior executive branch officials to disclose any stock trade over $1,000 within days of making it, not just once a year. Each disclosure is a public record, but they are scattered across three archives and thousands of PDFs. This site collects them in one place.`,
  },
  {
    title: "The 45-day deadline",
    body: `House and Senate members must file a Periodic Transaction Report (PTR) within 30 days of being notified of a trade, and never more than 45 days after the trade itself. The 45-day mark is the hard backstop, and it is the deadline this site measures against.`,
  },
  {
    title: "The executive branch files too",
    body: `Senior executive branch officials report the same trades on OGE Form 278-T, under the same 30/45-day window. Congressional PTRs are archived by the Clerk of the House and the Senate; 278-T filings sit at the U.S. Office of Government Ethics. We pull from all three.`,
  },
  {
    title: "Extensions",
    body: `A filer can request an extension from their ethics committee: 45 days, renewable once to 90 days total. We only flag a trade as late when it was filed past the deadline without one, so the flag means what it says.`,
  },
  {
    title: `What "late" means here`,
    body: `Any report filed more than 45 days after the transaction, without an approved extension, is late. The STOCK Act's penalty is a flat $200 per late filing, and it is often waived. The lasting cost is the public record, which is exactly what this dataset makes visible.`,
  },
  {
    title: "Who this is for",
    body: `One disclosure tells you almost nothing. Thousands of them, aggregated, show who routinely files late, which tickers cluster around which committees, and whether holdings line up with public statements. Built for journalists, researchers, and curious citizens. Not investment advice.`,
  },
];

export default function AboutPage() {
  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 pt-8 pb-20">
      <div className="max-w-3xl">
        <h1 className="dk-h1">About the data</h1>
        <p className="text-regular text-ink_muted">
          An open dataset of stock trades disclosed by members of Congress and senior executive branch officials, parsed
          from the original filings into one searchable, sortable view. Every trade links back to its source PDF. The
          data is collected with{" "}
          <a href="https://kadoa.com" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
            kadoa.com
          </a>{" "}
          and the code is open source on{" "}
          <a
            href="https://github.com/kadoa-org/congress-trading-monitor"
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent hover:underline"
          >
            GitHub
          </a>
          .
        </p>
      </div>

      <div id="law" className="mt-12 max-w-3xl scroll-mt-20">
        <h2 className="text-large font-semibold text-ink mb-1">The law and the deadlines</h2>
        <p className="text-small text-ink_muted">
          What the STOCK Act requires, how the disclosure windows work, and what the late flag on a trade actually
          means.
        </p>
      </div>

      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4 max-w-5xl">
        {LAW.map((s, i) => (
          <Card key={s.title} className="p-5">
            <div className="flex items-center gap-3 mb-3">
              <span className="w-6 h-6 rounded-full bg-ink text-white text-mini font-medium flex items-center justify-center tabular-nums shrink-0">
                {i + 1}
              </span>
              <div className="text-regular font-semibold text-ink">{s.title}</div>
            </div>
            <p className="text-small text-ink_secondary leading-[1.5]">{s.body}</p>
          </Card>
        ))}
      </div>

      <div className="mt-8 max-w-5xl">
        <Card className="p-5">
          <p className="text-small text-ink_secondary leading-[1.5]">
            <a
              href="https://kadoa.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent hover:underline font-medium"
            >
              Kadoa
            </a>{" "}
            is the web data layer for finance, providing the most reliable datasets for investors.
          </p>
        </Card>
      </div>

      <div className="mt-16 max-w-3xl text-small text-ink_muted">
        <p>For informational and journalism purposes only. Not investment advice. Dataset licensed for open use.</p>
      </div>
    </div>
  );
}
