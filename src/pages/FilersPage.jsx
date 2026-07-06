import React, { useMemo } from "react";
import { InlineSearchInput, SingleSelectChip } from "../components/FilterBar";
import { FilerAvatar, SampleChip } from "../components/TablePrimitives";
import { useQueryState } from "../router";
import { Card, fmtInt, fmtUSD, RowLink, SectionHeader, SortHeader } from "../ui";

// GOV.UK palette for data colouring (green = buy/positive, red = sell/negative).
const GREEN = "text-[#0f7a52]";
const RED = "text-[#ca3535]";

const SORTS = {
  trades: { label: "Most trades", fn: (a, b) => b.trade_count - a.trade_count },
  late: { label: "Most late filings", fn: (a, b) => b.late_filings / b.trade_count - a.late_filings / a.trade_count },
  volume: { label: "Highest volume", fn: (a, b) => (b.est_volume || 0) - (a.est_volume || 0) },
  alpha: { label: "Highest alpha vs SPY", fn: (a, b) => (b.weighted_excess ?? -999) - (a.weighted_excess ?? -999) },
};

const BRANCH_FILTERS = [
  { k: "all", label: "All" },
  { k: "house", label: "House" },
  { k: "senate", label: "Senate" },
  { k: "executive", label: "Executive" },
];

function matchBranch(f, k) {
  if (k === "all") return true;
  if (k === "executive") return f.branch === "executive";
  return f.branch === "congress" && f.chamber === k;
}

export default function FilersPage({ data }) {
  const { filers = [], returns = [] } = data;
  const [qs, setQs] = useQueryState(["q", "sort", "branch"], {
    q: "",
    sort: "trades",
    branch: "all",
  });

  // Merge returns into filers by id for sorting / display
  const enrichedFilers = useMemo(() => {
    const byId = new Map(returns.map((r) => [r.id, r]));
    return filers.map((f) => {
      const r = byId.get(f.id);
      return { ...f, weighted_excess: r?.weighted_excess ?? null, scored_buys: r?.scored_buys ?? 0 };
    });
  }, [filers, returns]);

  const filtered = useMemo(() => {
    const q = qs.q.toLowerCase().trim();
    let list = enrichedFilers.filter((f) => {
      if (!matchBranch(f, qs.branch)) return false;
      if (!q) return true;
      return (
        (f.full_name || "").toLowerCase().includes(q) ||
        (f.state || "").toLowerCase().includes(q) ||
        (f.agency || "").toLowerCase().includes(q)
      );
    });
    const sorter = SORTS[qs.sort] ?? SORTS.trades;
    return [...list].sort(sorter.fn);
  }, [enrichedFilers, qs]);

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 pt-8 pb-16">
      <h1 className="govuk-heading-l" style={{ marginBottom: 10 }}>Filers</h1>
      <p className="govuk-hint" style={{ marginTop: -6 }}>{`${fmtInt(filtered.length)} of ${fmtInt(enrichedFilers.length)}`}</p>

      <div className="dk-toolbar">
        <InlineSearchInput
          value={qs.q}
          onChange={(v) => setQs({ q: v })}
          placeholder="Search name, state, agency…"
          width={240}
        />
        <SingleSelectChip
          label="Chamber"
          options={BRANCH_FILTERS}
          value={qs.branch}
          onChange={(v) => setQs({ branch: v })}
        />
      </div>

      <FilersTable
        filtered={filtered}
        sort={qs.sort}
        setSort={(v) => setQs({ sort: v })}
        onClear={() => setQs({ q: "", sort: "trades", branch: "all" })}
      />
    </div>
  );
}

