import React, { useMemo, useState } from "react";
import { committeeLabel, pct } from "../committees";
import { DataTable } from "../kit";
import { fmtInt, Link } from "../ui";
import GovTabs from "./GovTabs";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const day = (s) => { const d = new Date(`${s}T00:00:00Z`); return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`; };
const MIN_TRADES = 10; // below this a member's share swings on one or two trades

function useSort(rows, initial) {
  const [sort, setSort] = useState(initial);
  const sorted = useMemo(() => {
    const dir = sort.dir === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
      const x = a[sort.key], y = b[sort.key];
      return (typeof x === "string" ? x.localeCompare(y) : x - y) * dir;
    });
  }, [rows, sort]);
  const onSort = (key) => setSort((s) => ({ key, dir: s.key === key && s.dir === "desc" ? "asc" : "desc" }));
  return { sorted, sort, onSort };
}

function download(members) {
  const esc = (v) => (/[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : v);
  const csv = [
    "member,party,state,chamber,committees,trades,trades_in_committee_sectors,share_pct,congress_share_pct",
    ...members.map((m) => [m.name, m.party ?? "", m.state ?? "", m.chamber ?? "", m.committees.join(" "), m.trades, m.overseen, m.overseenPct, m.expectedPct].map(esc).join(",")),
  ].join("\n");
  const url = URL.createObjectURL(new Blob([csv + "\n"], { type: "text/csv" }));
  const a = document.createElement("a"); a.href = url; a.download = "congress-committee-overlap.csv"; a.click(); URL.revokeObjectURL(url);
}

export default function CommitteeInsight({ oversight }) {
  const { overall, committees, committeeNames, mapping, members, since } = oversight;
  const name = (code) => committeeLabel(committeeNames[code] ?? code);
  const sectors = (code) => mapping.committees[code]?.industries.map((i) => mapping.industries[i].label).join(", ");

  const committeeRows = useMemo(() => Object.entries(committees).map(([code, c]) => ({ code, name: name(code), ...c })), [committees]);
  const memberRows = useMemo(() => members.filter((m) => m.trades >= MIN_TRADES), [members]);
  const bc = useSort(committeeRows, { key: "trades", dir: "desc" });
  const bm = useSort(memberRows, { key: "trades", dir: "desc" });
  const above = committeeRows.filter((c) => c.overseenPct > c.expectedPct).length;

  const share = (r) => `${pct(r.overseenPct)}`;
  const committeeColumns = [
    { key: "name", header: "Committee", sortable: true, render: (r) => <><span>{r.name}</span><span className="dk-hint dk-hide-sm"><br />{sectors(r.code)}</span></> },
    { key: "members", header: "Members trading", align: "right", sortable: true, hideBelow: "sm", render: (r) => fmtInt(r.members) },
    { key: "trades", header: "Trades", align: "right", sortable: true, hideBelow: "sm", render: (r) => fmtInt(r.trades) },
    { key: "overseenPct", header: "Own sectors", align: "right", sortable: true, render: share },
    { key: "expectedPct", header: "All Congress", align: "right", sortable: true, render: (r) => pct(r.expectedPct) },
  ];
  const memberColumns = [
    { key: "name", header: "Member", sortable: true, render: (r) => <><Link to={`/filer/${r.filerId}`}>{r.name}</Link><span className="dk-hint dk-hide-sm"><br />{r.committees.map(name).join(", ")}</span></> },
    { key: "trades", header: "Trades", align: "right", sortable: true, hideBelow: "sm", render: (r) => fmtInt(r.trades) },
    { key: "overseenPct", header: "Own sectors", align: "right", sortable: true, render: (r) => `${pct(r.overseenPct)} (${fmtInt(r.overseen)})` },
    { key: "expectedPct", header: "All Congress", align: "right", sortable: true, render: (r) => pct(r.expectedPct) },
  ];
  const mappingRows = Object.entries(mapping.committees).filter(([, c]) => c.industries.length).map(([code, c]) => ({ code, ...c }));
  const mappingColumns = [
    { key: "code", header: "Committee", render: (r) => name(r.code) },
    { key: "industries", header: "Sectors", render: (r) => sectors(r.code) },
    { key: "why", header: "Jurisdiction", hideBelow: "md", render: (r) => <>{r.why}<br /><span className="dk-hint">{r.source}</span></> },
  ];

  return (
    <>
      <section className="insight-chart-card" aria-labelledby="chart-title">
        <h1 className="govuk-heading-m" id="chart-title">Stock trades and committee assignments</h1>
        <p className="govuk-body-s insight-date">Trades from {day(since)}, against committee assignments in the 119th Congress</p>
        <GovTabs tabs={[
          { label: "By committee", content: <DataTable rows={bc.sorted} columns={committeeColumns} rowKey={(r) => r.code} sort={bc.sort} onSort={bc.onSort} caption="Own sectors: the share of members' trades in sectors their committee covers. All Congress: the share of every member's trades in the same sectors." /> },
          { label: "By member", content: <DataTable rows={bm.sorted} columns={memberColumns} rowKey={(r) => r.filerId} sort={bm.sort} onSort={bm.onSort} caption={`Members with at least ${MIN_TRADES} stock trades.`} /> },
          { label: "Sectors", content: <DataTable rows={mappingRows} columns={mappingColumns} rowKey={(r) => r.code} /> },
          { label: "Download", content: <><p className="govuk-body">Every member as a CSV: committees, trades, trades in their committees' sectors and the Congress-wide share.</p><button type="button" className="govuk-button govuk-button--secondary" onClick={() => download(members)}>Download CSV</button></> },
        ]} />
      </section>
      <section className="mt-8 max-w-3xl insight-about">
        <h2 className="govuk-heading-m">About this data</h2>
        <ul className="govuk-list govuk-list--bullet">
          <li>{pct(overall.overseenPct)} of members' stock trades were in sectors their own committees cover. If they traded like Congress as a whole, it would be {pct(overall.expectedPct)}.</li>
          <li>{above} of {committeeRows.length} committees have members trading their own sectors more than Congress overall does. Most differences are small and rest on few trades.</li>
          <li>Sectors come from each committee's written jurisdiction (House Rule X, Senate Rule XXV) and each company's SEC industry code. Tax, spending and antitrust committees touch every sector and are left out. The Sectors tab lists every match.</li>
          <li>Funds and ETFs are left out, as are companies without an SEC industry code.</li>
          <li>Each trade counts once, whatever its size. Assignments are recorded from October 2026 and applied to earlier trades in this Congress.</li>
          <li>A trade in a committee's sector is not evidence of wrongdoing. Members often sit on committees that matter to their state's industries.</li>
        </ul>
      </section>
    </>
  );
}
