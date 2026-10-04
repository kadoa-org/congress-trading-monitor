import React, { Fragment, useMemo, useState } from "react";
import { billText, CommitteeName, committeeParts, pct, shortTitle } from "../committees";
import CompactTable from "./CompactTable";
import LobbyEvidenceTable from "./LobbyEvidenceTable";
import { DataTable } from "../kit";
import { fmtInt, Link } from "../ui";
import GovTabs from "./GovTabs";
import { TickerBadge } from "./TickerBadge";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const day = (s) => { const d = new Date(`${s}T00:00:00Z`); return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`; };
const MIN_MEMBERS = 3; // committees with fewer trading members (a defunct select panel) say little
const who = (m) => `${m.name}${m.party && m.state ? ` (${m.party}-${m.state})` : ""}`;

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
    "member,party,state,chamber,committees,trades,trades_in_lobbying_companies,share_pct,all_congress_pct",
    ...members.map((m) => [m.name, m.party ?? "", m.state ?? "", m.chamber ?? "", m.committees.join(" "), m.trades, m.linked, m.linkedPct, m.expectedPct].map(esc).join(",")),
  ].join("\n");
  const url = URL.createObjectURL(new Blob([csv + "\n"], { type: "text/csv" }));
  const a = document.createElement("a"); a.href = url; a.download = "congress-committee-lobbying.csv"; a.click(); URL.revokeObjectURL(url);
}

// Committees with their figures; a row opens a full-width panel listing the members who trade.
function CommitteeTable({ rows }) {
  const [open, setOpen] = useState(null);
  return (
    <div className="dk-table-wrap">
      <table className="dk-table committee-table">
        <thead>
          <tr>
            <th rowSpan={2}>Committee</th>
            <th colSpan={2} scope="colgroup" className="dk-table__group">Trades in lobbying companies</th>
            <th rowSpan={2} className="dk-num">Members</th>
          </tr>
          <tr>
            <th className="dk-num">Its members</th>
            <th className="dk-num">All of Congress</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const isOpen = open === r.code;
            return (
              <Fragment key={r.code}>
                <tr className={`committee-table__row${isOpen ? " is-open" : ""}`} onClick={() => setOpen(isOpen ? null : r.code)}>
                  <td><CommitteeName full={r.full} /></td>
                  <td className="dk-num">{pct(r.linkedPct)}</td>
                  <td className="dk-num">{pct(r.expectedPct)}</td>
                  <td className="dk-num">
                    <button type="button" className="committee-table__toggle" aria-expanded={isOpen} onClick={(e) => { e.stopPropagation(); setOpen(isOpen ? null : r.code); }}>
                      {r.members} <span aria-hidden="true">{isOpen ? "▴" : "▾"}</span>
                    </button>
                  </td>
                </tr>
                {isOpen && (
                  <tr className="committee-table__panel">
                    <td colSpan={4}>
                      <div className="committee-panel">
                        {r.topLinked.length > 0 && (
                          <CompactTable
                            caption="Top companies"
                            rowKey={(t) => t.ticker}
                            rows={r.topLinked.slice(0, 5)}
                            columns={[
                              { key: "ticker", header: "Stock", width: 72, render: (t) => <Link to={`/ticker/${t.ticker}`} className="no-underline"><TickerBadge ticker={t.ticker} /></Link> },
                              { key: "bill", header: "Lobbied on", clamp: true, render: (t) => <span title={t.bills.map(billText).join("; ")}>{t.bills[0] ? `${t.bills[0].label} ${shortTitle(t.bills[0].title, 34)}` : ""}</span> },
                              { key: "trades", header: "Trades", numeric: true, render: (t) => fmtInt(t.trades) },
                            ]}
                          />
                        )}
                        <div>
                          <CompactTable
                            caption="Members"
                            rowKey={(m) => m.filerId}
                            rows={(r.seats ?? []).filter((m) => m.linked > 0).slice(0, 8)}
                            columns={[
                              { key: "name", header: "Member", clamp: true, render: (m) => <><Link to={`/filer/${m.filerId}`}>{m.name}</Link> <span className="dk-hint">{m.party && m.state ? `${m.party}-${m.state}` : ""}</span></> },
                              { key: "linked", header: "Trades", numeric: true, render: (m) => fmtInt(m.linked) },
                              { key: "share", header: "% of trades", numeric: true, render: (m) => pct((100 * m.linked) / Math.max(1, m.trades)) },
                            ]}
                          />
                          {(r.seats ?? []).filter((m) => m.linked > 0).length > 8 && (
                            <p className="govuk-body-s" style={{ color: "#505a5f", marginTop: -16 }}>
                              and {(r.seats ?? []).filter((m) => m.linked > 0).length - 8} more
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function LobbyingOverview({ oversight }) {
  const { committees, committeeNames, members, since, lobbying } = oversight;
  const committeeRows = useMemo(
    () =>
      Object.entries(committees)
        .map(([code, c]) => ({ code, full: committeeNames[code] ?? code, ...c }))
        .filter((r) => r.members >= MIN_MEMBERS)
        .sort((a, b) => b.trades - a.trades),
    [committees, members],
  );
  const memberRows = useMemo(() => members.filter((m) => m.linked > 0).map((m) => ({ ...m, sortName: m.name })), [members]);
  const bm = useSort(memberRows, { key: "linked", dir: "desc" });
  const shortName = (code) => committeeParts(committeeNames[code] ?? code).name;

  const memberColumns = [
    {
      key: "sortName",
      header: "Member",
      sortable: true,
      render: (r) => (
        <>
          <Link to={`/filer/${r.filerId}`} className="member-name">{r.name}</Link> <span className="dk-hint whitespace-nowrap">{r.party && r.state ? `${r.party}-${r.state}` : ""}</span>
          <span className="dk-hint member-committees">{r.committees.map(shortName).join(", ")}</span>
        </>
      ),
    },
    {
      key: "stocks",
      header: "Stocks",
      hideBelow: "sm",
      render: (r) => (
        <span className="stock-chips">
          {r.topLinked.slice(0, 3).map((t) => (
            <Link key={t.ticker} to={`/ticker/${t.ticker}`} className="no-underline"><TickerBadge ticker={t.ticker} size="sm" /></Link>
          ))}
        </span>
      ),
    },
    { key: "linked", header: "Stock trades", align: "right", sortable: true, hideBelow: "sm", render: (r) => <span className="whitespace-nowrap">{fmtInt(r.linked)} <span className="dk-hint">of {fmtInt(r.trades)}</span></span> },
    { key: "linkedPct", header: "This member", group: "Trades in lobbying companies", align: "right", sortable: true, render: (r) => pct(r.linkedPct) },
    { key: "expectedPct", header: "All of Congress", group: "Trades in lobbying companies", align: "right", sortable: true, render: (r) => pct(r.expectedPct) },
  ];

  return (
    <>
      <h1 className="dk-h1">Lobbying</h1>
      <p className="govuk-body-l max-w-3xl">When members of Congress trade stocks of companies that lobby their own committees.</p>
      <section className="insight-chart-card" aria-label="Stocks of companies that lobby them">
        <GovTabs tabs={[
          { label: "Members", content: <DataTable rows={bm.sorted} columns={memberColumns} rowKey={(r) => r.filerId} sort={bm.sort} onSort={bm.onSort} expand={(r) => <LobbyEvidenceTable topLinked={r.topLinked} trades={r.trades} linked={r.linked} />} /> },
          { label: "Committees", content: <CommitteeTable rows={committeeRows} /> },
          { label: "Download", content: <><p className="govuk-body">Every member as a CSV.</p><button type="button" className="govuk-button govuk-button--secondary" onClick={() => download(members)}>Download CSV</button></> },
        ]} />
      </section>
      <p className="govuk-body-s max-w-3xl" style={{ marginTop: 16, color: "#505a5f" }}>
        Source: LDA.gov lobbying filings{lobbying?.retrieved ? `, retrieved ${day(lobbying.retrieved)}` : ""}. Not evidence of wrongdoing. <Link to="/about#lobbying">How this is counted</Link>
      </p>
    </>
  );
}
