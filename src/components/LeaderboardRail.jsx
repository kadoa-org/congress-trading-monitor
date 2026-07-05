import React, { useMemo } from "react";
import { fmtInt, fmtUSD, RowLink } from "../ui";
import { FilerAvatar } from "./TablePrimitives";
import { TickerBadge } from "./TickerBadge";

// Five editorial "podium" cards answering the five questions most readers bring:
// who trades most, who earns most, which stock is hot, who has the best hit rate,
// what's the biggest single trade.

// Compact KPI cell in the GOV.UK idiom: a square 1px #b1b4b6 bordered white
// panel — no radius, no shadow. Renders identically on every breakpoint — the
// parent grid controls 2-column on mobile vs 5-column on desktop.
//
// Renders as a RowLink when `to` is set (whole-card cmd+clickable) or a
// plain div otherwise. Optional className is appended so callers can grant
// individual cards col-span on mobile.
function Card({ children, to, className = "" }) {
  const base = "text-left p-3 border border-[#b1b4b6] bg-white flex flex-col gap-1 h-full min-w-0";
  if (to) {
    return (
      <RowLink to={to} className={`${base} text-[#0b0c0c] no-underline hover:bg-[#f3f2f1] ${className}`}>
        {children}
      </RowLink>
    );
  }
  return <div className={`${base} ${className}`}>{children}</div>;
}

// Panel label in govuk-hint styling (secondary #505a5f).
function Metric({ label }) {
  return (
    <span className="govuk-hint truncate" style={{ marginBottom: 0, fontSize: "14px" }}>
      {label}
    </span>
  );
}

