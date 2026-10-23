// Builds a CSV in the browser and hands it to the reader as a file.
export function downloadCsv(filename, header, rows) {
  const esc = (v) => (/[",\n]/.test(String(v ?? "")) ? `"${String(v).replace(/"/g, '""')}"` : (v ?? ""));
  const csv = [header.join(","), ...rows.map((r) => r.map(esc).join(","))].join("\n");
  const url = URL.createObjectURL(new Blob([csv + "\n"], { type: "text/csv" }));
  const a = document.createElement("a"); a.href = url; a.download = filename; a.click(); URL.revokeObjectURL(url);
}
