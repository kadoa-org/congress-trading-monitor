import { useLayoutEffect, useRef, useState } from "react";
import { navigate, withBase } from "../router";

// Who traded one stock, and when: one row per member on a shared time axis, the largest traders by value first.
// Purchases point up and sales down (shape as well as colour), in three sizes by value
// bracket. Shaded spans mark a period of interest and the recent days whose trades may not be reported yet.
const BUY = "#009E73", SELL = "#D55E00", INK = "#0b0c0c", MUTED = "#505a5f", GRID = "rgba(0,0,0,0.08)", BAND = "#1d70b8";
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const ts = (s) => Date.parse(`${s}T00:00:00Z`);
const dayYear = (s) => `${+s.slice(8, 10)} ${MONTHS[+s.slice(5, 7) - 1]} ${s.slice(0, 4)}`;
export const SIZES = [
  { max: 15_000, r: 4, label: "Up to $15K" },
  { max: 250_000, r: 6, label: "$15K to $250K" },
  { max: Infinity, r: 8, label: "Over $250K" },
];
const radius = (high) => SIZES.find((s) => high <= s.max).r;
const isBuy = (t) => /^p/i.test(t.type);
const LINK = "#1d70b8";

// A row name, linked to the member's page when the row has an href; plain clicks stay in the app.
function Name({ href, children, ...text }) {
  if (!href) return <text {...text}>{children}</text>;
  const to = withBase(href);
  const go = (e) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    navigate(to);
  };
  return <a href={to} onClick={go}><text {...text} fill={LINK} textDecoration="underline">{children}</text></a>;
}

function useWidth() {
  const ref = useRef(null);
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    if (!ref.current) return undefined;
    setWidth(ref.current.getBoundingClientRect().width);
    const ro = new ResizeObserver((e) => setWidth(e[0].contentRect.width));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return [ref, width];
}

function Triangle({ cx, cy, r, buy }) {
  const pts = buy ? `${cx},${cy - r} ${cx - r},${cy + r * 0.8} ${cx + r},${cy + r * 0.8}` : `${cx},${cy + r} ${cx - r},${cy - r * 0.8} ${cx + r},${cy - r * 0.8}`;
  return <polygon points={pts} fill={buy ? BUY : SELL} stroke="#fff" strokeWidth="1" />;
}

export function TimelineKey() {
  return (
    <div className="dk-hint" style={{ display: "flex", gap: "6px 20px", flexWrap: "wrap", margin: "0 0 10px", fontSize: 16, alignItems: "center" }}>
      <span><span style={{ color: BUY }}>▲</span> Purchase</span>
      <span><span style={{ color: SELL }}>▼</span> Sale</span>
      {SIZES.map((s) => (
        <span key={s.label} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <svg width={2 * s.r + 2} height={2 * s.r + 2} aria-hidden="true"><Triangle cx={s.r + 1} cy={s.r + 1} r={s.r} buy /></svg>
          {s.label}
        </span>
      ))}
    </div>
  );
}

// rows: [{ key, name, note, href?, trades: [{ date, type, label, high }] }], top to bottom.
// spans: [{ from, to, label, hatch?, row? }]; row puts the label on the upper line. from/to: the time axis, ISO dates.
// On phones the list starts with the first PHONE_ROWS rows and a button shows the rest.
const PHONE_ROWS = 12;

