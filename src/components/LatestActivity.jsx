import React, { useMemo } from "react";
import { bestAssetNameByTicker, cleanAssetName, fmtAmountRange, RowLink, TABLE_HEADER_CLS } from "../ui";
import { FilerAvatar } from "./TablePrimitives";
import { TickerBadge } from "./TickerBadge";

// Latest activity feed — last N filings, sorted by filing_date desc.
// Shows who just disclosed what, for the "check on the dataset" reader who
// wants a pulse on what came in today vs what the leaderboards surface.

function relativeDate(iso) {
  if (!iso) return "";
  const then = Date.parse(iso);
  if (!Number.isFinite(then)) return iso;
  const days = Math.round((Date.now() - then) / 86400_000);
  if (days <= 0) return "today";
  if (days === 1) return "1d ago";
  if (days < 30) return `${days}d ago`;
  const months = Math.round(days / 30);
  if (months < 12) return `${months}mo ago`;
  return iso;
}

export default function LatestActivity({ trades, limit = 12 }) {
  const rows = useMemo(() => {
    return [...trades]
      .filter((t) => t.filing_date)
      .sort((a, b) => (a.filing_date < b.filing_date ? 1 : a.filing_date > b.filing_date ? -1 : 0))
      .slice(0, limit);
  }, [trades, limit]);
  const bestNames = useMemo(() => bestAssetNameByTicker(trades), [trades]);

  if (!rows.length) return null;

  return (
    <div className="border border-[#b1b4b6] bg-white overflow-hidden">
      {/* Column header only renders at sm+ — mobile layout is a stacked card. */}
      <div
        className={`hidden sm:grid grid-cols-[minmax(0,1fr)_44px_74px_58px_60px] gap-2 px-4 py-[10px] border-b border-stroke items-center ${TABLE_HEADER_CLS}`}
      >
        <span>Filer</span>
        <span>Side</span>
        <span className="tabular-nums text-right">Amount</span>
        <span className="tabular-nums text-right">vs SPY</span>
        <span className="tabular-nums text-right">Filed</span>
      </div>
      <div className="divide-y divide-stroke_soft">
        {rows.map((t) => {
          const tt = (t.transaction_type || "").toLowerCase();
          const isBuy = tt.includes("urchase") || tt === "p";
          const isSell = tt.includes("ale") || tt === "s";
          const side = isBuy ? "Buy" : isSell ? "Sell" : (t.transaction_type || "—").slice(0, 5);
          const fullAsset = bestNames.get(t.ticker) || cleanAssetName(t.asset_name) || "";
          const sideColor = isBuy ? "text-buy" : isSell ? "text-sell" : "text-ink_muted";
          return (
            <RowLink
              key={t.id}
              to={t.filer_id ? `/filer/${t.filer_id}` : undefined}
              className="w-full px-3 sm:px-4 py-[10px] text-left hover:bg-muted block sm:grid sm:grid-cols-[minmax(0,1fr)_44px_74px_58px_60px] sm:gap-2 sm:items-center text-ink no-underline"
            >
              {/* Filer block — a SINGLE grid cell on desktop (col 1, 1fr) that
                  contains avatar + name + asset inline. On mobile this is a
                  3-row stack: name+time, ticker+company, then side/amount/alpha. */}
              <div className="flex items-start gap-2 min-w-0">
                <FilerAvatar filer={{ full_name: t.filer_name, chamber: t.chamber, branch: t.branch }} size={24} />
                <div className="min-w-0 flex-1">
                  <div className="text-small text-ink font-medium flex items-center gap-1.5 min-w-0">
                    <span className="truncate">{t.filer_name}</span>
                    {t.row_index != null && (
                      <span
                        className="text-mini text-ink_faint font-normal tabular-nums shrink-0"
                        title={`Filing row #${t.row_index}`}
                      >
                        #{t.row_index}
                      </span>
                    )}
                    {/* Mobile-only time, pinned right of the name row. */}
                    <span className="text-mini tabular-nums text-ink_muted ml-auto sm:hidden shrink-0">
                      {relativeDate(t.filing_date)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-[1px] min-w-0">
                    {t.ticker ? (
                      <TickerBadge ticker={t.ticker} size="sm" />
                    ) : (
                      <span className="text-mini text-ink_faint">—</span>
                    )}
                    <span className="text-mini text-ink_muted truncate" title={fullAsset}>
                      {fullAsset}
                    </span>
                  </div>
                  {/* Mobile-only side/amount/alpha row. */}
                  <div className="sm:hidden mt-1 flex items-baseline gap-1.5 whitespace-nowrap text-mini">
                    <span className={`font-medium ${sideColor}`}>{side}</span>
                    <span className="text-ink_faint">·</span>
                    <span className="tabular-nums text-ink" title={t.amount_range_label || undefined}>
                      {fmtAmountRange(t)}
                    </span>
                    {t.excess_since != null && (
                      <>
                        <span className="text-ink_faint">·</span>
                        <span className={`tabular-nums font-medium ${t.excess_since >= 0 ? "text-buy" : "text-sell"}`}>
                          {t.excess_since >= 0 ? "+" : ""}
                          {t.excess_since.toFixed(1)}% vs SPY
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Desktop-only grid cells — hidden on mobile (handled inline above). */}
              <span className={`hidden sm:inline text-mini font-medium ${sideColor}`}>{side}</span>
              <span
                className="hidden sm:inline text-small tabular-nums text-right text-ink whitespace-nowrap"
                title={t.amount_range_label || undefined}
              >
                {fmtAmountRange(t)}
              </span>
              <span
                className={`hidden sm:inline text-mini tabular-nums text-right whitespace-nowrap ${
                  t.excess_since == null ? "text-ink_faint" : t.excess_since >= 0 ? "text-buy" : "text-sell"
                }`}
                title="Stock's excess return vs SPY since the transaction date"
              >
                {t.excess_since == null ? "—" : `${t.excess_since >= 0 ? "+" : ""}${t.excess_since.toFixed(1)}%`}
              </span>
              <span className="hidden sm:inline text-mini tabular-nums text-right text-ink_muted whitespace-nowrap">
                {relativeDate(t.filing_date)}
              </span>
            </RowLink>
          );
        })}
      </div>
    </div>
  );
}
