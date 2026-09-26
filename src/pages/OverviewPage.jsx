import React from "react";
import CabinetSpotlight from "../components/CabinetSpotlight";
import LatestActivity from "../components/LatestActivity";
import ReturnsLeaderboard from "../components/ReturnsLeaderboard";
import TickerBoard from "../TickerBoard";
import { ChangeTag, KeyFigures } from "../kit";
import { fmtInt, fmtUSD, Link, SectionHeader } from "../ui";

// Headline figures over one period, the trades disclosed in the past 30 days, counted by filing date: a count by
// trade date would always look like a slump at the end, because most trades are disclosed weeks after they happen.
const WINDOW_DAYS = 30;
const dayOffset = (iso, days) => { const d = new Date(`${iso}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + days); return d.toISOString().slice(0, 10); };
const isBuy = (t) => /purchase/i.test(t.transaction_type || "");

function Headlines({ trades, filers, asOf }) {
  const end = new Date(asOf ?? Date.now()).toISOString().slice(0, 10);
  const start = dayOffset(end, -WINDOW_DAYS);
  const priorStart = dayOffset(end, -2 * WINDOW_DAYS);
  const recent = trades.filter((t) => t.filing_date > start && t.filing_date <= end);
  if (!recent.length) return null;
  // The feed holds the newest 5,000 trades; the change is shown only when it reaches back over the prior window.
  const earliest = trades.reduce((min, t) => (t.filing_date && t.filing_date < min ? t.filing_date : min), end);
  const prior = earliest <= priorStart ? trades.filter((t) => t.filing_date > priorStart && t.filing_date <= start).length : null;
  const change = prior ? ((recent.length - prior) / prior) * 100 : null;
  const top = (key) => {
    const counts = new Map();
    for (const t of recent) if (t[key]) counts.set(t[key], (counts.get(t[key]) || 0) + 1);
    return [...counts].sort((a, b) => b[1] - a[1])[0];
  };
  const [filerId, filerTrades] = top("filer_id") ?? [];
  const filer = filers.find((f) => f.id === filerId);
  const [ticker, tickerTrades] = top("ticker") ?? [];
  const tickerBuys = recent.filter((t) => t.ticker === ticker && isBuy(t)).length;
  const largest = recent.reduce((best, t) => ((t.amount_range_high || 0) > (best?.amount_range_high || 0) ? t : best), null);
  const fmtDay = (iso) => new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
  return (
    <KeyFigures
      title="Trades disclosed, past 30 days"
      description="Stock trades by members of Congress and senior officials, by the date they were filed."
      date={`Up to and including ${fmtDay(end)}`}
      items={[
        { label: "Trades disclosed", value: fmtInt(recent.length), note: change !== null ? <><ChangeTag value={change} good="none" size="small" /> on prior 30 days</> : undefined },
        filer && { label: "Most active", value: <Link to={`/filer/${filer.id}`}>{filer.full_name}</Link>, note: `${fmtInt(filerTrades)} trades` },
        ticker && { label: "Most traded stock", value: <Link to={`/ticker/${ticker}`}>{ticker}</Link>, note: `${fmtInt(tickerTrades)} trades, ${fmtInt(tickerBuys)} buys` },
        largest && {
          label: "Largest trade",
          value: <Link to={`/filer/${largest.filer_id}`}>{largest.filer_name}</Link>,
          note: `${fmtUSD(largest.amount_range_low)} to ${fmtUSD(largest.amount_range_high)}${largest.ticker ? `, ${largest.ticker}` : ""}`,
        },
      ]}
    />
  );
}

export default function OverviewPage({ data, asOf }) {
  const { stats, filers, tickers, trades = [], returns = [], prices = {} } = data;

  const headline = "Monitor every stock trade Congress makes";
  const subline = `${fmtInt(stats?.totalTrades)} trades by ${fmtInt(stats?.totalFilers)} members of Congress and senior officials, from House, Senate and OGE filings.`;

  return (
    <div className="govuk-width-container">
      <main className="govuk-main-wrapper" id="main-content">
        <section className="pb-6">
          <div className="max-w-3xl">
            <h1 className="govuk-heading-xl">{headline}</h1>
            <p className="govuk-body-l">{subline}</p>
          </div>

          <div className="mt-8">
            <Headlines trades={trades} filers={filers} asOf={asOf} />
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
