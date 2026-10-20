import React, { useEffect, useMemo, useState } from "react";
import data from "../static/committee-trades.json";
import { DataTable } from "../kit";
import { useQueryState } from "../router";
import { fmtInt, Link } from "../ui";
import { InlineSearchInput, SingleSelectChip } from "./FilterBar";
import GovTabs from "./GovTabs";

// Members who traded stocks in companies their committees oversee, January 2025 to October 2026. A frozen analysis,
// bundled with the site rather than refreshed daily: committee jurisdiction and company links were classified once.
const PARTY = { D: "#1d70b8", R: "#d4351c", I: "#4c2c92" };
const TINT = { D: "#bbd4ea", R: "#f4cdc6", I: "#d2cae3" };
const NONE = "#e8e9e9";
const PARTY_NAME = { D: "Democrat", R: "Republican", I: "Independent" };
const ROLE = { house: "Representative", senate: "Senator" };
const STATUS = ["no stock trades", "traded other stocks", "traded companies their committees oversee"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const day = (s) => { const d = new Date(`${s}T00:00:00Z`); return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`; };
// Amber and pink are too light for white text at full strength.
const DARK_TEXT = new Set(["#eda100", "#e87ba4"]);

function shade(colour, n) {
  if (n >= 16) return { background: colour, color: DARK_TEXT.has(colour) ? "#0b0c0c" : "#fff" };
  return { background: colour + (n >= 6 ? "8c" : "38"), color: "#0b0c0c" };
}

function SeatGrid({ seats, label, cols, onPick }) {
  const matched = seats.filter((s) => s[3] === 2).length;
  return (
    <div className={`ct-chamber ct-chamber--${cols}`}>
      <h3 className="govuk-heading-s ct-chamber__title">{label} <span>· {matched} matched</span></h3>
      <div className="ct-grid" role="img" aria-label={`${label}: ${matched} of ${seats.length} members traded companies their committees oversee`}>
        {seats.map(([name, party, state, status, filerId], i) => status === 2
          ? <button key={i} type="button" className="ct-cell" style={{ background: PARTY[party] }} title={`${name} (${party}-${state}): ${STATUS[status]}. Show card`} aria-label={`Show ${name}`} onClick={() => onPick(filerId)} />
          : <i key={i} style={{ background: status === 1 ? TINT[party] : NONE }} title={`${name} (${party}-${state}): ${STATUS[status]}`} />)}
      </div>
    </div>
  );
}

function Grid({ onPick }) {
  return (
    <>
      <div className="ct-chambers">
        <SeatGrid seats={data.grid.house} label="House" cols={52} onPick={onPick} />
        <SeatGrid seats={data.grid.senate} label="Senate" cols={14} onPick={onPick} />
      </div>
      <div className="ct-key govuk-body-s">
        <span><i style={{ background: PARTY.D }} /><i style={{ background: PARTY.R }} />Traded companies their committees oversee</span>
        <span><i style={{ background: TINT.D }} /><i style={{ background: TINT.R }} />Traded other stocks</span>
        <span><i style={{ background: NONE }} />No stock trades</span>
        <span>Click a dark square to see that member's card</span>
      </div>
    </>
  );
}

const committeesOf = (c) => [...new Set(c.rows.flatMap((r) => r.committees))];
// Filter keys carry the chamber, since both have an Armed Services, an Appropriations and so on.
const committeeKeysOf = (c) => [...new Set(c.rows.flatMap((r) => r.committeeKeys))];

function download() {
  const q = (s) => `"${String(s).replace(/"/g, '""')}"`;
  const csv = ["member,party,state,chamber,companies_traded,companies_linked_to_committee,matched_trades,committees",
    ...data.cards.map((m) => [q(m.name), m.party, m.state, m.chamber, m.companiesTraded, m.linkedCompanies, m.matchedTrades, q(committeesOf(m).join("; "))].join(","))].join("\n");
  const url = URL.createObjectURL(new Blob([csv + "\n"], { type: "text/csv" }));
  const a = document.createElement("a"); a.href = url; a.download = "congress-committee-trades.csv"; a.click(); URL.revokeObjectURL(url);
}

