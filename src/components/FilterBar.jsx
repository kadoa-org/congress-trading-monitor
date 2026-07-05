import { useEffect, useMemo, useRef, useState } from "react";

// Linear-style filter bar: chips for applied filters + a "+ Filter" button that
// opens a category picker → value picker. Clicking a chip's value reopens the
// value picker for that filter. Clear button wipes all filters to defaults.

// ---- Public exports: data model + filter predicate ------------------------------

export const defaultFilters = {
  search: "",
  source: "all",
  type: "all",
  size: "all",
  late: "all",
  party: "all",
  state: "all",
  asset: "all",
};

// Asset-type buckets we treat as NOT publicly-traded equity. Drawn from raw
// PTR/278-T asset_type values present in the dataset.
const NON_PUBLIC_ASSET_TYPES = new Set([
  "Municipal Security",
  "Corporate Bond",
  "Corporate Debt",
  "Non-Public Stock",
  "Non-Public Equity",
  "Commodities/Futures Contract",
  "Commodity",
  "Futures",
  "Cryptocurrency",
  "Other",
]);

export function isPubliclyTraded(t) {
  if (!t.ticker) return false;
  const at = t.asset_type;
  if (!at) return true;
  return !NON_PUBLIC_ASSET_TYPES.has(at);
}

export function applyFilters(trades, filters) {
  return trades.filter((t) => {
    if (filters.source !== "all" && t.source_id !== filters.source) return false;
    if (filters.party !== "all" && t.party !== filters.party) return false;
    if (filters.state !== "all" && t.state !== filters.state) return false;
    if (filters.asset === "public" && !isPubliclyTraded(t)) return false;
    if (filters.type !== "all") {
      const tt = (t.transaction_type || "").toLowerCase();
      const isBuy = tt.includes("urchase") || tt === "p";
      const isSell = tt.includes("ale") || tt === "s";
      if (filters.type === "buy" && !isBuy) return false;
      if (filters.type === "sell" && !isSell) return false;
    }
    if (filters.size !== "all") {
      const mid = t.amount_range_low && t.amount_range_high ? (t.amount_range_low + t.amount_range_high) / 2 : null;
      if (!mid) return false;
      if (filters.size === "small" && !(mid < 50000)) return false;
      if (filters.size === "medium" && !(mid >= 50000 && mid <= 500000)) return false;
      if (filters.size === "large" && !(mid > 500000)) return false;
      if (filters.size === "whale" && !(mid > 5000000)) return false;
    }
    if (filters.late !== "all") {
      const isLate = !!t.is_late;
      if (filters.late === "late" && !isLate) return false;
      if (filters.late === "on_time" && isLate) return false;
    }
    if (filters.search) {
      const q = filters.search.toLowerCase();
      if (
        !(t.ticker || "").toLowerCase().includes(q) &&
        !(t.asset_name || "").toLowerCase().includes(q) &&
        !(t.filer_name || "").toLowerCase().includes(q)
      )
        return false;
    }
    return true;
  });
}

// ---- Icons ---------------------------------------------------------------------

