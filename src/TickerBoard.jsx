import React from "react";
import { TickerLabel } from "./components/TickerBadge";
import { DataTable } from "./kit";
import { RowLink } from "./ui";

function dailyChange(p) {
  if (!p?.latest || !p?.previous) return null;
  const a = p.latest.close;
  const b = p.previous.close;
  if (!a || !b) return null;
  return ((a - b) / b) * 100;
}

const COLUMNS = (prices) => [
  {
    key: "ticker",
    header: "Ticker",
    render: (t) => (
      <RowLink to={`/ticker/${t.ticker}`} className="no-underline inline-flex items-center gap-1.5">
        <TickerLabel ticker={t.ticker} size="sm" />
      </RowLink>
    ),
  },
  {
    key: "change",
    header: "Δ1d",
    align: "right",
    render: (t) => {
      const change = dailyChange(prices[t.ticker]);
      if (change == null) return <span style={{ color: "var(--dk-muted)" }}>—</span>;
      return (
        <span className={change >= 0 ? "dk-pos" : "dk-neg"}>
          {change >= 0 ? "+" : ""}
          {change.toFixed(1)}%
        </span>
      );
    },
  },
  {
    key: "trade_count",
    header: "Trades",
    align: "right",
    render: (t) => (
      <>
        {t.trade_count}
        <span style={{ color: "var(--dk-muted)" }}> · {t.filer_count}f</span>
      </>
    ),
  },
  {
    key: "mix",
    header: "Buy / Sell",
    align: "right",
    render: (t) => (
      <>
        <span className="dk-pos">{t.purchases}</span>
        <span style={{ color: "var(--dk-muted)" }}>/</span>
        <span className="dk-neg">{t.sales}</span>
      </>
    ),
  },
];

export default function TickerBoard({ tickers, prices = {} }) {
  return <DataTable columns={COLUMNS(prices)} rows={tickers} rowKey={(t) => t.ticker} />;
}
