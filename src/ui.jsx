// Small reusable primitives. Sized to Linear.app: root is 18px, body is 0.9375rem (16.875px).
import React from "react";
import { navigate, withBase } from "./router";
import { Tag as DkTag, Section as DkSection } from "./kit";

// Canonical Tailwind class for table column headers.
// Matches Linear's data-table convention: small, muted, regular case, no tracking —
// the row content is the hero, headers should barely register.
// (Uppercase + tracking is Linear's *sidebar-label* style, too shouty for tables
// and causes narrower columns to wrap on two-word headers like "Buy / Sell mix".)
export const TABLE_HEADER_CLS = "text-mini font-medium text-ink_muted";

// Clickable table-column header with ascending/descending sort indicator.
// `sort` is a string key (matches sortKey when active). `setSort(newKey)` is
// called with the column's key — the parent decides how to toggle direction.
export function SortHeader({ label, sortKey, sort, setSort, align = "left" }) {
  const active = sort === sortKey;
  const justify = align === "right" ? "justify-end" : align === "center" ? "justify-center" : "justify-start";
  return (
    <button
      onClick={() => setSort(sortKey)}
      className={`inline-flex items-center gap-1 cursor-pointer hover:text-ink tabular-nums text-${align} ${justify} ${active ? "text-ink" : ""}`}
    >
      <span>{label}</span>
      {active ? (
        <svg width="10" height="10" viewBox="0 0 10 10" className="text-ink shrink-0" aria-hidden="true">
          <path d="M2 4 L5 7 L8 4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      ) : (
        <svg width="8" height="10" viewBox="0 0 8 10" className="text-ink_faint shrink-0" aria-hidden="true">
          <path d="M2 4 L4 2 L6 4" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          <path d="M2 6 L4 8 L6 6" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
      )}
    </button>
  );
}

// Soft zebra striping for data tables. Adds a near-invisible band to every other
// row — the eye catches the pattern and tracks rows across columns without the
// noise of full vertical gridlines (which feel Excel-era on a Linear-style canvas).
export const TABLE_ZEBRA_CLS = "[&>*:nth-child(even)]:bg-muted/30";

// House PTR PDFs sometimes drop the company-name token at row boundaries,
// leaving fragments like ", Inc. - Common Stock" or empty strings on a
// subset of trades for a ticker. We pick the most-frequent CLEAN candidate
// per ticker (and break ties toward the shortest), since duplicated forms
// across many trades are nearly always the canonical equity name and noisy
// outliers (comment-field bleed, account-label leakage, option contract
// strings) tend to appear only once. Memoized by trades array reference.
const _bestNameCache = new WeakMap();
function tidyAssetCandidate(raw) {
  if (!raw) return "";
  let s = cleanAssetName(raw);
  if (!s) return "";
  // Trim option-contract / date trailers
  s = s
    .replace(/\s+Option\s+Type:.*$/i, "")
    .replace(/\s+Strike\s+price:.*$/i, "")
    .replace(/\s+Expires?:.*$/i, "")
    .replace(/\s+\d{2}\/\d{2}\/\d{4}.*$/, "")
    .trim();
  // Strip leading "F S: New" / "New" PTR account-state labels
  s = s.replace(/^(?:F\s+S\s*:\s*)?New\s+(?=[A-Z])/, "").trim();
  // "S O: <account label> D: <description-or-equity>" — keep the post-"D:" tail.
  const dCut = s.match(/\bD:\s*([^]*)$/);
  if (dCut && dCut[1].trim().length > 4) s = dCut[1].trim();
  // "DESCRIPTION: Shares received in spinoff from Pentair PLC (PNR) JTnVent Electric"
  // → drop everything up to and including the parenthetical, keep equity tail.
  s = s.replace(/^DESCRIPTI?O?N:.*?\)\s+/i, "").trim();
  // Account/family-name prefixes glued to the equity name via owner code:
  //   "Thomas C MacArthur and Deborah A MacArthur JTnVent Electric plc"
  //   "MacArthur Family 2008 Irr Tr FBo David MacArthur JTnVent..."
  // Split at the owner-code/lowercase boundary and keep the right side.
  const ownerSplit = s.match(/\b(?:DC|SP|JT|DJ|SA)([a-z][\w.& ]+)$/);
  if (ownerSplit) s = ownerSplit[1].trim();
  // After splits the leading char may be lowercase (e.g. "nVent..."). That's fine
  // for real equity names like nVent / iShares / eBay.
  return s;
}
function isPlausibleCompanyName(s) {
  if (!s) return false;
  if (/^[,.]/.test(s)) return false;
  if (s.length < 3 || s.length > 80) return false;
  // Reject comment-field bleed (PTR comments often start with "D:" or contain
  // narrative sentence structure)
  if (/^D:\s/i.test(s)) return false;
  if (/\b(?:I\s+(?:received|did|am)|managed account|the time|guidance)\b/i.test(s)) return false;
  return true;
}
export function bestAssetNameByTicker(trades) {
  if (!trades) return new Map();
  if (_bestNameCache.has(trades)) return _bestNameCache.get(trades);
  const counts = new Map(); // ticker -> Map<name, count>
  for (const t of trades) {
    if (!t.ticker || !t.asset_name) continue;
    const cleaned = tidyAssetCandidate(t.asset_name);
    if (!isPlausibleCompanyName(cleaned)) continue;
    if (!counts.has(t.ticker)) counts.set(t.ticker, new Map());
    const m = counts.get(t.ticker);
    m.set(cleaned, (m.get(cleaned) ?? 0) + 1);
  }
  const out = new Map();
  for (const [ticker, m] of counts) {
    // Sort by frequency desc, then by length asc (shorter = less noisy).
    const best = [...m.entries()].sort((a, b) => b[1] - a[1] || a[0].length - b[0].length)[0];
    if (best) out.set(ticker, best[0]);
  }
  _bestNameCache.set(trades, out);
  return out;
}

