import React, { useMemo } from "react";
import { navigate } from "../router";
import { dateInAdmin, findAdmin, fmtInt, fmtUSD, Link, RowLink, SectionHeader } from "../ui";
import { FilerAvatar } from "./TablePrimitives";

// Trump II cabinet spotlight. Surfaces executive-branch officials with any
// disclosed activity since the 2025 inauguration. Ordered by est. volume,
// which is more telling than raw trade counts for senior officials who may
// trade large one-off positions rather than many small ones.
//
// Inspired by open-cabinet.org's "What is Trump's cabinet buying?" hero block.

// GOV.UK buy/sell text colours.
const BUY = "text-[#0f7a52]";
const SELL = "text-[#ca3535]";

export default function CabinetSpotlight({ filers, trades }) {
  const admin = findAdmin("trump2");

  const spotlight = useMemo(() => {
    const byFiler = new Map();
    let totalTrades = 0,
      totalLate = 0,
      totalVol = 0;
    const tickerCount = new Map();
    for (const t of trades) {
      if (!dateInAdmin(t.transaction_date, admin)) continue;
      const fid = t.filer_id;
      if (!fid) continue;
      const filer = filers.find((f) => f.id === fid);
      if (!filer || filer.branch !== "executive") continue;
      if (!byFiler.has(fid)) {
        byFiler.set(fid, {
          id: fid,
          name: t.filer_name,
          agency: filer.agency,
          level: filer.level,
          photo_url: filer.photo_url,
          branch: filer.branch,
          trades: 0,
          buys: 0,
          sells: 0,
          volume: 0,
          late: 0,
          latest: null,
        });
      }
      const e = byFiler.get(fid);
      e.trades++;
      totalTrades++;
      const tt = (t.transaction_type || "").toLowerCase();
      if (tt.includes("urchase") || tt === "p") e.buys++;
      else if (tt.includes("ale") || tt === "s") e.sells++;
      const mid = t.amount_range_low && t.amount_range_high ? (t.amount_range_low + t.amount_range_high) / 2 : 0;
      e.volume += mid;
      totalVol += mid;
      if (t.is_late) {
        e.late++;
        totalLate++;
      }
      if (!e.latest || (t.filing_date && t.filing_date > e.latest)) e.latest = t.filing_date;
      if (t.ticker) tickerCount.set(t.ticker, (tickerCount.get(t.ticker) || 0) + 1);
    }
    const officials = [...byFiler.values()].sort((a, b) => b.volume - a.volume);
    const topTickers = [...tickerCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
    return { officials, totalTrades, totalLate, totalVol, topTickers };
  }, [filers, trades, admin]);

  if (spotlight.officials.length === 0) return null;

  return (
    <div>
      <SectionHeader
        title="Cabinet activity"
        subtitle={`${fmtInt(spotlight.officials.length)} officials · ${fmtInt(spotlight.totalTrades)} trades · ${fmtUSD(spotlight.totalVol)} since 2025-01-20`}
        right={<Link to="/filers?admin=trump2&branch=executive">See all</Link>}
      />
      {/* Mobile/tablet: stacked rows inside a square bordered panel. */}
      <div className="lg:hidden border border-[#b1b4b6] bg-white">
        <div className="divide-y divide-[#b1b4b6]">
          {spotlight.officials.slice(0, 10).map((o, i) => {
            const netBias = o.trades ? ((o.buys - o.sells) / o.trades) * 100 : 0;
            return (
              <RowLink
                key={o.id}
                to={`/filer/${o.id}`}
                className="block w-full px-3 py-3 text-left text-[#0b0c0c] no-underline hover:bg-[#f3f2f1]"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className="text-mini text-[#505a5f] tabular-nums w-5 shrink-0 text-right">{i + 1}</span>
                    <FilerAvatar filer={o} size={28} />
                    <div className="min-w-0">
                      <div className="text-small text-[#0b0c0c] font-bold truncate">{o.name}</div>
                      <div className="text-mini text-[#505a5f] truncate mt-[1px]">
                        {o.level || "Official"}
                        {o.agency ? ` · ${o.agency}` : ""}
                      </div>
                    </div>
                  </div>
                  <div className="text-right shrink-0 tabular-nums">
                    <div className="text-small text-[#0b0c0c] font-bold">{fmtUSD(o.volume)}</div>
                    <div className="text-mini text-[#505a5f] mt-[1px]">{fmtInt(o.trades)} trades</div>
                  </div>
                </div>
                <div className="mt-1.5 ml-7 flex items-center gap-2 text-mini tabular-nums text-[#505a5f]">
                  <span>
                    <span className={BUY}>{o.buys}</span>
                    <span className="mx-[2px]">/</span>
                    <span className={SELL}>{o.sells}</span>
                  </span>
                  <span className={netBias > 20 ? BUY : netBias < -20 ? SELL : "text-[#505a5f]"}>
                    {netBias > 20 ? "buy bias" : netBias < -20 ? "sell bias" : "balanced"}
                  </span>
                </div>
              </RowLink>
            );
          })}
        </div>
      </div>
      {/* Desktop: semantic GOV.UK table. */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="govuk-table" style={{ marginBottom: 0 }}>
          <thead className="govuk-table__head">
            <tr className="govuk-table__row">
              <th scope="col" className="govuk-table__header govuk-table__header--numeric w-[40px]">
                #
              </th>
              <th scope="col" className="govuk-table__header">
                Official
              </th>
              <th scope="col" className="govuk-table__header">
                Agency
              </th>
              <th scope="col" className="govuk-table__header govuk-table__header--numeric">
                Trades
              </th>
              <th scope="col" className="govuk-table__header govuk-table__header--numeric">
                Buy / Sell · bias
              </th>
              <th scope="col" className="govuk-table__header govuk-table__header--numeric">
                Est. volume
              </th>
            </tr>
          </thead>
          <tbody className="govuk-table__body">
            {spotlight.officials.slice(0, 10).map((o, i) => {
              const netBias = o.trades ? ((o.buys - o.sells) / o.trades) * 100 : 0;
              const biasArrow = netBias > 20 ? "↑" : netBias < -20 ? "↓" : "•";
              const biasTone = netBias > 20 ? BUY : netBias < -20 ? SELL : "text-[#505a5f]";
              return (
                <tr
                  key={o.id}
                  className="govuk-table__row hover:bg-[#f3f2f1] cursor-pointer"
                  onClick={(e) => {
                    // Anchors handle their own navigation (incl. cmd/ctrl-click).
                    if (e.target.closest("a") || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
                    navigate(`/filer/${o.id}`);
                  }}
                >
                  <td className="govuk-table__cell govuk-table__cell--numeric text-[#505a5f] tabular-nums">{i + 1}</td>
                  <td className="govuk-table__cell">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <FilerAvatar filer={o} size={28} />
                      <div className="min-w-0">
                        <RowLink to={`/filer/${o.id}`} className="govuk-link font-bold truncate">
                          {o.name}
                        </RowLink>
                        <div className="text-mini text-[#505a5f] truncate">{o.level || "Official"}</div>
                      </div>
                    </div>
                  </td>
                  <td className="govuk-table__cell text-[#505a5f]">{o.agency || "—"}</td>
                  <td className="govuk-table__cell govuk-table__cell--numeric tabular-nums">{fmtInt(o.trades)}</td>
                  <td className="govuk-table__cell govuk-table__cell--numeric">
                    <span className="inline-flex items-center justify-end gap-2">
                      <span className="tabular-nums whitespace-nowrap">
                        <span className={BUY}>{o.buys}</span>
                        <span className="text-[#505a5f] mx-[2px]">/</span>
                        <span className={SELL}>{o.sells}</span>
                      </span>
                      <span
                        className={`tabular-nums w-[12px] text-center ${biasTone}`}
                        title={`Net bias ${netBias.toFixed(0)}%`}
                      >
                        {biasArrow}
                      </span>
                    </span>
                  </td>
                  <td className="govuk-table__cell govuk-table__cell--numeric tabular-nums">{fmtUSD(o.volume)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
