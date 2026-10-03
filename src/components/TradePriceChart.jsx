import { useLayoutEffect, useMemo, useRef, useState } from "react";

// A stock page's trades against its price, as Quiver, Capitol Trades and Unusual Whales pair them: the weekly close as
// a line over a soft fill, and monthly buys and sells as mirrored bars on the same time axis, with the busiest months
// labelled. Triangles on the line mark trade weeks only when there are few enough to read (usually the 1Y view).

const GREEN = "#00703c";
const RED = "#d4351c";
const INK = "#0b0c0c";
const MUTED = "#505a5f";
const RULE = "#e5e6e7";
const RANGES = [
  { key: "1y", label: "1Y", years: 1 },
  { key: "5y", label: "5Y", years: 5 },
  { key: "all", label: "All", years: null },
];
const PRICE_H = 230;
const BARS_H = 96;
const MAX_MARKER_WEEKS = 60;
const GAP = 18;
const AXIS_H = 26;
const NARROW = 480;

const isBuy = (t) => {
  const tt = (t.transaction_type || "").toLowerCase();
  return tt.includes("urchase") || tt === "p";
};
const isSell = (t) => {
  const tt = (t.transaction_type || "").toLowerCase();
  return tt.includes("ale") || tt === "s";
};
const weekOf = (d) => {
  const t = new Date(`${d}T00:00:00Z`);
  t.setUTCDate(t.getUTCDate() - ((t.getUTCDay() + 6) % 7));
  return t.toISOString().slice(0, 10);
};
const fmtPrice = (v) => `$${v >= 100 || Number.isInteger(v) ? v.toFixed(0) : v.toFixed(2)}`;
const fmtDay = (d) => new Date(`${d}T12:00:00Z`).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

