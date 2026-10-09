import React, { useMemo, useState } from "react";
import GovTabs from "../components/GovTabs";
import LobbyingScatter, { GROUPS, money, perMillion } from "../components/LobbyingScatter";
import WeeklyFlows from "../components/WeeklyFlows";
import { insightBySlug } from "../insights";
import { DataTable } from "../kit";
import { fmtInt, Link } from "../ui";

// One insight on its own page, laid out as a dashboard topic: breadcrumbs, title and lede, a chart card with
// Chart / Tabular data / Download tabs and the date, then a one-line note.
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const day = (s) => { const d = new Date(`${s}T00:00:00Z`); return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`; };
const signed = (v) => (v > 0 ? `+${v}` : v < 0 ? `−${Math.abs(v)}` : "0");

function download(rows) {
  const csv = ["week_starting,purchases,sales,net,members_trading,spy_close", ...rows.map((r) => [r.week, r.buys, r.sells, r.buys - r.sells, r.members, r.spy ?? ""].join(","))].join("\n");
  const url = URL.createObjectURL(new Blob([csv + "\n"], { type: "text/csv" }));
  const a = document.createElement("a"); a.href = url; a.download = "congress-weekly-trading.csv"; a.click(); URL.revokeObjectURL(url);
}

function WeeklyTrading({ flows }) {
  const last = flows.at(-1);
  const rows = [...flows].reverse();
  const columns = [
    { key: "week", header: "Week starting", render: (r) => day(r.week) },
    { key: "buys", header: "Purchases", align: "right", render: (r) => fmtInt(r.buys) },
    { key: "sells", header: "Sales", align: "right", render: (r) => fmtInt(r.sells) },
    { key: "net", header: "Net", align: "right", render: (r) => signed(r.buys - r.sells) },
    { key: "members", header: "Members trading", align: "right", render: (r) => fmtInt(r.members) },
    { key: "spy", header: "S&P 500 (SPY)", align: "right", render: (r) => (r.spy != null ? Math.round(r.spy) : "–") },
  ];
  return (
    <>
      <h1 className="dk-h1">Weekly buying and selling</h1>
      <p className="govuk-body-l max-w-3xl">Stock purchases minus sales by members of Congress each week, with the S&amp;P 500.</p>
      <section className="insight-chart-card" aria-label="Weekly buying and selling">
        <p className="govuk-body-s insight-date">Up to the week starting {day(last.week)}</p>
        <GovTabs tabs={[
          { label: "Chart", content: <WeeklyFlows flows={flows} /> },
          { label: "Tabular data", content: <DataTable rows={rows} columns={columns} rowKey={(r) => r.week} /> },
          { label: "Download", content: <><p className="govuk-body">Every week since January 2025 as a CSV: purchases, sales, net, members trading and the SPY close.</p><button type="button" className="govuk-button govuk-button--secondary" onClick={() => download(flows)}>Download CSV</button></> },
        ]} />
      </section>
      <p className="govuk-body-s max-w-3xl" style={{ marginTop: 16, color: "#505a5f" }}>
        Members have 45 days to disclose a trade, so recent weeks will still change.
      </p>
    </>
  );
}

function downloadLobbying(rows) {
  const csv = ["ticker,company,sector,lobbying_2025_usd,market_cap_usd,lobbying_per_1m_market_cap", ...rows.map((r) => [r.t, `"${r.n.replace(/"/g, '""')}"`, r.g, r.spend, r.mcap, perMillion(r).toFixed(2)].join(","))].join("\n");
  const url = URL.createObjectURL(new Blob([csv + "\n"], { type: "text/csv" }));
  const a = document.createElement("a"); a.href = url; a.download = "company-lobbying-vs-market-cap-2025.csv"; a.click(); URL.revokeObjectURL(url);
}

const SECTOR = { ...Object.fromEntries(Object.entries(GROUPS).map(([k, g]) => [k, g.label])), other: "Other" };