const icon = {
  search: (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" />
    </svg>
  ),
  source: (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2 3h20M4 3v18M20 3v18M4 21h16" />
      <path d="M8 7h8M8 11h8M8 15h5" />
    </svg>
  ),
  type: (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M7 7l10 10M17 7v10M7 7h10" />
    </svg>
  ),
  asset: (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  ),
  size: (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 2v20M5 8l7-6 7 6" />
    </svg>
  ),
  late: (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  ),
  party: (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  state: (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  ),
  plus: (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  ),
  close: (
    <svg
      width="10"
      height="10"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  ),
  check: (
    <svg
      width="11"
      height="11"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  ),
};

// ---- Category definitions ------------------------------------------------------

function buildCategories(trades) {
  const parties = new Set();
  const states = new Set();
  for (const t of trades) {
    if (t.party) parties.add(t.party);
    if (t.state) states.add(t.state);
  }
  return [
    {
      key: "source",
      label: "Source",
      icon: icon.source,
      kind: "single",
      emptyValue: "all",
      options: [
        { k: "house_clerk", label: "House" },
        { k: "senate_efd", label: "Senate" },
        { k: "oge_executive", label: "Executive" },
      ],
    },
    {
      key: "type",
      label: "Side",
      icon: icon.type,
      kind: "single",
      emptyValue: "all",
      options: [
        { k: "buy", label: "Buy" },
        { k: "sell", label: "Sell" },
      ],
    },
    {
      key: "asset",
      label: "Asset",
      icon: icon.asset,
      kind: "single",
      emptyValue: "all",
      options: [{ k: "public", label: "Publicly traded only" }],
    },
    {
      key: "size",
      label: "Size",
      icon: icon.size,
      kind: "single",
      emptyValue: "all",
      options: [
        { k: "small", label: "< $50K" },
        { k: "medium", label: "$50K - $500K" },
        { k: "large", label: "> $500K" },
        { k: "whale", label: "> $5M" },
      ],
    },
    {
      key: "late",
      label: "Filing",
      icon: icon.late,
      kind: "single",
      emptyValue: "all",
      options: [
        { k: "on_time", label: "On time" },
        { k: "late", label: "Late" },
      ],
    },
    {
      key: "party",
      label: "Party",
      icon: icon.party,
      kind: "single",
      emptyValue: "all",
      options: [...parties].sort().map((p) => ({ k: p, label: p })),
    },
    {
      key: "state",
      label: "State",
      icon: icon.state,
      kind: "single",
      emptyValue: "all",
      options: [...states].sort().map((s) => ({ k: s, label: s })),
    },
  ];
}

// ---- FilterBar -----------------------------------------------------------------

export default function FilterBar({ filters, setFilters, trades }) {
  const categories = useMemo(() => buildCategories(trades), [trades]);
  const categoryByKey = useMemo(() => Object.fromEntries(categories.map((c) => [c.key, c])), [categories]);

  const appliedKeys = categories
    .filter((c) => {
      const v = filters[c.key];
      return v !== undefined && v !== null && v !== c.emptyValue;
    })
    .map((c) => c.key);

  const availableForAdd = categories.filter((c) => !appliedKeys.includes(c.key));

  const [open, setOpen] = useState(null); // { anchor: 'add' | chip_key, initialQuery?: string }
  const clearAll = () => setFilters({ ...defaultFilters });

  const anyApplied = appliedKeys.length > 0 || (filters.search ?? "") !== "";

  return (
    <div className="flex flex-wrap items-center gap-[15px]">
      <InlineSearch value={filters.search ?? ""} onChange={(v) => setFilters((prev) => ({ ...prev, search: v }))} />

      {appliedKeys.map((k) => (
        <FilterChip
          key={k}
          cat={categoryByKey[k]}
          value={filters[k]}
          onChange={(v) => setFilters((prev) => ({ ...prev, [k]: v }))}
          onRemove={() => setFilters((prev) => ({ ...prev, [k]: categoryByKey[k].emptyValue }))}
          open={open === k}
          setOpen={(o) => setOpen(o ? k : null)}
        />
      ))}

      <AddFilterButton
        categories={availableForAdd}
        onAdd={(catKey, v) => {
          setFilters((prev) => ({ ...prev, [catKey]: v }));
        }}
        open={open === "__add"}
        setOpen={(o) => setOpen(o ? "__add" : null)}
      />

      {anyApplied && (
        <button onClick={clearAll} className="ml-auto govuk-button govuk-button--secondary" style={{ marginBottom: 0 }}>
          Clear
        </button>
      )}
    </div>
  );
}

// ---- Named exports for Filers/Tickers pages ----------------------------------

export function InlineSearchInput({ value, onChange, placeholder = "Search…", width = 220 }) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      aria-label={placeholder}
      style={{ width }}
      className="govuk-input"
    />
  );
}

