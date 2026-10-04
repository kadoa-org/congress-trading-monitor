import React from "react";
import GovTabs from "../components/GovTabs";
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

export default function InsightPage({ slug, data }) {
  const insight = insightBySlug(slug);
  const { flows = [] } = data;
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
      </main>
    </div>
  );
}
