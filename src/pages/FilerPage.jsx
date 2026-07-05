import React, { useEffect, useMemo, useState } from "react";
import FilterBar, { applyFilters, defaultFilters } from "../components/FilterBar";
import PersonalTimeline from "../components/PersonalTimeline";
import { FilerAvatar as AvatarPrimitive } from "../components/TablePrimitives";
import { TickerBadge, TickerLabel } from "../components/TickerBadge";
import TradesTable from "../TradesTable";
import {
  bestAssetNameByTicker,
  branchPill,
  Card,
  cleanAssetName,
  fmtAmountRange,
  fmtInt,
  fmtUSD,
  Link,
  Pill,
  RowLink,
  SectionHeader,
  SourceLink,
} from "../ui";

// data-kit palette for data colouring (green = buy/positive, red = sell/negative).
const GREEN = "text-[#0f7a52]";
const RED = "text-[#ca3535]";

function role(f) {
  if (!f) return "";
  if (f.branch === "executive") return `${f.level ?? ""} ${f.agency ?? ""}`.trim() || "Executive branch official";
  // Prefer the detailed "U.S. Representative · CA-12" office if we have it; fall back to chamber+state.
  if (f.office) {
    const parts = [f.office];
    if (f.party) parts.push(f.party);
    return parts.join(" · ");
  }
  return `${f.chamber === "senate" ? "U.S. Senate" : "U.S. House"}${f.party ? " · " + f.party : ""}${f.state ? " · " + f.state : ""}`;
}