export default function LeaderboardRail({ filers = [], returns = [], trades = [], prices = {}, stats = {} }) {
  const data = useMemo(() => {
    // Most active
    const topActive = [...filers].sort((a, b) => b.trade_count - a.trade_count)[0];
    const mostActive = topActive ? { ...topActive, metric: topActive.trade_count } : null;

    // Highest alpha
    const topAlpha = [...returns].sort((a, b) => b.weighted_excess - a.weighted_excess)[0];
    const highestAlpha = topAlpha
      ? {
          ...(filers.find((x) => x.id === topAlpha.id) || topAlpha),
          metric: topAlpha.weighted_excess,
          scored_buys: topAlpha.scored_buys,
        }
      : null;

    // Hot stock (60d): >=5 trades in last 60 days, pick highest trade count
    let hottestStock = null;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 60);
    const cutoffStr = cutoff.toISOString().slice(0, 10);
    const recent = new Map();
    for (const t of trades) {
      if (!t.ticker || !t.transaction_date) continue;
      if (t.transaction_date < cutoffStr) continue;
      recent.set(t.ticker, (recent.get(t.ticker) || 0) + 1);
    }
    let bestTicker = null;
    let bestScore = 0;
    for (const [tk, n] of recent) {
      if (n >= 5 && n > bestScore) {
        bestScore = n;
        bestTicker = tk;
      }
    }
    if (bestTicker) {
      const p = prices[bestTicker];
      const change = p?.latest && p?.previous ? ((p.latest.close - p.previous.close) / p.previous.close) * 100 : null;
      hottestStock = { ticker: bestTicker, trades: bestScore, change };
    }

    // Best hit rate — filers with >=20 scored buys, highest % beating SPY
    const byFiler = new Map();
    for (const t of trades) {
      const tt = (t.transaction_type || "").toLowerCase();
      const isBuy = tt.includes("urchase") || tt === "p";
      if (!isBuy || t.excess_since == null || !t.filer_id) continue;
      if (!byFiler.has(t.filer_id)) byFiler.set(t.filer_id, { scored: 0, wins: 0 });
      const e = byFiler.get(t.filer_id);
      e.scored++;
      if (t.excess_since > 0) e.wins++;
    }
    let bestHitRate = null;
    let bestRate = 0;
    for (const [id, stats] of byFiler) {
      if (stats.scored < 20) continue;
      const rate = stats.wins / stats.scored;
      if (rate > bestRate) {
        bestRate = rate;
        const f = filers.find((x) => x.id === id);
        if (f) bestHitRate = { ...f, metric: rate, scored: stats.scored, wins: stats.wins };
      }
    }

    // Biggest single trade
    let best = null;
    let bestMid = 0;
    for (const t of trades) {
      if (!t.amount_range_low || !t.amount_range_high) continue;
      const mid = (t.amount_range_low + t.amount_range_high) / 2;
      if (mid > bestMid) {
        bestMid = mid;
        best = t;
      }
    }
    const biggestTrade = best
      ? {
          filer: filers.find((x) => x.id === best.filer_id),
          filer_name: best.filer_name,
          ticker: best.ticker,
          mid: bestMid,
          date: best.transaction_date,
        }
      : null;

    return { mostActive, highestAlpha, hottestStock, bestHitRate, biggestTrade };
  }, [filers, returns, trades, prices]);

  // Mobile: 2-column grid. The 5th cell (Biggest trade) spans both columns
  // on the bottom row so it has room for the larger headline number and the
  // filer/date sub-line without truncating awkwardly. Desktop is unchanged
  // — single row of 5 equal cards.
  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-2 md:gap-3 auto-rows-fr">
      {data.mostActive && (
        <Card to={`/filer/${data.mostActive.id}`}>
          <Metric label="Most active" />
          <div className="flex items-center gap-2 min-w-0">
            <FilerAvatar filer={data.mostActive} size={24} />
            <div className="min-w-0 flex-1">
              <div className="text-small font-bold text-[#0b0c0c] truncate">{data.mostActive.full_name}</div>
              <div className="text-mini text-[#505a5f] tabular-nums">{fmtInt(data.mostActive.metric)} trades</div>
            </div>
          </div>
        </Card>
      )}

      {data.highestAlpha && (
        <Card to={`/filer/${data.highestAlpha.id}`}>
          <Metric label="Biggest outperformer" />
          <div className="flex items-center gap-2 min-w-0">
            <FilerAvatar filer={data.highestAlpha} size={24} />
            <div className="min-w-0 flex-1">
              <div className="text-small font-bold text-[#0b0c0c] truncate">{data.highestAlpha.full_name}</div>
              <div className="text-mini tabular-nums truncate">
                <span
                  className={data.highestAlpha.metric >= 0 ? "text-[#0f7a52] font-bold" : "text-[#ca3535] font-bold"}
                >
                  {data.highestAlpha.metric >= 0 ? "+" : ""}
                  {data.highestAlpha.metric.toFixed(0)}%
                </span>
                <span className="text-[#505a5f]"> vs SPY</span>
              </div>
            </div>
          </div>
        </Card>
      )}

      {data.hottestStock && (
        <Card to={`/ticker/${data.hottestStock.ticker}`}>
          <Metric label="Hot stock (60d)" />
          <div className="flex items-center gap-2 min-w-0">
            <TickerBadge ticker={data.hottestStock.ticker} size="sm" />
            {data.hottestStock.change != null && (
              <span
                className={`text-small tabular-nums font-bold ${data.hottestStock.change >= 0 ? "text-[#0f7a52]" : "text-[#ca3535]"}`}
              >
                {data.hottestStock.change >= 0 ? "+" : ""}
                {data.hottestStock.change.toFixed(1)}%
              </span>
            )}
          </div>
          <div className="text-mini text-[#505a5f] tabular-nums truncate">
            {fmtInt(data.hottestStock.trades)} trades · 60d
          </div>
        </Card>
      )}

      {stats?.disclosureLag?.medianDaysToFile != null && (
        <Card>
          <Metric label="Disclosure lag" />
          <div className="flex items-baseline gap-1.5 min-w-0">
            <span className="govuk-heading-m tabular-nums" style={{ marginBottom: 0 }}>
              {stats.disclosureLag.medianDaysToFile}d
            </span>
            <span className="text-mini text-[#505a5f] truncate">median · 45d cap</span>
          </div>
          <div className="text-mini tabular-nums truncate">
            <span className="text-[#ca3535] font-bold">
              {((stats.disclosureLag.lateCount / stats.disclosureLag.tradesWithLag) * 100).toFixed(0)}%
            </span>
            <span className="text-[#505a5f]"> late</span>
          </div>
        </Card>
      )}

      {data.biggestTrade && (
        <Card
          to={data.biggestTrade.filer ? `/filer/${data.biggestTrade.filer.id}` : undefined}
          className="col-span-2 md:col-span-1"
        >
          <Metric label="Biggest single trade" />
          <div className="flex items-center gap-2 min-w-0">
            <span className="govuk-heading-m tabular-nums" style={{ marginBottom: 0 }}>
              {fmtUSD(data.biggestTrade.mid)}
            </span>
            {data.biggestTrade.ticker && <TickerBadge ticker={data.biggestTrade.ticker} size="sm" />}
          </div>
          <div className="text-mini text-[#505a5f] truncate">
            {data.biggestTrade.filer_name}
            {data.biggestTrade.date && <span> · {data.biggestTrade.date}</span>}
          </div>
        </Card>
      )}
    </div>
  );
}
