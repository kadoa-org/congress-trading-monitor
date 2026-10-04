import React from "react";
import { INSIGHTS } from "../insights";
import { Link } from "../ui";

// The index of insight pages, one card each.
export default function InsightsPage() {
  return (
    <div className="dk-container">
      <main className="govuk-main-wrapper" id="main-content">
        <div className="max-w-3xl">
          <h1 className="dk-h1">Insights</h1>
          <p className="govuk-body-l">Trends across every disclosed trade by members of Congress. Each one has its own page to link to.</p>
        </div>
        <ul className="insight-cards">
          {INSIGHTS.map((i) => (
            <li key={i.slug} className="insight-card">
              <h2 className="govuk-heading-m"><Link to={`/insights/${i.slug}`}>{i.title}</Link></h2>
              <p className="govuk-body">{i.summary}</p>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