export default function MemberTimeline({ rows: allRows, from, to, spans = [], label }) {
  const [ref, width] = useWidth();
  const [hover, setHover] = useState(null);
  const [all, setAll] = useState(false);
  const narrow = width > 0 && width < 560;
  const rows = narrow && !all ? allRows.slice(0, PHONE_ROWS) : allRows;
  const W = Math.max(300, width);
  const nameW = narrow ? 0 : Math.min(220, W * 0.28);
  const ROW = narrow ? 40 : 26, HEAD = spans.length > 1 ? 38 : 22, AXIS = 24, R = 10;
  const H = HEAD + rows.length * ROW + AXIS;
  const x0 = ts(from), x1 = ts(to);
  const x = (d) => nameW + 8 + ((ts(d) - x0) / (x1 - x0)) * (W - nameW - 8 - R);
  const laneY = (i) => HEAD + i * ROW + (narrow ? ROW - 14 : ROW / 2);
  // Quarter ticks with the year on January; on phones January and July.
  const ticks = [];
  for (let d = new Date(x0); d.getTime() <= x1; d.setUTCMonth(d.getUTCMonth() + 1)) {
    d.setUTCDate(1);
    const m = d.getUTCMonth();
    if (d.getTime() < x0 || ![0, 3, 6, 9].includes(m) || (narrow && ![0, 6].includes(m))) continue;
    const iso = d.toISOString().slice(0, 10);
    ticks.push([iso, m === 0 ? `Jan ${d.getUTCFullYear()}` : MONTHS[m]]);
  }
  return (
    <div ref={ref} style={{ position: "relative" }}>
      {width > 0 && (
        <svg width={W} height={H} role="img" aria-label={label} style={{ display: "block" }} onMouseLeave={() => setHover(null)}>
          <defs>
            <pattern id="mt-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <line x1="0" y1="0" x2="0" y2="6" stroke={MUTED} strokeWidth="1.5" strokeOpacity="0.35" />
            </pattern>
          </defs>
          {ticks.map(([d]) => <line key={d} x1={x(d)} x2={x(d)} y1={HEAD} y2={H - AXIS} stroke={GRID} />)}
          {spans.map((s) => (
            <g key={s.label}>
              <rect x={x(s.from)} y={HEAD} width={Math.max(3, x(s.to) - x(s.from))} height={H - HEAD - AXIS} fill={s.hatch ? "url(#mt-hatch)" : BAND} fillOpacity={s.hatch ? 1 : 0.14} />
              <text x={x(s.to)} y={s.row ? 13 : HEAD - 6} textAnchor="end" fontSize="12" fontWeight="700" fill={s.hatch ? MUTED : BAND}>{s.label}</text>
            </g>
          ))}
          {rows.map((r, i) => (
            <g key={r.key}>
              <line x1={nameW + 8} x2={W - R} y1={laneY(i)} y2={laneY(i)} stroke={GRID} />
              {narrow
                ? <Name href={r.href} x={0} y={HEAD + i * ROW + 13} fontSize="14" fill={INK}>{r.name}<tspan fill={MUTED} textDecoration="none">{r.note ? `  ${r.note}` : ""}</tspan></Name>
                : <Name href={r.href} x={nameW} y={laneY(i) + 5} textAnchor="end" fontSize="14" fill={INK}>{r.name}<tspan fill={MUTED} textDecoration="none">{r.note ? ` ${r.note}` : ""}</tspan></Name>}
              {[...r.trades].sort((a, b) => b.high - a.high).map((t, j) => (
                <g key={j} onMouseEnter={() => setHover({ ...t, name: r.name, cx: x(t.date), cy: laneY(i) })}>
                  <circle cx={x(t.date)} cy={laneY(i)} r={R} fill="transparent" />
                  <Triangle cx={x(t.date)} cy={laneY(i)} r={radius(t.high)} buy={isBuy(t)} />
                </g>
              ))}
            </g>
          ))}
          {ticks.map(([d, l]) => <text key={d} x={x(d)} y={H - 6} textAnchor={x(d) - l.length * 3.5 < nameW ? "start" : "middle"} fontSize="13" fill={MUTED}>{l}</text>)}
        </svg>
      )}
      {rows.length < allRows.length && (
        <button type="button" className="govuk-button govuk-button--secondary" style={{ margin: "8px 0 0" }} onClick={() => setAll(true)}>Show all {allRows.length} members</button>
      )}
      {hover && (
        <div role="status" style={{ position: "absolute", left: Math.min(Math.max(0, hover.cx - 110), W - 220), top: hover.cy + 14, width: 220, background: "#fff", border: "1px solid #b1b4b6", padding: "6px 8px", fontSize: 14, pointerEvents: "none", boxShadow: "0 2px 6px rgba(0,0,0,0.12)" }}>
          <strong>{hover.name}</strong><br />{dayYear(hover.date)}: {isBuy(hover) ? "Purchase" : "Sale"}, {hover.label}
        </div>
      )}
    </div>
  );
}
