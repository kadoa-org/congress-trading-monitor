import React from "react";
import CommitteeInsight from "../components/CommitteeInsight";
import GovTabs from "../components/GovTabs";
import WeeklyFlows from "../components/WeeklyFlows";
import { insightBySlug } from "../insights";
import { DataTable } from "../kit";
import { fmtInt, Link } from "../ui";

// One insight on its own page, laid out as a UKHSA dashboard topic: breadcrumbs, title and lede, a chart card with
// Chart / Tabular data / Download tabs and the "up to and including" date, then a short About section.
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
      <section className="insight-chart-card" aria-labelledby="chart-title">
        {/* The card title is the page heading: one heading per page, as on a UKHSA chart page. */}
        <h1 className="govuk-heading-m" id="chart-title">Weekly buying and selling, and the S&amp;P 500</h1>
        <p className="govuk-body-s insight-date">Up to and including the week starting {day(last.week)}</p>
        <GovTabs tabs={[
          { label: "Chart", content: <WeeklyFlows flows={flows} /> },
          { label: "Tabular data", content: <DataTable rows={rows} columns={columns} rowKey={(r) => r.week} /> },
          { label: "Download", content: <><p className="govuk-body">Every week since January 2025 as a CSV: purchases, sales, net, members trading and the SPY close.</p><button type="button" className="govuk-button govuk-button--secondary" onClick={() => download(flows)}>Download CSV</button></> },
        ]} />
      </section>
      <section className="mt-8 max-w-3xl insight-about">
        <h2 className="govuk-heading-m">About this data</h2>
        <ul className="govuk-list govuk-list--bullet">
          <li>Members were net buyers in every week from early March to early May, while the S&amp;P 500 fell to its low on March 30 and recovered.</li>
          <li>From March 2 to May 3, they made 411 more purchases than sales. 36 members were net buyers and 26 net sellers.</li>
          <li>The buying was concentrated: Michael McCaul (R-TX) and Rohit Khanna (D-CA) account for most of it. Both have large, actively managed portfolios.</li>
          <li>From mid-May on, the weeks are mostly net selling.</li>
          <li>Members have 45 days to disclose, so August and September will still change as filings come in.</li>
        </ul>
      </section>
    </>
  );
}

export default function InsightPage({ slug, data }) {
  const insight = insightBySlug(slug);
  const { flows = [], oversight } = data;
  if (!insight) return <div className="govuk-width-container"><main className="govuk-main-wrapper"><h1 className="dk-h1">Insight not found</h1><p className="govuk-body"><Link to="/insights">See all insights</Link></p></main></div>;
  return (
    <div className="govuk-width-container">
      <nav className="govuk-breadcrumbs" aria-label="Breadcrumb">
        <ol className="govuk-breadcrumbs__list">
          <li className="govuk-breadcrumbs__list-item"><Link className="govuk-breadcrumbs__link" to="/insights">Insights</Link></li>
          <li className="govuk-breadcrumbs__list-item" aria-current="page">{insight.title}</li>
        </ol>
      </nav>
      <main className="govuk-main-wrapper" id="main-content">
        {insight.slug === "weekly-trading" && flows.length > 0 && <WeeklyTrading flows={flows} />}
        {insight.slug === "committees" && oversight && <CommitteeInsight oversight={oversight} />}
      </main>
    </div>
  );
}