// Strip the parser garbage that frequently leaks into House PTR asset_name strings.
// Examples handled:
//   "Tesla, Inc. (Tsla) [sT]s (partial)08/03/2018..." → "Tesla, Inc."
//   "DCadvanced Micro Devices, Inc." → "advanced Micro Devices, Inc."
//   "Gains > $200? GE HealthCare Technologies Inc." → "GE HealthCare Technologies Inc."
//   "F S: New Tapestry, Inc. Common Stock" → "New Tapestry, Inc. Common Stock"
//   "MARRIOTT INTL INC NEW SER LL NOTE 5.45000% 09/15/2026 (571903BM4) [CS]" → drops the [CS] tail
// Clean strings without garbage pass through unchanged.
export function cleanAssetName(s) {
  if (!s) return s;
  let out = String(s).trim();
  // "Gains > $200?" is a PTR form question that OCR pulls into the asset field.
  out = out.replace(/^Gains\s*[>≥]\s*\$?\d+\??\s*/i, "");
  // "F S:", "J T:" etc are short field-code prefixes (filing-type letters + colon).
  out = out.replace(/^[A-Z]\s[A-Z]:\s*/, "");
  // Owner-field codes (DC/SP/JT/DJ) glued onto the name without a space.
  out = out.replace(/^(?:DC|SP|JT|DJ)(?=[a-z])/, "");
  // Anything after a square-bracket type tag is parser trailer.
  const bracket = out.indexOf(" [");
  if (bracket > 0) out = out.slice(0, bracket).trim();
  // Trailing "(TSLA)" / "(NVDA)"-style ticker echo.
  out = out.replace(/\s\([A-Za-z]{2,5}\)\s*$/, "").trim();
  // A leading comma/period + lowercase means we're looking at a sentence
  // fragment that bled in from the PTR comment field. Nothing we can salvage.
  // (Do NOT blank lowercase-starting names — iShares, eBay, iRobot, etc. are valid.)
  if (/^[,.]\s[a-z]/.test(out)) out = "";
  return out;
}

