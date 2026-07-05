import React, { useMemo } from "react";
import { DataTable, Tag } from "../kit";
import { bestAssetNameByTicker, cleanAssetName, fmtAmountRange, RowLink } from "../ui";
import { FilerAvatar } from "./TablePrimitives";
import { TickerBadge } from "./TickerBadge";

// Latest activity feed — last N filings, sorted by filing_date desc.

function relativeDate(iso) {
  if (!iso) return "";
  const then = Date.parse(iso);
  if (!Number.isFinite(then)) return iso;
  const days = Math.round((Date.now() - then) / 86400_000);
  if (days <= 0) return "today";
  if (days === 1) return "1d ago";
  if (days < 30) return `${days}d ago`;
  const months = Math.round(days / 30);
  if (months < 12) return `${months}mo ago`;
  return iso;
}

export default function LatestActivity({ trades, limit = 12 }) {
  const rows = useMemo(() => {
    return [...trades]
      .filter((t) => t.filing_date)
      .sort((a, b) => (a.filing_date < b.filing_date ? 1 : a.filing_date > b.filing_date ? -1 : 0))
      .slice(0, limit);
  }, [trades, limit]);
  const bestNames = useMemo(() => bestAssetNameByTicker(trades), [trades]);

  if (!rows.length) return null;

  const columns = [
    {
      key: "filer",
      header: "Filer",
      render: (t) => {
        const fullAsset = bestNames.get(t.ticker) || cleanAssetName(t.asset_name) || "";
        return (
          <RowLink
            to={t.filer_id ? `/filer/${t.filer_id}` : undefined}
            className="flex items-start gap-2 min-w-0 no-underline"
            style={{ color: "var(--dk-ink)" }}
          >
            <FilerAvatar filer={{ full_name: t.filer_name, chamber: t.chamber, branch: t.branch }} size={24} />
            <span className="min-w-0">
              <span style={{ display: "block", fontWeight: 500 }}>{t.filer_name}</span>
              <span className="flex items-center gap-1.5" style={{ marginTop: 1 }}>
                {t.ticker && <TickerBadge ticker={t.ticker} size="sm" />}
                <span className="dk-hint truncate" style={{ maxWidth: 120 }} title={fullAsset}>
                  {fullAsset}
                </span>
              </span>
            </span>
          </RowLink>
        );
      },
    },
    {
      key: "side",
      header: "Side",
      render: (t) => {
        const tt = (t.transaction_type || "").toLowerCase();
        const isBuy = tt.includes("urchase") || tt === "p";
        const isSell = tt.includes("ale") || tt === "s";
        return <Tag tone={isBuy ? "green" : isSell ? "red" : "grey"}>{isBuy ? "Buy" : isSell ? "Sell" : "Other"}</Tag>;
      },
    },
    {
      key: "amount",
      header: "Amount",
      align: "right",
      render: (t) => <span style={{ whiteSpace: "nowrap" }} title={t.amount_range_label || undefined}>{fmtAmountRange(t)}</span>,
    },
    {
      key: "spy",
      header: "vs SPY",
      align: "right",
      headerHint: "Stock's excess return vs SPY since the transaction date",
      render: (t) =>
        t.excess_since == null ? (
          <span style={{ color: "var(--dk-faint)" }}>—</span>
        ) : (
          <span className={t.excess_since >= 0 ? "dk-pos" : "dk-neg"}>
            {t.excess_since >= 0 ? "+" : ""}
            {t.excess_since.toFixed(1)}%
          </span>
        ),
    },
    {
      key: "filed",
      header: "Filed",
      align: "right",
      render: (t) => <span style={{ color: "var(--dk-muted)" }}>{relativeDate(t.filing_date)}</span>,
    },
  ];

  return <DataTable columns={columns} rows={rows} rowKey={(t) => t.id} />;
}
