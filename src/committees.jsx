import React from "react";

// "House Committee on the Judiciary" -> { name: "Judiciary", chamber: "House" }. The chamber is shown as a tag.
// Select and special committees keep their kind: "House Permanent Select Committee on Intelligence" -> "Intelligence
// (Select)" in the House.
export function committeeParts(full) {
  const m = /^(House|Senate|Joint) (?:(Permanent Select|Select|Special) )?(?:Committee|Subcommittee) (?:on|to) (?:the )?(.*)$/.exec(full ?? "");
  if (!m) return { name: full, chamber: null };
  // Select panels with sentence-long names.
  if (/Chinese Communist Party/.test(m[3])) return { name: "China (select)", chamber: m[1] };
  if (/January 6/.test(m[3])) return { name: "January 6 (select)", chamber: m[1] };
  return { name: m[2] ? `${m[3]} (${m[2].replace("Permanent ", "").toLowerCase()})` : m[3], chamber: m[1] };
}

export function ChamberTag({ chamber }) {
  if (!chamber) return null;
  return <strong className={`chamber-tag chamber-tag--${chamber.toLowerCase()}`}>{chamber}</strong>;
}

// A committee name followed by its chamber tag.
export function CommitteeName({ full }) {
  const { name, chamber } = committeeParts(full);
  return (
    <span className="committee-name">
      {name} <ChamberTag chamber={chamber} />
    </span>
  );
}

export const pct = (v) => `${Math.round(v)}%`;

// Bill titles run long ("Streamlining Procurement ... and National Defense Authorization Act for Fiscal Year 2026").
export function shortTitle(title, max = 60) {
  const t = (title ?? "").replace(/^(H\.R\.|S\.)\s?\d+,\s*/, "");
  if (t.length <= max) return t;
  return `${t.slice(0, t.lastIndexOf(" ", max))}…`;
}

export function billText(b) {
  return b.title ? `${b.label} (${shortTitle(b.title)})` : b.label;
}

// "$10.4M", "$640K": lobbying amounts, which are filed rounded to $10,000.
export const fmtMoney = (v) => (v == null ? "—" : v >= 1e6 ? `$${(v / 1e6).toFixed(v >= 1e7 ? 0 : 1)}M` : `$${Math.round(v / 1e3)}K`);

// "Microsoft Corporation" -> "Microsoft", "Amazon.com, Inc." -> "Amazon.com".
export const shortCompany = (name) => (name ?? "").replace(/,?\s+(Inc\.?|Corporation|Corp\.?|Co\.?|Company|Ltd\.?|plc|N\.?V\.?|S\.?A\.?)$/i, "").trim();
