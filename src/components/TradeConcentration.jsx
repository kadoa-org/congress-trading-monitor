import data from "../static/trade-concentration.json";
import { ChartCard, DataTable } from "../kit";
import { ExtLink, fmtInt, HOUSE_FILINGS, Link, SENATE_FILINGS } from "../ui";

// How concentrated Congress's reported trades are: each member's count since the 119th Congress began, the most
// active first, and the same total beside Trump's accounts. The data is built in the datasets repo
// (services/custom/datasets/congress-trading/charts/trade-concentration/site-data.mjs).
// Colours: a member's party, in the two Okabe-Ito hues that stay apart under colour blindness (blue for Democrats,
// vermilion for Republicans, with a darker vermilion for text). A bar of several members is split by party. Trump's
// accounts are dark grey: a comparison, not a member.
const C = { D: "#0072B2", R: "#D55E00", other: "#8a9096", trump: "#505a5f", muted: "#505a5f" };
const TEXT = { D: "#0072B2", R: "#B34E00" };
const PARTIES = [["D", "Democrats"], ["R", "Republicans"]];
const LEAD = 4, TOP = 10;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const day = (s) => `${+s.slice(8)} ${MONTHS[+s.slice(5, 7) - 1]} ${s.slice(0, 4)}`;
const month = (s) => `${MONTHS[+s.slice(5, 7) - 1]} ${s.slice(0, 4)}`;
const CHAMBER = { house: "House", senate: "Senate" };
const cell = (v) => (v == null ? "" : /[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));

function download(file, header, rows) {
  const csv = [header.join(","), ...rows.map((r) => r.map(cell).join(","))].join("\n");
  const url = URL.createObjectURL(new Blob([csv + "\n"], { type: "text/csv" }));
  const a = document.createElement("a"); a.href = url; a.download = file; a.click(); URL.revokeObjectURL(url);
}

// Horizontal bars on one scale: a name, an optional note after it, the bar (one colour, or parts side by side), then
// the count and an optional share. The key names the two party colours.
function Bars({ rows, max, label }) {
  return (
    <figure className="m-0" role="img" aria-label={label}>
      <div className="mb-3 flex flex-wrap gap-x-6 gap-y-1 text-[16px]">
        {PARTIES.map(([k, name]) => <span key={k} className="flex items-center gap-2"><i className="block h-4 w-4 rounded-[2px]" style={{ background: C[k] }} /><b style={{ color: TEXT[k] }}>{name}</b></span>)}
      </div>
      <div className="flex flex-col gap-2">
        {rows.map((r) => (
          <div key={r.key} className={`grid grid-cols-[124px_minmax(0,1fr)] items-center gap-3 sm:grid-cols-[250px_minmax(0,1fr)] ${r.rule ? "mt-2 border-t border-[#0b0c0c] pt-4" : ""}`}>
            <div className="text-[16px] leading-tight sm:text-[17px]">
              <b>{r.label}</b>{r.note && <span className="block sm:ml-2 sm:inline" style={{ color: C.muted }}>{r.note}</span>}
            </div>
            <div className="flex items-center gap-2">
              <div className="flex h-7 shrink-0" style={{ width: `max(3px, calc((100% - 112px) * ${(r.value / max).toFixed(4)}))`, background: r.colour }}>
                {r.parts?.map((part) => <span key={part.key} style={{ width: `${(100 * part.value) / r.value}%`, background: part.colour }} />)}
              </div>
              <span className="whitespace-nowrap text-[16px]"><b>{fmtInt(r.value)}</b>{r.share != null && <span className="ml-2" style={{ color: C.muted }}>{r.share}</span>}</span>
            </div>
          </div>
        ))}
      </div>
    </figure>
  );
}