function LobbyingVsMarketCap({ data }) {
  const { rows, medians } = data;
  const [sort, setSort] = useState({ key: "spend", dir: "desc" });
  const sorted = useMemo(() => {
    const val = { name: (r) => r.n, sector: (r) => SECTOR[r.g], spend: (r) => r.spend, mcap: (r) => r.mcap, per: perMillion }[sort.key];
    return [...rows].sort((a, b) => { const p = val(a), q = val(b); return (p < q ? -1 : p > q ? 1 : 0) * (sort.dir === "asc" ? 1 : -1); });
  }, [rows, sort]);
  const onSort = (key) => setSort((s) => ({ key, dir: s.key === key && s.dir === "desc" ? "asc" : "desc" }));
  const columns = [
    { key: "name", header: "Company", sortable: true, render: (r) => <><Link to={`/ticker/${encodeURIComponent(r.t)}`}>{r.n}</Link> <span style={{ color: "#505a5f" }}>{r.t}</span></> },
    { key: "sector", header: "Sector", sortable: true, hideBelow: "sm", render: (r) => SECTOR[r.g] },
    { key: "spend", header: "Lobbying in 2025", align: "right", sortable: true, render: (r) => money(r.spend) },
    { key: "mcap", header: "Market cap", align: "right", sortable: true, hideBelow: "sm", render: (r) => money(r.mcap) },
    { key: "per", header: "Per $1M of market cap", align: "right", sortable: true, render: (r) => `$${Math.round(perMillion(r)).toLocaleString("en-US")}` },
  ];
  const order = Object.keys(GROUPS).sort((a, b) => medians[a] - medians[b]);
  return (
    <>
      <h1 className="dk-h1">Lobbying spend vs market cap</h1>
      <p className="govuk-body-l max-w-3xl">
        Median federal lobbying in 2025 per $1M of market cap (October 2026), across {rows.length} US companies traded by members of Congress:{" "}
        {order.map((k, i) => <React.Fragment key={k}>{i ? ", " : ""}<strong style={{ color: GROUPS[k].text }}>{GROUPS[k].label.toLowerCase()}</strong> ${medians[k]}</React.Fragment>)}.
      </p>
      <section className="insight-chart-card" aria-label="Lobbying spend vs market cap">
        <GovTabs tabs={[
          { label: "Chart", content: <LobbyingScatter rows={rows} /> },
          { label: "Tabular data", content: <DataTable rows={sorted} columns={columns} rowKey={(r) => r.t} sort={sort} onSort={onSort} /> },
          { label: "Download", content: <><p className="govuk-body">All {rows.length} companies as a CSV: lobbying in 2025, market cap, sector and lobbying per $1M of market cap.</p><button type="button" className="govuk-button govuk-button--secondary" onClick={() => downloadLobbying(rows)}>Download CSV</button></> },
        ]} />
      </section>
      <p className="govuk-body-s max-w-3xl" style={{ marginTop: 16, color: "#505a5f" }}>
        Sources: LDA.gov filings (2025), SEC share counts and recent prices. US-listed companies with at least $2B market cap and $100K of lobbying.
      </p>
    </>
  );
}

export default function InsightPage({ slug, data }) {
  const insight = insightBySlug(slug);
  const { flows = [], lobbyingMcap } = data;
  if (!insight) return <div className="dk-container"><main className="govuk-main-wrapper"><h1 className="dk-h1">Insight not found</h1><p className="govuk-body"><Link to="/insights">See all insights</Link></p></main></div>;
  return (
    <div className="dk-container">
      <nav className="govuk-breadcrumbs" aria-label="Breadcrumb">
        <ol className="govuk-breadcrumbs__list">
          <li className="govuk-breadcrumbs__list-item"><Link className="govuk-breadcrumbs__link" to="/insights">Insights</Link></li>
          <li className="govuk-breadcrumbs__list-item" aria-current="page">{insight.title}</li>
        </ol>
      </nav>
      <main className="govuk-main-wrapper" id="main-content">
        {insight.slug === "weekly-trading" && flows.length > 0 && <WeeklyTrading flows={flows} />}
        {insight.slug === "lobbying-vs-market-cap" && lobbyingMcap && <LobbyingVsMarketCap data={lobbyingMcap} />}
      </main>
    </div>
  );
}
