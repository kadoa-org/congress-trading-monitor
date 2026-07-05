import React, { useMemo, useState } from "react";
import { FilerAvatar } from "./components/TablePrimitives";
import { TickerBadge } from "./components/TickerBadge";
import { cleanAssetName, fmtAmountRange, fmtInt, Pill, RowLink, SourceLink } from "./ui";

const COLUMNS = [
  { key: "filer_name", label: "Filer", numeric: false, sortable: true },
  { key: "ticker", label: "Ticker", numeric: false, sortable: true },
  { key: "asset_name", label: "Asset", numeric: false, sortable: false },
  { key: "transaction_type", label: "Side", numeric: false, sortable: true },
  { key: "amount", label: "Amount", numeric: true, sortable: true },
  { key: "transaction_date", label: "Traded", numeric: true, sortable: true },
  { key: "filing_date", label: "Filed", numeric: true, sortable: true },
  { key: "days_to_file", label: "Lag", numeric: true, sortable: true },
  { key: "excess_since", label: "vs SPY", numeric: true, sortable: true },
  { key: "doc_url", label: "Source", numeric: true, sortable: false },
];

const DEFAULT_PAGE_SIZE = 200;

// GOV.UK palette
const GREEN = "#00703c";
const RED = "#d4351c";

// Sort indicator: dimmed double-chevron on inactive sortable columns,
// solid single arrow showing direction on the active column. Lets users
// see at a glance which columns they can sort without hover discovery.
function SortIndicator({ active, dir }) {
  if (!active) {
    return (
      <svg width="8" height="10" viewBox="0 0 8 10" className="text-[#b1b4b6] shrink-0" aria-hidden="true">
        <path d="M2 4 L4 2 L6 4" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        <path d="M2 6 L4 8 L6 6" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" className="text-[#0b0c0c] shrink-0" aria-hidden="true">
      <path
        d={dir === "asc" ? "M2 6 L5 3 L8 6" : "M2 4 L5 7 L8 4"}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

// Owner code chip: STOCK Act filings label who in the household the trade
// belongs to. SP = spouse, DC = dependent child, JT = joint, DJ = dependent
// joint. If it's blank or "self", don't render a chip (that's the default).
const OWNER_LABELS = {
  SP: { label: "SP", title: "Trade by spouse" },
  DC: { label: "DC", title: "Trade by dependent child" },
  JT: { label: "JT", title: "Joint account" },
  DJ: { label: "DJ", title: "Dependent joint account" },
};

function OwnerChip({ owner }) {
  const meta = owner ? OWNER_LABELS[owner.toUpperCase?.()] : null;
  if (!meta) return null;
  return (
    <span
      className="shrink-0 inline-flex items-center px-[5px] h-[16px] border border-[#b1b4b6] bg-[#f3f2f1] text-[#0b0c0c] text-[11px] font-semibold tabular-nums"
      title={meta.title}
    >
      {meta.label}
    </span>
  );
}

function assetTypeTag(type) {
  if (!type) return null;
  const t = String(type).toUpperCase();
  if (t === "OP" || t === "OPTION" || t.includes("OPTION")) return { label: "OP", title: "Option" };
  if (t === "BD" || t.includes("BOND") || t === "CS") return { label: "BD", title: "Bond / corporate debt" };
  if (t === "CT" || t.includes("CRYPTO")) return { label: "CR", title: "Cryptocurrency" };
  if (t === "MF" || t.includes("FUND")) return { label: "FD", title: "Fund" };
  return null;
}

function AssetTypeChip({ tag }) {
  if (!tag) return null;
  return (
    <span
      className="shrink-0 inline-flex items-center px-[5px] h-[16px] border border-[#b1b4b6] bg-[#f3f2f1] text-[#505a5f] text-[11px] font-semibold tabular-nums"
      title={tag.title}
    >
      {tag.label}
    </span>
  );
}

// Classify a raw PTR transaction_type string into buy/sell/exchange + display label.
function sideOf(t) {
  const tt = (t.transaction_type || "").toLowerCase();
  const isBuy = tt.includes("urchase") || tt === "p" || /^p($|\s|\()/.test(tt);
  const isSell = tt.includes("ale") || tt === "s" || /^s($|\s|\()/.test(tt);
  const isPartial = tt.includes("parti");
  const isExchange = tt.includes("xchang");
  const label = isBuy
    ? "Buy"
    : isSell
      ? isPartial
        ? "Sell·p"
        : "Sell"
      : isExchange
        ? "Exch"
        : (t.transaction_type || "—").slice(0, 6);
  const tone = isBuy ? "buy" : isSell ? "sell" : "neutral";
  return { isBuy, isSell, label, tone };
}

export default function TradesTable({ trades, tall = false, sortCol, onSort, filersById }) {
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [internalSort, setInternalSort] = useState({ key: "filing_date", dir: "desc" });
  const col = sortCol ?? internalSort;
  const setCol = onSort ?? setInternalSort;
  // Only sort internally when the caller hasn't already sorted (sortCol === undefined).
  // TradesPage pre-sorts on the page level; FilerPage/TickerPage pass unsorted data.
  const controlled = sortCol !== undefined;

  const sortedTrades = useMemo(() => {
    if (controlled) return trades;
    const { key, dir } = col;
    const mul = dir === "asc" ? 1 : -1;
    const valueFor = (t) => {
      if (key === "amount") {
        return t.amount_range_low != null && t.amount_range_high != null
          ? (t.amount_range_low + t.amount_range_high) / 2
          : -Infinity;
      }
      if (key === "excess_since" || key === "days_to_file" || key === "ret_since") {
        const v = t[key];
        return v == null ? (dir === "asc" ? Infinity : -Infinity) : v;
      }
      return t[key] ?? "";
    };
    return [...trades].sort((a, b) => {
      const av = valueFor(a);
      const bv = valueFor(b);
      if (av < bv) return -1 * mul;
      if (av > bv) return 1 * mul;
      return 0;
    });
  }, [trades, col, controlled]);

  const displayed = sortedTrades.slice(0, pageSize);

  const toggleSort = (k) => {
    if (col.key === k) setCol({ key: k, dir: col.dir === "asc" ? "desc" : "asc" });
    else setCol({ key: k, dir: "desc" });
  };

  return (
    <div>
      {/* Mobile: stacked cards. Desktop (lg+): a GOV.UK table. */}
      <div className="lg:hidden border border-[#b1b4b6] bg-white divide-y divide-[#b1b4b6]">
        {displayed.length === 0 && (
          <div className="px-4 py-10 text-[14px] text-[#505a5f] text-center">No trades match the current filters.</div>
        )}
        {displayed.map((t) => (
          <MobileTradeCard key={t.id} t={t} filersById={filersById} />
        ))}
      </div>

      <div className="hidden lg:block overflow-x-auto">
        <table className="govuk-table govuk-table--small-text-until-tablet" style={{ minWidth: 1100, marginBottom: 0 }}>
          <thead className="govuk-table__head">
            <tr className="govuk-table__row">
              {COLUMNS.map((c) => {
                const isActive = c.sortable && col.key === c.key;
                return (
                  <th
                    key={c.key}
                    scope="col"
                    className={`govuk-table__header${c.numeric ? " govuk-table__header--numeric" : ""}`}
                    aria-sort={
                      c.sortable ? (isActive ? (col.dir === "asc" ? "ascending" : "descending") : "none") : undefined
                    }
                  >
                    {c.sortable ? (
                      <button
                        type="button"
                        onClick={() => toggleSort(c.key)}
                        className="inline-flex items-center gap-1 bg-transparent cursor-pointer"
                        style={{ font: "inherit", color: "inherit", border: 0, padding: 0 }}
                      >
                        <span>{c.label}</span>
                        <SortIndicator active={isActive} dir={col.dir} />
                      </button>
                    ) : (
                      c.label
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="govuk-table__body">
            {displayed.length === 0 && (
              <tr className="govuk-table__row">
                <td className="govuk-table__cell text-center text-[#505a5f]" colSpan={COLUMNS.length}>
                  No trades match the current filters.
                </td>
              </tr>
            )}
            {displayed.map((t) => {
              const assetTag = assetTypeTag(t.asset_type);
              const side = sideOf(t);
              const filerPhoto = filersById?.get?.(t.filer_id);
              return (
                <tr key={t.id} className="govuk-table__row hover:bg-[#f3f2f1]">
                  <td className="govuk-table__cell" style={{ maxWidth: 260 }}>
                    <RowLink
                      to={t.filer_id ? `/filer/${t.filer_id}` : undefined}
                      className="flex items-center gap-2 min-w-0 text-left no-underline"
                    >
                      <FilerAvatar
                        filer={filerPhoto ?? { full_name: t.filer_name, chamber: t.chamber, branch: t.branch }}
                        size={24}
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span
                            className={`truncate font-medium ${
                              t.filer_id ? "text-[#1d70b8] underline hover:text-[#003078]" : "text-[#0b0c0c]"
                            }`}
                          >
                            {t.filer_name}
                          </span>
                          <OwnerChip owner={t.owner} />
                        </div>
                        <div className="text-[13px] text-[#505a5f] truncate mt-[1px]">
                          {t.chamber
                            ? `${t.chamber === "senate" ? "Senate" : "House"} · ${t.party ?? "-"}${t.state ? ` · ${t.state}` : ""}`
                            : `${t.level ?? ""} ${t.agency ?? ""}`.trim()}
                        </div>
                      </div>
                    </RowLink>
                  </td>

                  <td className="govuk-table__cell">
                    <div className="flex items-center gap-1.5 min-w-0">
                      {t.ticker ? (
                        <RowLink
                          to={`/ticker/${t.ticker}`}
                          className="inline-flex items-center gap-1.5 truncate hover:opacity-80"
                        >
                          <TickerBadge ticker={t.ticker} size="sm" />
                        </RowLink>
                      ) : (
                        <span className="text-[#b1b4b6]">—</span>
                      )}
                      <AssetTypeChip tag={assetTag} />
                    </div>
                  </td>

                  <td className="govuk-table__cell" style={{ maxWidth: 240 }}>
                    <div className="text-[#505a5f] truncate" title={t.asset_name}>
                      {cleanAssetName(t.asset_name)}
                    </div>
                    {t.comment && (
                      <div className="text-[13px] text-[#b1b4b6] truncate mt-[1px] italic" title={t.comment}>
                        {t.comment}
                      </div>
                    )}
                  </td>

                  <td className="govuk-table__cell">
                    <span title={t.transaction_type}>
                      <Pill tone={side.tone} size="xs">
                        {side.label}
                      </Pill>
                    </span>
                  </td>

                  <td
                    className="govuk-table__cell govuk-table__cell--numeric tabular-nums whitespace-nowrap"
                    title={t.amount_range_label ?? ""}
                  >
                    {fmtAmountRange(t)}
                  </td>

                  <td className="govuk-table__cell govuk-table__cell--numeric tabular-nums whitespace-nowrap text-[#505a5f]">
                    {t.transaction_date ?? "--"}
                  </td>

                  <td className="govuk-table__cell govuk-table__cell--numeric tabular-nums whitespace-nowrap">
                    <span
                      className={t.is_late ? "font-medium" : ""}
                      style={t.is_late ? { color: RED } : { color: "#505a5f" }}
                    >
                      {t.filing_date ?? "--"}
                    </span>
                  </td>

                  <td
                    className="govuk-table__cell govuk-table__cell--numeric tabular-nums whitespace-nowrap"
                    title={
                      t.days_to_file != null
                        ? `${t.days_to_file} days from transaction to filing${t.is_late ? " (late — STOCK Act requires ≤45)" : ""}`
                        : undefined
                    }
                  >
                    {t.days_to_file == null ? (
                      <span className="text-[#b1b4b6]">—</span>
                    ) : (
                      <span
                        className={t.is_late ? "font-medium" : ""}
                        style={t.is_late ? { color: RED } : { color: "#505a5f" }}
                      >
                        {t.days_to_file}d
                      </span>
                    )}
                  </td>

                  <td className="govuk-table__cell govuk-table__cell--numeric tabular-nums whitespace-nowrap font-medium">
                    {t.excess_since == null ? (
                      <span className="text-[#b1b4b6]">—</span>
                    ) : (
                      <span style={{ color: t.excess_since >= 0 ? GREEN : RED }}>
                        {`${t.excess_since >= 0 ? "+" : ""}${t.excess_since.toFixed(1)}%`}
                      </span>
                    )}
                  </td>

                  <td className="govuk-table__cell govuk-table__cell--numeric">
                    <SourceLink url={t.doc_url} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {trades.length > displayed.length && (
        <div className="py-3 border-t border-[#b1b4b6] flex items-center justify-between">
          <span className="govuk-body-s tabular-nums" style={{ margin: 0, color: "#505a5f" }}>
            Showing {fmtInt(displayed.length)} of {fmtInt(trades.length)}
          </span>
          <button
            type="button"
            onClick={() => setPageSize((n) => n + 200)}
            className="govuk-button govuk-button--secondary"
            style={{ marginBottom: 0 }}
          >
            Show 200 more
          </button>
        </div>
      )}
    </div>
  );
}

// Stacked card row for narrow viewports. Surfaces the same data as the
// desktop table but in a vertical layout that fits a phone without horizontal
// scrolling. Tap the filer avatar/name to drill in; tap the ticker badge to
// open the ticker page.
function MobileTradeCard({ t, filersById }) {
  const side = sideOf(t);
  const filerPhoto = filersById?.get?.(t.filer_id);
  const assetTag = assetTypeTag(t.asset_type);
  const officeLine = t.chamber
    ? `${t.chamber === "senate" ? "Senate" : "House"} · ${t.party ?? "-"}${t.state ? ` · ${t.state}` : ""}`
    : `${t.level ?? ""} ${t.agency ?? ""}`.trim();

  const cleanAsset = cleanAssetName(t.asset_name);
  const dateLine =
    t.transaction_date && t.filing_date
      ? `${t.transaction_date} → ${t.filing_date}${t.days_to_file != null ? ` · ${t.days_to_file}d${t.is_late ? " late" : ""}` : ""}`
      : t.transaction_date || t.filing_date || "";

  return (
    <div className="px-3 py-3 text-[14px] leading-[1.4] text-[#0b0c0c]">
      <div className="flex items-start justify-between gap-3">
        <RowLink
          to={t.filer_id ? `/filer/${t.filer_id}` : undefined}
          className="flex items-center gap-2 min-w-0 text-left flex-1 no-underline"
        >
          <FilerAvatar
            filer={filerPhoto ?? { full_name: t.filer_name, chamber: t.chamber, branch: t.branch }}
            size={28}
          />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className={`font-medium truncate ${t.filer_id ? "text-[#1d70b8] underline" : "text-[#0b0c0c]"}`}>
                {t.filer_name}
              </span>
              <OwnerChip owner={t.owner} />
            </div>
            {officeLine && <div className="text-[13px] text-[#505a5f] truncate mt-[1px]">{officeLine}</div>}
          </div>
        </RowLink>
        <div className="text-right shrink-0 leading-tight">
          <div className="flex items-baseline gap-1.5 justify-end">
            <Pill tone={side.tone} size="xs">
              {side.label}
            </Pill>
            <span className="font-medium tabular-nums" title={t.amount_range_label ?? ""}>
              {fmtAmountRange(t)}
            </span>
          </div>
          {t.excess_since != null && (
            <div className="text-[13px] tabular-nums mt-[2px]" style={{ color: t.excess_since >= 0 ? GREEN : RED }}>
              {t.excess_since >= 0 ? "+" : ""}
              {t.excess_since.toFixed(1)}% vs SPY
            </div>
          )}
        </div>
      </div>

      <div className="mt-1.5 ml-9 flex items-center gap-1.5 min-w-0">
        {t.ticker ? (
          <RowLink to={`/ticker/${t.ticker}`} className="inline-flex items-center hover:opacity-80 shrink-0">
            <TickerBadge ticker={t.ticker} size="sm" />
          </RowLink>
        ) : (
          <span className="text-[#b1b4b6] shrink-0">—</span>
        )}
        <AssetTypeChip tag={assetTag} />
        {cleanAsset && (
          <span className="text-[13px] text-[#505a5f] truncate min-w-0" title={t.asset_name}>
            {cleanAsset}
          </span>
        )}
      </div>
      {t.comment && (
        <div className="ml-9 text-[13px] text-[#b1b4b6] italic truncate mt-[1px]" title={t.comment}>
          {t.comment}
        </div>
      )}

      {(dateLine || t.doc_url) && (
        <div className="mt-1.5 ml-9 flex items-center justify-between gap-2 text-[13px] tabular-nums">
          <span className={`truncate ${t.is_late ? "font-medium" : ""}`} style={{ color: t.is_late ? RED : "#505a5f" }}>
            {dateLine}
          </span>
          <SourceLink url={t.doc_url} className="shrink-0" />
        </div>
      )}
    </div>
  );
}
