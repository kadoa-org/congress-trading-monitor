import React from "react";
import { ChamberTag, committeeParts, shortTitle } from "../committees";
import { fmtInt, Link, SectionHeader } from "../ui";
import CompactTable from "./CompactTable";

// A stock page's lobbying: the committees whose bills the company lobbied on, and the members of those committees who
// traded the stock while it did.
export default function TickerLobbying({ ticker, lobbying }) {
  if (!lobbying?.committees?.length) return null;
  const name = (full) => {
    const { name, chamber } = committeeParts(full);
    return <span className="whitespace-nowrap">{name} <ChamberTag chamber={chamber} /></span>;
  };
  return (
    <section className="mb-10 max-w-3xl" aria-labelledby="ticker-lobbying">
      <SectionHeader title={<span id="ticker-lobbying">Lobbying</span>} />
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
