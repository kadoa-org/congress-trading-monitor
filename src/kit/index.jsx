// Kadoa data-kit: the shared component library for dataset micropages.
// Self-contained (no app imports) so it can lift out into a package.
// Rule: pages never style tables/tags/sections ad hoc — variants via props only.
import React from "react";
import "./kit.css";

// One table to rule them all.
// columns: [{ key, header, align?: "left"|"right", width?, render?(row), sortable?, headerHint? }]
// rowHref(row) makes the first-column link; onRowClick for SPA nav is handled by callers via render.
export function DataTable({ columns, rows, rowKey, sort, onSort, caption, empty = "No rows.", plain = false }) {
  return (
    <div className={`dk-table-wrap${plain ? " dk-table-wrap--plain" : ""}`}>
      <table className="dk-table">
        {caption && <caption className="dk-hint" style={{ textAlign: "left", padding: "6px 12px" }}>{caption}</caption>}
        <thead>
          <tr>
            {columns.map((c) => {
              const active = sort && sort.key === c.key;
              const label = (
                <>
                  <span>{c.header}</span>
                  {c.sortable && <span aria-hidden="true">{active ? (sort.dir === "asc" ? "▲" : "▼") : "↕"}</span>}
                </>
              );
              return (
                <th
                  key={c.key}
                  className={c.align === "right" ? "dk-num" : undefined}
                  style={c.width ? { width: c.width } : undefined}
                  aria-sort={active ? (sort.dir === "asc" ? "ascending" : "descending") : undefined}
                  title={c.headerHint}
                >
                  {c.sortable && onSort ? (
                    <button type="button" className="dk-th-btn" onClick={() => onSort(c.key)}>
                      {label}
                    </button>
                  ) : (
                    label
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td className="dk-empty" colSpan={columns.length}>{empty}</td>
            </tr>
          )}
          {rows.map((r) => (
            <tr key={rowKey(r)}>
              {columns.map((c) => (
                <td key={c.key} className={c.align === "right" ? "dk-num" : undefined}>
                  {c.render ? c.render(r) : (r[c.key] ?? "—")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Tag({ tone = "grey", children }) {
  return <strong className={`dk-tag dk-tag--${tone}`}>{children}</strong>;
}

export function Section({ title, hint, right, children }) {
  return (
    <section style={{ marginBottom: 28 }}>
      <div className="dk-section-head">
        <div style={{ minWidth: 0 }}>
          <h2>{title}</h2>
          {hint && <p className="dk-hint">{hint}</p>}
        </div>
        {right && <div style={{ flexShrink: 0, whiteSpace: "nowrap" }}>{right}</div>}
      </div>
      {children}
    </section>
  );
}

export function StatGrid({ children }) {
  return <div className="dk-stats">{children}</div>;
}

export function Stat({ label, value, sub }) {
  return (
    <div className="dk-stat">
      <div className="dk-stat-label">{label}</div>
      <div className="dk-stat-value">{value}</div>
      {sub && <div className="dk-stat-sub">{sub}</div>}
    </div>
  );
}

// Green/red numeric convention, one place.
export function Delta({ value, children }) {
  const cls = value > 0 ? "dk-pos" : value < 0 ? "dk-neg" : undefined;
  return <span className={cls}>{children}</span>;
}

// Site chrome: brand bar + tab navigation. linkComponent lets the host app
// inject its SPA Link; falls back to plain anchors.
export function SiteHeader({ brand, brandHref = "/", right, LinkComponent = "a" }) {
  const L = LinkComponent;
  return (
    <header className="dk-header">
      <div className="dk-container dk-header-inner">
        <L href={brandHref} to={brandHref} className="dk-header-brand">
          {brand}
        </L>
        {right}
      </div>
    </header>
  );
}

export function NavBar({ items, LinkComponent = "a" }) {
  const L = LinkComponent;
  return (
    <nav className="dk-nav" aria-label="Primary">
      <div className="dk-container">
        <ul className="dk-nav-list">
          {items.map((it) => (
            <li key={it.href}>
              <L href={it.href} to={it.href} aria-current={it.active ? "true" : undefined}>
                {it.label}
              </L>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}

export function Toolbar({ children }) {
  return <div className="dk-toolbar">{children}</div>;
}

export function SearchInput({ value, onChange, placeholder, width = 260, ...rest }) {
  return (
    <input
      type="search"
      className="dk-input"
      style={{ width }}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      aria-label={placeholder}
      {...rest}
    />
  );
}

export function Button({ children, inverse = false, ...rest }) {
  return (
    <button type="button" className={`dk-btn${inverse ? " dk-btn--inverse" : ""}`} {...rest}>
      {children}
    </button>
  );
}

// Ticker symbol chip. Stable hue per symbol (hash-based) drawn from the
// non-semantic tag colourways so it never collides with buy/sell greens/reds.
const TICKER_TONES = ["blue", "purple", "orange", "yellow", "teal", "slate"];
function tickerTone(ticker) {
  if (!ticker) return "grey";
  let h = 0;
  for (let i = 0; i < ticker.length; i++) h = ((h << 5) - h + ticker.charCodeAt(i)) | 0;
  return TICKER_TONES[Math.abs(h) % TICKER_TONES.length];
}

export function TickerTag({ ticker, size = "md" }) {
  return (
    <span className={`dk-tag dk-tag--${tickerTone(ticker)} dk-ticker dk-ticker--${size}`}>{ticker || "—"}</span>
  );
}

// Freshness indicator (pulsing dot + label), designed for the dark header.
// Hidden on small screens where header space is scarce.
export function LiveBadge({ children }) {
  return (
    <span className="dk-live">
      <span className="dk-live-dot" aria-hidden="true" />
      {children}
    </span>
  );
}
