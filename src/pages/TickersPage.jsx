import React, { useMemo } from "react";
import { InlineSearchInput } from "../components/FilterBar";
import { useQueryState } from "../router";
import { fmtInt, fmtUSD, RowLink, SectionHeader, SortHeader } from "../ui";

const SORTS = {
  trades: { label: "Most trades", fn: (a, b) => b.trade_count - a.trade_count },
  filers: { label: "Most filers", fn: (a, b) => b.filer_count - a.filer_count },
  volume: { label: "Highest volume", fn: (a, b) => (b.est_volume || 0) - (a.est_volume || 0) },
  buys: { label: "Net buys", fn: (a, b) => b.purchases - b.sales - (a.purchases - a.sales) },
};

function dailyChange(p) {
  if (!p?.latest || !p?.previous) return null;
  const a = p.latest.close;
  const b = p.previous.close;
  if (!a || !b) return null;
  return ((a - b) / b) * 100;
}

export default function TickersPage({ data }) {
  const { tickers = [], prices = {} } = data;
  const [qs, setQs] = useQueryState(["q", "sort"], { q: "", sort: "trades" });

  const filtered = useMemo(() => {
    const q = qs.q.toLowerCase().trim();
    const list = q ? tickers.filter((t) => (t.ticker || "").toLowerCase().includes(q)) : tickers;
    const sorter = SORTS[qs.sort] ?? SORTS.trades;
    return [...list].sort(sorter.fn);
  }, [tickers, qs]);

  return (
    <div className="dk-container pt-8 pb-16">
      <h1 className="govuk-heading-l" style={{ marginBottom: 10 }}>Stocks</h1>
      <p className="govuk-hint" style={{ marginTop: -6 }}>{`${fmtInt(filtered.length)} of ${fmtInt(tickers.length)}`}</p>

      <div className="dk-toolbar">
        <InlineSearchInput value={qs.q} onChange={(v) => setQs({ q: v })} placeholder="Search ticker…" width={240} />
      </div>

      <div className="overflow-x-auto">
        <table className="govuk-table min-w-[880px]">
          <thead className="govuk-table__head">
            <tr className="govuk-table__row">
              <th scope="col" className="govuk-table__header govuk-table__header--numeric">
                #
              </th>
              <th scope="col" className="govuk-table__header">
                Ticker
              </th>
              <th scope="col" className="govuk-table__header govuk-table__header--numeric">
                <SortHeader
                  label="Trades"
                  sortKey="trades"
                  sort={qs.sort}
                  setSort={(v) => setQs({ sort: v })}
                  align="right"
                />
              </th>
              <th scope="col" className="govuk-table__header govuk-table__header--numeric">
                Last · Δ1d
              </th>
              <th scope="col" className="govuk-table__header govuk-table__header--numeric">
                <SortHeader
                  label="Politicians"
                  sortKey="filers"
                  sort={qs.sort}
                  setSort={(v) => setQs({ sort: v })}
                  align="right"
                />
              </th>
              <th scope="col" className="govuk-table__header govuk-table__header--numeric">
                <SortHeader
                  label="Buy / Sell mix"
                  sortKey="buys"
                  sort={qs.sort}
                  setSort={(v) => setQs({ sort: v })}
                  align="right"
                />
              </th>
              <th scope="col" className="govuk-table__header govuk-table__header--numeric">
                <SortHeader
                  label="Est. volume"
                  sortKey="volume"
                  sort={qs.sort}
                  setSort={(v) => setQs({ sort: v })}
                  align="right"
                />
              </th>
            </tr>
          </thead>
          <tbody className="govuk-table__body">
            {filtered.length === 0 && (
              <tr className="govuk-table__row">
                <td colSpan={7} className="govuk-table__cell text-center text-[#505a5f]">
                  No tickers match.{" "}
                  <button onClick={() => setQs({ q: "", sort: "trades" })} className="govuk-link">
                    Clear filters
                  </button>
                  .
                </td>
              </tr>
            )}
            {filtered.slice(0, 1000).map((t, i) => {
              const p = prices[t.ticker];
              const change = dailyChange(p);
              return (
                <tr key={t.ticker} className="govuk-table__row hover:bg-[#f3f2f1]">
                  <td className="govuk-table__cell govuk-table__cell--numeric text-[#505a5f]">{i + 1}</td>
                  <td className="govuk-table__cell">
                    <RowLink to={`/ticker/${t.ticker}`} className="govuk-link govuk-link--no-visited-state font-bold">
                      {t.ticker}
                    </RowLink>
                  </td>
                  <td className="govuk-table__cell govuk-table__cell--numeric tabular-nums">
                    {t.trade_count.toLocaleString("en-US")}
                  </td>
                  <td className="govuk-table__cell govuk-table__cell--numeric tabular-nums">
                    {p?.latest?.close != null ? (
                      <>
                        <span>${p.latest.close.toFixed(2)}</span>
                        {change != null && (
                          <span className="ml-1" style={{ color: change >= 0 ? "#0f7a52" : "#ca3535" }}>
                            {change >= 0 ? "+" : ""}
                            {change.toFixed(1)}%
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="text-[#505a5f]">—</span>
                    )}
                  </td>
                  <td className="govuk-table__cell govuk-table__cell--numeric tabular-nums text-[#505a5f]">
                    {t.filer_count}
                  </td>
                  <td className="govuk-table__cell govuk-table__cell--numeric tabular-nums whitespace-nowrap">
                    <span style={{ color: "#0f7a52" }}>{t.purchases}</span>
                    <span className="text-[#b1b4b6] mx-[2px]">/</span>
                    <span style={{ color: "#ca3535" }}>{t.sales}</span>
                  </td>
                  <td className="govuk-table__cell govuk-table__cell--numeric tabular-nums text-[#505a5f]">
                    {fmtUSD(t.est_volume)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {filtered.length > 1000 && (
        <p className="govuk-hint text-center">
          Showing 1,000 of {fmtInt(filtered.length)} tickers. Narrow the search to see the rest.
        </p>
      )}
    </div>
  );
}