export default function TradeConcentration() {
  const { members, total, trump, from, to } = data;
  const pct = (n) => `${Math.round((100 * n) / total)}%`;
  const sum = (rows) => rows.reduce((t, m) => t + m.trades, 0);
  const lead = members.slice(0, LEAD), top = members.slice(0, TOP), rest = members.slice(TOP);
  const names = `${lead.slice(0, -1).map((m) => m.name).join(", ")} and ${lead.at(-1).name}`;
  const busy = members.filter((m) => m.trades >= 100).length;
  const seat = (m) => `${m.party}-${m.state}`;
  const colour = (m) => C[m.party] ?? C.other;
  // A group of members as one bar, Democrats first, then Republicans, then anyone else.
  const byParty = (rows) => ["D", "R", "other"].map((k) => ({ key: k, value: sum(rows.filter((m) => (k === "other" ? m.party !== "D" && m.party !== "R" : m.party === k))), colour: C[k] })).filter((part) => part.value > 0);
  const memberBars = [
    ...top.map((m) => ({ key: m.id, label: m.name, note: seat(m), value: m.trades, share: pct(m.trades), colour: colour(m) })),
    { key: "rest", label: `The other ${rest.length} who traded`, value: sum(rest), share: pct(sum(rest)), parts: byParty(rest), rule: true },
  ];
  const against = [
    { key: "congress", label: "All of Congress", note: `${members.length} members`, value: total, parts: byParty(members) },
    { key: "lead", label: lead[0].name, note: seat(lead[0]), value: lead[0].trades, colour: colour(lead[0]) },
    { key: "trump", label: "Trump's accounts", note: `to ${month(trump.to)}`, value: trump.trades, colour: C.trump, rule: true },
  ];
  const partyTrades = (k) => sum(members.filter((m) => m.party === k));
  const ranked = members.map((m, i) => ({ ...m, rank: i + 1 }));
  return (
    <>
      <h1 className="dk-h1">Four members of Congress made more than half of its trades</h1>
      <p className="govuk-body-l">
        Since January 2025, {members.length} members of Congress reported {fmtInt(total)} trades. {names} made {pct(sum(lead))} of them.
      </p>
      <ChartCard
        id="members-title"
        title={`${lead[0].name} alone made ${pct(lead[0].trades)} of the trades`}
        description={`Trades reported by each of the ${TOP} most active members and their share of the total. ${busy} members made 100 or more. Democrats made ${fmtInt(partyTrades("D"))} of the trades and Republicans ${fmtInt(partyTrades("R"))}.`}
        date={`${day(from)} to ${day(to)}`}
        tabs={[
          { label: "Chart", content: <Bars rows={memberBars} max={memberBars[0].value} label={`Trades reported by the ${TOP} most active members of Congress and by all other members together`} /> },
          {
            label: "Tabular data", short: "Tabular", scroll: true,
            content: (
              <DataTable
                rows={ranked}
                rowKey={(m) => m.id}
                columns={[
                  { key: "rank", header: "Rank", render: (m) => m.rank },
                  { key: "name", header: "Member", render: (m) => <Link to={`/filer/${encodeURIComponent(m.id)}`}>{m.name}</Link> },
                  { key: "seat", header: "Party and state", render: seat },
                  { key: "chamber", header: "Chamber", render: (m) => CHAMBER[m.chamber] ?? m.chamber },
                  { key: "trades", header: "Trades", align: "right", render: (m) => fmtInt(m.trades) },
                  { key: "share", header: "Share", align: "right", render: (m) => `${((100 * m.trades) / total).toFixed(1)}%` },
                  { key: "stocks", header: "Of which stocks", align: "right", render: (m) => fmtInt(m.stocks) },
                ]}
              />
            ),
          },
          {
            label: "Download",
            content: (
              <>
                <p className="govuk-body">Every member who reported a trade as a CSV, with their trades and how many were stocks.</p>
                <button type="button" className="govuk-button govuk-button--secondary" onClick={() => download("congress-trades-by-member.csv", ["rank", "member", "party", "state", "chamber", "trades", "stocks", "latest_trade"], ranked.map((m) => [m.rank, m.name, m.party, m.state, m.chamber, m.trades, m.stocks, m.last]))}>Download CSV</button>
              </>
            ),
          },
        ]}
      />
      <ChartCard
        id="trump-title"
        title="Trump's accounts made more trades than every member together"
        description={<>Disclosed trades since January 2025. Trump&apos;s latest report ends in {month(trump.to)}. More in <Link to="/insights/trump-trades">Trump&apos;s trades against Congress</Link>.</>}
      >
        <Bars rows={against} max={trump.trades} label={`Trades by Trump's accounts, by all members of Congress and by ${lead[0].name}`} />
      </ChartCard>
      <section className="insight-about">
        <h2>About the data</h2>
        <ul>
          <li>Trades come from <ExtLink href={HOUSE_FILINGS}>House</ExtLink> and <ExtLink href={SENATE_FILINGS}>Senate</ExtLink> periodic transaction reports for trades dated {day(from)} to {day(to)}. We count each reported trade, and a trade repeated in an amended filing once.</li>
          <li>A member&apos;s trades include those of a spouse and dependent children, which the reports list together. The reports do not say who chose a trade. Ro Khanna has said the trades reported under his name are in his wife&apos;s trusts and run by outside managers.</li>
          <li>Trades are stocks, bonds, funds and other securities. {fmtInt(members.reduce((t, m) => t + m.stocks, 0))} of the {fmtInt(total)} are stocks, and the same four members made {Math.round((100 * lead.reduce((t, m) => t + m.stocks, 0)) / members.reduce((t, m) => t + m.stocks, 0))}% of those.</li>
          <li>Members have up to 45 days to report a trade, so the latest weeks are incomplete. Congress has {data.seats} voting seats, and members who reported no trade are not listed.</li>
          <li>Trump&apos;s count is from his filings with the Office of Government Ethics and covers {trump.accounts} accounts to {month(trump.to)}, the end of his latest report, so it stops earlier than the Congress count.</li>
        </ul>
      </section>
    </>
  );
}
