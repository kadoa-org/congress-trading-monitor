import { useState } from "react";

// Charts for the Trump trades insight, copied from the POTUS Tracker's TradeCharts.jsx so both sites show the same
// figures: trades per month (Trump's accounts vs Congress) and the most-traded stocks. Colours: Trump blue, Congress
// grey, purchases green, sales red (Okabe-Ito, checked for colour blindness; the stock bars also label each part).
export const C = { trump: "#0072B2", congress: "#9aa0a6", congressText: "#505a5f", buy: "#009E73", buyText: "#00785A", sale: "#D55E00", saleText: "#A84A00", ink: "#0b0c0c", muted: "#505a5f" };

const MONTH = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const monthLabel = (m) => `${MONTH[+m.slice(5) - 1]} ${m.slice(0, 4)}`;

// Paired bars per month. The last month is faded: its filings may not all be in yet.
export function MonthlyTrades({ months, totals }) {
  return (
    <figure className="m-0">
      <div className="mb-3 flex flex-wrap gap-x-6 gap-y-1 text-[16px]">
        <span className="flex items-center gap-2"><i className="block h-4 w-4 rounded-[2px]" style={{ background: C.trump }} />Trump&apos;s accounts <b>{totals.trump.toLocaleString("en-US")}</b></span>
        <span className="flex items-center gap-2"><i className="block h-4 w-4 rounded-[2px]" style={{ background: C.congress }} />Congress <b>{totals.congress.toLocaleString("en-US")}</b></span>
      </div>
      <div className="hidden sm:block"><Bars months={months} W={860} H={320} ticks={/(01|07)$/} /></div>
      <div className="sm:hidden"><Bars months={months} W={300} H={220} ticks={/01$/} /></div>
    </figure>
  );
}

function Bars({ months, W, H, ticks }) {
  const L = 44, T = 16, B = 30, YMAX = 3000;
  const n = months.length, gw = (W - L) / n, bw = gw * 0.36;
  const y = (v) => T + (1 - v / YMAX) * (H - T - B);
  return (
      <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img" aria-label="Trades per month, Trump's accounts and Congress">
        {[0, 1000, 2000, 3000].map((v) => (
          <g key={v}>
            <line x1={0} x2={W} y1={y(v)} y2={y(v)} stroke="rgba(0,0,0,.08)" />
            <text x={0} y={y(v) - 5} fontSize={14} fill={C.muted}>{v.toLocaleString("en-US")}</text>
          </g>
        ))}
        {months.map((m, i) => {
          const cx = L + i * gw + gw / 2, last = i === n - 1;
          return (
            <g key={m.month} opacity={last ? 0.45 : 1}>
              <rect x={cx - bw - 1} y={y(m.trump)} width={bw} height={y(0) - y(m.trump)} rx={1.5} fill={C.trump}>
                <title>{`${monthLabel(m.month)}: Trump's accounts ${m.trump.toLocaleString("en-US")}, Congress ${m.congress.toLocaleString("en-US")}${last ? " (incomplete)" : ""}`}</title>
              </rect>
              <rect x={cx + 1} y={y(m.congress)} width={bw} height={y(0) - y(m.congress)} rx={1.5} fill={C.congress}>
                <title>{`${monthLabel(m.month)}: Trump's accounts ${m.trump.toLocaleString("en-US")}, Congress ${m.congress.toLocaleString("en-US")}${last ? " (incomplete)" : ""}`}</title>
              </rect>
              {ticks.test(m.month) && <text x={cx} y={H - 8} fontSize={14} fill={C.muted} textAnchor="middle">{monthLabel(m.month)}</text>}
            </g>
          );
        })}
      </svg>
  );
}

// Every stock as one stacked bar of purchases and sales, the total after. The 10 most traded show at full size; the
// button expands the rest in compact rows, with counts inside a bar only where they fit.
export function TopStocks({ stocks, initial = 10 }) {
  const [all, setAll] = useState(false);
  const max = Math.max(...stocks.map((r) => r.buy + r.sell));
  const rows = all ? stocks : stocks.slice(0, initial);
  return (
    <figure className="m-0">
      <div className="mb-3 flex flex-wrap gap-x-6 gap-y-1 text-[16px]">
        <span className="flex items-center gap-2"><i className="block h-4 w-4 rounded-[2px]" style={{ background: C.buy }} /><b style={{ color: C.buyText }}>Purchases</b></span>
        <span className="flex items-center gap-2"><i className="block h-4 w-4 rounded-[2px]" style={{ background: C.sale }} /><b style={{ color: C.saleText }}>Sales</b></span>
      </div>
      <div className="flex flex-col gap-1.5">
        {rows.map((r, i) => {
          const big = i < initial, n = r.buy + r.sell, fits = (v) => big || (v / max) * 80 >= 4;
          return (
            <div key={r.ticker} className="grid grid-cols-[130px_minmax(0,1fr)] items-center gap-3 sm:grid-cols-[220px_minmax(0,1fr)]">
              <div className={`truncate text-right font-bold ${big ? "text-[16px] sm:text-[17px]" : "text-[14px]"}`} title={r.company}>{r.company}</div>
              <div className="flex items-center gap-2">
                <div className={`flex ${big ? "h-7" : "h-5"}`} style={{ width: `${(n / max) * 80}%` }} role="img" aria-label={`${r.company}: ${r.buy} purchases, ${r.sell} sales`}>
                  {r.buy > 0 && <span className="flex items-center justify-end pr-1.5 text-[14px] font-bold text-white" style={{ width: `${(r.buy / n) * 100}%`, background: C.buy }}>{fits(r.buy) && r.buy}</span>}
                  {r.sell > 0 && <span className={`flex flex-1 items-center justify-end pr-1.5 text-[14px] font-bold text-white ${r.buy > 0 ? "ml-[2px]" : ""}`} style={{ background: C.sale }}>{fits(r.sell) && r.sell}</span>}
                </div>
                <b className={big ? "text-[16px]" : "text-[14px]"}>{n}</b>
              </div>
            </div>
          );
        })}
      </div>
      {stocks.length > initial && (
        <button type="button" className="mt-4 cursor-pointer text-[16px] font-bold underline" onClick={() => setAll((v) => !v)}>
          {all ? `Show the ${initial} most traded` : `Show all ${stocks.length.toLocaleString("en-US")} stocks`}
        </button>
      )}
    </figure>
  );
}
