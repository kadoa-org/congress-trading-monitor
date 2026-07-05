import React from "react";
import { TickerLabel } from "./components/TickerBadge";
import { navigate } from "./router";
import { RowLink } from "./ui";

function dailyChange(p) {
  if (!p?.latest || !p?.previous) return null;
  const a = p.latest.close;
  const b = p.previous.close;
  if (!a || !b) return null;
  return ((a - b) / b) * 100;
}

// GOV.UK buy/sell text colours.
const BUY = "text-[#0f7a52]";
const SELL = "text-[#ca3535]";

export default function TickerBoard({ tickers, prices = {} }) {
  return (
    <div className="overflow-x-auto">
      <table className="govuk-table" style={{ marginBottom: 0 }}>
        <thead className="govuk-table__head">
          <tr className="govuk-table__row">
            <th scope="col" className="govuk-table__header">
              Ticker
            </th>
            <th scope="col" className="govuk-table__header govuk-table__header--numeric">
              Δ1d
            </th>
            <th scope="col" className="govuk-table__header govuk-table__header--numeric">
              Trades
            </th>
            <th scope="col" className="govuk-table__header govuk-table__header--numeric">
              Buy / Sell
            </th>
          </tr>
        </thead>
        <tbody className="govuk-table__body">
          {tickers.map((t) => {
            const change = dailyChange(prices[t.ticker]);
            return (
              <tr
                key={t.ticker}
                className="govuk-table__row hover:bg-[#f3f2f1] cursor-pointer"
                onClick={(e) => {
                  // Anchors handle their own navigation (incl. cmd/ctrl-click).
                  if (e.target.closest("a") || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
                  navigate(`/ticker/${t.ticker}`);
                }}
              >
                <td className="govuk-table__cell">
                  <RowLink to={`/ticker/${t.ticker}`} className="no-underline inline-flex items-center gap-1.5">
                    <TickerLabel ticker={t.ticker} size="sm" />
                  </RowLink>
                </td>
                <td className="govuk-table__cell govuk-table__cell--numeric tabular-nums">
                  {change != null ? (
                    <span className={`whitespace-nowrap ${change >= 0 ? BUY : SELL}`}>
                      {change >= 0 ? "+" : ""}
                      {change.toFixed(1)}%
                    </span>
                  ) : (
                    <span className="text-[#505a5f]">—</span>
                  )}
                </td>
                <td className="govuk-table__cell govuk-table__cell--numeric tabular-nums">
                  <span className="text-[#0b0c0c] font-bold">{t.trade_count}</span>
                  <span className="text-[#505a5f] ml-1">· {t.filer_count}f</span>
                </td>
                <td className="govuk-table__cell govuk-table__cell--numeric tabular-nums whitespace-nowrap">
                  <span className={BUY}>{t.purchases}</span>
                  <span className="text-[#505a5f] mx-[2px]">/</span>
                  <span className={SELL}>{t.sales}</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