export default function TradePriceChart({ trades, history = [] }) {
  const ref = useRef(null);
  const [width, setWidth] = useState(0);
  const [hover, setHover] = useState(null);
  const span = history.length ? (Date.parse(history.at(-1)[0]) - Date.parse(history[0][0])) / (365.25 * 864e5) : 0;
  const [range, setRange] = useState(span > 5 ? "5y" : "all");
  const picked = useRef(false);

  useLayoutEffect(() => {
    if (!ref.current) return;
    const w0 = ref.current.getBoundingClientRect().width;
    setWidth(w0);
    // Phones open on one year: five years of monthly bars do not fit in 300 px.
    if (w0 < NARROW && !picked.current && span > 1) setRange("1y");
    const ro = new ResizeObserver((e) => setWidth(e[0].contentRect.width));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);

  const view = useMemo(() => {
    if (!history.length) return null;
    const end = history.at(-1)[0];
    const years = RANGES.find((r) => r.key === range)?.years;
    const startCut = years ? new Date(Date.parse(end) - years * 365.25 * 864e5).toISOString().slice(0, 10) : history[0][0];
    const points = history.filter(([d]) => d >= startCut);
    const weeks = new Map();
    for (const t of trades) {
      const d = t.transaction_date;
      if (!d || d < startCut || d > end) continue;
      const buy = isBuy(t), sell = isSell(t);
      if (!buy && !sell) continue;
      const wk = weekOf(d);
      const w = weeks.get(wk) ?? { wk, buys: 0, sells: 0, buyers: new Map(), sellers: new Map() };
      if (buy) { w.buys++; w.buyers.set(t.filer_name, (w.buyers.get(t.filer_name) ?? 0) + 1); }
      else { w.sells++; w.sellers.set(t.filer_name, (w.sellers.get(t.filer_name) ?? 0) + 1); }
      weeks.set(wk, w);
    }
    const months = new Map();
    for (const w of weeks.values()) {
      const m = w.wk.slice(0, 7);
      const e = months.get(m) ?? { m, buys: 0, sells: 0 };
      e.buys += w.buys;
      e.sells += w.sells;
      months.set(m, e);
    }
    return { start: points[0]?.[0] ?? startCut, end, points, weeks: [...weeks.values()], months: [...months.values()] };
  }, [history, trades, range]);

  if (!history.length) return <p className="govuk-hint">No price history for this stock.</p>;

  const narrow = width < NARROW;
  const M = { top: 12, right: narrow ? 40 : 52, left: narrow ? 2 : 8 };
  const priceH = narrow ? 180 : PRICE_H;
  const barsH = narrow ? 72 : BARS_H;
  const plotW = Math.max(200, width - M.left - M.right);
  const height = M.top + priceH + GAP + barsH + AXIS_H;
  const t0 = Date.parse(view.start), t1 = Date.parse(view.end);
  const x = (d) => M.left + ((Date.parse(d) - t0) / Math.max(1, t1 - t0)) * plotW;
  const closes = view.points.map(([, c]) => c);
  const lo = Math.min(...closes), hi = Math.max(...closes);
  const pad = (hi - lo) * 0.12 || hi * 0.05;
  const yP = (v) => M.top + priceH - ((v - (lo - pad)) / (hi - lo + 2 * pad)) * priceH;
  // The close on or just before a date, for placing a week's markers on the line.
  const closeAt = (d) => {
    let a = 0, b = view.points.length - 1;
    while (a < b) {
      const mid = (a + b + 1) >> 1;
      if (view.points[mid][0] <= d) a = mid;
      else b = mid - 1;
    }
    return view.points[a][1];
  };
  const maxWeek = Math.max(1, ...view.weeks.map((w) => Math.max(w.buys, w.sells)));
  const size = (n) => (narrow ? 2.5 + Math.sqrt(n / maxWeek) * 4 : 3.5 + Math.sqrt(n / maxWeek) * 7);
  const maxMonth = Math.max(1, ...view.months.map((m) => Math.max(m.buys, m.sells)));
  const barsTop = M.top + priceH + GAP;
  const mid = barsTop + barsH / 2;
  const yB = (n) => (n / maxMonth) * (barsH / 2 - 2);
  const monthW = Math.max(1, (plotW / Math.max(1, (t1 - t0) / (30.44 * 864e5))) * 0.7);
  const line = view.points.map(([d, c], i) => `${i ? "L" : "M"}${x(d).toFixed(1)},${yP(c).toFixed(1)}`).join("");
  const area = `${line}L${x(view.end).toFixed(1)},${M.top + priceH}L${x(view.start).toFixed(1)},${M.top + priceH}Z`;
  const showMarkers = view.weeks.length <= (narrow ? 25 : MAX_MARKER_WEEKS);
  const last = view.points.at(-1);
  const peakBuy = view.months.reduce((a, m) => (m.buys > (a?.buys ?? 0) ? m : a), null);
  const peakSell = view.months.reduce((a, m) => (m.sells > (a?.sells ?? 0) ? m : a), null);
  const monthName = (m) => new Date(`${m}-15T12:00:00Z`).toLocaleString("en-US", { month: "short", year: "numeric", timeZone: "UTC" });
  // Round price gridlines: a step of 1, 2, 2.5 or 5 times a power of ten giving about four lines.
  const rawStep = (hi - lo + 2 * pad) / 4;
  const pow = 10 ** Math.floor(Math.log10(rawStep));
  const step = [1, 2, 2.5, 5, 10].map((k) => k * pow).find((v) => v >= rawStep);
  const priceTicks = [];
  for (let v = Math.ceil((lo - pad) / step) * step; v <= hi + pad; v += step) priceTicks.push(v);
  const yearSpan = (t1 - t0) / (365.25 * 864e5);
  const ticks = [];
  for (let y = new Date(t0).getUTCFullYear(); y <= new Date(t1).getUTCFullYear(); y++) {
    if (yearSpan <= 1.5) {
      for (let m = 0; m < 12; m += 3) ticks.push(`${y}-${String(m + 1).padStart(2, "0")}-01`);
    } else if (yearSpan <= 6 || y % 2 === 0) ticks.push(`${y}-01-01`);
  }
  const axisTicks = ticks.filter((d) => Date.parse(d) >= t0 && Date.parse(d) <= t1);
  const tri = (cx, cy, s, up) => (up ? `M${cx},${cy - s}L${cx + s},${cy + s * 0.8}L${cx - s},${cy + s * 0.8}Z` : `M${cx},${cy + s}L${cx + s},${cy - s * 0.8}L${cx - s},${cy - s * 0.8}Z`);

  const onMove = (e) => {
    const box = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - box.left;
    if (px < M.left || px > M.left + plotW) return setHover(null);
    const d = new Date(t0 + ((px - M.left) / plotW) * (t1 - t0)).toISOString().slice(0, 10);
    const wk = weekOf(d);
    const week = view.weeks.find((w) => w.wk === wk) ?? null;
    setHover({ d, x: px, close: closeAt(d), week });
  };
  const top = (m) => [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([n, c]) => (c > 1 ? `${n} (${c})` : n)).join(", ");

  return (
    <div ref={ref} className="relative">
      <div className="mb-3 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-4 text-[14px] text-[#505a5f]">
          <span className="inline-flex items-center gap-1.5"><svg width="12" height="12" aria-hidden="true"><path d={showMarkers ? tri(6, 6, 5, true) : "M1,2h10v8h-10z"} fill={GREEN} /></svg>Buys</span>
          <span className="inline-flex items-center gap-1.5"><svg width="12" height="12" aria-hidden="true"><path d={showMarkers ? tri(6, 6, 5, false) : "M1,2h10v8h-10z"} fill={RED} /></svg>Sells</span>
        </div>
        <div className="inline-flex border border-[#b1b4b6]" role="group" aria-label="Time range">
          {RANGES.filter((r) => r.years == null || span > r.years * 0.8).map((r) => (
            <button
              key={r.key}
              type="button"
              aria-pressed={range === r.key}
              onClick={() => {
                picked.current = true;
                setRange(r.key);
              }}
              className={`px-3 h-[30px] text-[14px] ${range === r.key ? "bg-[#0b0c0c] text-white" : "bg-white text-[#0b0c0c] hover:bg-[#f3f2f1]"}`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>
      {width > 0 && (
        <svg width={width} height={height} role="img" aria-label="Stock price with congressional buys and sells" onPointerMove={onMove} onPointerDown={onMove} onMouseLeave={() => setHover(null)} style={{ display: "block", fontVariantNumeric: "tabular-nums" }}>
          {priceTicks.map((v) => (
            <g key={v}>
              <line x1={M.left} x2={M.left + plotW} y1={yP(v)} y2={yP(v)} stroke={RULE} />
              {Math.abs(yP(v) - yP(last[1])) > 14 && <text x={M.left + plotW + 6} y={yP(v) + 4} fontSize="12" fill={MUTED}>{fmtPrice(v)}</text>}
            </g>
          ))}
          <path d={area} fill="#f3f2f1" />
          <path d={line} fill="none" stroke={INK} strokeWidth="1.6" strokeLinejoin="round" />
          <circle cx={x(last[0])} cy={yP(last[1])} r="3" fill={INK} />
          {showMarkers && view.weeks.map((w) => {
            const cx = x(w.wk), cy = yP(closeAt(w.wk));
            return (
              <g key={w.wk}>
                {w.sells > 0 && <path d={tri(cx, cy - 6 - size(w.sells), size(w.sells), false)} fill={RED} fillOpacity="0.8" />}
                {w.buys > 0 && <path d={tri(cx, cy + 6 + size(w.buys), size(w.buys), true)} fill={GREEN} fillOpacity="0.8" />}
              </g>
            );
          })}
          <line x1={M.left} x2={M.left + plotW} y1={mid} y2={mid} stroke="#b1b4b6" />
          {view.months.map((m) => {
            const cx = x(`${m.m}-15`);
            return (
              <g key={m.m}>
                {m.buys > 0 && <rect x={cx - monthW / 2} y={mid - yB(m.buys)} width={monthW} height={yB(m.buys)} fill={GREEN} />}
                {m.sells > 0 && <rect x={cx - monthW / 2} y={mid} width={monthW} height={yB(m.sells)} fill={RED} />}
              </g>
            );
          })}
          <text x={M.left + plotW + 6} y={barsTop + 12} fontSize="12" fill={GREEN}>Buys</text>
          <text x={M.left + plotW + 6} y={barsTop + barsH - 3} fontSize="12" fill={RED}>Sells</text>
          {!narrow && peakBuy && (
            <text x={x(`${peakBuy.m}-15`)} y={mid - yB(peakBuy.buys) - 4} fontSize="12" fill={INK} textAnchor={x(`${peakBuy.m}-15`) > M.left + plotW * 0.8 ? "end" : "middle"}>
              <tspan fontWeight="700">{peakBuy.buys} buys</tspan> {monthName(peakBuy.m)}
            </text>
          )}
          {!narrow && peakSell && (
            <text x={x(`${peakSell.m}-15`)} y={mid + yB(peakSell.sells) + 13} fontSize="12" fill={INK} textAnchor={x(`${peakSell.m}-15`) > M.left + plotW * 0.8 ? "end" : "middle"}>
              <tspan fontWeight="700">{peakSell.sells} sells</tspan> {monthName(peakSell.m)}
            </text>
          )}
          {axisTicks.map((d) => (
            <text key={d} x={x(d)} y={height - 8} fontSize="12" fill={MUTED} textAnchor="middle">
              {yearSpan <= 1.5 ? new Date(`${d}T12:00:00Z`).toLocaleString("en-US", { month: "short", timeZone: "UTC" }) : d.slice(0, 4)}
            </text>
          ))}
          <text x={M.left + plotW + 6} y={yP(last[1]) + 4} fontSize="12" fontWeight="700" fill={INK}>{fmtPrice(last[1])}</text>
          {hover && <circle cx={x(hover.d)} cy={yP(hover.close)} r="3.5" fill="#fff" stroke={INK} strokeWidth="1.5" />}
          {hover && <line x1={hover.x} x2={hover.x} y1={M.top} y2={barsTop + barsH} stroke={MUTED} strokeDasharray="3 3" />}
        </svg>
      )}
      {hover && (
        // On phones the details sit under the chart so the tapped week stays visible; on wider screens they float.
        <div
          className={
            narrow
              ? "mt-2 border border-[#b1b4b6] bg-white p-2 text-[13px] leading-[1.4]"
              : "pointer-events-none absolute z-10 w-[240px] border border-[#b1b4b6] bg-white p-2 text-[13px] leading-[1.4] shadow-[0_2px_6px_rgba(0,0,0,0.12)]"
          }
          style={narrow ? undefined : { left: Math.max(0, Math.min(hover.x + 12, width - 250)), top: 44 }}
        >
          <div className="font-bold">{fmtDay(hover.week?.wk ?? hover.d)}{hover.week ? " (week)" : ""}</div>
          <div className="text-[#505a5f]">Close {fmtPrice(hover.close)}</div>
          {hover.week ? (
            <>
              {hover.week.buys > 0 && <div style={{ color: GREEN }}>{hover.week.buys} buy{hover.week.buys > 1 ? "s" : ""}: <span className="text-[#0b0c0c]">{top(hover.week.buyers)}</span></div>}
              {hover.week.sells > 0 && <div style={{ color: RED }}>{hover.week.sells} sell{hover.week.sells > 1 ? "s" : ""}: <span className="text-[#0b0c0c]">{top(hover.week.sellers)}</span></div>}
            </>
          ) : (
            <div className="text-[#505a5f]">No trades this week</div>
          )}
        </div>
      )}
    </div>
  );
}