// Columns: rank · avatar+name · trades · buy/sell split · volume · late share · alpha vs SPY
// Sortable headers stay inside <th>; URL ?sort=<key> still works.
function FilersTable({ filtered, sort, setSort, onClear }) {
  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="govuk-table" style={{ marginBottom: 0 }}>
          <thead className="govuk-table__head">
            <tr className="govuk-table__row">
              <th scope="col" className="govuk-table__header govuk-table__header--numeric">
                #
              </th>
              <th scope="col" className="govuk-table__header">
                Filer
              </th>
              <th scope="col" className="govuk-table__header govuk-table__header--numeric">
                <SortHeader label="Trades" sortKey="trades" sort={sort} setSort={setSort} align="right" />
              </th>
              <th scope="col" className="govuk-table__header govuk-table__header--numeric whitespace-nowrap">
                Buy / Sell mix
              </th>
              <th scope="col" className="govuk-table__header govuk-table__header--numeric whitespace-nowrap">
                <SortHeader label="Est. volume" sortKey="volume" sort={sort} setSort={setSort} align="right" />
              </th>
              <th scope="col" className="govuk-table__header govuk-table__header--numeric whitespace-nowrap">
                <SortHeader label="Late share" sortKey="late" sort={sort} setSort={setSort} align="right" />
              </th>
              <th scope="col" className="govuk-table__header govuk-table__header--numeric whitespace-nowrap">
                <SortHeader label="vs SPY" sortKey="alpha" sort={sort} setSort={setSort} align="right" />
              </th>
            </tr>
          </thead>
          <tbody className="govuk-table__body">
            {filtered.length === 0 && (
              <tr className="govuk-table__row">
                <td colSpan={7} className="govuk-table__cell text-center text-[#505a5f]">
                  No filers match these filters.{" "}
                  <button
                    onClick={onClear}
                    className="govuk-link"
                    style={{ background: "none", border: 0, padding: 0, cursor: "pointer" }}
                  >
                    Clear filters
                  </button>
                  .
                </td>
              </tr>
            )}
            {filtered.slice(0, 500).map((f, i) => {
              const alpha = f.weighted_excess;
              const officeLine =
                f.branch === "executive"
                  ? `${f.level ?? ""} ${f.agency ?? ""}`.trim() || "Executive"
                  : `${f.chamber === "senate" ? "Senate" : "House"} · ${f.party ?? "-"} · ${f.state ?? "-"}`;
              return (
                <tr key={f.id} className="govuk-table__row hover:bg-[#f3f2f1]">
                  <td className="govuk-table__cell govuk-table__cell--numeric tabular-nums text-[#505a5f]">{i + 1}</td>
                  <td className="govuk-table__cell">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <FilerAvatar filer={f} size={32} />
                      <div className="min-w-0">
                        <RowLink to={`/filer/${f.id}`} className="govuk-link">
                          {f.full_name}
                        </RowLink>
                        <div className="text-[#505a5f] truncate" style={{ fontSize: "14px" }}>
                          {officeLine}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="govuk-table__cell govuk-table__cell--numeric tabular-nums">
                    {f.trade_count.toLocaleString()}
                  </td>
                  <td className="govuk-table__cell govuk-table__cell--numeric tabular-nums whitespace-nowrap">
                    <span className={GREEN}>{f.purchases || 0}</span>
                    <span className="text-[#b1b4b6] mx-[2px]">/</span>
                    <span className={RED}>{f.sales || 0}</span>
                  </td>
                  <td className="govuk-table__cell govuk-table__cell--numeric tabular-nums text-[#505a5f]">
                    {f.est_volume ? fmtUSD(f.est_volume) : "—"}
                  </td>
                  <td className="govuk-table__cell govuk-table__cell--numeric tabular-nums whitespace-nowrap">
                    {f.late_filings > 0 ? (
                      <>
                        <span className={`font-bold ${f.late_filings / f.trade_count >= 0.5 ? RED : "text-[#505a5f]"}`}>
                          {((f.late_filings / f.trade_count) * 100).toFixed(0)}%
                        </span>{" "}
                        <span className="text-[#505a5f]">({f.late_filings})</span>
                      </>
                    ) : (
                      <span className="text-[#505a5f]">—</span>
                    )}
                  </td>
                  <td className="govuk-table__cell govuk-table__cell--numeric tabular-nums whitespace-nowrap">
                    {alpha == null ? (
                      <span className="text-[#505a5f]">—</span>
                    ) : (
                      <>
                        <span className={`font-bold ${alpha >= 0 ? GREEN : RED}`}>
                          {alpha >= 0 ? "+" : ""}
                          {alpha.toFixed(1)}%
                        </span>
                        <SampleChip n={f.scored_buys} />
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {filtered.length > 500 && (
        <div className="px-4 py-2 border-t border-[#b1b4b6] text-[#505a5f] text-center" style={{ fontSize: "14px" }}>
          Showing 500 of {filtered.length.toLocaleString()} filers. Narrow the search to see the rest.
        </div>
      )}
    </Card>
  );
}
