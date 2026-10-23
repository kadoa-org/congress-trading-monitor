import React, { useState } from "react";

// Small, reusable visual primitives used across every table view.
// These carry the finance-scanner aesthetic: avatar + crisp number + proportion bar.

export function FilerAvatar({ filer, size = 28 }) {
  const [err, setErr] = useState(false);
  const name = filer?.full_name || filer?.name || "?";
  const initials = name
    .replace(/[,]/g, "")
    .split(/\s+/)
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  // Stronger tinted backgrounds so initials never feel "empty" next to photos.
  const branch =
    filer?.branch === "executive"
      ? { bg: "#f5e3c7", fg: "#8b5410" }
      : filer?.chamber === "senate"
        ? { bg: "#ded8f8", fg: "#54419f" }
        : { bg: "#d9e0f2", fg: "#2e3d86" };
  const fontSize = Math.max(9, Math.round(size * 0.4));
  return (
    <div
      className="rounded-full flex items-center justify-center overflow-hidden border border-stroke shrink-0"
      style={{ width: size, height: size, backgroundColor: branch.bg }}
    >
      {filer?.photo_url && !err ? (
        <img
          src={filer.photo_url}
          alt=""
          className="w-full h-full object-cover"
          loading="lazy"
          onError={() => setErr(true)}
        />
      ) : (
        <span style={{ color: branch.fg, fontSize, fontWeight: 600 }}>{initials}</span>
      )}
    </div>
  );
}

// Horizontal proportion bar: buys on the left, sells on the right.
// The total width represents 100% — each half's width is that side's share
// of (buys+sells). Neutral-width mode: fixed width, proportion inside.
export function BuySellBar({ buys = 0, sells = 0, width = 72 }) {
  const total = buys + sells;
  const buyPct = total > 0 ? (buys / total) * 100 : 0;
  return (
    <div
      className="h-[4px] rounded-full bg-stroke_soft overflow-hidden flex"
      style={{ width }}
      title={`${buys} buys · ${sells} sells`}
    >
      <div className="h-full bg-buy" style={{ width: `${buyPct}%` }} />
      <div className="h-full bg-sell" style={{ width: `${100 - buyPct}%` }} />
    </div>
  );
}

// Single-color proportion bar — width is value / max.
export function ProportionBar({ value, max, color = "#5e6ad2", width = 120 }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="h-[3px] rounded-full bg-stroke overflow-hidden" style={{ width }}>
      <div className="h-full" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

// A small warn-tinted bar used for "late share".
export function WarnBar({ value, max = 100, width = 64 }) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div className="h-[3px] rounded-full bg-stroke overflow-hidden" style={{ width }}>
      <div
        className="h-full rounded-full"
        style={{ width: `${pct}%`, background: "linear-gradient(90deg, #d97706, #be2929)" }}
      />
    </div>
  );
}

// Leaderboard rank chip (1-99). Gold/silver/bronze for top 3, neutral otherwise.
export function RankBadge({ rank }) {
  const tone =
    rank === 1
      ? { bg: "#fdf6c8", fg: "#8b6a06" }
      : rank === 2
        ? { bg: "#eef0f3", fg: "#5c6470" }
        : rank === 3
          ? { bg: "#f6e5cf", fg: "#8b4a1f" }
          : { bg: "#f4f5f8", fg: "#7e8490" };
  return (
    <div
      className="w-[22px] h-[22px] rounded-full flex items-center justify-center shrink-0 tabular-nums text-mini font-semibold"
      style={{ backgroundColor: tone.bg, color: tone.fg }}
    >
      {rank}
    </div>
  );
}

// Compact sample-size confidence indicator for alpha columns.
// <10 → low (faint), 10-29 → medium, 30+ → high.
export function SampleChip({ n }) {
  const tone = n >= 30 ? "text-ink_muted" : n >= 10 ? "text-ink_faint" : "text-ink_faint italic";
  return <span className={`text-small tabular-nums ml-1.5 ${tone}`}>n={n}</span>;
}
