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
        {caption && (
          <caption className="dk-hint" style={{ textAlign: "left", padding: "6px 12px" }}>
            {caption}
          </caption>
        )}
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
              const hideCls = c.hideBelow ? ` dk-hide-${c.hideBelow}` : "";
              return (
                <th
                  key={c.key}
                  className={(c.align === "right" ? "dk-num" : "") + hideCls || undefined}
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
              <td className="dk-empty" colSpan={columns.length}>
                {empty}
              </td>
            </tr>
          )}
          {rows.map((r) => (
            <tr key={rowKey(r)}>
              {columns.map((c) => (
                <td
                  key={c.key}
                  className={
                    [
                      c.align === "right" ? "dk-num" : "",
                      c.hideBelow ? `dk-hide-${c.hideBelow}` : "",
                      c.clamp ? "dk-clamp" : "",
                    ]
                      .filter(Boolean)
                      .join(" ") || undefined
                  }
                >
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
// brandSuffix renders as a sibling next to the brand link (e.g. an attribution
// link like "by Kadoa"); kept outside the brand <L> so it can be its own link.
export function SiteHeader({ brand, brandHref = "/", brandSuffix, right, LinkComponent = "a" }) {
  const L = LinkComponent;
  return (
    <header className="dk-header">
      <div className="dk-container dk-header-inner">
        <span className="dk-header-brand-group">
          <L href={brandHref} to={brandHref} className="dk-header-brand">
            {brand}
          </L>
          {brandSuffix}
        </span>
        {right}
      </div>
    </header>
  );
}

// Cross-dataset footer: links the sibling open-data sites (all under
// www.kadoa.com/*) to each other — internal linking for SEO. `current` marks
// the active site (plain text, not a self-link). Cross-site links are full
// navigations, so plain anchors.
export function SiteFooter({ current }) {
  const sites = [
    ["quant", "https://www.kadoa.com/quant", "Quant Jobs"],
    ["layoffs", "https://www.kadoa.com/layoffs", "Layoffs Tracker"],
    ["congress", "https://www.kadoa.com/congress", "Congress Trades"],
    ["potus", "https://www.kadoa.com/potus", "POTUS Tracker"],
    ["mining", "https://www.kadoa.com/mining", "Mining Monitor"],
  ];
  return (
    <footer className="dk-footer">
      <div className="dk-container dk-footer-inner">
        <nav className="dk-footer-nav" aria-label="Kadoa open datasets">
          <span className="dk-footer-label">
            <a href="https://www.kadoa.com/datasets">Open data</a> by <a href="https://www.kadoa.com/">Kadoa</a>
          </span>
          {sites.map(([key, href, label]) =>
            key === current ? (
              <span key={key} className="dk-footer-here" aria-current="page">
                {label}
              </span>
            ) : (
              <a key={key} href={href}>
                {label}
              </a>
            ),
          )}
        </nav>
      </div>
    </footer>
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

// "Star on GitHub" header button for the open-data sites. Inverse variant
// sits on the dark SiteHeader; the octocat inherits currentColor.
export function GitHubButton({ repo, children = "Star on GitHub" }) {
  const label = typeof children === "string" ? children : "Star on GitHub";
  return (
    <a
      className="dk-btn dk-btn--inverse"
      href={`https://github.com/${repo}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      style={{ textDecoration: "none" }}
    >
      <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
        <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0016 8c0-4.42-3.58-8-8-8z" />
      </svg>
      <span className="dk-btn-label">{children}</span>
    </a>
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
  return <span className={`dk-tag dk-tag--${tickerTone(ticker)} dk-ticker dk-ticker--${size}`}>{ticker || "—"}</span>;
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
