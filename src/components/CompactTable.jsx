import React from "react";

// A table for short repeating facts: one line per row, a caption as its heading, numbers right-aligned.
// columns: [{ key, header, numeric?, clamp?, width?, render(row) }]
export default function CompactTable({ caption, columns, rows, rowKey }) {
  return (
    <table className="govuk-table compact-table">
      {caption && <caption className="govuk-table__caption govuk-table__caption--s">{caption}</caption>}
      <thead className="govuk-table__head">
        <tr className="govuk-table__row">
          {columns.map((c) => (
            <th key={c.key} scope="col" className={`govuk-table__header${c.numeric ? " govuk-table__header--numeric" : ""}`} style={c.width ? { width: c.width } : undefined}>
              {c.header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="govuk-table__body">
        {rows.map((r) => (
          <tr key={rowKey(r)} className="govuk-table__row">
            {columns.map((c) => (
              <td key={c.key} className={`govuk-table__cell${c.numeric ? " govuk-table__cell--numeric" : ""}${c.clamp ? " compact-table__clamp" : ""}`}>
                {c.render(r)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
