import { useLayoutEffect, useMemo, useRef, useState } from "react";

// Each company's lobbying spend against its market cap, both on log scales, with dashed lines for $1, $10 and $100 of
// lobbying per $1M of market cap. Four sectors are coloured (Okabe-Ito, checked for colour blindness); the rest stay
// grey. The biggest names are labelled where there is room, and hovering a dot names it.
export const GROUPS = {
  tech: { label: "Tech", color: "#0072B2", text: "#0072B2" },
  pharma: { label: "Pharma", color: "#009E73", text: "#007a5a" },
  telecom: { label: "Telecom and media", color: "#CC79A7", text: "#a8578a" },
  defense: { label: "Defense", color: "#D55E00", text: "#b34700" },
};
const GREY = "#c9cdd0", INK = "#0b0c0c", MUTED = "#505a5f", GRID = "rgba(0,0,0,0.07)";
const LABELLED = ["META", "LMT", "GM", "AMZN", "GOOGL", "GD", "RTX", "AAPL", "MSFT", "NVDA", "AVGO", "LLY", "PFE", "CMCSA", "CHTR", "PSKY", "TMUS", "PM"];
// Phones show only the story points: the biggest spenders and the extremes on each side of the lines.
const NARROW_LABELLED = new Set(["META", "AMZN", "LMT", "NVDA", "CHTR"]);
const X0 = 2e9, X1 = 6e12, Y0 = 1e5, Y1 = 3e7;

export const money = (v) => (v >= 1e12 ? `$${+(v / 1e12).toFixed(2)}T` : v >= 1e9 ? `$${+(v / 1e9).toFixed(v >= 1e10 ? 0 : 1)}B` : v >= 1e6 ? `$${+(v / 1e6).toFixed(1)}M` : `$${Math.round(v / 1e3)}K`);
const tickMoney = (v) => (v >= 1e12 ? `$${v / 1e12}T` : v >= 1e9 ? `$${v / 1e9}B` : v >= 1e6 ? `$${v / 1e6}M` : `$${v / 1e3}K`);
export const perMillion = (r) => (r.spend / r.mcap) * 1e6;

