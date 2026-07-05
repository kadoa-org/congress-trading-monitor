import React from "react";
import CabinetSpotlight from "../components/CabinetSpotlight";
import LatestActivity from "../components/LatestActivity";
import LeaderboardRail from "../components/LeaderboardRail";
import ReturnsLeaderboard from "../components/ReturnsLeaderboard";
import TickerBoard from "../TickerBoard";
import { fmtInt, Link, SectionHeader } from "../ui";

export default function OverviewPage({ data }) {
  const { stats, filers, tickers, trades = [], returns = [], prices = {} } = data;

  const headline = "Monitor every stock trade Congress makes";
  const subline = `${fmtInt(stats?.totalTrades)} transactions from ${fmtInt(stats?.totalFilers)} members of Congress and senior executive branch officials, parsed directly from the Clerk of the House, OGE, and Senate eFD.`;

  return (
    <div className="govuk-width-container">
      <main className="govuk-main-wrapper" id="main-content">
        <section className="pb-6">
          <div className="max-w-3xl">
            <h1 className="govuk-heading-xl">{headline}</h1>
            <p className="govuk-body-l">{subline}</p>
          </div>

          <div className="mt-8">
            <LeaderboardRail
              filers={filers}
              returns={returns}
              tickers={tickers}
              trades={trades}
              prices={prices}
              stats={stats}
            />
          </div>
        </section>

        <section className="pb-14">
          <CabinetSpotlight filers={filers} trades={trades} />
        </section>

        {returns && returns.length > 0 && (
          <section className="pb-14">
            <SectionHeader
              title="Biggest outperformers"
              subtitle="Dollar-weighted cumulative excess return vs SPY from trade date to today. Large numbers are long holds on big winners, not annualized skill."
              right={<Link to="/filers?sort=alpha">See all</Link>}
            />
            <ReturnsLeaderboard returns={returns} />
          </section>
        )}

        <section className="pb-20 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <SectionHeader title="Latest activity" right={<Link to="/trades">See all</Link>} />
            <LatestActivity trades={trades} />
          </div>
          <div>
            <SectionHeader title="Most traded tickers" right={<Link to="/tickers">See all</Link>} />
            <TickerBoard tickers={tickers.slice(0, 15)} prices={prices} />
          </div>
        </section>
      </main>
    </div>
  );
}
