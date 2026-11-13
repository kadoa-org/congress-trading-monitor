import { useLayoutEffect, useRef, useState } from "react";
import data from "../static/congress-generations.json";
import { ChartCard, DataTable } from "../kit";
import { ExtLink } from "../ui";

// Each generation's share of seats in the Congress elected in November 2026, beside its share of Americans old
// enough to hold them and its share before the election. A frozen analysis built in the datasets repo
// (services/custom/datasets/congress-generations) from the members' birth dates, the election results and Census
// population estimates; only decided seats are counted.
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const day = (s) => { const d = new Date(`${s}T00:00:00Z`); return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`; };
// One colour per generation: the seats bar solid, the people bar the same colour at a third of its strength.
const COLOUR = { Silent: "#6f777b", Boomers: "#009E73", "Gen X": "#CC79A7", Millennials: "#D55E00", "Gen Z": "#0072B2" };
// The generations that have left Congress, in lighter greys, oldest lightest.
const PAST = { "Before 1883": "#d3d6d9", Lost: "#b9bec2", Greatest: "#9aa1a6" };
// Darker shades of the line colours for the names, which need more contrast on white than a line does.
const TEXT = { Silent: "#505a5f", Boomers: "#007a59", "Gen X": "#a8507f", Millennials: "#b34f00", "Gen Z": "#005a8c" };
const LIVING = Object.keys(COLOUR);
// The longest bar is two thirds of the track, so a share of 65% fills it.
const MAX = 65;
const pct = (v) => (v > 0 && v < 0.5 ? "<1%" : `${Math.round(v)}%`);
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
    <div className="gen" role="img" aria-label={`${ch.name}: ${ch.rows.map((r) => `${r.name} ${pct(r.share)} of seats, ${pct(r.population)} of the US population aged ${ch.minAge} and over`).join("; ")}`}>
      <div className="gen__row gen__row--head" aria-hidden="true">
        <span className="gen__name"><strong>{ch.name}</strong></span>
        <span className="gen__bars gen__note">{ch.decided} of {ch.total} seats decided</span>
        <span className="gen__num">Seats</span>
        <span className="gen__num">Share of seats</span>
        <span className="gen__num">Before midterms</span>
        <span className="gen__num">US population aged {ch.minAge}+</span>
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
          <span className="gen__num"><strong>{r.seats}</strong></span>
          <span className="gen__num"><strong>{pct(r.share)}</strong></span>
          <span className="gen__num">{pct(r.shareBefore)}</span>
          <span className="gen__num">{pct(r.population)}</span>
        </div>
      ))}
    </div>
  );
}

// Each generation's share of a chamber in every Congress since 1945, one line a generation, named at its peak.
function GenHistory({ name, share, years }) {
  const ref = useRef(null);
  const [w, setW] = useState(880);
  useLayoutEffect(() => {
    if (!ref.current) return undefined;
    setW(ref.current.getBoundingClientRect().width);
    const ro = new ResizeObserver((e) => setW(e[0].contentRect.width));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  const narrow = w < 560;
  // A gutter on the left for the axis numbers and one on the right for the names of the generations still rising.
  const H = narrow ? 320 : 380, top = 44, bottom = 30, left = 34, right = 92, TOP = 90;
  const x = (yr) => left + ((yr - years[0]) / (years.at(-1) - years[0])) * (w - left - right);
  const y = (v) => top + (1 - v / TOP) * (H - top - bottom);
  const lines = Object.entries(share).map(([gen, values]) => {
    const pts = values.map((v, i) => ({ v, yr: years[i] })).filter((p) => p.v > 0);
    if (!pts.length) return null;
    const peak = pts.reduce((a, b) => (b.v > a.v ? b : a));
    return { gen, pts, peak, colour: COLOUR[gen] ?? PAST[gen], main: gen === "Boomers" || gen === "Gen X" };
  }).filter(Boolean);
  const last = years.length - 1;
  return (
    <div ref={ref} className="genline">
      <svg width={w} height={H} role="img" aria-label={`${name}: each generation's share of members in every Congress from ${years[0]} to ${years[last]}. In ${years[last]}: ${LIVING.map((g) => `${g} ${pct(share[g][last])}`).join(", ")}.`}>
        {[0, 25, 50, 75].map((t) => (
          <g key={t}>
            <line x1={left} x2={w - right} y1={y(t)} y2={y(t)} stroke={t ? "#e3e5e7" : "#0b0c0c"} />
            <text x={left - 8} y={y(t) + 5} textAnchor="end" className="genline__tick">{t}</text>
          </g>
        ))}
        <text x={0} y={16} className="genline__title">Share of members, %</text>
        {years.filter((yr) => yr % (narrow ? 20 : 10) === 1).map((yr) => (
          <text key={yr} x={x(yr - 1)} y={H - 8} textAnchor="middle" className="genline__tick">{yr - 1}</text>
        ))}
        {lines.map((l) => <path key={l.gen} d={l.pts.map((p, i) => `${i ? "L" : "M"}${x(p.yr).toFixed(1)},${y(p.v).toFixed(1)}`).join("")} fill="none" stroke={l.colour} strokeWidth={l.main ? 3 : 2} strokeLinejoin="round" />)}
        {lines.filter((l) => l.peak.v >= 5).map((l) => {
          // A generation still rising is named beside the end of its line; the others above their peak.
          const end = l.peak.yr === years[last], start = l.peak.yr <= years[0] + 4;
          // On a narrow chart a late peak's name runs right, into the gutter, to stay clear of the name before it.
          const late = narrow && l.peak.yr > years[last] - 20;
          const at = end ? { x: x(l.peak.yr) + 8, y: y(l.peak.v) + 5, textAnchor: "start" } : { x: x(l.peak.yr) + (start ? 6 : 0), y: y(l.peak.v) - 9, textAnchor: start || late ? "start" : "middle" };
          return <text key={l.gen} {...at} className={`genline__name${l.main ? " genline__name--main" : ""}`} fill={TEXT[l.gen] ?? "#505a5f"}>{l.gen === "Before 1883" ? (narrow ? "Pre-1883" : "Born before 1883") : l.gen}</text>;
        })}
      </svg>
    </div>
  );
}

