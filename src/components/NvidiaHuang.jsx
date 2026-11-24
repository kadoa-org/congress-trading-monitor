import { useState } from "react";
import data from "../static/nvidia-huang.json";
import { ChartCard, DataTable } from "../kit";
import MemberTimeline, { KeySpans, TimelineKey, useWidth } from "./MemberTimeline";
import { ExtLink, fmtInt, Link } from "../ui";

// Trump's NVIDIA holdings and trades from his OGE reports, NVIDIA's price through Jensen Huang's resignation and
// reinstatement, and the NVDA trades members of Congress have disclosed. A frozen analysis; the data is built in the
// datasets repo (services/custom/datasets/nvidia-huang/build.mjs).
const BUY = "#009E73", SELL = "#D55E00", LINE = "#0b0c0c", MUTED = "#505a5f", GRID = "rgba(0,0,0,0.07)", EVENT = "#1d70b8";
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const ts = (s) => Date.parse(`${s}T00:00:00Z`);
const day = (s) => { const d = new Date(ts(s)); return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`; };
const FULL = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const dayLong = (s) => `${+s.slice(8, 10)} ${FULL[+s.slice(5, 7) - 1]}`;
const dayYear = (s) => `${day(s)} ${s.slice(0, 4)}`;
const usd = (v) => `$${v.toFixed(2).replace(/\.00$/, "")}`;
const millions = (v) => `$${v >= 10e6 ? Math.round(v / 1e6) : (v / 1e6).toFixed(1)} million`;
const money = (v) => (v < 1e6 ? `$${Math.round(v / 1e3)}K` : `$${(v / 1e6).toFixed(1).replace(/\.0$/, '')}M`);
const range = (lo, hi) => `${money(lo)} to ${money(hi)}`;
const pct = (a, b) => Math.round((b / a - 1) * 100);
const isBuy = (t) => /purchase/i.test(t.type);
const party = (m) => `${m.party}-${m.state}`;

// Daily closes as a line, with trades as triangles (purchases up, sales down, area by the top of the value range)
// and an optional shaded band with a label, here the days Huang was out.
function PriceChart({ prices, trades = [], band, pending, label }) {
  const [ref, width] = useWidth();
  const [hover, setHover] = useState(null);
  const narrow = width < 560;
  const W = width, H = narrow ? 260 : 320, P = { l: 44, r: narrow ? 8 : 28, t: 12, b: 28 };
  const x0 = ts(prices[0].date), x1 = ts(prices.at(-1).date);
  const lo = Math.min(...prices.map((p) => p.close)), hi = Math.max(...prices.map((p) => p.close));
  const step = narrow || hi - lo > 120 ? 50 : 25;
  // The range snaps to $25 so a coarse label step on phones does not add empty space; labels sit on the step.
  const yLo = Math.floor(lo / 25) * 25, yHi = Math.ceil(hi / 25) * 25;
  const x = (d) => P.l + ((ts(d) - x0) / (x1 - x0 || 1)) * (W - P.l - P.r);
  const y = (v) => H - P.b - ((v - yLo) / (yHi - yLo)) * (H - P.t - P.b);
  const at = (d) => (prices.filter((p) => p.date <= d).at(-1) ?? prices[0]).close;
  const ticks = []; for (let v = Math.ceil(yLo / step) * step; v <= yHi; v += step) ticks.push(v);
  const spanDays = (x1 - x0) / 864e5;
  // Month ticks; over a year, quarters with the year on each January.
  const monthStarts = prices.filter((p, i) => i === 0 || p.date.slice(5, 7) !== prices[i - 1].date.slice(5, 7));
  const xTicks = spanDays > 400
    ? monthStarts.filter((p) => [1, 4, 7, 10].includes(+p.date.slice(5, 7))).filter((p) => !narrow || ["01", "07"].includes(p.date.slice(5, 7))).map((p) => [p.date, p.date.slice(5, 7) === "01" ? `Jan ${p.date.slice(0, 4)}` : MONTHS[+p.date.slice(5, 7) - 1]])
    : spanDays > 60
    ? monthStarts.filter((_, i) => !narrow || i % 2 === 0).map((p) => [p.date, MONTHS[+p.date.slice(5, 7) - 1]])
    : prices.filter((_, i, a) => (a.length - 1 - i) % (narrow ? 5 : 2) === 0).map((p) => [p.date, day(p.date)]);
  const maxHigh = Math.max(1, ...trades.map((t) => t.high));
  const size = (t) => (narrow ? 3 : 4) + (narrow ? 6 : 9) * Math.sqrt(t.high / maxHigh);
  // Hover snaps to the nearest trading day and lists that day's trades.
  const onMove = (e) => {
    const px = e.clientX - e.currentTarget.getBoundingClientRect().left;
    const t = x0 + ((px - P.l) / (W - P.l - P.r)) * (x1 - x0);
    const p = prices.reduce((a, b) => (Math.abs(ts(b.date) - t) < Math.abs(ts(a.date) - t) ? b : a));
    setHover({ ...p, trades: trades.filter((tr) => tr.date === p.date) });
  };
  const path = prices.map((p, i) => `${i ? "L" : "M"}${x(p.date).toFixed(1)},${y(p.close).toFixed(1)}`).join("");
  return (
    <div ref={ref} style={{ position: "relative" }}>
      {width > 0 && (
        <svg width={W} height={H} role="img" aria-label={label} style={{ display: "block", touchAction: "pan-y" }} onPointerMove={onMove} onPointerDown={onMove} onPointerLeave={() => setHover(null)}>
          {ticks.map((v) => <g key={v}><line x1={P.l} x2={W - P.r} y1={y(v)} y2={y(v)} stroke={GRID} /><text x={P.l - 6} y={y(v) + 4} textAnchor="end" fontSize="13" fill={MUTED}>${v}</text></g>)}
          {xTicks.map(([d, l]) => <text key={d} x={x(d)} y={H - 8} textAnchor={x(d) + l.length * 4 > W ? "end" : "middle"} fontSize="13" fill={MUTED}>{l}</text>)}
          {pending && (
            <g>
              <defs>
                <pattern id="pc-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                  <line x1="0" y1="0" x2="0" y2="6" stroke={MUTED} strokeWidth="1.5" strokeOpacity="0.35" />
                </pattern>
              </defs>
              <rect x={x(pending.from)} y={P.t} width={Math.max(2, x(pending.to) - x(pending.from))} height={H - P.t - P.b} fill="url(#pc-hatch)" />
            </g>
          )}
          {band && (
            <g>
              <rect x={x(band.from)} y={P.t} width={Math.max(2, x(band.to) - x(band.from))} height={H - P.t - P.b} fill={EVENT} fillOpacity="0.12" />
            </g>
          )}
          <path d={path} fill="none" stroke={LINE} strokeWidth="2" />
          {trades.map((t, i) => {
            const cx = x(t.date), cy = y(at(t.date)), s = size(t), up = isBuy(t);
            const pts = up ? `${cx},${cy - s - 3} ${cx - s},${cy + s - 3} ${cx + s},${cy + s - 3}` : `${cx},${cy + s + 3} ${cx - s},${cy - s + 3} ${cx + s},${cy - s + 3}`;
            return <polygon key={i} points={pts} fill={up ? BUY : SELL} fillOpacity="0.8" stroke="#fff" strokeWidth="1" />;
          })}
          {hover && (
            <g pointerEvents="none">
              <line x1={x(hover.date)} x2={x(hover.date)} y1={P.t} y2={H - P.b} stroke={LINE} strokeOpacity="0.4" />
              <circle cx={x(hover.date)} cy={y(hover.close)} r="4" fill={LINE} stroke="#fff" strokeWidth="2" />
            </g>
          )}
          <rect x={P.l} y={P.t} width={W - P.l - P.r} height={H - P.t - P.b} fill="transparent" />
        </svg>
      )}
      {hover && (
        <div role="status" style={{ position: "absolute", left: Math.min(Math.max(0, x(hover.date) + (x(hover.date) > W / 2 ? -232 : 12)), W - 220), top: P.t, width: 220, background: "#fff", border: "1px solid #b1b4b6", padding: "6px 8px", fontSize: 14, pointerEvents: "none", boxShadow: "0 2px 6px rgba(0,0,0,0.12)" }}>
          <strong>{dayYear(hover.date)}</strong>: {usd(hover.close)}
          {hover.trades.map((t, i) => <div key={i}><span style={{ color: isBuy(t) ? BUY : SELL }}>{isBuy(t) ? "▲" : "▼"}</span> {isBuy(t) ? "Purchase" : "Sale"}, {t.label}</div>)}
        </div>
      )}
    </div>
  );
}

const Key = ({ spans = [] }) => (
  <div className="dk-hint" style={{ display: "flex", gap: "6px 20px", flexWrap: "wrap", margin: "0 0 10px", fontSize: 16, alignItems: "center" }}>
    <span><span style={{ color: BUY }}>▲</span> Purchase</span><span><span style={{ color: SELL }}>▼</span> Sale</span><span>Larger: higher value</span>
    <KeySpans spans={spans} />
  </div>
);

// Sources for the board's and Trump's statements on the reinstatement.
const REINSTATED = "https://www.ms.now/news/nvidia-board-reinstates-jensen-huang-as-ceo";
const MANAGED = "https://wtop.com/business-finance/2026/05/trump-discloses-thousands-of-stock-trades-some-in-companies-directly-influenced-by-his-policies/";

export default function NvidiaHuang() {
  const { points, trump, congress, prices, live } = data;
  const { yearEnd, beforeResign, low, reinstated } = points;
  const latest = reinstated;
  const out = { from: "2026-11-11", to: "2026-11-23", label: "Huang out" };
  const loss = (s) => s * (beforeResign.close - low.close);
  const net = (s) => s * (beforeResign.close - latest.close);
  const lastTrump = trump.trades.at(-1);
  // The autumn high before the resignation, so the fall from 11 November is not read as the whole fall.
  const peak = prices.filter((p) => p.date >= "2026-09-01" && p.date <= beforeResign.date).reduce((a, b) => (b.close > a.close ? b : a));
  const latestNote = live ? ` The ${dayLong(latest.date)} price is from during trading.` : "";
  const shares = (v) => fmtInt(Math.round(v / 1000) * 1000);
  // One row per member, the largest totals (top of the value ranges) first.
  const timelineRows = congress.members.map((r) => ({ key: r.member, name: r.name, note: party(r), href: `/filer/${encodeURIComponent(r.id)}`, trades: congress.trades.filter((t) => t.member === r.member) }));
  // Members have up to 45 days to report a trade, so the last 45 days are not complete.
  const reportedBy = new Date(Date.parse(latest.date) - 45 * 864e5).toISOString().slice(0, 10);
  const pending = { from: reportedBy, to: latest.date, label: "May not be reported yet", hatch: true };
  return (
    <>
      <h1 className="dk-h1">Who in Washington owns and trades Nvidia stock</h1>
      <p className="govuk-body-l">
        Trump&apos;s latest annual report lists {range(trump.held.low, trump.held.high)} of Nvidia stock at the end of last year, and his accounts traded the stock {trump.trades.length} times from January to {dayLong(lastTrump.date)}. Nvidia had fallen {Math.abs(pct(peak.close, beforeResign.close))}% from its {dayLong(peak.date)} high by 11 November, before Jensen Huang&apos;s resignation was announced. It closed another {Math.abs(pct(beforeResign.close, low.close))}% lower on 20 November, with quarterly results in between, and {pct(low.close, latest.close)}% higher on {dayLong(latest.date)}, after his reinstatement.
      </p>
      <p className="govuk-body">
        The board said it had input from senior levels of the US government, and Trump said he was represented at the board (<ExtLink href={REINSTATED}>MS NOW</ExtLink>). His reports so far cover trades up to {dayLong(lastTrump.date)}.
      </p>
      <ChartCard
        id="trump-title"
        title="Trump's trades in Nvidia stock in 2026"
        description={`${trump.bought.n} purchases (${range(trump.bought.low, trump.bought.high)}) and ${trump.sold.n} sales (${range(trump.sold.low, trump.sold.high)}), plotted on Nvidia's daily close. His latest report, released ${dayYear(trump.lastFiled)}, runs to ${dayLong(lastTrump.date)}.${latestNote}`}
        tabs={[
          { label: "Chart", content: <><Key spans={[out, pending]} /><PriceChart prices={prices.filter((p) => p.date >= "2026-01-01")} trades={trump.trades} band={out} pending={pending} label={`${trump.trades.length} Nvidia trades by Trump's accounts in 2026 on Nvidia's price.`} /></> },
          { label: "Tabular data", short: "Tabular", scroll: true, content: <DataTable rows={[...trump.trades].reverse()} rowKey={(t, i) => `${t.date}-${i}`} columns={[{ key: "date", header: "Date", render: (t) => dayYear(t.date) }, { key: "type", header: "Type", render: (t) => t.type.replace(" (Full)", ", all shares in the account") }, { key: "label", header: "Value", align: "right" }]} /> },
        ]}
        footer={<p>Prices: Yahoo Finance.</p>}
      />
      <ChartCard
        id="congress-title"
        title="Members of Congress who traded Nvidia stock since January 2025"
        description={`${congress.trades.length} trades by ${congress.members.length} members, largest totals first. The latest disclosed trade is from ${dayLong(congress.lastTrade)}. Periodic transaction reports only.`}
        tabs={[
          { label: "Chart", content: <><TimelineKey spans={[out, pending]} /><MemberTimeline rows={timelineRows} from={congress.since} to={latest.date} spans={[out, pending]} label={`Nvidia trades by members of Congress since January 2025, one row per member: ${timelineRows.slice(0, 3).map((r) => r.name).join(", ")} and others.`} /></> },
          {
            label: "Tabular data",
            short: "Tabular",
            scroll: true,
            content: (
              <DataTable
                rows={congress.members}
                rowKey={(r) => r.id}
                columns={[
                  { key: "name", header: "Member", render: (r) => <><Link to={`/filer/${encodeURIComponent(r.id)}`}>{r.name}</Link> <span className="dk-hint">{party(r)}</span></> },
                  { key: "trades", header: "Buys / sales", align: "right", render: (r) => <span style={{ whiteSpace: "nowrap" }}>{fmtInt(r.buys)} / {fmtInt(r.sells)}</span> },
                  { key: "value", header: "Value", align: "right", render: (r) => <span style={{ whiteSpace: "nowrap" }}>{money(r.low)}–{money(r.high)}</span> },
                  { key: "last", header: "Latest", align: "right", render: (r) => <span style={{ whiteSpace: "nowrap" }}>{MONTHS[+r.last.slice(5, 7) - 1]} {r.last.slice(0, 4)}</span> },
                ]}
              />
            ),
          },
        ]}
              />
      <section className="insight-about">
        <h2>About the data</h2>
        <ul>
          <li>Holdings: <ExtLink href={data.sources.annual}>Trump&apos;s annual report for 2025</ExtLink> values assets at the end of the year. At that day&apos;s close of {usd(yearEnd.close)}, {range(trump.held.low, trump.held.high)} is {shares(trump.shares.low)} to {shares(trump.shares.high)} shares.</li>
          <li>If he still held those shares, the net change from 11 to {dayLong(latest.date)} is a loss of {millions(net(trump.shares.low))} to {millions(net(trump.shares.high))}: the fall to 20 November cost {millions(loss(trump.shares.low))} to {millions(loss(trump.shares.high))} and the rise after returned {millions(trump.gain.low)} to {millions(trump.gain.high)}. His current holding is not known: his 2026 purchases and sales are in ranges too wide to net.</li>
          <li>The Trump Organization says his accounts are managed by independent third parties (<ExtLink href={MANAGED}>AP</ExtLink>). The reports do not show who decided a trade.</li>
          <li>Trades must be reported within 30 days of the filer learning of them and no later than 45 days after, so trades from November are due by early January. We will update this page when they appear.</li>
          <li>Congress: trades in members&apos; periodic transaction reports, families included. Trades reported only in annual or candidate reports are not counted, such as those NOTUS reported for Eric Swalwell and Ritchie Torres.</li>
        </ul>
      </section>
    </>
  );
}
