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
