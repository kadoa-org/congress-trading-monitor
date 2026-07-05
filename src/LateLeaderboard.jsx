import React, { useMemo } from "react";
import { FilerAvatar, RankBadge } from "./components/TablePrimitives";
import { RowLink, TABLE_HEADER_CLS } from "./ui";

function role(f) {
  if (f.branch === "executive") return `${f.level ?? "Exec"} · ${f.agency ?? ""}`.trim();
  return `${f.chamber === "senate" ? "Senate" : "House"} · ${f.party ?? "-"} · ${f.state ?? "-"}`;
}

export default function LateLeaderboard({ filers }) {
  // Balance share with absolute count: share × sqrt(late_count) surfaces the
  // newsworthy filers (high share AND many cases) over statistical noise
  // (5 late / 5 total).
  const ranked = useMemo(
    () =>
      filers
        .filter((f) => f.late_filings >= 5 && f.trade_count >= 10)
        .map((f) => ({
          ...f,
          _score: (f.late_filings / f.trade_count) * Math.sqrt(f.late_filings),
        }))
        .sort((a, b) => b._score - a._score)
        .slice(0, 12),
    [filers],
  );

  return (
    <div className="border border-stroke rounded-md bg-panel overflow-hidden">
      <div
        className={`grid grid-cols-[28px_minmax(0,1fr)_80px_112px] gap-3 px-4 py-[10px] border-b border-stroke items-center ${TABLE_HEADER_CLS}`}
      >
        <span></span>
        <span>Filer</span>
        <span className="tabular-nums text-right">Late share</span>
        <span className="tabular-nums text-right">Late / total</span>
      </div>
      <div className="divide-y divide-stroke_soft">
        {ranked.map((f, i) => {
          const sharePct = (f.late_filings / f.trade_count) * 100;
          return (
            <RowLink
              key={f.id}
              to={`/filer/${f.id}`}
              className="w-full grid grid-cols-[28px_minmax(0,1fr)_80px_112px] gap-3 px-4 py-[10px] items-center text-left text-ink no-underline hover:bg-muted"
            >
              <RankBadge rank={i + 1} />
              <div className="flex items-center gap-2.5 min-w-0">
                <FilerAvatar filer={f} size={28} />
                <div className="min-w-0">
                  <div className="text-small text-ink font-medium truncate">{f.full_name}</div>
                  <div className="text-mini text-ink_muted truncate mt-[1px]">{role(f)}</div>
                </div>
              </div>
              <span className="text-small text-warn font-semibold tabular-nums text-right">{sharePct.toFixed(0)}%</span>
              <span className="tabular-nums text-right text-small">
                <span className="text-ink font-semibold">{f.late_filings.toLocaleString()}</span>
                <span className="text-ink_muted"> / {f.trade_count.toLocaleString()}</span>
              </span>
            </RowLink>
          );
        })}
      </div>
    </div>
  );
}
