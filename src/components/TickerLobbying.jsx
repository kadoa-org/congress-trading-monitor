import React from "react";
import { ChamberTag, committeeParts, fmtMoney, shortTitle } from "../committees";
import { fmtInt, Link, SectionHeader } from "../ui";
import CompactTable from "./CompactTable";

// A stock page's lobbying: the committees whose bills the company lobbied on, and the members of those committees who
// traded the stock while it did.
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

// One row per year with its spend and the change from the year before. The current year only counts quarters whose
// reports are due, so it is labelled with the month it runs to and has no change.
function spendRows(spend) {
  if (!spend?.byYear) return [];
  const years = Object.keys(spend.byYear).map(Number).sort((a, b) => a - b);
  return years
    .filter((y) => y < spend.currentYear || spend.currentThroughMonth > 0)
    .map((y) => {
      const v = spend.byYear[y];
      const prev = spend.byYear[y - 1];
      const partial = y === spend.currentYear;
      return { year: y, label: partial ? `${y} through ${MONTHS[spend.currentThroughMonth - 1]}` : String(y), value: v, change: !partial && prev > 0 ? ((v - prev) / prev) * 100 : null };
    });
}

const issueList = (issues) => (issues.length < 2 ? issues[0] : `${issues.slice(0, -1).join(", ")} and ${issues.at(-1)}`);

export default function TickerLobbying({ ticker, lobbying }) {
  if (!lobbying?.committees?.length) return null;
  const name = (full) => {
    const { name, chamber } = committeeParts(full);
    return <span className="whitespace-nowrap">{name} <ChamberTag chamber={chamber} /></span>;
  };
  return (
    <section className="mb-10 max-w-3xl" aria-labelledby="ticker-lobbying">
      <SectionHeader title={<span id="ticker-lobbying">Lobbying</span>} />
      {spendRows(lobbying.spend).length > 0 && (
        <CompactTable
          caption={
            <>
              Spend
              {lobbying.issues?.length > 0 && <span className="compact-table__hint">Mostly on {issueList(lobbying.issues)}</span>}
            </>
          }
          rowKey={(r) => r.year}
          rows={spendRows(lobbying.spend)}
          columns={[
            { key: "year", header: "Year", render: (r) => r.label },
            { key: "value", header: "Spend", numeric: true, render: (r) => fmtMoney(r.value) },
            { key: "change", header: "Change", numeric: true, render: (r) => (r.change == null ? "—" : `${r.change >= 0 ? "+" : "−"}${Math.abs(Math.round(r.change))}%`) },
          ]}
        />
      )}
      <CompactTable
        caption="Committees it lobbied"
        rowKey={(c) => c.code}
        rows={lobbying.committees.slice(0, 5)}
        columns={[
          { key: "name", header: "Committee", render: (c) => name(c.name) },
          { key: "bill", header: "For example", clamp: true, render: (c) => <span title={c.top[0]?.title ?? ""}>{c.top[0] ? `${c.top[0].label} ${shortTitle(c.top[0].title, 40)}` : ""}</span> },
          { key: "bills", header: "Bills", numeric: true, render: (c) => fmtInt(c.bills) },
        ]}
      />
      {lobbying.members.length > 0 && (
        <CompactTable
          caption={`Committee members who traded ${ticker}`}
          rowKey={(m) => m.filerId}
          rows={lobbying.members.slice(0, 6)}
          columns={[
            { key: "name", header: "Member", render: (m) => <><Link to={`/filer/${m.filerId}`}>{m.name}</Link> <span className="dk-hint whitespace-nowrap">{m.party && m.state ? `${m.party}-${m.state}` : ""}</span></> },
            { key: "committee", header: "Committee", clamp: true, render: (m) => m.committees.map((c) => committeeParts(c).name).join(", ") },
            { key: "trades", header: "Trades", numeric: true, render: (m) => fmtInt(m.trades) },
          ]}
        />
      )}
      <p className="govuk-body-s">
        <Link to="/lobbying">More on lobbying</Link>
      </p>
    </section>
  );
}
