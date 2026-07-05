import React, { useMemo } from "react";
import { DataTable } from "../kit";
import { dateInAdmin, findAdmin, fmtInt, fmtUSD, Link, RowLink, SectionHeader } from "../ui";
import { FilerAvatar } from "./TablePrimitives";

// Trump II cabinet spotlight. Surfaces executive-branch officials with any
// disclosed activity since the 2025 inauguration. Ordered by est. volume,
// which is more telling than raw trade counts for senior officials who may
// trade large one-off positions rather than many small ones.
//
// Inspired by open-cabinet.org's "What is Trump's cabinet buying?" hero block.

// GOV.UK buy/sell text colours.
const BUY = "text-[#0f7a52]";
const SELL = "text-[#ca3535]";

export default function CabinetSpotlight({ filers, trades }) {
  const admin = findAdmin("trump2");

  const spotlight = useMemo(() => {
    const byFiler = new Map();
    let totalTrades = 0,
      totalLate = 0,
      totalVol = 0;
    const tickerCount = new Map();
    for (const t of trades) {
      if (!dateInAdmin(t.transaction_date, admin)) continue;
      const fid = t.filer_id;
      if (!fid) continue;
      const filer = filers.find((f) => f.id === fid);
      if (!filer || filer.branch !== "executive") continue;
      if (!byFiler.has(fid)) {
        byFiler.set(fid, {
          id: fid,
          name: t.filer_name,
          agency: filer.agency,
          level: filer.level,
          photo_url: filer.photo_url,
          branch: filer.branch,
          trades: 0,
          buys: 0,
          sells: 0,
          volume: 0,
          late: 0,
          latest: null,
        });
      }
      const e = byFiler.get(fid);
      e.trades++;
      totalTrades++;
      const tt = (t.transaction_type || "").toLowerCase();
      if (tt.includes("urchase") || tt === "p") e.buys++;
      else if (tt.includes("ale") || tt === "s") e.sells++;
      const mid = t.amount_range_low && t.amount_range_high ? (t.amount_range_low + t.amount_range_high) / 2 : 0;
      e.volume += mid;
      totalVol += mid;
      if (t.is_late) {
        e.late++;
        totalLate++;
      }
      if (!e.latest || (t.filing_date && t.filing_date > e.latest)) e.latest = t.filing_date;
      if (t.ticker) tickerCount.set(t.ticker, (tickerCount.get(t.ticker) || 0) + 1);
    }
    const officials = [...byFiler.values()].sort((a, b) => b.volume - a.volume);
    const topTickers = [...tickerCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
    return { officials, totalTrades, totalLate, totalVol, topTickers };
  }, [filers, trades, admin]);

  if (spotlight.officials.length === 0) return null;

  return (
    <div>
      <SectionHeader
        title="Cabinet activity"
        subtitle={`${fmtInt(spotlight.officials.length)} officials · ${fmtInt(spotlight.totalTrades)} trades · ${fmtUSD(spotlight.totalVol)} since 2025-01-20`}
        right={<Link to="/filers?admin=trump2&branch=executive">See all</Link>}
      />
      <DataTable
        columns={[
          { key: "rank", header: "#", width: 36, align: "right", render: (o) => <span style={{ color: "var(--dk-muted)" }}>{o._rank}</span> },
          {
            key: "official",
            header: "Official",
            render: (o) => (
              <RowLink to={`/filer/${o.id}`} className="flex items-center gap-2.5 min-w-0 no-underline" style={{ color: "var(--dk-ink)" }}>
                <FilerAvatar filer={o} size={28} />
                <span className="min-w-0">
                  <span style={{ display: "block", fontWeight: 500 }}>{o.name}</span>
                  <span className="dk-hint">{o.level || "Official"}</span>
                </span>
              </RowLink>
            ),
          },
          { key: "agency", header: "Agency", render: (o) => <span style={{ color: "var(--dk-muted)" }}>{o.agency || "—"}</span> },
          { key: "trades", header: "Trades", align: "right", render: (o) => fmtInt(o.trades) },
          {
            key: "mix",
            header: "Buy / Sell",
            align: "right",
            render: (o) => {
              const netBias = o.trades ? ((o.buys - o.sells) / o.trades) * 100 : 0;
              return (
                <>
                  <span className="dk-pos">{o.buys}</span>
                  <span style={{ color: "var(--dk-muted)" }}>/</span>
                  <span className="dk-neg">{o.sells}</span>
                  <span style={{ color: "var(--dk-muted)", marginLeft: 6 }}>{netBias > 20 ? "↑" : netBias < -20 ? "↓" : "•"}</span>
                </>
              );
            },
          },
          { key: "volume", header: "Est. volume", align: "right", render: (o) => fmtUSD(o.volume) },
        ]}
        rows={spotlight.officials.slice(0, 10).map((o, i) => ({ ...o, _rank: i + 1 }))}
        rowKey={(o) => o.id}
      />
    </div>
  );
}
