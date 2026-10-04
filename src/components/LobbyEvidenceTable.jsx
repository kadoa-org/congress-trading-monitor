import React from "react";
import { billText, shortTitle } from "../committees";
import CompactTable from "./CompactTable";
import { fmtInt, RowLink } from "../ui";
import { TickerBadge } from "./TickerBadge";

// A member's trades in companies that lobbied their committees: each stock, the bill behind the match, and how many
// trades. Used on the politician page and in the Lobbying tab's member rows.
export default function LobbyEvidenceTable({ topLinked, trades, linked }) {
  return (
    <CompactTable
      caption={
        <>
          Trades in lobbying companies
          <span className="compact-table__hint">
            {fmtInt(linked)} of {fmtInt(trades)} {trades === 1 ? "stock trade" : "stock trades"} since January 2025
          </span>
        </>
      }
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
  );
}
