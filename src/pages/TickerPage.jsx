import React, { useEffect, useMemo, useState } from "react";
import FilterBar, { applyFilters, defaultFilters } from "../components/FilterBar";
import PersonalTimeline from "../components/PersonalTimeline";
import { FilerAvatar } from "../components/TablePrimitives";
import TradesTable from "../TradesTable";
import { bestAssetNameByTicker, Card, fmtInt, fmtUSD, Link, RowLink, SectionHeader } from "../ui";

export default function TickerPage({ symbol, filersById }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState(defaultFilters);

  useEffect(() => {
    setData(null);
    setError(null);
    fetch(`/data/ticker/${encodeURIComponent(symbol)}.json`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then(setData)
      .catch(setError);
  }, [symbol]);

  const trades = data?.trades ?? [];
  const ticker = data?.ticker ?? symbol;
  const price = data?.price ?? null;
  const fullName = useMemo(() => bestAssetNameByTicker(trades).get(ticker) ?? null, [trades, ticker]);

  const stats = useMemo(() => {
    let buys = 0,
      sells = 0,
      late = 0,
      vol = 0,
      excessSum = 0,
      excessCount = 0;
    const byFiler = new Map();
    for (const t of trades) {
      const tt = (t.transaction_type || "").toLowerCase();
      const isBuy = tt.includes("urchase") || tt === "p";
      const isSell = tt.includes("ale") || tt === "s";
      if (isBuy) buys++;
      else if (isSell) sells++;
      if (t.is_late) late++;
      if (t.amount_range_low && t.amount_range_high) vol += (t.amount_range_low + t.amount_range_high) / 2;
      if (t.excess_since != null) {
        excessSum += t.excess_since;
        excessCount++;
      }
      if (!byFiler.has(t.filer_id))
        byFiler.set(t.filer_id, {
          id: t.filer_id,
          name: t.filer_name,
          chamber: t.chamber,
          branch: t.branch,
          party: t.party,
          count: 0,
          buys: 0,
          sells: 0,
          vol: 0,
        });
      const f = byFiler.get(t.filer_id);
      f.count++;
      if (isBuy) f.buys++;
      else if (isSell) f.sells++;
      if (t.amount_range_low && t.amount_range_high) f.vol += (t.amount_range_low + t.amount_range_high) / 2;
    }
    const avgExcess = excessCount > 0 ? excessSum / excessCount : null;
    const topFilers = [...byFiler.values()].sort((a, b) => b.count - a.count).slice(0, 12);
    return {
      buys,
      sells,
      late,
      vol,
      count: trades.length,
      filerCount: byFiler.size,
      topFilers,
      avgExcess,
      scored: excessCount,
    };
  }, [trades]);

  const filtered = useMemo(() => applyFilters(trades, filters), [trades, filters]);

  if (error) {
    return (
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-16">
        <p className="govuk-body">
          No trades found for <strong>{symbol}</strong>.
        </p>
        <Link to="/" className="govuk-body inline-block">
          ← Back to all trades
        </Link>
      </div>
    );
  }

  if (!data) {
    return <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-16 govuk-body text-[#505a5f]">Loading…</div>;
  }

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 pt-8 pb-16">
      <nav className="govuk-breadcrumbs mb-6" aria-label="Breadcrumb" style={{ marginTop: 0 }}>
        <ol className="govuk-breadcrumbs__list">
          <li className="govuk-breadcrumbs__list-item">
            <Link to="/" className="govuk-breadcrumbs__link">
              Overview
            </Link>
          </li>
          <li className="govuk-breadcrumbs__list-item">
            <Link to="/tickers" className="govuk-breadcrumbs__link">
              Tickers
            </Link>
          </li>
          <li className="govuk-breadcrumbs__list-item" aria-current="page">
            {ticker}
          </li>
        </ol>
      </nav>

      <div className="flex items-start justify-between flex-wrap gap-4 mb-8">
        <div className="min-w-0">
          <h1 className="govuk-heading-xl" style={{ marginBottom: 5 }}>
            {ticker}
          </h1>
          {fullName && (
            <p className="govuk-hint" style={{ marginBottom: 5 }} title={fullName}>
              {fullName}
            </p>
          )}
          <p className="govuk-body-s" style={{ color: "#505a5f", marginBottom: 0 }}>
            traded by <strong style={{ color: "#0b0c0c" }}>{stats.filerCount}</strong> filers,{" "}
            <strong style={{ color: "#0b0c0c" }}>{fmtInt(stats.count)}</strong> times
            <a
              href={`https://finance.yahoo.com/quote/${encodeURIComponent(ticker)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="govuk-link ml-2"
              title={`Open ${ticker} on Yahoo Finance`}
            >
              Yahoo Finance ↗
            </a>
          </p>
        </div>
        {price && <PriceTicker price={price} />}
      </div>

      <dl className="govuk-summary-list mb-8" style={{ maxWidth: 640 }}>
        <div className="govuk-summary-list__row">
          <dt className="govuk-summary-list__key">Trades</dt>
          <dd className="govuk-summary-list__value tabular-nums">{fmtInt(stats.count)}</dd>
        </div>
        <div className="govuk-summary-list__row">
          <dt className="govuk-summary-list__key">Buys</dt>
          <dd className="govuk-summary-list__value tabular-nums" style={{ color: "#0f7a52" }}>
            {fmtInt(stats.buys)}
          </dd>
        </div>
        <div className="govuk-summary-list__row">
          <dt className="govuk-summary-list__key">Sells</dt>
          <dd className="govuk-summary-list__value tabular-nums" style={{ color: "#ca3535" }}>
            {fmtInt(stats.sells)}
          </dd>
        </div>
        <div className="govuk-summary-list__row">
          <dt className="govuk-summary-list__key">Est. volume</dt>
          <dd className="govuk-summary-list__value tabular-nums">{fmtUSD(stats.vol)}</dd>
        </div>
        <div className="govuk-summary-list__row">
          <dt className="govuk-summary-list__key">Late filings</dt>
          <dd className="govuk-summary-list__value tabular-nums">{fmtInt(stats.late)}</dd>
        </div>
        {stats.avgExcess != null && (
          <div className="govuk-summary-list__row">
            <dt className="govuk-summary-list__key">Avg cumulative vs SPY</dt>
            <dd className="govuk-summary-list__value tabular-nums">
              <span style={{ color: stats.avgExcess >= 0 ? "#0f7a52" : "#ca3535" }}>
                {stats.avgExcess >= 0 ? "+" : ""}
                {stats.avgExcess.toFixed(0)}%
              </span>
              <span className="govuk-hint" style={{ marginBottom: 0, display: "block" }}>
                {stats.scored} scored buys, trade-date to today
              </span>
            </dd>
          </div>
        )}
      </dl>

      <div className="mb-8">
        <SectionHeader title="Trade timeline" />
        <Card className="p-4">
          <PersonalTimeline trades={trades} highlightTicker={ticker} />
        </Card>
      </div>

      <div className="mb-10">
        <SectionHeader title="Top holders" subtitle="Ranked by number of trades in this ticker" />
        <Card className="overflow-hidden">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 divide-x divide-y divide-[#b1b4b6]">
            {stats.topFilers.map((f) => {
              const lookup = filersById?.get?.(f.id) ?? { full_name: f.name, chamber: f.chamber, branch: f.branch };
              return (
                <RowLink
                  key={f.id}
                  to={`/filer/${f.id}`}
                  className="px-4 py-[10px] flex items-center gap-2.5 hover:bg-[#f3f2f1] text-left min-w-0 text-[#0b0c0c] no-underline"
                >
                  <FilerAvatar filer={lookup} size={28} />
                  <div className="flex-1 min-w-0">
                    <div className="text-[16px] font-bold text-[#0b0c0c] truncate">{f.name}</div>
                    <div className="text-[14px] text-[#505a5f] tabular-nums whitespace-nowrap mt-[1px]">
                      {f.count} · {fmtUSD(f.vol)}
                    </div>
                  </div>
                </RowLink>
              );
            })}
          </div>
        </Card>
      </div>

      <SectionHeader title="All trades" subtitle={`${fmtInt(filtered.length)} of ${fmtInt(trades.length)}`} />
      <div className="mb-4">
        <FilterBar filters={filters} setFilters={setFilters} trades={trades} />
      </div>
      <TradesTable trades={filtered} tall filersById={filersById} />
    </div>
  );
}

function PriceTicker({ price }) {
  const last = price.latest?.close ?? null;
  const prev = price.previous?.close ?? null;
  const change = last != null && prev != null ? ((last - prev) / prev) * 100 : null;
  const tone = change == null ? "#505a5f" : change >= 0 ? "#0f7a52" : "#ca3535";
  return (
    <div className="text-right">
      <div className="text-[16px] text-[#505a5f]">
        Last close <span className="tabular-nums">{price.latest?.date ?? "—"}</span>
      </div>
      <div className="flex items-baseline gap-2 justify-end">
        <span className="text-[1.25rem] font-bold tabular-nums text-[#0b0c0c]">
          ${last != null ? last.toFixed(2) : "—"}
        </span>
        <span className="text-[16px] font-bold tabular-nums" style={{ color: tone }}>
          {change == null ? "" : `${change >= 0 ? "+" : ""}${change.toFixed(2)}%`}
        </span>
      </div>
    </div>
  );
}
