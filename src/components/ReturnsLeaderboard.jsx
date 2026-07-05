import React from "react";
import { RowLink, TABLE_HEADER_CLS } from "../ui";
import { FilerAvatar, RankBadge, SampleChip } from "./TablePrimitives";

function role(f) {
  if (f.branch === "executive") return `${f.level ?? "Exec"} · ${f.agency ?? ""}`.trim();
  return `${f.chamber === "senate" ? "Senate" : "House"} · ${f.party ?? "-"} · ${f.state ?? "-"}`;
}

export default function ReturnsLeaderboard({ returns }) {
  if (!returns || returns.length === 0) {
    return (
      <div className="border border-[#b1b4b6] bg-white p-4 text-small text-ink_muted">
        Return data not yet computed. Run <span className="font-mono text-ink">bun collectors/fetchPrices.ts</span> then{" "}
        <span className="font-mono text-ink">bun extractors/computeReturns.ts</span>.
      </div>
    );
  }

  const ranked = [...returns].sort((a, b) => b.weighted_excess - a.weighted_excess).slice(0, 15);

  return (
    <div className="border border-[#b1b4b6] bg-white overflow-hidden">
      <div
        className={`grid grid-cols-[28px_minmax(0,1fr)_96px_56px] gap-3 px-4 py-[10px] border-b border-stroke items-center ${TABLE_HEADER_CLS}`}
      >
        <span></span>
        <span>Filer</span>
        <span className="tabular-nums text-right">vs SPY</span>
        <span className="tabular-nums text-right">Scored</span>
      </div>
      <div className="divide-y divide-stroke_soft">
        {ranked.map((f, i) => {
          const ex = f.weighted_excess;
          const exSign = ex >= 0 ? "+" : "";
          return (
            <RowLink
              key={f.id}
              to={`/filer/${f.id}`}
              className="w-full grid grid-cols-[28px_minmax(0,1fr)_96px_56px] gap-3 px-4 py-[10px] items-center text-left text-ink no-underline hover:bg-muted"
            >
              <RankBadge rank={i + 1} />
              <div className="flex items-center gap-2.5 min-w-0">
                <FilerAvatar filer={f} size={28} />
                <div className="min-w-0">
                  <div className="text-small text-ink font-medium truncate">{f.full_name}</div>
                  <div className="text-mini text-ink_muted truncate mt-[1px]">{role(f)}</div>
                </div>
              </div>
              <span
                className={`text-small font-semibold tabular-nums text-right ${ex >= 0 ? "text-buy" : "text-sell"}`}
              >
                {exSign}
                {ex.toFixed(1)}%
              </span>
              <div className="text-right">
                <SampleChip n={f.scored_buys} />
              </div>
            </RowLink>
          );
        })}
      </div>
    </div>
  );
}