// The new Congress by party: each generation's seats as parts of one bar a group.
function PartyBars({ rows }) {
  return (
    <div className="genparty">
      <div className="genparty__key" aria-hidden="true">{LIVING.map((g) => <span key={g}><i style={{ background: COLOUR[g] }} />{g}</span>)}</div>
      {rows.map((r) => (
        <div className="genparty__row" key={r.label} role="img" aria-label={`${r.label}: ${LIVING.filter((g) => r.seats[g]).map((g) => `${g} ${r.seats[g]}`).join(", ")}`}>
          <span className="genparty__label"><strong>{r.label}</strong><span className="gen__note">{r.total} seats</span></span>
          <span className="genparty__bar" aria-hidden="true">
            {LIVING.filter((g) => r.seats[g]).map((g) => {
              const share = (100 * r.seats[g]) / r.total;
              return <i key={g} style={{ width: `${share}%`, background: COLOUR[g] }}>{share >= 12 ? `${Math.round(share)}%` : ""}</i>;
            })}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function CongressGenerations() {
  const { asOf, chambers, history } = data;
  const { years } = history;
  // The first Congress in which Gen X held a larger share of a chamber than Boomers, if any.
  const passed = (key) => years.find((_, i) => history.chambers[key].share["Gen X"][i] > history.chambers[key].share.Boomers[i]);
  const peak = (key, gen) => { const s = history.chambers[key].share[gen], top = Math.max(...s); return { share: top, year: years[s.indexOf(top)] }; };
  const historyTable = (key) => years.map((yr, i) => ({ yr, ...Object.fromEntries(history.generations.map((g) => [g.name, history.chambers[key].share[g.name][i]])) })).reverse();
  const partyRows = chambers.flatMap((ch) => Object.entries(history.chambers[ch.key].parties).map(([p, seats]) => ({ label: `${ch.name} ${p}`, seats, total: Object.values(seats).reduce((a, b) => a + b, 0) })));
  const both = history.congress;
  const [senate, house] = chambers;
  const of = (ch, key) => ch.rows.find((r) => r.key === key);
  const boomers = of(senate, "Boomers");
  const table = chambers.flatMap((ch) => ch.rows.map((r) => ({ ...r, chamber: ch.name, id: `${ch.key}-${r.key}`, eligible: r.population > 0 })));
  return (
    <>
      <h1 className="dk-h1">Gen X will outnumber Boomers in Congress for the first time</h1>
      <p className="govuk-body-l">
        The Congress elected in November 2026 has {both.latest["Gen X"]} Gen X members and {both.latest.Boomers} Boomers. Boomers still hold{" "}
        {pct(boomers.share)} of Senate seats, down from {pct(boomers.shareBefore)}, and are {pct(boomers.population)} of Americans aged {senate.minAge} and over.
      </p>
      <ChartCard
        id="generations-title"
        title="Each generation's share of seats, and of Americans old enough to hold them"
        description="The solid bar is the share of seats, the pale bar the share of the US population old enough."
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
                  { key: "shareBefore", header: "Share before midterms", align: "right", hideBelow: "sm", render: (r) => pct(r.shareBefore) },
                  { key: "population", header: "Share of US population old enough", align: "right", render: (r) => pct(r.population) },
                ]}
              />
            ),
          },
          { label: "Download", content: <><p className="govuk-body">Both chambers as a CSV: seats now and before the election, share of decided seats and share of Americans old enough to serve, by generation.</p><button type="button" className="govuk-button govuk-button--secondary" onClick={() => download(chambers)}>Download CSV</button></> },
        ]}
      />
      {chambers.map((ch) => {
        const b = peak(ch.key, "Boomers"), since = passed(ch.key);
        return (
          <ChartCard
            key={ch.key}
            id={`history-${ch.key}`}
            title={`Generations in the ${ch.name} since 1945`}
            description={`Boomers peaked at ${pct(b.share)} of the ${ch.name} in ${b.year}. ${since ? `Gen X has outnumbered them there since ${since}.` : "They are still its largest generation."}`}
            date={`Congresses starting ${years[0]} to ${years.at(-1)}`}
            tabs={[
              { label: "Chart", content: <GenHistory name={ch.name} share={history.chambers[ch.key].share} years={years} /> },
              {
                label: "Tabular data", short: "Tabular", scroll: true,
                content: (
                  <DataTable
                    rows={historyTable(ch.key)}
                    rowKey={(r) => r.yr}
                    columns={[
                      { key: "yr", header: "Congress starting", render: (r) => <strong>{r.yr}</strong> },
                      ...history.generations.filter((g) => g.name !== "Before 1883").map((g) => ({ key: g.name, header: g.name, align: "right", render: (r) => (r[g.name] ? pct(r[g.name]) : "–") })),
                    ]}
                  />
                ),
              },
            ]}
          />
        );
      })}
      <div className="chart-fit">
      <ChartCard
        id="party-title"
        title="Generations by party in the new Congress"
        description="Decided seats. Independents are left out."
        tabs={[
          { label: "Chart", content: <PartyBars rows={partyRows} /> },
          {
            label: "Tabular data", short: "Tabular", scroll: true,
            content: (
              <DataTable
                rows={partyRows}
                rowKey={(r) => r.label}
                columns={[
                  { key: "label", header: "Group", render: (r) => <strong>{r.label}</strong> },
                  ...LIVING.map((g) => ({ key: g, header: g, align: "right", render: (r) => r.seats[g] ?? 0 })),
                  { key: "total", header: "Seats", align: "right" },
                ]}
              />
            ),
          },
        ]}
      />
      </div>
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
          <li>Sources: <ExtLink href="https://github.com/unitedstates/congress-legislators">congress-legislators</ExtLink>, Wikipedia&apos;s 2026 election results, Census Bureau population estimates.</li>
          <li>Only decided seats are counted, as of {day(asOf)}: {senate.decided} of {senate.total} in the Senate and {house.decided} of {house.total} in the House. The rest are uncalled races, runoffs or seats awaiting an appointment.</li>
          <li>The open Senate seats are Alaska (uncalled), Minnesota and Tennessee (awaiting appointments). Their current senators, all Boomers, are not counted, so Boomers will end with 49 to 52 of the 100 seats.</li>
          <li>&quot;Before the election&quot; is every sitting member.</li>
          <li>Generations use Pew Research Center&apos;s birth years. People born before 1928 are counted with the Silent generation.</li>
          <li>The population is all US residents old enough to serve, {senate.minAge} for the Senate and {house.minAge} for the House, as of July 2025. It is not limited to citizens.</li>
          <li>A few new members&apos; birth years are listed as one of two years. We use the earlier.</li>
          <li>Age is the year the new Congress starts less the birth year.</li>
          <li>The charts since 1945 count everyone who served in a Congress, even for part of it, so a seat that changed hands counts twice. The Lost generation was born 1883 to 1900 and the Greatest 1901 to 1927.</li>
        </ul>
      </section>
    </>
  );
}
