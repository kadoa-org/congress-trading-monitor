import data from "../static/congress-generations.json";
import { ChartCard, DataTable } from "../kit";
import { ExtLink } from "../ui";

// Each generation's share of seats in the Congress elected in November 2026, beside its share of Americans old
// enough to hold them and the change since before the election. A frozen analysis built in the datasets repo
// (services/custom/datasets/congress-generations) from the members' birth dates, the election results and Census
// population estimates; only decided seats are counted.
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const day = (s) => { const d = new Date(`${s}T00:00:00Z`); return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`; };
// One colour per generation: the seats bar solid, the people bar the same colour at a third of its strength.
const COLOUR = { Silent: "#6f777b", Boomers: "#009E73", "Gen X": "#CC79A7", Millennials: "#D55E00", "Gen Z": "#0072B2" };
// The longest bar is two thirds of the track, so a share of 65% fills it.
const MAX = 65;
const pct = (v) => (v > 0 && v < 0.5 ? "<1%" : `${Math.round(v)}%`);
// The change between the two rounded shares, so it agrees with the seats figure beside it.
const change = (r) => {
  const d = Math.round(r.share) - Math.round(r.shareBefore);
  return d === 0 ? "0" : `${d > 0 ? "+" : "−"}${Math.abs(d)}`;
};
const cell = (v) => (v == null ? "" : /[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));

function download(chambers) {
  const header = ["chamber", "generation", "born", "seats", "seats_before_election", "share_of_decided_seats_pct", "share_before_election_pct", "share_of_americans_old_enough_pct"];
  const rows = chambers.flatMap((ch) => ch.rows.map((r) => [ch.name, r.name, r.born, r.seats, r.seatsBefore, r.share, r.shareBefore, r.population]));
  const csv = [header.join(","), ...rows.map((r) => r.map(cell).join(","))].join("\n");
  const url = URL.createObjectURL(new Blob([csv + "\n"], { type: "text/csv" }));
  const a = document.createElement("a"); a.href = url; a.download = "congress-generations-2026.csv"; a.click(); URL.revokeObjectURL(url);
}

function Chamber({ ch }) {
  return (
    <div className="gen" role="img" aria-label={`${ch.name}: ${ch.rows.map((r) => `${r.name} ${pct(r.share)} of seats, ${pct(r.population)} of Americans ${ch.minAge} and over`).join("; ")}`}>
      <div className="gen__row gen__row--head" aria-hidden="true">
        <span className="gen__name"><strong>{ch.name}</strong></span>
        <span className="gen__bars gen__note">{ch.decided} of {ch.total} seats decided</span>
        <span className="gen__num">Seats</span>
        <span className="gen__num">Midterm change</span>
        <span className="gen__num">Americans {ch.minAge}+</span>
      </div>
      {ch.rows.map((r) => (
        <div className="gen__row" key={r.key} aria-hidden="true">
          <span className="gen__name"><strong>{r.name}</strong><span className="gen__note">{r.born}</span></span>
          <span className="gen__bars">
            {r.population > 0 ? (
              <>
                <i className="gen__bar" style={{ width: `${Math.max(0.4, (r.share / MAX) * 100)}%`, background: COLOUR[r.key] }} />
                <i className="gen__bar gen__bar--people" style={{ width: `${(r.population / MAX) * 100}%`, background: COLOUR[r.key] }} />
              </>
            ) : <span className="gen__note">Senators must be {ch.minAge}</span>}
          </span>
          <span className="gen__num"><strong>{pct(r.share)}</strong></span>
          <span className="gen__num">{r.population > 0 ? change(r) : ""}</span>
          <span className="gen__num">{pct(r.population)}</span>
        </div>
      ))}
    </div>
  );
}

export default function CongressGenerations() {
  const { asOf, chambers } = data;
  const [senate, house] = chambers;
  const of = (ch, key) => ch.rows.find((r) => r.key === key);
  const boomers = of(senate, "Boomers"), millennials = of(senate, "Millennials");
  const table = chambers.flatMap((ch) => ch.rows.map((r) => ({ ...r, chamber: ch.name, id: `${ch.key}-${r.key}`, eligible: r.population > 0 })));
  return (
    <>
      <h1 className="dk-h1">Boomers still hold half the Senate after the 2026 midterms</h1>
      <p className="govuk-body-l">
        Boomers are {pct(boomers.population)} of Americans aged {senate.minAge} and over and hold {pct(boomers.share)} of Senate seats, down from{" "}
        {pct(boomers.shareBefore)} before the election. Millennials are {pct(millennials.population)} and hold {pct(millennials.share)}.
      </p>
      <ChartCard
        id="generations-title"
        title="Each generation's share of seats, and of Americans old enough to hold them"
        description="The solid bar is the share of seats, the pale bar the share of Americans old enough. Midterm change is in percentage points."
        date={`Seats decided by ${day(asOf)}`}
        tabs={[
          { label: "Chart", content: <>{chambers.map((ch) => <Chamber key={ch.key} ch={ch} />)}</> },
          {
            label: "Tabular data", short: "Tabular", scroll: true,
            content: (
              <DataTable
                rows={table}
                rowKey={(r) => r.id}
                columns={[
                  { key: "chamber", header: "Chamber" },
                  { key: "name", header: "Generation", render: (r) => <><strong>{r.name}</strong> <span style={{ color: "#505a5f" }}>{r.born}</span></> },
                  { key: "seats", header: "Seats", align: "right" },
                  { key: "seatsBefore", header: "Before", align: "right", hideBelow: "sm" },
                  { key: "share", header: "Share of seats", align: "right", render: (r) => pct(r.share) },
                  { key: "change", header: "Midterm change", align: "right", hideBelow: "sm", render: (r) => (r.eligible ? change(r) : "–") },
                  { key: "population", header: "Share of Americans old enough", align: "right", render: (r) => pct(r.population) },
                ]}
              />
            ),
          },
          { label: "Download", content: <><p className="govuk-body">Both chambers as a CSV: seats now and before the election, share of decided seats and share of Americans old enough to serve, by generation.</p><button type="button" className="govuk-button govuk-button--secondary" onClick={() => download(chambers)}>Download CSV</button></> },
        ]}
        footer={<p>Source: <ExtLink href="https://github.com/unitedstates/congress-legislators">congress-legislators</ExtLink>, Wikipedia&apos;s 2026 election results, Census Bureau population estimates.</p>}
      />
      <ChartCard id="age-title" title="The new members are younger" description="Median age on 3 January 2027, when the new Congress starts.">
        <DataTable
          rows={chambers}
          rowKey={(ch) => ch.key}
          columns={[
            { key: "name", header: "Chamber", render: (ch) => <strong>{ch.name}</strong> },
            { key: "before", header: "Before the election", align: "right", render: (ch) => Math.round(ch.medianAge.before) },
            { key: "now", header: "New Congress", align: "right", render: (ch) => Math.round(ch.medianAge.now) },
            { key: "new", header: "New members only", align: "right", render: (ch) => Math.round(ch.medianAge.newMembers) },
            { key: "aged80", header: "Members aged 80 or over", align: "right", hideBelow: "sm", render: (ch) => `${ch.aged80.now}, was ${ch.aged80.before}` },
          ]}
        />
      </ChartCard>
      <section className="insight-about">
        <h2>About the data</h2>
        <ul>
          <li>Only decided seats are counted, as of {day(asOf)}: {senate.decided} of {senate.total} in the Senate and {house.decided} of {house.total} in the House. The rest are uncalled races, runoffs or seats awaiting an appointment.</li>
          <li>&quot;Before the election&quot; is every sitting member. Shares after it are of decided seats, so each open Senate seat can still move a share by about a point.</li>
          <li>Generations use Pew Research Center&apos;s birth years. People born before 1928 are counted with the Silent generation.</li>
          <li>The population is all US residents old enough to serve, {senate.minAge} for the Senate and {house.minAge} for the House, from the Census Bureau&apos;s July 2025 estimates by age. It is not limited to citizens.</li>
          <li>Birth dates of sitting members are from the congress-legislators dataset. New members and their birth years are from Wikipedia&apos;s list of new members of the 120th Congress, where a few are given as one of two years; we use the earlier.</li>
          <li>Age is the year the new Congress starts less the birth year.</li>
        </ul>
      </section>
    </>
  );
}
