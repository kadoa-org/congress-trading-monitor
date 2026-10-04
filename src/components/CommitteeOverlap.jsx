import React from "react";
import { billText, CommitteeName, pct, shortTitle } from "../committees";
import CompactTable from "./CompactTable";
import { fmtInt, Link, RowLink, SectionHeader } from "../ui";
import { TickerBadge } from "./TickerBadge";

// A member's stock trades in companies that lobbied on bills sent to their committees, next to the share for Congress
// as a whole, with the bills behind each match. Laid out as a summary list at reading width.
export default function CommitteeOverlap({ oversight }) {
  if (!oversight?.trades) return null;
  const { committees, trades, linked, linkedPct, expectedPct, topLinked } = oversight;
  return (
    <section className="mb-10 max-w-3xl" aria-labelledby="committee-overlap">
      <SectionHeader title={<span id="committee-overlap">Committees</span>} />
      <dl className="govuk-summary-list">
        <div className="govuk-summary-list__row">
          <dt className="govuk-summary-list__key">Sits on</dt>
          <dd className="govuk-summary-list__value">
            {committees.map((c) => (
              <p className="govuk-body" key={c.code} style={{ marginBottom: c === committees.at(-1) ? 0 : 6 }}>
                <CommitteeName full={c.name} />
              </p>
            ))}
          </dd>
        </div>
        <div className="govuk-summary-list__row">
          <dt className="govuk-summary-list__key">Trades in companies lobbying them</dt>
          <dd className="govuk-summary-list__value tabular-nums">
            {fmtInt(linked)} of {fmtInt(trades)} since January 2025 ({pct(linkedPct)})
          </dd>
        </div>
        <div className="govuk-summary-list__row">
          <dt className="govuk-summary-list__key">All of Congress</dt>
          <dd className="govuk-summary-list__value tabular-nums">{pct(expectedPct)} of trades in the same companies</dd>
        </div>
      </dl>
      {topLinked.length > 0 && (
        <CompactTable
          caption="Companies lobbying their committees"
          rowKey={(t) => t.ticker}
          rows={topLinked}
          columns={[
            { key: "ticker", header: "Stock", width: 80, render: (t) => <RowLink to={`/ticker/${t.ticker}`} className="no-underline"><TickerBadge ticker={t.ticker} /></RowLink> },
            {
              key: "bill",
              header: "Lobbied on",
              clamp: true,
              render: (t) => (
                <span title={t.bills.map(billText).join("; ")}>
                  {t.bills[0] ? `${t.bills[0].label} ${shortTitle(t.bills[0].title, 40)}` : ""}
                  {t.bills.length > 1 && <span className="dk-hint"> +{t.bills.length - 1}</span>}
                </span>
              ),
            },
            { key: "trades", header: "Trades", numeric: true, render: (t) => fmtInt(t.trades) },
          ]}
        />
      )}
      <p className="govuk-body-s">
        <Link to="/lobbying">More on lobbying</Link>
      </p>
    </section>
  );
}
