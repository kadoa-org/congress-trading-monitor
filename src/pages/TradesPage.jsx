import React, { useMemo, useState } from "react";
import FilterBar, { applyFilters, defaultFilters } from "../components/FilterBar";
import { useQueryState } from "../router";
import TradesTable from "../TradesTable";
import { fmtInt } from "../ui";

const FILTER_KEYS = ["q", "source", "type", "size", "late", "party", "state", "asset"];
const QUERY_DEFAULTS = {
  q: "",
  source: "all",
  type: "all",
  size: "all",
  late: "all",
  party: "all",
  state: "all",
  asset: "all",
};

// Adapt URL query state to FilterBar's filter object (which uses "search" not "q")
function toFilters(qs) {
  return {
    ...defaultFilters,
    search: qs.q,
    source: qs.source,
    type: qs.type,
    size: qs.size,
    late: qs.late,
    party: qs.party,
    state: qs.state,
    asset: qs.asset,
  };
}

export default function TradesPage({ data }) {
  const { trades = [], filersById } = data;
  const [qs, setQs] = useQueryState(FILTER_KEYS, QUERY_DEFAULTS);
  const [sortCol, setSortCol] = useState({ key: "filing_date", dir: "desc" });

  const filters = toFilters(qs);
  const setFilters = (updater) => {
    setQs((prev) => {
      const merged = typeof updater === "function" ? updater(toFilters(prev)) : { ...toFilters(prev), ...updater };
      return {
        q: merged.search,
        source: merged.source,
        type: merged.type,
        size: merged.size,
        late: merged.late,
        party: merged.party,
        state: merged.state,
        asset: merged.asset,
      };
    });
  };

  const filtered = useMemo(() => {
    const rows = applyFilters(trades, filters);
    const { key, dir } = sortCol;
    const mul = dir === "asc" ? 1 : -1;
    const valued = (t) => {
      if (key === "amount") return t.amount_range_low != null ? (t.amount_range_low + t.amount_range_high) / 2 : -1;
      if (key === "ret_since" || key === "excess_since" || key === "days_to_file") {
        const v = t[key];
        return v == null ? (dir === "asc" ? Infinity : -Infinity) : v;
      }
      return t[key] ?? "";
    };
    return [...rows].sort((a, b) => {
      const av = valued(a);
      const bv = valued(b);
      if (av < bv) return -1 * mul;
      if (av > bv) return 1 * mul;
      return 0;
    });
  }, [trades, filters, sortCol]);

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 pt-8 pb-16">
      <h1 className="govuk-heading-l" style={{ marginBottom: 10 }}>
        All trades
      </h1>
      <p className="govuk-hint">
        {fmtInt(filtered.length)} of {fmtInt(trades.length)}
      </p>

      <div className="mb-4">
        <FilterBar filters={filters} setFilters={setFilters} trades={trades} />
      </div>

      <TradesTable trades={filtered} tall sortCol={sortCol} onSort={setSortCol} filersById={filersById} />
    </div>
  );
}
