import { useLayoutEffect, useMemo, useRef, useState } from "react";

// Weekly stock purchases minus sales by members of Congress (counted by trade) as bars, with the S&P 500 as a line on
// its own right-hand scale. The right scale is chosen so its ticks fall on the bar gridlines, giving one set of
// gridlines; each scale has its title and key directly above its own tick column; the line is cased in white so it
// holds contrast over the bars. Hovering a week shows its purchases, sales, members and the SPY close.
const BUY = "#00703c", SELL = "#d4351c", INK = "#0b0c0c", MUTED = "#505a5f", GRID = "rgba(0,0,0,0.07)", AXIS = "rgba(0,0,0,0.4)";
const RANGES = [["2026", "2026"], ["all", "Since 2025"]];
const NICE = [5, 10, 20, 25, 50, 100, 200];
const t = (s) => Date.parse(`${s}T00:00:00Z`);
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const dayLabel = (s) => { const d = new Date(t(s)); return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`; };
const signed = (v) => (v > 0 ? `+${v}` : v < 0 ? `−${Math.abs(v)}` : "0");

// Bar scale from the data, then an S&P scale whose ticks sit on the same gridlines.
function scales(rows, spy) {
  const nMax = Math.max(20, ...rows.map((r) => r.net)), nMin = Math.min(-20, ...rows.map((r) => r.net));
  const step = NICE.find((n) => (nMax - nMin) / n <= 5) ?? 200;
  const nLo = Math.floor(nMin / step) * step, nHi = Math.ceil(nMax / step) * step;
  const sLo = Math.min(...spy.map((r) => r.spy)), sHi = Math.max(...spy.map((r) => r.spy));
  for (const sStep of NICE) {
    const k = sStep / step, aMin = sHi - k * nHi, aMax = sLo - k * nLo;
    const a = Math.ceil(aMin / sStep) * sStep;
    if (a <= aMax) return { step, nLo, nHi, toS: (n) => a + k * n, fromS: (v) => (v - a) / k };
  }
  return { step, nLo, nHi, toS: (n) => n, fromS: (v) => v };
}

export default function WeeklyFlows({ flows }) {
  const ref = useRef(null);
  const [width, setWidth] = useState(0);
  const [range, setRange] = useState("2026");
  const [hover, setHover] = useState(null);
  useLayoutEffect(() => {
    if (!ref.current) return undefined;
    setWidth(ref.current.getBoundingClientRect().width);
    const ro = new ResizeObserver((e) => setWidth(e[0].contentRect.width));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  const rows = useMemo(() => flows.filter((r) => (range === "2026" ? r.week >= "2026-01-01" : true)).map((r) => ({ ...r, net: r.buys - r.sells })), [flows, range]);
  if (!rows.length) return null;
  const spy = rows.filter((r) => r.spy != null);
  const narrow = width < 640;
  const W = Math.max(320, width), P = { l: narrow ? 38 : 48, r: narrow ? 38 : 48, t: 58, b: 34 };
  const H = narrow ? 340 : 440;
  const { step, nLo, nHi, toS, fromS } = scales(rows, spy);
  const x0 = t(rows[0].week), x1 = t(rows.at(-1).week) + 7 * 86400000;
  const x = (s) => P.l + ((t(s) - x0) / (x1 - x0)) * (W - P.l - P.r);
  const yN = (v) => H - P.b - ((v - nLo) / (nHi - nLo)) * (H - P.t - P.b);
  const yS = (v) => yN(fromS(v));
  const weekW = (W - P.l - P.r) / rows.length, bw = Math.max(2, weekW * 0.6);
  const cx = (r) => x(r.week) + weekW / 2;
  const ticks = []; for (let v = nLo; v <= nHi; v += step) ticks.push(v);
  const months = [];
  for (let d = new Date(x0); d.getTime() <= x1; d.setUTCMonth(d.getUTCMonth() + 1)) { d.setUTCDate(1); if (d.getTime() >= x0) months.push(new Date(d)); }
  const monthStep = range === "all" ? (narrow ? 6 : 3) : narrow ? 2 : 1;
  const path = spy.map((r, i) => `${i ? "L" : "M"}${cx(r).toFixed(1)},${yS(r.spy).toFixed(1)}`).join("");
  const onMove = (e) => {
    const box = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - box.left) / box.width) * W;
    setHover(rows[Math.max(0, Math.min(rows.length - 1, Math.floor((px - P.l) / weekW)))]);
  };
  const tipLeft = hover ? Math.min(Math.max(cx(hover), 100), W - 100) : 0;
  const tick = { fontSize: narrow ? 12 : 14, fill: MUTED, style: { fontVariantNumeric: "tabular-nums" } };
  return (
    <div>
      <div className="govuk-form-group" style={{ marginBottom: 12 }}>
        <label className="govuk-label" htmlFor="flows-range">Period</label>
        <select className="govuk-select" id="flows-range" value={range} onChange={(e) => { setRange(e.target.value); setHover(null); }}>
          {RANGES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>
      <div ref={ref} style={{ position: "relative" }}>
        {width > 0 && (
          <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} onMouseMove={onMove} onMouseLeave={() => setHover(null)} role="img"
            aria-label="Weekly stock purchases minus sales by members of Congress, as bars, with the S&P 500 as a line on its own scale.">
            <text x={0} y={18} fontSize="15" fontWeight="700" fill={INK}>{narrow ? "Net purchases" : "Net stock purchases a week"}</text>
            <rect x={0} y={30} width={12} height={12} fill={BUY} /><text x={18} y={41} fontSize="13" fill={MUTED}>Buying</text>
            <rect x={78} y={30} width={12} height={12} fill={SELL} /><text x={96} y={41} fontSize="13" fill={MUTED}>Selling</text>
            <text x={W} y={18} textAnchor="end" fontSize="15" fontWeight="700" fill={INK}>S&amp;P 500</text>
            <line x1={W - 96} x2={W - 74} y1={36} y2={36} stroke={INK} strokeWidth="2.5" /><text x={W} y={41} textAnchor="end" fontSize="13" fill={MUTED}>Index level</text>
            {ticks.map((v) => (
              <g key={v}>
                <line x1={P.l} x2={W - P.r} y1={yN(v)} y2={yN(v)} stroke={v ? GRID : AXIS} />
                <text x={P.l - 8} y={yN(v) + 4} textAnchor="end" {...tick}>{signed(v)}</text>
                <text x={W - P.r + 8} y={yN(v) + 4} {...tick}>{Math.round(toS(v))}</text>
              </g>
            ))}
            {rows.map((r) => {
              const y0 = yN(0), y1 = yN(r.net);
              return <rect key={r.week} x={cx(r) - bw / 2} y={Math.min(y0, y1)} width={bw} height={Math.max(1, Math.abs(y1 - y0))} fill={r.net >= 0 ? BUY : SELL} opacity={hover && hover.week !== r.week ? 0.4 : 1} />;
            })}
            <path d={path} fill="none" stroke="#fff" strokeWidth="6" strokeLinejoin="round" strokeLinecap="round" />
            <path d={path} fill="none" stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />
            {months.filter((d, i) => i % monthStep === 0).map((d) => {
              const iso = d.toISOString().slice(0, 10);
              return (
                <g key={iso}>
                  <line x1={x(iso)} x2={x(iso)} y1={H - P.b} y2={H - P.b + 5} stroke={AXIS} />
                  <text x={x(iso)} y={H - P.b + 20} textAnchor="middle" fontSize={narrow ? 12 : 13} fill={MUTED}>{MONTHS[d.getUTCMonth()]}{range === "all" && d.getUTCMonth() === 0 ? ` ${d.getUTCFullYear()}` : ""}</text>
                </g>
              );
            })}
            {hover && <line x1={cx(hover)} x2={cx(hover)} y1={P.t} y2={H - P.b} stroke={INK} strokeOpacity="0.25" />}
          </svg>
        )}
        {hover && (
          <div style={{ position: "absolute", top: P.t, left: tipLeft, transform: "translateX(-50%)", background: "#fff", border: "1px solid #b1b4b6", padding: "6px 10px", fontSize: 14, lineHeight: "20px", pointerEvents: "none", whiteSpace: "nowrap" }}>
            <strong>Week of {dayLabel(hover.week)}</strong><br />
            <span style={{ color: BUY }}>{hover.buys} purchases</span>, <span style={{ color: SELL }}>{hover.sells} sales</span><br />
            Net {signed(hover.net)}, {hover.members} members{hover.spy != null ? `, S&P ${Math.round(hover.spy)}` : ""}
          </div>
        )}
      </div>
    </div>
  );
}
