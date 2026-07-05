import React from "react";
import { DataTable } from "../kit";
import { RowLink } from "../ui";
import { FilerAvatar, RankBadge, SampleChip } from "./TablePrimitives";

function role(f) {
  if (f.branch === "executive") return `${f.level ?? "Exec"} · ${f.agency ?? ""}`.trim();
  return `${f.chamber === "senate" ? "Senate" : "House"} · ${f.party ?? "-"} · ${f.state ?? "-"}`;
}

const COLUMNS = [
  { key: "rank", header: "#", width: 36, render: (f) => <RankBadge rank={f._rank} /> },
  {
    key: "filer",
    header: "Filer",
    render: (f) => (
      <RowLink
        to={`/filer/${f.id}`}
        className="flex items-center gap-2.5 min-w-0 no-underline"
        style={{ color: "var(--dk-ink)" }}
      >
        <FilerAvatar filer={f} size={28} />
        <span className="min-w-0">
          <span style={{ display: "block", fontWeight: 500 }}>{f.full_name}</span>
          <span className="dk-hint">{role(f)}</span>
        </span>
      </RowLink>
    ),
  },
  {
    key: "spy",
    header: "vs SPY",
    align: "right",
    render: (f) => (
      <span className={f.weighted_excess >= 0 ? "dk-pos" : "dk-neg"} style={{ fontWeight: 600 }}>
        {f.weighted_excess >= 0 ? "+" : ""}
        {f.weighted_excess.toFixed(1)}%
      </span>
    ),
  },
  { key: "scored", header: "Scored", align: "right", render: (f) => <SampleChip n={f.scored_buys} /> },
];

export default function ReturnsLeaderboard({ returns }) {
  if (!returns || returns.length === 0) {
    return <p className="dk-hint">Return data not yet computed.</p>;
  }
  const ranked = [...returns]
    .sort((a, b) => b.weighted_excess - a.weighted_excess)
    .slice(0, 15)
    .map((f, i) => ({ ...f, _rank: i + 1 }));
  return <DataTable columns={COLUMNS} rows={ranked} rowKey={(f) => f.id} />;
}
