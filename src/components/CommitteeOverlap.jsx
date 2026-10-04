import React from "react";
import { committeeLabel, pct } from "../committees";
import { KeyFigures } from "../kit";
import { fmtInt, Link, RowLink } from "../ui";
import { TickerBadge } from "./TickerBadge";

// A member's stock trades in the sectors their committees cover, next to the share for Congress as a whole.
export default function CommitteeOverlap({ oversight }) {
  if (!oversight?.trades) return null;
  const { committees, trades, overseen, overseenPct, expectedPct, topOverseenTickers } = oversight;
  return (
    <div className="mb-10">
      <KeyFigures
        title="Committee overlap"
        description="Their stock trades since January 2025 in sectors their committees cover."
        items={[
          { label: "In their committees' sectors", value: pct(overseenPct), note: `${fmtInt(overseen)} of ${fmtInt(trades)} trades` },
          { label: "Congress overall", value: pct(expectedPct), note: "of all members' trades are in the same sectors" },
        ]}
      />
      <dl className="govuk-summary-list">
        {committees.map((c) => (
          <div className="govuk-summary-list__row" key={c.code}>
            <dt className="govuk-summary-list__key">{committeeLabel(c.name)}</dt>
            <dd className="govuk-summary-list__value">{c.sectors.join(", ")}</dd>
          </div>
        ))}
      </dl>
      {topOverseenTickers.length > 0 && (
        <p className="govuk-body flex flex-wrap items-center gap-2">
          <span>Most traded in these sectors:</span>
          {topOverseenTickers.map((t) => (
            <RowLink key={t.ticker} to={`/ticker/${t.ticker}`} className="inline-flex items-center gap-1 no-underline">
              <TickerBadge ticker={t.ticker} />
              <span className="govuk-body-s" style={{ marginBottom: 0 }}>×{t.trades}</span>
            </RowLink>
          ))}
        </p>
      )}
      <p className="govuk-body-s">
        <Link to="/insights/committees">How committees are matched to sectors</Link>
      </p>
    </div>
  );
}