function MembersTable() {
  const [sort, setSort] = useState({ key: "matched", dir: "desc" });
  const rows = useMemo(() => {
    const val = { name: (m) => m.name, companies: (m) => m.companiesTraded, linked: (m) => m.linkedCompanies, matched: (m) => m.matchedTrades }[sort.key];
    return [...data.cards].sort((a, b) => { const p = val(a), q = val(b); return (p < q ? -1 : p > q ? 1 : 0) * (sort.dir === "asc" ? 1 : -1); });
  }, [sort]);
  const onSort = (key) => setSort((s) => ({ key, dir: s.key === key && s.dir === "desc" ? "asc" : "desc" }));
  const columns = [
    { key: "name", header: "Member", sortable: true, render: (m) => <><Link to={`/filer/${m.filerId}`}>{m.name}</Link> <span style={{ color: "#505a5f" }}>{m.party}-{m.state}</span></> },
    { key: "committees", header: "Committees", hideBelow: "sm", render: (m) => committeesOf(m).join(", ") },
    { key: "companies", header: "Companies traded", align: "right", sortable: true, hideBelow: "sm", render: (m) => fmtInt(m.companiesTraded) },
    { key: "linked", header: "Linked to a seat", align: "right", sortable: true, render: (m) => fmtInt(m.linkedCompanies) },
    { key: "matched", header: "Trades", align: "right", sortable: true, render: (m) => fmtInt(m.matchedTrades) },
  ];
  return <DataTable rows={rows} columns={columns} rowKey={(m) => m.filerId} sort={sort} onSort={onSort} />;
}

const MAX_CHIPS = 7;
const MAX_ROWS = 4;

function MemberCard({ card, query, flash }) {
  const [open, setOpen] = useState(false);
  const probe = card.rows.some((r) => r.companies.some((c) => c.probe));
  const hit = (c) => query && c.name.toLowerCase().includes(query);
  // A search for a company opens the card so a match is never hidden behind "Show all".
  const expanded = open || card.rows.some((r) => r.companies.some(hit));
  const total = card.rows.reduce((n, r) => n + r.companies.length, 0);
  const shown = card.rows.slice(0, expanded ? undefined : MAX_ROWS).reduce((n, r) => n + Math.min(r.companies.length, expanded ? Infinity : MAX_CHIPS), 0);
  return (
    <article key={flash} className={`ct-card${flash ? " ct-card--flash" : ""}`} id={`m-${card.filerId}`}>
      <header className="ct-card__header">
        <img src={card.photo} alt="" width="56" height="68" loading="lazy" />
        <div>
          <h3 className="govuk-heading-m ct-card__name"><Link to={`/filer/${card.filerId}`}>{card.name}</Link></h3>
          <p className="govuk-body-s ct-card__role"><span className="ct-dot" style={{ background: PARTY[card.party] }} aria-label={PARTY_NAME[card.party]} />{card.former ? `Former ${ROLE[card.chamber].toLowerCase()}` : ROLE[card.chamber]}, {card.party}-{card.state}</p>
        </div>
      </header>
      <div className="ct-card__body">
        <p className="govuk-body ct-card__sum">Traded {fmtInt(card.companiesTraded)} companies, <strong className="ct-mark">{card.linkedCompanies} linked to a committee seat</strong> ({card.matchedTrades} trades)</p>
        {card.rows.slice(0, expanded ? undefined : MAX_ROWS).map((r) => (
          <div key={r.label} className="ct-row">
            <p className="ct-row__label"><b style={{ background: r.colour }} />{r.label}</p>
            <div className="ct-chips">
              {r.companies.slice(0, expanded ? undefined : MAX_CHIPS).map((c) => (
                <Link key={c.ticker} to={`/ticker/${encodeURIComponent(c.ticker)}`} className={`ct-chip${hit(c) ? " ct-chip--hit" : ""}`} style={shade(r.colour, c.trades)} title={`${c.name}: ${c.trades} ${c.trades === 1 ? "trade" : "trades"}`}>{c.name}{c.probe ? "*" : ""}</Link>
              ))}
            </div>
          </div>
        ))}
        {total > shown && <button type="button" className="ct-toggle" onClick={() => setOpen(true)}>Show all {total} companies</button>}
        {open && total > MAX_CHIPS && <button type="button" className="ct-toggle" onClick={() => setOpen(false)}>Show fewer</button>}
        {probe && <p className="ct-note">* Traded while the committee was investigating the company</p>}
        <p className="ct-note">{card.owners}</p>
      </div>
    </article>
  );
}

