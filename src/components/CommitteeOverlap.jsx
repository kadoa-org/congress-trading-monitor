import React from "react";
import { committeeLabel, pct } from "../committees";
import { fmtInt, Link, RowLink, SectionHeader } from "../ui";
import { TickerBadge } from "./TickerBadge";

// A member's stock trades in the sectors their committees cover, next to the share for Congress as a whole. Laid out
// as a GOV.UK summary list at reading width.
export default function CommitteeOverlap({ oversight }) {
  if (!oversight?.trades) return null;
  const { committees, trades, overseen, overseenPct, expectedPct, topOverseenTickers } = oversight;
  return (
    <section className="mb-10 max-w-3xl" aria-labelledby="committee-overlap">
      <SectionHeader title={<span id="committee-overlap">Committees</span>} />
      <dl className="govuk-summary-list">
        <div className="govuk-summary-list__row">
          <dt className="govuk-summary-list__key">Sits on</dt>
          <dd className="govuk-summary-list__value">
            {committees.map((c) => (
              <p className="govuk-body" key={c.code} style={{ marginBottom: c === committees.at(-1) ? 0 : 8 }}>
                {committeeLabel(c.name)}
                <br />
                <span className="govuk-hint" style={{ marginBottom: 0 }}>{c.sectors.join(", ")}</span>
              </p>
            ))}
          </dd>
        </div>
        <div className="govuk-summary-list__row">
          <dt className="govuk-summary-list__key">Trades in these sectors</dt>
          <dd className="govuk-summary-list__value tabular-nums">
            {pct(overseenPct)} ({fmtInt(overseen)} of {fmtInt(trades)} since January 2025)
          </dd>
        </div>
        <div className="govuk-summary-list__row">
          <dt className="govuk-summary-list__key">All of Congress</dt>
          <dd className="govuk-summary-list__value tabular-nums">{pct(expectedPct)} of trades in the same sectors</dd>
        </div>
        {topOverseenTickers.length > 0 && (
          <div className="govuk-summary-list__row">
            <dt className="govuk-summary-list__key">Most traded</dt>
            <dd className="govuk-summary-list__value">
              <span className="flex flex-wrap items-center gap-x-3 gap-y-2">
                {topOverseenTickers.map((t) => (
                  <RowLink key={t.ticker} to={`/ticker/${t.ticker}`} className="inline-flex items-center gap-1 no-underline">
                    <TickerBadge ticker={t.ticker} />
                    <span className="tabular-nums" style={{ color: "#505a5f" }}>×{t.trades}</span>
                  </RowLink>
                ))}
              </span>
            </dd>
          </div>
        )}
      </dl>
      <p className="govuk-body-s">
        <Link to="/insights/committees">How committees are matched to sectors</Link>
      </p>
    </section>
  );
}