export default function FilerPage({ filerId, filersIndex, filersById, prices: pricesProp, returns = [] }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState(defaultFilters);
  const prices = pricesProp ?? {};

  useEffect(() => {
    setData(null);
    setError(null);
    fetch(`/data/filer/${encodeURIComponent(filerId)}.json`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then(setData)
      .catch(setError);
  }, [filerId]);

  const filer = data?.filer ?? null;
  const trades = data?.trades ?? [];

  const stats = useMemo(() => {
    let buys = 0;
    let sells = 0;
    let late = 0;
    let volume = 0;
    const byTicker = new Map();
    const lagValues = [];
    let earliest = null;
    let latest = null;
    let excessSum = 0;
    let excessWeight = 0;
    let scoredBuys = 0;
    let wins = 0; // scored buys with excess > 0
    for (const t of trades) {
      const tt = (t.transaction_type || "").toLowerCase();
      const isBuy = tt.includes("urchase") || tt === "p";
      const isSell = tt.includes("ale") || tt === "s";
      if (isBuy) buys++;
      else if (isSell) sells++;
      if (t.is_late) late++;
      if (t.days_to_file != null && t.days_to_file >= 0) lagValues.push(t.days_to_file);
      const mid = t.amount_range_low && t.amount_range_high ? (t.amount_range_low + t.amount_range_high) / 2 : null;
      if (mid) volume += mid;
      if (t.ticker) {
        if (!byTicker.has(t.ticker))
          byTicker.set(t.ticker, {
            ticker: t.ticker,
            buys: 0,
            sells: 0,
            total: 0,
            volume: 0,
            excessSum: 0,
            excessWeight: 0,
            contribSum: 0,
            wins: 0,
            scored: 0,
          });
        const e = byTicker.get(t.ticker);
        e.total++;
        if (isBuy) e.buys++;
        else if (isSell) e.sells++;
        if (mid) e.volume += mid;
        if (isBuy && t.excess_since != null && mid) {
          e.excessSum += t.excess_since * mid;
          e.excessWeight += mid;
          e.contribSum += t.excess_since * mid;
          e.scored++;
          if (t.excess_since > 0) e.wins++;
        }
      }
      if (t.transaction_date) {
        if (!earliest || t.transaction_date < earliest) earliest = t.transaction_date;
        if (!latest || t.transaction_date > latest) latest = t.transaction_date;
      }
      if (isBuy && t.excess_since != null && mid) {
        excessSum += t.excess_since * mid;
        excessWeight += mid;
        scoredBuys++;
        if (t.excess_since > 0) wins++;
      }
    }
    const weightedExcess = excessWeight > 0 ? excessSum / excessWeight : null;
    const hitRate = scoredBuys > 0 ? wins / scoredBuys : null;
    // Ticker-level attribution: weightedExcess within ticker, contribution share
    const tickerAttribution = [...byTicker.values()].map((e) => ({
      ...e,
      tickerAlpha: e.excessWeight > 0 ? e.excessSum / e.excessWeight : null,
      tickerHitRate: e.scored > 0 ? e.wins / e.scored : null,
    }));
    const totalContribAbs = tickerAttribution.reduce((s, e) => s + Math.abs(e.contribSum), 0);
    for (const e of tickerAttribution) {
      e.contribShare = totalContribAbs > 0 ? (Math.abs(e.contribSum) / totalContribAbs) * 100 : 0;
      e.signedContribShare = totalContribAbs > 0 ? (e.contribSum / totalContribAbs) * 100 : 0;
    }
    tickerAttribution.sort((a, b) => Math.abs(b.contribSum) - Math.abs(a.contribSum));
    const topTickers = [...byTicker.values()].sort((a, b) => b.total - a.total).slice(0, 10);

    // Which individual purchases drive the weighted alpha? Each scored buy
    // contributes (mid * excess_since) to the numerator of weightedExcess.
    // Ranking by |contribution| reveals whether the headline number is broad
    // skill or a handful of moonshots held to today.
    const alphaDrivers = [];
    if (excessWeight > 0) {
      const totalContribAbs = trades.reduce((s, t) => {
        const tt = (t.transaction_type || "").toLowerCase();
        const isBuy = tt.includes("urchase") || tt === "p";
        const mid = t.amount_range_low && t.amount_range_high ? (t.amount_range_low + t.amount_range_high) / 2 : null;
        if (isBuy && t.excess_since != null && mid) return s + Math.abs(t.excess_since * mid);
        return s;
      }, 0);
      for (const t of trades) {
        const tt = (t.transaction_type || "").toLowerCase();
        const isBuy = tt.includes("urchase") || tt === "p";
        const mid = t.amount_range_low && t.amount_range_high ? (t.amount_range_low + t.amount_range_high) / 2 : null;
        if (!isBuy || t.excess_since == null || !mid || !t.transaction_date) continue;
        const contribution = t.excess_since * mid;
        alphaDrivers.push({
          id: t.id,
          ticker: t.ticker,
          asset_name: t.asset_name,
          comment: t.comment,
          transaction_date: t.transaction_date,
          mid,
          amount_range_low: t.amount_range_low,
          amount_range_high: t.amount_range_high,
          amount_range_label: t.amount_range_label,
          row_index: t.row_index,
          excess: t.excess_since,
          ret: t.ret_since,
          doc_url: t.doc_url,
          contribution,
          share: totalContribAbs > 0 ? (Math.abs(contribution) / totalContribAbs) * 100 : 0,
        });
      }
      alphaDrivers.sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution));
    }
    const sortedLag = [...lagValues].sort((a, b) => a - b);
    const medianLag = sortedLag.length ? sortedLag[Math.floor((sortedLag.length - 1) * 0.5)] : null;
    return {
      buys,
      sells,
      late,
      volume,
      topTickers,
      tickerAttribution,
      earliest,
      latest,
      count: trades.length,
      weightedExcess,
      scoredBuys,
      wins,
      hitRate,
      alphaDrivers,
      medianLag,
      lateShare: lagValues.length ? late / lagValues.length : null,
    };
  }, [trades]);

  // Peer rank among all filers with enough scored buys to be comparable.
  // Matches the ReturnsLeaderboard threshold (driven by server-side returns.json).
  const peerContext = useMemo(() => {
    if (!returns || returns.length === 0 || stats.weightedExcess == null) return null;
    const sorted = [...returns].sort((a, b) => b.weighted_excess - a.weighted_excess);
    const idx = sorted.findIndex((r) => r.id === filerId);
    if (idx === -1) return { total: sorted.length, rank: null };
    return { total: sorted.length, rank: idx + 1 };
  }, [returns, filerId, stats.weightedExcess]);

  const filtered = useMemo(() => {
    if (!filer) return [];
    const enriched = trades.map((t) => ({
      ...t,
      filer_name: filer.full_name,
      chamber: filer.chamber,
      party: filer.party,
      state: filer.state,
      agency: filer.agency,
      level: filer.level,
    }));
    return applyFilters(enriched, filters);
  }, [trades, filters, filer]);

  if (error) {
    const fallback = filersIndex?.find((f) => f.id === filerId);
    const isMissing = !fallback;
    return (
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-16">
        <h1 className="govuk-heading-m">{isMissing ? "Filer not found" : "No parsed trades for this filer yet"}</h1>
        <p className="govuk-body text-[#505a5f]">
          {isMissing ? (
            <>
              No filer matches <span className="font-mono text-[#0b0c0c]">{filerId}</span>. It may have been deduped
              into a canonical record, renamed, or the URL was mistyped.
            </>
          ) : (
            <>
              They appear in the dataset (<span className="font-bold text-[#0b0c0c]">{fallback.full_name}</span>) but
              their PTRs are image-based PDFs that still need OCR.
            </>
          )}
        </p>
        <Link to="/filers" className="mt-3 inline-block">
          ← Browse all filers
        </Link>
      </div>
    );
  }

  if (!data || !filer) {
    return <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-16 govuk-body text-[#505a5f]">Loading…</div>;
  }

  const meta = branchPill(filer);
  const coverageStart = stats.earliest?.slice(0, 7);
  const coverageEnd = stats.latest?.slice(0, 7);

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 pt-6 pb-16">
      <nav className="govuk-breadcrumbs" aria-label="Breadcrumb" style={{ marginTop: 0, marginBottom: 20 }}>
        <ol className="govuk-breadcrumbs__list">
          <li className="govuk-breadcrumbs__list-item">
            <RowLink to="/" className="govuk-breadcrumbs__link">
              Overview
            </RowLink>
          </li>
          <li className="govuk-breadcrumbs__list-item">
            <RowLink to="/filers" className="govuk-breadcrumbs__link">
              Filers
            </RowLink>
          </li>
          <li className="govuk-breadcrumbs__list-item" aria-current="page">
            {filer.full_name}
          </li>
        </ol>
      </nav>

      {/* Hero: avatar, name as page heading, role/office line as hint, branch tag. */}
      <div className="flex items-center gap-3 mb-6">
        <AvatarPrimitive filer={filer} size={44} />
        <div className="min-w-0">
          <h1 className="govuk-heading-l" style={{ marginBottom: 2 }}>
            {filer.full_name}{" "}
            <span className="align-middle inline-block" style={{ verticalAlign: "middle" }}>
              <Pill tone={meta.tone}>{meta.label}</Pill>
            </span>
          </h1>
          <p className="govuk-hint" style={{ marginBottom: 0 }}>
            {role(filer)}
            {coverageStart && (
              <span>
                {" "}
                · {coverageStart} → {coverageEnd}
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Key facts as a summary list. */}
      <dl className="govuk-summary-list" style={{ marginBottom: 40 }}>
        <FactRow label="Chamber">
          {filer.branch === "executive" ? "Executive branch" : filer.chamber === "senate" ? "Senate" : "House"}
        </FactRow>
        {filer.branch === "executive" && filer.agency && <FactRow label="Agency">{filer.agency}</FactRow>}
        <FactRow label="Party">{filer.party || "—"}</FactRow>
        <FactRow label="State">{filer.state || "—"}</FactRow>
        <FactRow label="Trades">
          <span className="tabular-nums">
            {fmtInt(stats.count)} (<span className={GREEN}>{stats.buys} buys</span> ·{" "}
            <span className={RED}>{stats.sells} sells</span>)
          </span>
        </FactRow>
        <FactRow label="Estimated volume">
          <span className="tabular-nums">{stats.volume ? fmtUSD(stats.volume) : "—"}</span>
        </FactRow>
        <FactRow label="Late filings">
          {stats.lateShare != null ? (
            <span
              className={`tabular-nums ${stats.lateShare >= 0.25 ? RED : ""}`}
              title={`${stats.late} of ${stats.count} filings were disclosed more than 45 days after the trade`}
            >
              {(stats.lateShare * 100).toFixed(0)}% ({stats.late} of {stats.count})
            </span>
          ) : (
            "—"
          )}
        </FactRow>
        {stats.medianLag != null && (
          <FactRow label="Median filing lag">
            <span className="tabular-nums">{stats.medianLag} days</span>
          </FactRow>
        )}
        {peerContext?.rank != null && (
          <FactRow label="Outperformance rank">
            <span className="tabular-nums">
              #{peerContext.rank} of {peerContext.total} ranked
            </span>
          </FactRow>
        )}
      </dl>

      <ImaginaryPortfolio trades={trades} />

      {stats.weightedExcess != null && stats.alphaDrivers && stats.alphaDrivers.length > 0 && (
        <AlphaDriversSection drivers={stats.alphaDrivers} trades={trades} />
      )}

      {stats.tickerAttribution && stats.tickerAttribution.filter((t) => t.ticker).length > 0 && (
        <TickerAttributionSection rows={stats.tickerAttribution.filter((t) => t.ticker)} />
      )}

      <div className="mb-10">
        <SectionHeader title="Timeline" />
        <Card className="p-4">
          <PersonalTimeline trades={trades} />
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

// One row of the key-facts summary list.
function FactRow({ label, children }) {
  return (
    <div className="govuk-summary-list__row">
      <dt className="govuk-summary-list__key">{label}</dt>
      <dd className="govuk-summary-list__value">{children}</dd>
    </div>
  );
}

// Performance by ticker: net contribution to weighted alpha per symbol.
// Quant desks want to see: 'is alpha from one lucky name or broad-based?'
function TickerAttributionSection({ rows }) {
  const top = rows.slice(0, 15);
  return (
    <div className="mb-10">
      <SectionHeader title="Performance by ticker" subtitle="Per-ticker contribution to weighted alpha" />
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="govuk-table" style={{ marginBottom: 0 }}>
            <thead className="govuk-table__head">
              <tr className="govuk-table__row">
                <th scope="col" className="govuk-table__header govuk-table__header--numeric">
                  #
                </th>
                <th scope="col" className="govuk-table__header">
                  Ticker
                </th>
                <th scope="col" className="govuk-table__header govuk-table__header--numeric">
                  Trades
                </th>
                <th scope="col" className="govuk-table__header govuk-table__header--numeric whitespace-nowrap">
                  Buy / Sell mix
                </th>
                <th scope="col" className="govuk-table__header govuk-table__header--numeric whitespace-nowrap">
                  Hit rate
                </th>
                <th scope="col" className="govuk-table__header govuk-table__header--numeric whitespace-nowrap">
                  vs SPY
                </th>
              </tr>
            </thead>
            <tbody className="govuk-table__body">
              {top.map((r, i) => {
                const alpha = r.tickerAlpha;
                return (
                  <tr key={r.ticker} className="govuk-table__row hover:bg-[#f3f2f1]">
                    <td className="govuk-table__cell govuk-table__cell--numeric tabular-nums text-[#505a5f]">
                      {i + 1}
                    </td>
                    <td className="govuk-table__cell">
                      <RowLink to={`/ticker/${r.ticker}`} className="inline-flex items-center no-underline">
                        <TickerLabel ticker={r.ticker} size="sm" />
                      </RowLink>
                    </td>
                    <td className="govuk-table__cell govuk-table__cell--numeric tabular-nums">{r.total}</td>
                    <td className="govuk-table__cell govuk-table__cell--numeric tabular-nums whitespace-nowrap">
                      <span className={GREEN}>{r.buys}</span>
                      <span className="text-[#b1b4b6] mx-[2px]">/</span>
                      <span className={RED}>{r.sells}</span>
                    </td>
                    <td
                      className={`govuk-table__cell govuk-table__cell--numeric tabular-nums whitespace-nowrap ${
                        r.tickerHitRate == null
                          ? "text-[#505a5f]"
                          : r.tickerHitRate >= 0.7
                            ? `${GREEN} font-bold`
                            : r.tickerHitRate <= 0.3
                              ? `${RED} font-bold`
                              : "text-[#505a5f]"
                      }`}
                    >
                      {r.tickerHitRate == null ? "—" : `${(r.tickerHitRate * 100).toFixed(0)}% · ${r.wins}/${r.scored}`}
                    </td>
                    <td
                      className={`govuk-table__cell govuk-table__cell--numeric tabular-nums font-bold whitespace-nowrap ${
                        alpha == null ? "text-[#505a5f]" : alpha >= 0 ? GREEN : RED
                      }`}
                    >
                      {alpha == null ? "—" : `${alpha >= 0 ? "+" : ""}${alpha.toFixed(0)}%`}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function holdingLabel(dateStr) {
  const then = Date.parse(dateStr);
  if (!Number.isFinite(then)) return "";
  const years = (Date.now() - then) / (365.25 * 86400_000);
  if (years < 1) return `${(years * 12).toFixed(0)}mo`;
  return `${years.toFixed(1)}y`;
}

function isLongHold(dateStr) {
  const then = Date.parse(dateStr);
  if (!Number.isFinite(then)) return false;
  const years = (Date.now() - then) / (365.25 * 86400_000);
  return years >= 3;
}

// "What drove this alpha" breakdown. Shows the top 8 purchases by absolute
// contribution to the weighted-alpha numerator, plus a headline that states
// how concentrated the excess return really is.
function AlphaDriversSection({ drivers, trades }) {
  const bestNames = useMemo(() => bestAssetNameByTicker(trades), [trades]);
  const top = drivers.slice(0, 8);
  const topShare = top.reduce((s, d) => s + d.share, 0);
  const topTicker = top[0]?.ticker;
  const topTickerShare = top.filter((d) => d.ticker === topTicker).reduce((s, d) => s + d.share, 0);

  const subtitle =
    topTicker && topTickerShare > 50
      ? `${topTickerShare.toFixed(0)}% from ${top.filter((d) => d.ticker === topTicker).length} ${topTicker} buys`
      : `Top ${top.length} positions = ${topShare.toFixed(0)}% of the weighted alpha`;

  return (
    <div className="mb-10">
      <SectionHeader title="What drove this alpha" subtitle={subtitle} />
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="govuk-table" style={{ marginBottom: 0 }}>
            <thead className="govuk-table__head">
              <tr className="govuk-table__row">
                <th scope="col" className="govuk-table__header govuk-table__header--numeric">
                  #
                </th>
                <th scope="col" className="govuk-table__header">
                  Ticker
                </th>
                <th scope="col" className="govuk-table__header">
                  Asset
                </th>
                <th scope="col" className="govuk-table__header govuk-table__header--numeric">
                  Bought
                </th>
                <th scope="col" className="govuk-table__header govuk-table__header--numeric">
                  Held
                </th>
                <th scope="col" className="govuk-table__header govuk-table__header--numeric">
                  Size
                </th>
                <th scope="col" className="govuk-table__header govuk-table__header--numeric">
                  Return
                </th>
                <th scope="col" className="govuk-table__header govuk-table__header--numeric whitespace-nowrap">
                  vs SPY
                </th>
                <th scope="col" className="govuk-table__header govuk-table__header--numeric">
                  Source
                </th>
              </tr>
            </thead>
            <tbody className="govuk-table__body">
              {top.map((d, i) => {
                const ex = d.excess ?? 0;
                const ret = d.ret ?? 0;
                return (
                  <tr key={d.id} className="govuk-table__row hover:bg-[#f3f2f1]">
                    <td className="govuk-table__cell govuk-table__cell--numeric tabular-nums text-[#505a5f]">
                      {i + 1}
                    </td>
                    <td className="govuk-table__cell">
                      <RowLink
                        to={d.ticker ? `/ticker/${d.ticker}` : undefined}
                        className="inline-flex items-center no-underline"
                      >
                        {d.ticker ? (
                          <TickerLabel ticker={d.ticker} size="sm" />
                        ) : (
                          <span className="text-[#505a5f]">—</span>
                        )}
                      </RowLink>
                    </td>
                    <td className="govuk-table__cell">
                      <div className="min-w-0 max-w-[320px]">
                        <div
                          className="text-[#505a5f] truncate"
                          title={bestNames.get(d.ticker) || d.asset_name || d.ticker}
                        >
                          {bestNames.get(d.ticker) || cleanAssetName(d.asset_name) || d.ticker}
                        </div>
                        {d.comment && (
                          <div
                            className="text-[#505a5f] truncate italic"
                            style={{ fontSize: "14px" }}
                            title={d.comment}
                          >
                            {d.comment}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="govuk-table__cell govuk-table__cell--numeric tabular-nums text-[#505a5f] whitespace-nowrap">
                      {d.transaction_date}
                    </td>
                    <td className="govuk-table__cell govuk-table__cell--numeric tabular-nums text-[#505a5f]">
                      {holdingLabel(d.transaction_date)}
                    </td>
                    <td
                      className="govuk-table__cell govuk-table__cell--numeric tabular-nums whitespace-nowrap"
                      title={d.amount_range_label || undefined}
                    >
                      {fmtAmountRange(d)}
                    </td>
                    <td
                      className={`govuk-table__cell govuk-table__cell--numeric tabular-nums ${ret >= 0 ? GREEN : RED}`}
                    >
                      {ret >= 0 ? "+" : ""}
                      {ret.toFixed(0)}%
                    </td>
                    <td
                      className={`govuk-table__cell govuk-table__cell--numeric tabular-nums font-bold ${
                        ex >= 0 ? GREEN : RED
                      }`}
                    >
                      {ex >= 0 ? "+" : ""}
                      {ex.toFixed(0)}%
                    </td>
                    <td className="govuk-table__cell govuk-table__cell--numeric">
                      <SourceLink url={d.doc_url} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

// Compact stat block used in the portfolio card: small secondary label above a
// bold tabular value, data-kit colours only.
function PortfolioStat({ label, value, valueTone = "text-[#0b0c0c]", hint, hintTone = "text-[#505a5f]" }) {
  return (
    <div>
      <div className="text-[#505a5f]" style={{ fontSize: "16px" }}>
        {label}
      </div>
      <div className={`mt-1 text-large sm:text-[1.5rem] font-bold tabular-nums leading-tight ${valueTone}`}>
        {value}
      </div>
      {hint && (
        <div className={`tabular-nums mt-0.5 ${hintTone}`} style={{ fontSize: "14px" }}>
          {hint}
        </div>
      )}
    </div>
  );
}

// Imaginary portfolio: what this filer would be sitting on today if they held
// every disclosed buy to today's close. Reframes the hold-to-today methodology
// as a feature rather than a caveat — "If Marshall never sold his 2017 NVDA,
// he'd have a $3M tech portfolio today." The math is mid_amount × ret_since.
function ImaginaryPortfolio({ trades }) {
  const bestNames = useMemo(() => bestAssetNameByTicker(trades), [trades]);
  const data = useMemo(() => {
    const buys = trades.filter((t) => {
      const tt = (t.transaction_type || "").toLowerCase();
      const isBuy = tt.includes("urchase") || tt === "p";
      return isBuy && t.ret_since != null && t.excess_since != null && t.amount_range_low != null;
    });
    if (!buys.length) return null;

    let cost = 0,
      value = 0,
      spyValue = 0;
    const byTicker = new Map();
    for (const t of buys) {
      const mid = (t.amount_range_low + t.amount_range_high) / 2;
      const v = mid * (1 + t.ret_since / 100);
      const sv = mid * (1 + (t.ret_since - t.excess_since) / 100);
      cost += mid;
      value += v;
      spyValue += sv;
      if (!byTicker.has(t.ticker)) {
        byTicker.set(t.ticker, {
          ticker: t.ticker,
          asset_name: t.asset_name,
          cost: 0,
          value: 0,
          count: 0,
          firstDate: t.transaction_date,
        });
      }
      const pos = byTicker.get(t.ticker);
      pos.cost += mid;
      pos.value += v;
      pos.count += 1;
      if (t.transaction_date && t.transaction_date < pos.firstDate) pos.firstDate = t.transaction_date;
    }
    const holdings = [...byTicker.values()]
      .map((p) => ({
        ...p,
        gain: p.value - p.cost,
        gainPct: p.cost > 0 ? (p.value / p.cost - 1) * 100 : 0,
        weight: value > 0 ? (p.value / value) * 100 : 0,
      }))
      .sort((a, b) => b.value - a.value);

    return {
      scoredBuys: buys.length,
      cost,
      value,
      spyValue,
      gain: value - cost,
      gainPct: cost > 0 ? (value / cost - 1) * 100 : 0,
      vsSpy: value - spyValue,
      holdings,
    };
  }, [trades]);

  if (!data) return null;

  return (
    <div className="mb-10">
      <SectionHeader
        title="Live portfolio"
        subtitle="Real disclosed buys priced at today's close. Assumes nothing was sold."
      />

      <Card className="p-4 sm:p-5 mb-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 sm:gap-x-8 gap-y-4 sm:gap-y-5">
          <PortfolioStat label="Portfolio value" value={fmtUSD(data.value)} hint={`from ${fmtUSD(data.cost)} cost`} />
          <PortfolioStat
            label="Unrealized gain"
            value={`${data.gain >= 0 ? "+" : ""}${fmtUSD(data.gain)}`}
            valueTone={data.gain >= 0 ? GREEN : RED}
            hint={`${data.gainPct >= 0 ? "+" : ""}${data.gainPct.toFixed(1)}%`}
            hintTone={data.gain >= 0 ? GREEN : RED}
          />
          <PortfolioStat
            label="vs same-$ SPY"
            value={`${data.vsSpy >= 0 ? "+" : ""}${fmtUSD(data.vsSpy)}`}
            valueTone={data.vsSpy >= 0 ? GREEN : RED}
            hint={`SPY would hold ${fmtUSD(data.spyValue)}`}
          />
          <PortfolioStat
            label="Positions"
            value={data.holdings.length}
            hint={`${fmtInt(data.scoredBuys)} buys scored`}
          />
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="govuk-table" style={{ marginBottom: 0 }}>
            <thead className="govuk-table__head">
              <tr className="govuk-table__row">
                <th scope="col" className="govuk-table__header govuk-table__header--numeric">
                  #
                </th>
                <th scope="col" className="govuk-table__header">
                  Position
                </th>
                <th scope="col" className="govuk-table__header govuk-table__header--numeric">
                  Since
                </th>
                <th scope="col" className="govuk-table__header govuk-table__header--numeric whitespace-nowrap">
                  Cost basis
                </th>
                <th scope="col" className="govuk-table__header govuk-table__header--numeric whitespace-nowrap">
                  Value today
                </th>
                <th scope="col" className="govuk-table__header govuk-table__header--numeric">
                  Gain
                </th>
                <th scope="col" className="govuk-table__header govuk-table__header--numeric whitespace-nowrap">
                  Share of portfolio
                </th>
              </tr>
            </thead>
            <tbody className="govuk-table__body">
              {data.holdings.slice(0, 15).map((p, i) => (
                <tr key={p.ticker} className="govuk-table__row hover:bg-[#f3f2f1]">
                  <td className="govuk-table__cell govuk-table__cell--numeric tabular-nums text-[#505a5f]">{i + 1}</td>
                  <td className="govuk-table__cell">
                    <div className="flex items-center gap-2 min-w-0">
                      <RowLink to={`/ticker/${p.ticker}`} className="inline-flex items-center shrink-0 no-underline">
                        <TickerBadge ticker={p.ticker} size="sm" />
                      </RowLink>
                      <span
                        className="text-[#505a5f] truncate max-w-[280px]"
                        style={{ fontSize: "14px" }}
                        title={bestNames.get(p.ticker) || p.asset_name || p.ticker}
                      >
                        {bestNames.get(p.ticker) || cleanAssetName(p.asset_name) || p.ticker}
                      </span>
                    </div>
                  </td>
                  <td className="govuk-table__cell govuk-table__cell--numeric tabular-nums text-[#505a5f] whitespace-nowrap">
                    {p.firstDate}
                  </td>
                  <td className="govuk-table__cell govuk-table__cell--numeric tabular-nums text-[#505a5f]">
                    {fmtUSD(p.cost)}
                  </td>
                  <td className="govuk-table__cell govuk-table__cell--numeric tabular-nums font-bold">
                    {fmtUSD(p.value)}
                  </td>
                  <td
                    className={`govuk-table__cell govuk-table__cell--numeric tabular-nums font-bold ${
                      p.gain >= 0 ? GREEN : RED
                    }`}
                  >
                    {p.gain >= 0 ? "+" : ""}
                    {p.gainPct.toFixed(0)}%
                  </td>
                  <td className="govuk-table__cell govuk-table__cell--numeric tabular-nums text-[#505a5f]">
                    {p.weight.toFixed(0)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {data.holdings.length > 15 && (
          <div className="px-4 py-2 border-t border-[#b1b4b6] text-[#505a5f] text-center" style={{ fontSize: "14px" }}>
            Showing top 15 of {data.holdings.length} positions by value
          </div>
        )}
      </Card>
    </div>
  );
}
