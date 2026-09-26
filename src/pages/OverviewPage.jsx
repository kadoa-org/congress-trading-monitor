import React from "react";
import CabinetSpotlight from "../components/CabinetSpotlight";
import LatestActivity from "../components/LatestActivity";
import ReturnsLeaderboard from "../components/ReturnsLeaderboard";
import TickerBoard from "../TickerBoard";
import { ChangeTag, KeyFigures } from "../kit";
import { fmtInt, fmtUSD, Link, SectionHeader } from "../ui";

// Headline figures for members of Congress over one period, the trades disclosed in the past 30 days, counted by
// filing date: a count by trade date would always look like a slump at the end, because most trades are disclosed
// weeks after they happen. Executive branch filings are left out here; two thirds of recent filings are the
// President's, which would make every cell about one filer on a site about Congress. Officials have their own
// Cabinet section below.
const WINDOW_DAYS = 30;
const dayOffset = (iso, days) => { const d = new Date(`${iso}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + days); return d.toISOString().slice(0, 10); };
const isBuy = (t) => /purchase/i.test(t.transaction_type || "");
const isSell = (t) => /sale/i.test(t.transaction_type || "");
const midpoint = (t) => (t.amount_range_low && t.amount_range_high ? (t.amount_range_low + t.amount_range_high) / 2 : 0);
// Listed stock tickers only: Treasury bills ("US-TBILL") are not a stock pick.
const isStockTicker = (ticker) => /^[A-Z]{1,5}(\.[A-Z])?$/.test(ticker || "");

function Headlines({ trades, asOf, stats }) {
  const end = new Date(asOf ?? Date.now()).toISOString().slice(0, 10);
  const start = dayOffset(end, -WINDOW_DAYS);
  const congress = trades.filter((t) => t.branch !== "executive");
  const recent = congress.filter((t) => t.filing_date > start && t.filing_date <= end);
  if (!recent.length) return null;
  const members = new Set(recent.map((t) => t.filer_id)).size;

  // Direction of money: amounts are disclosed as ranges, so both sides use the range midpoint.
  const bought = recent.filter(isBuy).reduce((sum, t) => sum + midpoint(t), 0);
  const sold = recent.filter(isSell).reduce((sum, t) => sum + midpoint(t), 0);
  const direction = bought > sold * 1.1 ? "Net buying" : sold > bought * 1.1 ? "Net selling" : "Balanced";

  // The stock bought by the most members, which is a broader signal than one member's heavy trading.
  const byTicker = new Map();
  for (const t of recent) {
    if (!isStockTicker(t.ticker)) continue;
    const e = byTicker.get(t.ticker) ?? { buys: 0, sells: 0, buyers: new Set() };
    if (isBuy(t)) { e.buys++; e.buyers.add(t.filer_id); }
    if (isSell(t)) e.sells++;
    byTicker.set(t.ticker, e);
  }
  const [topTicker, top] = [...byTicker].sort((a, b) => b[1].buyers.size - a[1].buyers.size || b[1].buys - a[1].buys)[0] ?? [];

  // How the members' purchases of that stock have done against SPY since each trade date, averaged over the buys.
  const topBuys = topTicker ? recent.filter((t) => t.ticker === topTicker && isBuy(t) && t.excess_since != null) : [];
  const topExcess = topBuys.length ? topBuys.reduce((sum, t) => sum + t.excess_since, 0) / topBuys.length : null;

  const byMember = new Map();
  for (const t of recent) byMember.set(t.filer_id, { name: t.filer_name, trades: (byMember.get(t.filer_id)?.trades ?? 0) + 1 });
  const [activeId, active] = [...byMember].sort((a, b) => b[1].trades - a[1].trades)[0] ?? [];

  const late = recent.filter((t) => t.is_late).length;
  // Late share against the dataset's all-time rate, in percentage points, so the reader sees whether filing is
  // getting more or less punctual. Both rounded first, so 10% against 30% reads as 20 points.
  const lateShare = Math.round((late / recent.length) * 100);
  const allTimeLate = stats?.totalTrades ? Math.round((stats.lateFilings / stats.totalTrades) * 100) : null;
  const lags = recent.map((t) => t.days_to_file).filter((d) => d != null).sort((a, b) => a - b);
  const medianLag = lags.length ? lags[Math.floor(lags.length / 2)] : null;
  const fmtDay = (iso) => new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });

  return (
    <KeyFigures
      context={`${fmtInt(recent.length)} stock trades by ${fmtInt(members)} members of Congress disclosed in the past 30 days, up to ${fmtDay(end)}.`}
      items={[
        { label: "Buying or selling", value: direction, title: "Estimated from the midpoints of the disclosed amount ranges", note: `${fmtUSD(bought)} bought, ${fmtUSD(sold)} sold` },
        top && top.buyers.size > 0 && {
          label: "Most bought stock",
          value: <Link to={`/ticker/${topTicker}`}>{topTicker}</Link>,
          title: `Bought by ${fmtInt(top.buyers.size)} ${top.buyers.size === 1 ? "member" : "members"}: ${fmtInt(top.buys)} buys and ${fmtInt(top.sells)} sells. Return against SPY since each buy, averaged.`,
          note: topExcess !== null ? <><ChangeTag value={topExcess} good="up" size="small" /> vs SPY</> : `bought by ${fmtInt(top.buyers.size)} members`,
        },
        {
          label: "Late disclosures",
          value: `${lateShare}%`,
          title: medianLag !== null ? `Filed after the 45-day deadline. Median ${medianLag} days from trade to filing.` : "Filed after the 45-day deadline",
          note: allTimeLate !== null ? <><ChangeTag value={lateShare - allTimeLate} unit=" pts" size="small" /> vs {allTimeLate}% all-time</> : "after the 45-day deadline",
        },
        active && {
          label: "Most active",
          value: <Link to={`/filer/${activeId}`}>{active.name}</Link>,
          note: `${fmtInt(active.trades)} trades`,
        },
      ]}
    />
  );
}

export default function OverviewPage({ data, asOf }) {
  const { stats, filers, tickers, trades = [], returns = [], prices = {} } = data;

  const headline = "Congress Trading Monitor";
  // The page title carries the search terms; the intro keeps them on the page under the brand-name heading.
  const subline = `Every stock trade by members of Congress and senior officials: ${fmtInt(stats?.totalTrades)} trades by ${fmtInt(stats?.totalFilers)} filers, from House, Senate and OGE filings.`;

  return (
    <div className="govuk-width-container">
      <main className="govuk-main-wrapper" id="main-content">
        <section className="pb-6">
          <div className="max-w-3xl">
            <h1 className="dk-h1">{headline}</h1>
            <p className="govuk-body-l">{subline}</p>
          </div>

          <div className="mt-8">
            <Headlines trades={trades} asOf={asOf} stats={stats} />
          </div>
        </section>

        <section className="pb-8">
          <CabinetSpotlight filers={filers} trades={trades} />
        </section>

        {returns && returns.length > 0 && (
          <section className="pb-8">
            <SectionHeader
              title="Biggest outperformers"
              subtitle="Dollar-weighted return against SPY since each buy. Long holds on big winners score highest."
              right={<Link to="/filers?sort=alpha">See all</Link>}
            />
            <ReturnsLeaderboard returns={returns} />
          </section>
        )}

        <section className="pb-20 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <SectionHeader title="Latest activity" subtitle="The newest disclosed trades." right={<Link to="/trades">See all</Link>} />
            <LatestActivity trades={trades} asOf={asOf} />
          </div>
          <div>
            <SectionHeader title="Most traded tickers" subtitle="Stocks with the most trades, all years." right={<Link to="/tickers">See all</Link>} />
            <TickerBoard tickers={tickers.slice(0, 15)} prices={prices} />
          </div>
        </section>
      </main>
    </div>
  );
}