// Linear-style single-select chip. Reuses the filter-chip look for cases where
// a page has one small enum filter (e.g. chamber on the Filers page). Not
// removable — the chip stays, its value cycles.
export function SingleSelectChip({ label, icon: chipIcon, options, value, onChange }) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef(null);
  const current = options.find((o) => o.k === value) ?? options[0];
  return (
    <div className="relative inline-flex items-stretch border border-[#0b0c0c] bg-white overflow-hidden h-10 text-[14px]">
      <span className="inline-flex items-center gap-1.5 pl-2.5 pr-2 text-[#505a5f] border-r border-[#b1b4b6]">
        {chipIcon && <span className="text-[#505a5f]">{chipIcon}</span>}
        <span className="font-medium text-[#0b0c0c]">{label}</span>
      </span>
      <button
        ref={btnRef}
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1 px-2.5 text-[#0b0c0c] hover:bg-[#f3f2f1] transition-colors"
      >
        <span className="font-medium">{current.label}</span>
        <svg
          width="10"
          height="10"
          viewBox="0 0 10 10"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
          className="text-[#505a5f]"
        >
          <path d="M2 4 L5 7 L8 4" />
        </svg>
      </button>
      {open && (
        <Popover anchor={btnRef} onClose={() => setOpen(false)}>
          <div className="min-w-[180px] py-1">
            {options.map((o) => (
              <button
                key={o.k}
                onClick={() => {
                  onChange(o.k);
                  setOpen(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-[14px] text-left text-[#0b0c0c] hover:bg-[#f3f2f1]"
              >
                <span className="w-3 text-[#1d70b8]">{value === o.k ? icon.check : null}</span>
                <span className="flex-1">{o.label}</span>
              </button>
            ))}
          </div>
        </Popover>
      )}
    </div>
  );
}

// ---- Internal: legacy inline search used by the main FilterBar ---------------

function InlineSearch({ value, onChange }) {
  return (
    <div>
      <label className="govuk-label govuk-label--s govuk-visually-hidden" htmlFor="filter-bar-search">
        Search trades
      </label>
      <input
        id="filter-bar-search"
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search ticker, filer, asset…"
        className="govuk-input"
        style={{ width: 260 }}
      />
    </div>
  );
}

// ---- Filter chip ---------------------------------------------------------------

function FilterChip({ cat, value, onChange, onRemove, open, setOpen }) {
  const valueLabel = useMemo(() => {
    if (cat.kind === "text") return cat.renderValue ? cat.renderValue(value) : value;
    const opt = cat.options.find((o) => o.k === value);
    return opt?.label ?? value;
  }, [cat, value]);

  const btnRef = useRef(null);

  return (
    <div className="relative inline-flex items-stretch border border-[#0b0c0c] bg-white overflow-hidden h-10 text-[14px]">
      <span className="inline-flex items-center gap-1.5 pl-2.5 pr-2 text-[#505a5f] border-r border-[#b1b4b6]">
        <span className="text-[#505a5f]">{cat.icon}</span>
        <span className="font-medium text-[#0b0c0c]">{cat.label}</span>
      </span>
      <span className="inline-flex items-center px-2 text-[#505a5f] border-r border-[#b1b4b6]">is</span>
      <button
        ref={btnRef}
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1 px-2.5 bg-[#1d70b8] text-white hover:bg-[#003078] transition-colors"
      >
        <span className="font-medium">{valueLabel}</span>
      </button>
      <button
        onClick={onRemove}
        className="inline-flex items-center px-2 text-[#505a5f] hover:text-[#0b0c0c] hover:bg-[#f3f2f1] transition-colors border-l border-[#b1b4b6]"
        aria-label={`Remove ${cat.label} filter`}
      >
        {icon.close}
      </button>
      {open && (
        <Popover anchor={btnRef} onClose={() => setOpen(false)}>
          <ValuePicker
            cat={cat}
            value={value}
            onPick={(v) => {
              onChange(v);
              setOpen(false);
            }}
          />
        </Popover>
      )}
    </div>
  );
}

// ---- Add filter button + popover ----------------------------------------------

function AddFilterButton({ categories, onAdd, open, setOpen }) {
  const btnRef = useRef(null);
  const [activeCat, setActiveCat] = useState(null); // cat key currently hovered / showing submenu
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!open) {
      setActiveCat(null);
      setQuery("");
    }
  }, [open]);

  if (categories.length === 0) return null;
  const filtered = query ? categories.filter((c) => c.label.toLowerCase().includes(query.toLowerCase())) : categories;

  return (
    <div className="relative inline-block">
      <button
        ref={btnRef}
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1.5 h-8 px-3 border border-[#0b0c0c] bg-white text-[15px] font-medium text-[#0b0c0c] hover:bg-[#f3f2f1] transition-colors"
      >
        <span>{icon.plus}</span>
        <span>Filter</span>
      </button>
      {open && (
        <Popover anchor={btnRef} onClose={() => setOpen(false)}>
          <div className="min-w-[220px]">
            <div className="p-1.5 border-b border-[#b1b4b6]">
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Filter…"
                className="w-full h-7 px-2 text-[14px] bg-transparent border-none outline-none placeholder:text-[#505a5f]"
              />
            </div>
            <div className="py-1 max-h-[300px] overflow-y-auto">
              {filtered.map((c) => (
                <CategoryRow
                  key={c.key}
                  cat={c}
                  active={activeCat === c.key}
                  onHover={() => setActiveCat(c.key)}
                  onSelect={(v) => {
                    onAdd(c.key, v);
                    setOpen(false);
                  }}
                />
              ))}
              {filtered.length === 0 && <div className="px-3 py-2 text-[14px] text-[#505a5f]">No filters match.</div>}
            </div>
          </div>
        </Popover>
      )}
    </div>
  );
}

function CategoryRow({ cat, active, onHover, onSelect }) {
  const [submenuOpen, setSubmenuOpen] = useState(false);
  const rowRef = useRef(null);

  // Keyboard/mouse: hover opens submenu. Touch: hover doesn't fire cleanly, so
  // the click handler ensures the submenu opens even if mouseenter was missed.
  // `hasHover` media query feature-detects pointer devices so touch gets the
  // click-to-open flow without the mouseenter-then-click flicker.
  const handleClick = () => {
    if (cat.kind === "text") {
      onSelect("");
    } else {
      setSubmenuOpen(true);
    }
  };

  return (
    <div
      ref={rowRef}
      onMouseEnter={() => {
        onHover();
        if (cat.kind !== "text" && window.matchMedia?.("(hover: hover)").matches) {
          setSubmenuOpen(true);
        }
      }}
      onMouseLeave={() => {
        if (window.matchMedia?.("(hover: hover)").matches) setSubmenuOpen(false);
      }}
    >
      <button
        onClick={handleClick}
        className={`w-full flex items-center gap-2 px-3 py-1.5 text-[14px] text-left hover:bg-[#f3f2f1] ${
          active ? "bg-[#f3f2f1]" : ""
        }`}
      >
        <span className="text-[#505a5f]">{cat.icon}</span>
        <span className="text-[#0b0c0c] flex-1">{cat.label}</span>
        {cat.kind !== "text" && (
          <svg
            width="10"
            height="10"
            viewBox="0 0 10 10"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
            className="text-[#505a5f]"
          >
            <path d="M3.5 2l3 3-3 3" />
          </svg>
        )}
      </button>
      {submenuOpen && cat.kind !== "text" && (
        <Popover anchor={rowRef} placement="right" onClose={() => setSubmenuOpen(false)}>
          <ValuePicker cat={cat} value={cat.emptyValue} onPick={onSelect} />
        </Popover>
      )}
    </div>
  );
}

// ---- Value picker (shared for chip-edit + add-filter submenu) -----------------

function ValuePicker({ cat, value, onPick }) {
  const [q, setQ] = useState("");
  const [textValue, setTextValue] = useState(cat.kind === "text" ? value : "");
  const filtered = useMemo(() => {
    if (cat.kind === "text") return [];
    if (!q) return cat.options;
    return cat.options.filter((o) => o.label.toLowerCase().includes(q.toLowerCase()));
  }, [cat, q]);

  if (cat.kind === "text") {
    return (
      <div className="p-2 min-w-[240px]">
        <input
          autoFocus
          value={textValue}
          onChange={(e) => setTextValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") onPick(textValue);
          }}
          placeholder={cat.placeholder}
          className="govuk-input"
        />
        <button onClick={() => onPick(textValue)} className="govuk-button mt-2 w-full" style={{ marginBottom: 0 }}>
          Apply
        </button>
      </div>
    );
  }

  return (
    <div className="min-w-[200px] max-h-[320px] overflow-auto">
      {cat.options.length > 8 && (
        <div className="p-1.5 border-b border-[#b1b4b6]">
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search…"
            className="w-full h-7 px-2 text-[14px] bg-transparent border-none outline-none placeholder:text-[#505a5f]"
          />
        </div>
      )}
      <div className="py-1">
        {filtered.map((o) => (
          <button
            key={o.k}
            onClick={() => onPick(o.k)}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-[14px] text-left text-[#0b0c0c] hover:bg-[#f3f2f1]"
          >
            <span className="w-3 text-[#1d70b8]">{value === o.k ? icon.check : null}</span>
            <span className="flex-1">{o.label}</span>
          </button>
        ))}
        {filtered.length === 0 && <div className="px-3 py-2 text-[14px] text-[#505a5f]">No matches.</div>}
      </div>
    </div>
  );
}

// ---- Shared popover (outside-click + escape close) ----------------------------

function Popover({ anchor, children, onClose, placement = "bottom" }) {
  const ref = useRef(null);
  const [pos, setPos] = useState(null);

  useEffect(() => {
    if (!anchor.current) return;
    const r = anchor.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const POPOVER_W = 240; // conservative estimate for width clamping
    if (placement === "right") {
      // Flip to below if a right-placed popover would overflow the viewport
      // (happens on mobile where the parent popover already eats most width).
      if (r.right + 4 + POPOVER_W > vw) {
        setPos({ top: r.bottom + 4, left: Math.max(8, Math.min(r.left, vw - POPOVER_W - 8)) });
      } else {
        setPos({ top: r.top, left: r.right + 4 });
      }
    } else {
      // Bottom placement: clamp left so the popover stays in-viewport.
      const left = Math.max(8, Math.min(r.left, vw - POPOVER_W - 8));
      setPos({ top: r.bottom + 4, left });
    }
  }, [anchor, placement]);

  useEffect(() => {
    const onDoc = (e) => {
      if (ref.current?.contains(e.target)) return;
      if (anchor.current?.contains(e.target)) return;
      onClose();
    };
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [anchor, onClose]);

  if (!pos) return null;
  return (
    <div ref={ref} className="fixed z-50 bg-white border border-[#b1b4b6]" style={{ top: pos.top, left: pos.left }}>
      {children}
    </div>
  );
}
