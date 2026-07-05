import React, { useEffect, useMemo, useRef, useState } from "react";
import { navigate } from "../router";

function role(f) {
  if (f.branch === "executive") return `Exec · ${f.agency ?? ""}`.trim();
  return `${f.chamber === "senate" ? "Senate" : "House"} · ${f.party ?? "-"} · ${f.state ?? "-"}`;
}

// Command palette restyled to data-kit conventions. Fuzzy-filters filers + tickers.
export default function CommandPalette({ open, onClose, filers = [], tickers = [] }) {
  const [q, setQ] = useState("");
  const [idx, setIdx] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    setQ("");
    setIdx(0);
    const t = setTimeout(() => inputRef.current?.focus(), 10);
    return () => clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const items = useMemo(() => {
    const query = q.trim().toLowerCase();
    const out = [];
    // Always offer tab navigation up top
    const tabs = [
      { type: "page", id: "/", label: "Overview", hint: "Hero + KPIs + scatter" },
      { type: "page", id: "/filers", label: "Filers", hint: "Every politician / official" },
      { type: "page", id: "/tickers", label: "Tickers", hint: "Every stock in the corpus" },
      { type: "page", id: "/trades", label: "Trades", hint: "Filterable transaction table" },
      { type: "page", id: "/about", label: "About", hint: "How the STOCK Act works" },
    ];
    for (const t of tabs) if (!query || t.label.toLowerCase().includes(query)) out.push(t);

    const limit = query ? 30 : 6;
    for (const f of filers) {
      if (!query && out.filter((x) => x.type === "filer").length >= limit) break;
      if (query && out.filter((x) => x.type === "filer").length >= limit) break;
      const name = (f.full_name || "").toLowerCase();
      if (query && !name.includes(query) && !(f.state || "").toLowerCase().includes(query)) continue;
      out.push({
        type: "filer",
        id: `/filer/${f.id}`,
        label: f.full_name,
        hint: role(f),
        right: `${(f.trade_count ?? 0).toLocaleString()} trades`,
      });
    }
    for (const t of tickers) {
      if (!query && out.filter((x) => x.type === "ticker").length >= limit) break;
      if (query && out.filter((x) => x.type === "ticker").length >= limit) break;
      if (query && !(t.ticker || "").toLowerCase().includes(query)) continue;
      out.push({
        type: "ticker",
        id: `/ticker/${t.ticker}`,
        label: t.ticker,
        hint: `${t.trade_count} trades · ${t.filer_count} filers`,
        right: `$${Math.round((t.est_volume || 0) / 1e6)}M`,
      });
    }
    return out;
  }, [q, filers, tickers]);

  useEffect(() => {
    setIdx(0);
  }, [q]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setIdx((i) => Math.min(i + 1, items.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setIdx((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        const pick = items[idx];
        if (pick) {
          onClose();
          navigate(pick.id);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, items, idx, onClose]);

  useEffect(() => {
    if (!listRef.current) return;
    const el = listRef.current.querySelector(`[data-idx="${idx}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [idx]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] px-4">
      <div className="absolute inset-0 bg-[rgba(11,12,12,0.5)]" onClick={onClose} />
      <div className="relative w-full max-w-[560px] bg-white border-2 border-[#0b0c0c] overflow-hidden">
        <div className="flex items-center gap-2 p-3 border-b border-[#b1b4b6]">
          <label htmlFor="command-palette-search" className="govuk-visually-hidden">
            Search filers, tickers, or jump to a view
          </label>
          <input
            id="command-palette-search"
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search filers, tickers, or jump to a view…"
            className="govuk-input flex-1"
          />
          <kbd className="px-1.5 py-0.5 border border-[#b1b4b6] bg-[#f3f2f1] font-mono text-[14px] text-[#505a5f]">
            Esc
          </kbd>
        </div>
        <div ref={listRef} className="max-h-[52vh] overflow-auto py-1">
          {items.length === 0 ? (
            <div className="px-3 py-6 text-[16px] text-[#505a5f] text-center">No matches</div>
          ) : (
            (() => {
              let lastType = null;
              return items.map((it, i) => {
                const showHeader = it.type !== lastType;
                lastType = it.type;
                const label = { page: "Jump to", filer: "Filers", ticker: "Tickers" }[it.type];
                return (
                  <React.Fragment key={`${it.type}-${it.id}`}>
                    {showHeader && <div className="px-3 pt-2 pb-1 text-[14px] font-bold text-[#505a5f]">{label}</div>}
                    <button
                      data-idx={i}
                      onMouseEnter={() => setIdx(i)}
                      onClick={() => {
                        onClose();
                        navigate(it.id);
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-[7px] text-[16px] text-left text-[#0b0c0c] ${
                        idx === i ? "bg-[#f3f2f1]" : "hover:bg-[#f3f2f1]"
                      }`}
                    >
                      <span className="w-5 h-5 flex items-center justify-center border border-[#b1b4b6] bg-[#f3f2f1] text-[12px] text-[#505a5f] font-mono">
                        {it.type === "filer" ? "P" : it.type === "ticker" ? "$" : "→"}
                      </span>
                      <span
                        className={`flex-1 font-bold ${it.type === "ticker" ? "font-mono" : ""}`}
                        style={{ color: idx === i ? "#1d70b8" : "#0b0c0c" }}
                      >
                        {it.label}
                      </span>
                      <span className="text-[14px] text-[#505a5f] truncate max-w-[180px]">{it.hint}</span>
                      {it.right && (
                        <span className="text-[14px] text-[#505a5f] tabular-nums min-w-[72px] text-right">
                          {it.right}
                        </span>
                      )}
                    </button>
                  </React.Fragment>
                );
              });
            })()
          )}
        </div>
        <div className="flex items-center gap-3 px-3 h-8 border-t border-[#b1b4b6] text-[14px] text-[#505a5f]">
          <span className="inline-flex items-center gap-1">
            <kbd className="px-1 border border-[#b1b4b6] bg-[#f3f2f1] font-mono">↑</kbd>
            <kbd className="px-1 border border-[#b1b4b6] bg-[#f3f2f1] font-mono">↓</kbd>
            <span className="ml-1">navigate</span>
          </span>
          <span className="inline-flex items-center gap-1">
            <kbd className="px-1 border border-[#b1b4b6] bg-[#f3f2f1] font-mono">↵</kbd>
            <span className="ml-1">open</span>
          </span>
        </div>
      </div>
    </div>
  );
}