const CHAMBERS = [{ k: "all", label: "All" }, { k: "house", label: "House" }, { k: "senate", label: "Senate" }];
const PARTIES = [{ k: "all", label: "All" }, { k: "D", label: "Democrats" }, { k: "R", label: "Republicans" }, { k: "I", label: "Independents" }];
const SORTS = [
  { k: "trades", label: "Most trades", fn: (a, b) => b.matchedTrades - a.matchedTrades },
  { k: "companies", label: "Most companies", fn: (a, b) => b.linkedCompanies - a.linkedCompanies },
  { k: "name", label: "Name", fn: (a, b) => a.name.localeCompare(b.name) },
];
const COMMITTEES = (() => {
  const n = new Map();
  for (const c of data.cards) for (const x of committeeKeysOf(c)) n.set(x, (n.get(x) ?? 0) + 1);
  return [{ k: "all", label: "All" }, ...[...n].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([k, v]) => ({ k, label: `${k} (${v})` }))];
})();
const QUERY_KEYS = ["q", "chamber", "party", "committee", "sort"];
const QUERY_DEFAULTS = { q: "", chamber: "all", party: "all", committee: "all", sort: "trades" };

function Members({ focus }) {
  const [qs, setQs] = useQueryState(QUERY_KEYS, QUERY_DEFAULTS);
  const query = qs.q.trim().toLowerCase();
  const cards = useMemo(() => data.cards
    .filter((c) => (qs.chamber === "all" || c.chamber === qs.chamber) && (qs.party === "all" || c.party === qs.party)
      && (qs.committee === "all" || committeeKeysOf(c).includes(qs.committee))
      && (!query || c.name.toLowerCase().includes(query) || c.state.toLowerCase() === query
        || c.rows.some((r) => r.companies.some((x) => x.name.toLowerCase().includes(query) || x.ticker.toLowerCase() === query))))
    .sort((SORTS.find((x) => x.k === qs.sort) ?? SORTS[0]).fn), [qs.chamber, qs.party, qs.committee, qs.sort, query]);
  const filtered = cards.length !== data.cards.length;

  // A click on the grid clears the filters, then scrolls to the member's card and flashes it.
  useEffect(() => {
    if (!focus) return;
    if (filtered) { setQs(QUERY_DEFAULTS); return; }
    document.getElementById(`m-${focus.id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [focus, filtered]);

  return (
    <>
      <div className="ct-filters">
        <InlineSearchInput value={qs.q} onChange={(v) => setQs({ q: v })} placeholder="Search member, state or company" width={260} />
        <SingleSelectChip label="Chamber" options={CHAMBERS} value={qs.chamber} onChange={(v) => setQs({ chamber: v })} />
        <SingleSelectChip label="Party" options={PARTIES} value={qs.party} onChange={(v) => setQs({ party: v })} />
        <SingleSelectChip label="Committee" options={COMMITTEES} value={qs.committee} onChange={(v) => setQs({ committee: v })} />
        <SingleSelectChip label="Sort" options={SORTS} value={qs.sort} onChange={(v) => setQs({ sort: v })} />
      </div>
      <p className="govuk-body-s ct-count" aria-live="polite">
        {filtered ? <>Showing {cards.length} of {data.cards.length} members. <button type="button" className="ct-toggle" onClick={() => setQs(QUERY_DEFAULTS)}>Clear filters</button></> : <>All {data.cards.length} members</>}
      </p>
      <p className="govuk-body-s ct-legend">
        Trades per company, darker means more:
        <span className="ct-chip" style={shade(LEGEND, 1)}>1 to 5</span>
        <span className="ct-chip" style={shade(LEGEND, 6)}>6 to 15</span>
        <span className="ct-chip" style={shade(LEGEND, 16)}>16 or more</span>
      </p>
      {cards.length
        ? <div className="ct-cards">{cards.map((c) => <MemberCard key={c.filerId} card={c} query={query} flash={focus?.id === c.filerId ? focus.n : 0} />)}</div>
        : <p className="govuk-body">No members match. <button type="button" className="ct-toggle" onClick={() => setQs(QUERY_DEFAULTS)}>Clear filters</button></p>}
    </>
  );
}

const LEGEND = "#2a78d6";

export default function CommitteeTrades() {
  const [from, to] = data.period;
  const { median, runs, atLeastActual } = data.baseline;
  // n changes on every click, so picking the same member twice scrolls and flashes again.
  const [focus, setFocus] = useState(null);
  const pick = (id) => setFocus((f) => ({ id, n: (f?.n ?? 0) + 1 }));
  return (
    <>
      <h1 className="dk-h1">{data.membersMatched} members of Congress traded stocks in companies their committees oversee</h1>
      <p className="govuk-body-l max-w-3xl">
        Stock trades by members and their families, January 2025 to October 2026. Random committee seats give {median} in a typical run.
      </p>
      <section className="insight-chart-card" aria-label="Members who traded companies their committees oversee">
        <p className="govuk-body-s insight-date">Trades from {day(from)} to {day(to)}</p>
        <GovTabs tabs={[
          { label: "Chart", content: <Grid onPick={pick} /> },
          { label: "Tabular data", content: <MembersTable /> },
          { label: "Download", content: <><p className="govuk-body">All {data.cards.length} members as a CSV: companies traded, companies linked to a committee seat, matched trades and committees.</p><button type="button" className="govuk-button govuk-button--secondary" onClick={download}>Download CSV</button></> },
        ]} />
      </section>

      <h2 className="ct-section" id="members">All {data.membersMatched} members</h2>
      <Members focus={focus} />

      {/* Background for readers who ask what is being counted. The figures are fixed to the period they name. */}
      <section className="ct-about">
        <h2>About the data</h2>
        <ul>
          <li>These are stock trades that members of Congress reported for themselves, their spouses and their children from {day(from)} to {day(to)}, taken from <a className="govuk-link" href="https://disclosures-clerk.house.gov/FinancialDisclosure" target="_blank" rel="noreferrer">House</a> and <a className="govuk-link" href="https://efdsearch.senate.gov/" target="_blank" rel="noreferrer">Senate</a> disclosure filings.</li>
          <li>Only trades in individual companies count. Funds, ETFs and municipal bonds are left out, and so are filings reported twice.</li>
          <li>A trade is linked to a committee when the member sat on it that day and the committee oversees the company's main business. Tax committees only count through their health panels, which oversee Medicare, and only for drug, device, insurance and care companies. We also link defence and government contractors paid $100M or more by an agency the committee oversees, per <a className="govuk-link" href="https://www.usaspending.gov/" target="_blank" rel="noreferrer">USAspending</a>, and companies whose CEO testified before it.</li>
          <li>We sorted companies into committees using SEC industry codes and each committee's written remit, with an AI model doing the first pass.</li>
          <li>Filings give value ranges, not exact amounts, so we count trades rather than dollars.</li>
          <li>Is {data.membersMatched} a lot? We handed out the same committee seats at random {runs} times. A typical run gives {median} members, and {atLeastActual} of the {runs} runs gave {data.membersMatched} or more.</li>
          <li>The asterisks mark trades made within a year of a House Oversight letter to the company, for <a className="govuk-link" href="https://oversight.house.gov/release/comer-and-higgins-investigate-cvs-healths-use-of-confidential-patient-information-to-lobby-louisiana-state-legislature/" target="_blank" rel="noreferrer">CVS</a> and <a className="govuk-link" href="https://oversight.house.gov/release/mace-seeks-information-from-uber-on-safety-protocols-to-prevent-sexual-assault-and-misconduct/" target="_blank" rel="noreferrer">Uber</a>.</li>
        </ul>
      </section>
    </>
  );
}
