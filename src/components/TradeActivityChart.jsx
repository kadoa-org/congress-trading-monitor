import { useLayoutEffect, useMemo, useRef, useState } from "react";

// A politician's trades by month, in the same form as the bars under a stock page's price chart: buys up and sells
// down on one time axis, the busiest months labelled, and the stocks traded that month on hover or tap. There is no
// price line because a politician's trades span many stocks.

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
const monthName = (m) => new Date(`${m}-15T12:00:00Z`).toLocaleString("en-US", { month: "short", year: "numeric", timeZone: "UTC" });
const addMonths = (m, n) => {
  const d = new Date(`${m}-01T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + n);
  return d.toISOString().slice(0, 7);
};

export default function TradeActivityChart({ trades }) {
  const ref = useRef(null);
  const [width, setWidth] = useState(0);
  const [hover, setHover] = useState(null);
  const dated = useMemo(() => trades.filter((t) => t.transaction_date && (isBuy(t) || isSell(t))), [trades]);
  const first = dated.reduce((a, t) => (t.transaction_date < a ? t.transaction_date : a), "9999");
  const last = dated.reduce((a, t) => (t.transaction_date > a ? t.transaction_date : a), "0000");
  const span = dated.length ? (Date.parse(last) - Date.parse(first)) / (365.25 * 864e5) : 0;
  const [range, setRange] = useState(span > 5 ? "5y" : "all");
  const picked = useRef(false);

  useLayoutEffect(() => {
    if (!ref.current) return undefined;
    const w0 = ref.current.getBoundingClientRect().width;
    setWidth(w0);
    if (w0 < NARROW && !picked.current && span > 1) setRange("1y");
    const ro = new ResizeObserver((e) => setWidth(e[0].contentRect.width));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);

  const view = useMemo(() => {
    if (!dated.length) return null;
    const endM = last.slice(0, 7);
    const years = RANGES.find((r) => r.key === range)?.years;
    const startM = years ? addMonths(endM, -12 * years + 1) : first.slice(0, 7);
    const months = new Map();
    for (let m = startM; m <= endM; m = addMonths(m, 1)) months.set(m, { m, buys: 0, sells: 0, bought: new Map(), sold: new Map() });
    for (const t of dated) {
      const e = months.get(t.transaction_date.slice(0, 7));
      if (!e) continue;
      const name = t.ticker || "Other assets";
      if (isBuy(t)) { e.buys++; e.bought.set(name, (e.bought.get(name) ?? 0) + 1); }
      else { e.sells++; e.sold.set(name, (e.sold.get(name) ?? 0) + 1); }
    }
    return { months: [...months.values()] };
  }, [dated, first, last, range]);

  if (!view) return <p className="govuk-hint">No dated trades.</p>;

  const narrow = width < NARROW;
  const M = { top: 22, right: narrow ? 40 : 52, left: narrow ? 2 : 8 };
  const barsH = narrow ? 150 : 200;
  const plotW = Math.max(200, width - M.left - M.right);
  const height = M.top + barsH + 18 + AXIS_H;
  const n = view.months.length;
  const slot = plotW / n;
  const barW = Math.max(1, slot * 0.7);
  const cx = (i) => M.left + slot * (i + 0.5);
  const maxMonth = Math.max(1, ...view.months.map((m) => Math.max(m.buys, m.sells)));
  const mid = M.top + barsH / 2;
  const yB = (v) => (v / maxMonth) * (barsH / 2 - 2);
  const idx = (m) => view.months.findIndex((e) => e.m === m.m);
  const peakBuy = view.months.reduce((a, m) => (m.buys > (a?.buys ?? 0) ? m : a), null);
  const peakSell = view.months.reduce((a, m) => (m.sells > (a?.sells ?? 0) ? m : a), null);
  const anchor = (x) => (x > M.left + plotW * 0.8 ? "end" : x < M.left + plotW * 0.2 ? "start" : "middle");
  // Axis labels: quarters within about a year and a half, otherwise January of each year (every other year past six).
  const ticks = view.months
    .map((m, i) => ({ m, i }))
    .filter(({ m }) => {
      const mo = Number(m.m.slice(5));
      const y = Number(m.m.slice(0, 4));
      if (n <= 18) return mo % 3 === 1;
      return mo === 1 && (n <= 72 || y % 2 === 0);
    });
  const top = (map) => [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4).map(([k, c]) => (c > 1 ? `${k} (${c})` : k)).join(", ");

  const onMove = (e) => {
    const box = e.currentTarget.getBoundingClientRect();
    const i = Math.floor((e.clientX - box.left - M.left) / slot);
    setHover(i >= 0 && i < n ? { i, x: cx(i) } : null);
  };
  const h = hover && view.months[hover.i];

  return (
    <div ref={ref} className="relative">
      <div className="mb-3 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-4 text-[14px] text-[#505a5f]">
          <span className="inline-flex items-center gap-1.5"><svg width="12" height="12" aria-hidden="true"><path d="M1,2h10v8h-10z" fill={GREEN} /></svg>Buys</span>
          <span className="inline-flex items-center gap-1.5"><svg width="12" height="12" aria-hidden="true"><path d="M1,2h10v8h-10z" fill={RED} /></svg>Sells</span>
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
        <svg width={width} height={height} role="img" aria-label="Buys and sells by month" onPointerMove={onMove} onPointerDown={onMove} onMouseLeave={() => setHover(null)} style={{ display: "block", fontVariantNumeric: "tabular-nums" }}>
          <line x1={M.left} x2={M.left + plotW} y1={M.top} y2={M.top} stroke={RULE} />
          <line x1={M.left} x2={M.left + plotW} y1={M.top + barsH} y2={M.top + barsH} stroke={RULE} />
          {h && <rect x={hover.x - slot / 2} y={M.top} width={slot} height={barsH} fill="#f3f2f1" />}
          <line x1={M.left} x2={M.left + plotW} y1={mid} y2={mid} stroke="#b1b4b6" />
          {view.months.map((m, i) => (
            <g key={m.m}>
              {m.buys > 0 && <rect x={cx(i) - barW / 2} y={mid - yB(m.buys)} width={barW} height={yB(m.buys)} fill={GREEN} />}
              {m.sells > 0 && <rect x={cx(i) - barW / 2} y={mid} width={barW} height={yB(m.sells)} fill={RED} />}
            </g>
          ))}
          <text x={M.left + plotW + 6} y={M.top + 12} fontSize="12" fill={GREEN}>Buys</text>
          <text x={M.left + plotW + 6} y={M.top + barsH - 3} fontSize="12" fill={RED}>Sells</text>
          {!narrow && peakBuy && (
            <text x={cx(idx(peakBuy))} y={mid - yB(peakBuy.buys) - 4} fontSize="12" fill={INK} textAnchor={anchor(cx(idx(peakBuy)))}>
              <tspan fontWeight="700">{peakBuy.buys} buys</tspan> {monthName(peakBuy.m)}
            </text>
          )}
          {!narrow && peakSell && (
            <text x={cx(idx(peakSell))} y={mid + yB(peakSell.sells) + 13} fontSize="12" fill={INK} textAnchor={anchor(cx(idx(peakSell)))}>
              <tspan fontWeight="700">{peakSell.sells} sells</tspan> {monthName(peakSell.m)}
            </text>
          )}
          {ticks.map(({ m, i }) => (
            <text key={m.m} x={cx(i)} y={height - 8} fontSize="12" fill={MUTED} textAnchor="middle">
              {n <= 18 ? new Date(`${m.m}-15T12:00:00Z`).toLocaleString("en-US", { month: "short", timeZone: "UTC" }) : m.m.slice(0, 4)}
            </text>
          ))}
        </svg>
      )}
      {h && (
        <div
          className={
            narrow
              ? "mt-2 border border-[#b1b4b6] bg-white p-2 text-[13px] leading-[1.4]"
              : "pointer-events-none absolute z-10 w-[260px] border border-[#b1b4b6] bg-white p-2 text-[13px] leading-[1.4] shadow-[0_2px_6px_rgba(0,0,0,0.12)]"
          }
          style={narrow ? undefined : { left: Math.max(0, Math.min(hover.x + 12, width - 270)), top: 44 }}
        >
          <div className="font-bold">{monthName(h.m)}</div>
          {h.buys > 0 && <div style={{ color: GREEN }}>{h.buys} buy{h.buys > 1 ? "s" : ""}: <span className="text-[#0b0c0c]">{top(h.bought)}</span></div>}
          {h.sells > 0 && <div style={{ color: RED }}>{h.sells} sell{h.sells > 1 ? "s" : ""}: <span className="text-[#0b0c0c]">{top(h.sold)}</span></div>}
          {!h.buys && !h.sells && <div className="text-[#505a5f]">No trades this month</div>}
        </div>
      )}
    </div>
  );
}
