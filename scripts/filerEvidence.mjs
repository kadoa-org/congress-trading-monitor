const escapeHtml = (value) => String(value ?? "").replace(/[&<>"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[character]);

export function filerEvidence(trades) {
  const recent = [...trades].sort((a, b) => (b.transaction_date ?? "").localeCompare(a.transaction_date ?? "")).slice(0, 25);
  if (recent.length === 0) return "<p>No parsed transactions are available in this dataset snapshot.</p>";
  const rows = recent.map((trade) => {
    const source = /^https?:\/\//i.test(trade.doc_url ?? "")
      ? `<a href="${escapeHtml(trade.doc_url)}">Source filing</a>` : "Source unavailable";
    return `<tr><td>${escapeHtml(trade.transaction_date)}</td><td>${escapeHtml(trade.filing_date)}</td><td>${escapeHtml(trade.ticker ?? trade.asset_name)}</td><td>${escapeHtml(trade.transaction_type)}</td><td>${escapeHtml(trade.amount_range_label)}</td><td>${source}</td></tr>`;
  }).join("");
  return `<h2>Recent disclosed transactions</h2><p>Showing ${recent.length} of ${trades.length} transaction rows, ordered by transaction date.</p><div class="seo-table"><table><thead><tr><th>Transaction date</th><th>Filing date</th><th>Asset</th><th>Type</th><th>Amount range</th><th>Source</th></tr></thead><tbody>${rows}</tbody></table></div><p><a href="/congress/about">How filing flags and return comparisons work</a></p>`;
}
