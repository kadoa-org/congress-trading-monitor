import { useLayoutEffect, useMemo, useRef, useState } from "react";

export default function PersonalTimeline({ trades, highlightTicker = null }) {
  const ref = useRef(null);
  // Start at 0 until measured so the SVG doesn't render at a hardcoded width
  // on mobile before the ResizeObserver fires.
  const [width, setWidth] = useState(0);
  const [hover, setHover] = useState(null);

  useLayoutEffect(() => {
    if (!ref.current) return;
    setWidth(ref.current.getBoundingClientRect().width);
    const ro = new ResizeObserver((e) => setWidth(e[0].contentRect.width));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);

  const MARGIN = { top: 24, right: 16, bottom: 30, left: 24 };
  const HEIGHT = 240;

  const { xMin, xMax } = useMemo(() => {
    let min = Infinity,
      max = -Infinity;
    for (const t of trades) {
      const d = Date.parse(t.transaction_date);
      if (!Number.isFinite(d)) continue;
      if (d < min) min = d;
      if (d > max) max = d;
    }
    if (!Number.isFinite(min)) {
      min = Date.parse("2020-01-01");
      max = Date.now();
    }
    return { xMin: min, xMax: max };
  }, [trades]);

  const plotW = Math.max(200, width - MARGIN.left - MARGIN.right);
  const plotH = HEIGHT - MARGIN.top - MARGIN.bottom;

  const x = (iso) => ((Date.parse(iso) - xMin) / (xMax - xMin)) * plotW;

  const y = (iso, typeTone) => {
    const h = (iso?.charCodeAt(0) || 0) ^ (iso?.charCodeAt(5) || 0) ^ (iso?.charCodeAt(8) || 0);
    const jitter = (h % 10) - 5;
    const baseY = typeTone === "b" ? plotH * 0.32 : typeTone === "s" ? plotH * 0.68 : plotH * 0.5;
    return baseY + jitter;
  };

  const r = (amount) => {
    if (!amount) return 2.2;
    const log = Math.log10(Math.max(amount, 1000));
    return 2 + Math.max(0, log - 3) * 1.4;
  };

  const years = useMemo(() => {
    const y0 = new Date(xMin).getFullYear();
    const y1 = new Date(xMax).getFullYear();
    const step = y1 - y0 > 10 ? 2 : 1;
    const out = [];
    for (let yr = y0; yr <= y1; yr += step) out.push({ year: yr, xPos: x(`${yr}-01-01`) });
    return out;
  }, [xMin, xMax, plotW]);

  return (
    <div ref={ref} className="w-full relative">
      <svg width={width} height={HEIGHT} style={{ display: "block" }}>
        <line
          x1={MARGIN.left}
          x2={MARGIN.left + plotW}
          y1={MARGIN.top + plotH * 0.5}
          y2={MARGIN.top + plotH * 0.5}
          stroke="#ebecef"
          strokeWidth={1}
        />
        {years.map((yr) => (
          <g key={yr.year}>
            <line
              x1={MARGIN.left + yr.xPos}
              x2={MARGIN.left + yr.xPos}
              y1={MARGIN.top}
              y2={MARGIN.top + plotH}
              stroke="#f2f3f5"
              strokeWidth={1}
            />
            <text
              x={MARGIN.left + yr.xPos}
              y={HEIGHT - 8}
              fontSize="11"
              fill="#8a8f98"
              textAnchor="middle"
              fontFamily="JetBrains Mono"
            >
              {yr.year}
            </text>
          </g>
        ))}
        <text
          x={MARGIN.left + 4}
          y={MARGIN.top + plotH * 0.32}
          fontSize="10"
          fill="#0f7a52"
          dominantBaseline="middle"
          fontWeight={500}
        >
          Buy
        </text>
        <text
          x={MARGIN.left + 4}
          y={MARGIN.top + plotH * 0.68}
          fontSize="10"
          fill="#ca3535"
          dominantBaseline="middle"
          fontWeight={500}
        >
          Sell
        </text>

        <g transform={`translate(${MARGIN.left}, ${MARGIN.top})`}>
          {trades.map((t, i) => {
            const tt = (t.transaction_type || "").toLowerCase();
            const isBuy = tt.includes("urchase") || tt === "p";
            const isSell = tt.includes("ale") || tt === "s";
            const tone = isBuy ? "b" : isSell ? "s" : "o";
            const cx = x(t.transaction_date);
            if (!Number.isFinite(cx)) return null;
            const cy = y(t.transaction_date, tone);
            const mid =
              t.amount_range_low && t.amount_range_high ? (t.amount_range_low + t.amount_range_high) / 2 : null;
            const highlighted = highlightTicker && t.ticker === highlightTicker;
            return (
              <circle
                key={t.id || i}
                cx={cx}
                cy={cy}
                r={r(mid)}
                fill={isBuy ? "#0f7a52" : isSell ? "#ca3535" : "#8a8f98"}
                fillOpacity={highlighted ? 1 : t.is_late ? 0.85 : 0.55}
                stroke={t.is_late ? "#f47738" : highlighted ? "#23252a" : "none"}
                strokeWidth={t.is_late ? 0.7 : highlighted ? 0.9 : 0}
                style={{ cursor: "crosshair" }}
                onMouseEnter={(e) => {
                  const rect = ref.current.getBoundingClientRect();
                  setHover({ t, clientX: e.clientX - rect.left, clientY: e.clientY - rect.top });
                }}
                onMouseLeave={() => setHover(null)}
              />
            );
          })}
        </g>
      </svg>

      {hover && (
        <div
          className="pointer-events-none absolute z-50 text-small bg-panel border border-stroke rounded-md px-2.5 py-1.5 shadow-md whitespace-nowrap"
          style={{
            left: Math.min(hover.clientX + 12, width - 280),
            top: hover.clientY + 14,
          }}
        >
          <div className="font-medium text-ink">
            {hover.t.ticker && <span className="font-mono text-accent mr-1.5">{hover.t.ticker}</span>}
            {hover.t.asset_name?.slice(0, 40)}
          </div>
          <div className="text-ink_muted mt-[2px]">
            <span className="font-mono">{hover.t.transaction_date}</span>
            <span className="mx-1.5 text-ink_faint">·</span>
            <span className={hover.t.transaction_type?.toLowerCase().includes("urchase") ? "text-buy" : "text-sell"}>
              {hover.t.transaction_type}
            </span>
            <span className="mx-1.5 text-ink_faint">·</span>
            <span>{hover.t.amount_range_label ?? ""}</span>
            {hover.t.is_late ? <span className="text-warn ml-2">late ({hover.t.days_to_file}d)</span> : ""}
          </div>
        </div>
      )}
    </div>
  );
}