export function fmtUSD(n, signed = false) {
  if (!n && n !== 0) return "--";
  const s = n < 0 ? "-" : signed && n > 0 ? "+" : "";
  const abs = Math.abs(n);
  if (abs >= 1e9) return `${s}$${(abs / 1e9).toFixed(1)}B`;
  if (abs >= 1e6) return `${s}$${(abs / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `${s}$${(abs / 1e3).toFixed(0)}K`;
  return `${s}$${abs}`;
}

// Compact USD value used inside a range — drops the dollar sign so "$15K - $50K"
// renders as "$15-50K", and uses "M" where appropriate.
function fmtShort(n) {
  if (!Number.isFinite(n)) return "";
  if (n >= 1e6) return `${(n / 1e6) % 1 === 0 ? n / 1e6 : (n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${Math.round(n / 1e3)}K`;
  return String(n);
}

// Render a PTR/278-T amount range as "$15-50K", "$1-5M", etc. Prefer the
// numeric bounds; fall back to the verbatim label if the bounds aren't on
// the trade; finally fall back to a midpoint placeholder. Used to distinguish
// otherwise-identical-looking filing rows (e.g. Burgum's same-asset purchases
// at $15K-50K vs $1K-15K).
export function fmtAmountRange(t) {
  const lo = t?.amount_range_low;
  const hi = t?.amount_range_high;
  if (Number.isFinite(lo) && Number.isFinite(hi)) {
    if (lo === hi) return `$${fmtShort(lo)}`;
    return `$${fmtShort(lo)}-${fmtShort(hi)}`;
  }
  if (t?.amount_range_label) {
    // Compact verbatim labels: "$15,001 - $50,000" → "$15-50K", "Over $50,000,000" → "$50M+"
    const overMatch = t.amount_range_label.match(/Over \$([\d,]+)/i);
    if (overMatch) return `${fmtShort(parseInt(overMatch[1].replace(/,/g, ""), 10))}+`;
    const m = t.amount_range_label.match(/\$([\d,]+)\s*-\s*\$([\d,]+)/);
    if (m) {
      const a = parseInt(m[1].replace(/,/g, ""), 10);
      const b = parseInt(m[2].replace(/,/g, ""), 10);
      return `$${fmtShort(a)}-${fmtShort(b)}`;
    }
    return t.amount_range_label;
  }
  return "--";
}

export function fmtInt(n) {
  if (!n && n !== 0) return "--";
  return n.toLocaleString();
}

export function pct(n, digits = 0) {
  if (n == null) return "--";
  return `${n.toFixed(digits)}%`;
}

// Categorical chip. Linear uses lightly-rounded squares (4px radius), regular
// weight, translucent color backgrounds — not capsule shapes with bold text.
// The semantic `buy/sell/warn` tones keep the same rounded-square shape too,
// since our earlier capsule pill read as "loud status chip" rather than a
// calm category label.
export function Pill({ tone = "neutral", children }) {
  // Alias onto the kit Tag so every tag in the app shares one implementation.
  const map = { neutral: "grey", blue: "blue", violet: "purple", amber: "orange", buy: "green", sell: "red", warn: "yellow" };
  return <DkTag tone={map[tone] || "grey"}>{children}</DkTag>;
}

export function sourcePill(source) {
  if (source === "house_clerk") return { tone: "blue", label: "House" };
  if (source === "senate_efd") return { tone: "violet", label: "Senate" };
  if (source === "oge_executive") return { tone: "amber", label: "Exec" };
  return { tone: "neutral", label: source };
}

export function branchPill(filer) {
  if (filer.branch === "executive") return { tone: "amber", label: "Exec" };
  if (filer.chamber === "senate") return { tone: "violet", label: "Senate" };
  return { tone: "blue", label: "House" };
}

// Drop-in replacement for clickable list rows that previously rendered as
// <button onClick={() => navigate(...)}>. Renders a real <a href> so the
// browser handles cmd/ctrl/shift/middle click (open in new tab) natively;
// plain left-clicks still route through the SPA navigator. When `to` is
// missing the component still renders (as a div) so callers can pass
// optional destinations without branching.
export function RowLink({ to, onClick, className = "", children, ...rest }) {
  if (!to) {
    return (
      <div className={className} {...rest}>
        {children}
      </div>
    );
  }
  return (
    <a
      href={withBase(to)}
      className={className}
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
        e.preventDefault();
        onClick?.(e);
        navigate(to);
      }}
      {...rest}
    >
      {children}
    </a>
  );
}

// External-link icon + uniform tooltip for the "Source" column on every
// trade row. House/OGE doc_urls open the original PDF directly; Senate
// doc_urls open the eFD portal detail page (and require one-time terms
// acceptance — see tooltip). Both look identical in the UI so the column
// reads as one consistent "source" affordance instead of a PDF/non-PDF mix.
export function SourceLink({ url, className = "" }) {
  if (!url) return null;
  const isSenate = url.includes("efdsearch.senate.gov");
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      className={`text-ink_muted hover:text-accent inline-flex items-center justify-center ${className}`}
      title={
        isSenate
          ? "Senate eFD portal. First click → accept eFD terms. Second click → lands on the filing."
          : "Open original PDF filing"
      }
      aria-label="Open source"
    >
      <svg className="w-[13px] h-[13px] shrink-0" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M14 4h6m0 0v6m0-6L10 14"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M20 14v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h6"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </a>
  );
}

export function Link({ to, className = "", children, onClick, ...rest }) {
  return (
    <a
      href={withBase(to)}
      className={`govuk-link ${className}`}
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey) return;
        e.preventDefault();
        onClick?.(e);
        navigate(to);
      }}
      {...rest}
    >
      {children}
    </a>
  );
}

// Linear-style card: white surface, 1px border in --bg-border-color, 8px radius, no shadow.
// When `to` is set the card renders as a RowLink so the whole surface is
// cmd/ctrl-clickable (and middle-clickable) to open in a new tab.
export function Card({ children, className = "", to }) {
  // data-kit has no card component; nearest idiom is a square 1px-bordered panel.
  const base = `border border-[#b1b4b6] bg-white ${className}`;
  if (to) {
    return (
      <RowLink to={to} className={`block text-ink no-underline hover:bg-[#f3f2f1] ${base}`}>
        {children}
      </RowLink>
    );
  }
  return <div className={base}>{children}</div>;
}

export function SectionHeader({ title, subtitle, right }) {
  return (
    <div className="dk-section-head">
      <div style={{ minWidth: 0 }}>
        <h2>{title}</h2>
        {subtitle && <p className="dk-hint">{subtitle}</p>}
      </div>
      {right && <div style={{ flexShrink: 0, whiteSpace: "nowrap" }}>{right}</div>}
    </div>
  );
}

export function txnTone(type) {
  if (!type) return "neutral";
  const t = type.toLowerCase();
  if (t.includes("urchase") || t === "p") return "buy";
  if (t.includes("ale") || t === "s") return "sell";
  return "neutral";
}

export function txnColor(type) {
  if (!type) return "text-ink_muted";
  const t = type.toLowerCase();
  if (t.includes("urchase") || t === "p") return "text-buy";
  if (t.includes("ale") || t === "s") return "text-sell";
  return "text-ink_muted";
}

// Linear-style property row label - 14.625px, weight 500, tertiary grey, sentence case.
export function PropertyLabel({ children, className = "" }) {
  return <div className={`text-small font-medium text-ink_muted ${className}`}>{children}</div>;
}

// U.S. presidential administrations. `start` is the inauguration ISO date.
// `end` is exclusive — left null for the current admin so filtering works.
export const ADMINISTRATIONS = [
  { k: "all", label: "All time", short: "All", start: null, end: null },
  { k: "trump2", label: "Trump II", short: "Trump II", start: "2025-01-20", end: null, party: "R" },
  { k: "biden", label: "Biden", short: "Biden", start: "2021-01-20", end: "2025-01-20", party: "D" },
  { k: "trump1", label: "Trump I", short: "Trump I", start: "2017-01-20", end: "2021-01-20", party: "R" },
  { k: "obama", label: "Obama", short: "Obama", start: "2009-01-20", end: "2017-01-20", party: "D" },
];

export function findAdmin(k) {
  return ADMINISTRATIONS.find((a) => a.k === k) || ADMINISTRATIONS[0];
}

// Was the ISO date `d` (YYYY-MM-DD) inside this administration?
export function dateInAdmin(d, admin) {
  if (!admin || admin.k === "all") return true;
  if (!d) return false;
  if (admin.start && d < admin.start) return false;
  if (admin.end && d >= admin.end) return false;
  return true;
}

// Linear-style segmented control used for admin + scope toggles.
export function Segmented({ value, onChange, options, size = "default" }) {
  const h = size === "sm" ? "h-[26px] text-mini px-2" : "h-[32px] text-[15px] px-2.5";
  return (
    <div className="inline-flex items-center border border-[#0b0c0c] bg-white overflow-hidden">
      {options.map((o, i) => (
        <button
          key={o.k}
          onClick={() => onChange(o.k)}
          className={`${h} transition-colors whitespace-nowrap font-medium ${
            value === o.k ? "bg-[#1d70b8] text-white" : "text-[#0b0c0c] hover:bg-[#f3f2f1]"
          } ${i > 0 ? "border-l border-stroke" : ""}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
