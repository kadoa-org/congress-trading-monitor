import React from "react";
import { Card } from "../ui";

import { DISCLOSURE_METHOD, RETURN_METHOD } from "../methodology";

export default function AboutPage() {
  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 pt-8 pb-20">
      <div className="max-w-3xl">
        <h1 className="dk-h1">About the data</h1>
        <p className="text-regular text-ink_muted">
          An open dataset of stock trades disclosed by members of Congress and senior executive branch officials, parsed
          from the original filings into one searchable, sortable view. Source links open the original filing or disclosure portal when available. The
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
        <h2 className="text-large font-semibold text-ink mb-1">Disclosure rules and calculations</h2>
        <p className="text-small text-ink_muted">
          How disclosure deadlines, filing flags and hypothetical return comparisons work.
        </p>
      </div>

      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4 max-w-5xl">
        {[...DISCLOSURE_METHOD, ...RETURN_METHOD].map((s, i) => (
          <Card key={s.title} className="p-5">
            <div className="flex items-center gap-3 mb-3">
              <span className="w-6 h-6 rounded-full bg-ink text-white text-mini font-medium flex items-center justify-center tabular-nums shrink-0">
                {i + 1}
              </span>
              <div className="text-regular font-semibold text-ink">{s.title}</div>
            </div>
            <p className="text-small text-ink_secondary leading-[1.5]">{s.body}</p>
            {s.sources?.map(([label, href]) => <p key={href} className="mt-3 text-small"><a className="govuk-link" href={href}>{label}</a></p>)}
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