export default function LobbyingScatter({ rows }) {
  const ref = useRef(null);
  const [width, setWidth] = useState(0);
  const [hover, setHover] = useState(null);
  useLayoutEffect(() => {
    if (!ref.current) return undefined;
    setWidth(ref.current.getBoundingClientRect().width);
    const ro = new ResizeObserver((e) => setWidth(e[0].contentRect.width));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  const narrow = width < 640;
  const W = Math.max(320, width), H = narrow ? Math.round(W * 1.2) : 560;
  const P = { l: narrow ? 44 : 56, r: narrow ? 10 : 24, t: 30, b: 40 };
  const x = (v) => P.l + ((Math.log10(v) - Math.log10(X0)) / (Math.log10(X1) - Math.log10(X0))) * (W - P.l - P.r);
  const y = (v) => H - P.b - ((Math.log10(v) - Math.log10(Y0)) / (Math.log10(Y1) - Math.log10(Y0))) * (H - P.t - P.b);
  const pts = useMemo(() => {
    const order = { other: 0, pharma: 1, telecom: 2, defense: 3, tech: 4 };
    return rows.filter((r) => r.mcap >= X0 && r.spend >= Y0).sort((a, b) => order[a.g] - order[b.g]);
  }, [rows]);

  // Labels: right of the dot if there is room, else left, above or below; dropped when every spot is taken.
  const labels = useMemo(() => {
    if (!width) return [];
    const want = LABELLED.filter((t) => !narrow || NARROW_LABELLED.has(t));
    const boxes = [], out = [], fs = narrow ? 12 : 14;
    const dots = pts.filter((p) => p.g !== "other").map((p) => ({ cx: x(p.mcap), cy: y(p.spend) }));
    const hits = (b) => b.x < P.l || b.x + b.w > W - 2 || b.y < 2 || b.y + b.h > H - P.b
      || boxes.some((o) => b.x < o.x + o.w && b.x + b.w > o.x && b.y < o.y + o.h && b.y + b.h > o.y)
      || dots.some((d) => d.cx > b.x - 4 && d.cx < b.x + b.w + 4 && d.cy > b.y - 4 && d.cy < b.y + b.h + 4);
    for (const t of want) {
      const p = pts.find((q) => q.t === t);
      if (!p) continue;
      const cx = x(p.mcap), cy = y(p.spend), w = p.n.length * fs * 0.58 + 4, h = fs + 4;
      const spots = [[cx + 8, cy - h / 2, "start"], [cx - 8 - w, cy - h / 2, "end"], [cx - w / 2, cy - h - 7, "middle"], [cx - w / 2, cy + 7, "middle"],
        [cx + 6, cy - h - 4, "start"], [cx - 6 - w, cy - h - 4, "end"], [cx + 6, cy + 4, "start"], [cx - 6 - w, cy + 4, "end"]];
      const s = spots.find(([bx, by]) => !hits({ x: bx, y: by, w, h }));
      if (!s) continue;
      boxes.push({ x: s[0], y: s[1], w, h });
      out.push({ p, cx, cy, tx: s[2] === "start" ? s[0] : s[2] === "end" ? s[0] + w : s[0] + w / 2, ty: s[1] + h - 4, anchor: s[2], fs });
    }
    return out;
  }, [pts, width, narrow]); // eslint-disable-line react-hooks/exhaustive-deps

  const onMove = (e) => {
    const box = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - box.left) / box.width) * W, py = ((e.clientY - box.top) / box.height) * H;
    let best = null, bd = 18 * 18;
    for (const p of pts) {
      const d = (x(p.mcap) - px) ** 2 + (y(p.spend) - py) ** 2;
      if (d < bd) { bd = d; best = p; }
    }
    setHover(best);
  };
  const xTicks = narrow ? [1e10, 1e11, 1e12] : [3e9, 1e10, 3e10, 1e11, 3e11, 1e12, 3e12];
  const yTicks = narrow ? [1e5, 1e6, 1e7] : [1e5, 3e5, 1e6, 3e6, 1e7, 3e7];
  const tick = { fontSize: narrow ? 12 : 14, fill: MUTED, style: { fontVariantNumeric: "tabular-nums" } };
  // Dashed lines of constant lobbying per $1M of market cap, clipped to the plot and labelled where they leave it.
  const iso = [1, 10, 100].map((k) => {
    const f = (m) => (k * m) / 1e6;
    let a = X0, b = X1;
    if (f(a) < Y0) a = (Y0 * 1e6) / k;
    if (f(b) > Y1) b = (Y1 * 1e6) / k;
    return { k, x1: x(a), y1: y(f(a)), x2: x(b), y2: y(f(b)) };
  });
  // Line labels as on the Reddit chart: each rides its line, rotated to the slope and just below it, and all three
  // start at one shared height so they read as a set. The height is the one where the tightest label keeps the most
  // room from coloured dots and company labels.
  const isoLabels = (() => {
    if (!width) return [];
    const fs = narrow ? 12 : 13;
    const geo = iso.map((L) => {
      const len = Math.hypot(L.x2 - L.x1, L.y2 - L.y1), ux = (L.x2 - L.x1) / len, uy = (L.y2 - L.y1) / len;
      const text = `$${L.k} per $1M`;
      return { L, len, ux, uy, text, w: text.length * fs * 0.56 };
    });
    const dots = pts.filter((p) => p.g !== "other").map((p) => [x(p.mcap), y(p.spend)]);
    const boxes = labels.map((l) => ({ x0: l.anchor === "start" ? l.tx : l.anchor === "end" ? l.tx - l.p.n.length * l.fs * 0.58 : l.tx - (l.p.n.length * l.fs * 0.58) / 2, y0: l.ty - l.fs, y1: l.ty + 4 }));
    const off = fs + 3; // baseline offset below the line, in the rotated frame
    const clearance = (G, s) => {
      let c = Infinity;
      for (let a = 0; a <= G.w; a += 5) for (const o of [3, off / 2, off]) {
        const px = G.L.x1 + G.ux * (s + a) - G.uy * o, py = G.L.y1 + G.uy * (s + a) + G.ux * o;
        if (px < P.l + 4 || px > W - P.r - 2 || py < P.t + 4 || py > H - P.b - 4) return -99;
        for (const [dx, dy] of dots) c = Math.min(c, Math.hypot(px - dx, py - dy) - 5);
        for (const b of boxes) c = Math.min(c, Math.max(b.x0 - px, px - b.x0 - 200, b.y0 - py, py - b.y1));
      }
      return c;
    };
    let best = null;
    for (let yc = P.t + 10; yc <= H - P.b - 10; yc += 3) {
      const spots = [];
      for (const G of geo) {
        const s = (yc - G.ux * off - G.L.y1) / G.uy;
        if (!(s > 4 && s < G.len - G.w - 4)) break;
        spots.push({ G, s, c: clearance(G, s) });
      }
      if (spots.length < geo.length) continue;
      const worst = Math.min(...spots.map((q) => q.c));
      if (!best || worst > best.worst) best = { worst, spots };
    }
    return (best?.spots ?? []).map(({ G, s }) => ({ text: G.text, x: G.L.x1 + G.ux * s, y: G.L.y1 + G.uy * s, deg: (Math.atan2(G.uy, G.ux) * 180) / Math.PI, fs, off }));
  })();
  const tipLeft = hover ? Math.min(Math.max(x(hover.mcap), 110), W - 110) : 0;
  const tipTop = hover ? (y(hover.spend) > H / 2 ? y(hover.spend) - 96 : y(hover.spend) + 14) : 0;
  return (
    <div ref={ref} style={{ position: "relative" }}>
      {width > 0 && (
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} onMouseMove={onMove} onMouseLeave={() => setHover(null)} role="img"
          aria-label="Lobbying spend in 2025 against market cap for US companies traded by members of Congress, on log scales, coloured by sector.">
          <text x={0} y={14} fontSize={narrow ? 13 : 15} fontWeight="700" fill={INK}>Spent on lobbying in 2025</text>
          {yTicks.map((v) => (
            <g key={v}>
              <line x1={P.l} x2={W - P.r} y1={y(v)} y2={y(v)} stroke={GRID} />
              <text x={P.l - 6} y={y(v) + 4} textAnchor="end" {...tick}>{tickMoney(v)}</text>
            </g>
          ))}
          {xTicks.map((v) => (
            <g key={v}>
              <line x1={x(v)} x2={x(v)} y1={P.t} y2={H - P.b} stroke={GRID} />
              <text x={x(v)} y={H - P.b + 18} textAnchor="middle" {...tick}>{tickMoney(v)}</text>
            </g>
          ))}
          <text x={W - P.r} y={H - 4} textAnchor="end" fontSize={narrow ? 13 : 15} fontWeight="700" fill={INK}>Market cap</text>
          {iso.map((L) => (
            <g key={L.k}>
              <line x1={L.x1} y1={L.y1} x2={L.x2} y2={L.y2} stroke={MUTED} strokeDasharray="4 5" opacity="0.55" />

            </g>
          ))}
          {pts.map((p) => {
            const story = p.g !== "other";
            return <circle key={p.t} cx={x(p.mcap)} cy={y(p.spend)} r={story ? (narrow ? 3.5 : 5) : (narrow ? 2.2 : 4)} fill={story ? GROUPS[p.g].color : GREY} fillOpacity={story ? 0.9 : narrow ? 0.5 : 0.6} stroke="#fff" strokeWidth="1" />;
          })}
          {labels.map((l) => (
            <g key={l.p.t}>
              <circle cx={l.cx} cy={l.cy} r={narrow ? 4.5 : 5.5} fill={l.p.g === "other" ? "#8a9196" : GROUPS[l.p.g].color} stroke={INK} strokeWidth="1.5" />
              <text x={l.tx} y={l.ty} textAnchor={l.anchor} fontSize={l.fs} fontWeight="600" stroke="#fff" strokeWidth="4" strokeLinejoin="round" fill="#fff">{l.p.n}</text>
              <text x={l.tx} y={l.ty} textAnchor={l.anchor} fontSize={l.fs} fontWeight="600" fill={INK}>{l.p.n}</text>
            </g>
          ))}
          {isoLabels.map((l) => (
            <g key={l.text} transform={`translate(${l.x.toFixed(1)} ${l.y.toFixed(1)}) rotate(${l.deg.toFixed(2)})`}>
              <text y={l.off} fontSize={l.fs} stroke="#fff" strokeWidth="4" strokeLinejoin="round" fill="#fff">{l.text}</text>
              <text y={l.off} fontSize={l.fs} fill={MUTED}>{l.text}</text>
            </g>
          ))}
          {hover && <circle cx={x(hover.mcap)} cy={y(hover.spend)} r={narrow ? 6 : 7} fill="none" stroke={INK} strokeWidth="2" />}
        </svg>
      )}
      {hover && (
        <div style={{ position: "absolute", top: tipTop, left: tipLeft, transform: "translateX(-50%)", background: "#fff", border: "1px solid #b1b4b6", padding: "6px 10px", fontSize: 14, lineHeight: "20px", pointerEvents: "none", whiteSpace: "nowrap" }}>
          <strong>{hover.n}</strong> ({hover.t})<br />
          Lobbying {money(hover.spend)}, market cap {money(hover.mcap)}<br />
          ${Math.round(perMillion(hover)).toLocaleString("en-US")} per $1M of market cap
        </div>
      )}
    </div>
  );
}
