import React, { useMemo, useState } from "react";
import data from "../static/committee-trades.json";
import { DataTable } from "../kit";
import { fmtInt, Link } from "../ui";
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

function SeatGrid({ seats, label, cols }) {
  const matched = seats.filter((s) => s[3] === 2).length;
  return (
    <div className={`ct-chamber ct-chamber--${cols}`}>
      <h3 className="govuk-heading-s ct-chamber__title">{label} <span>· {matched} matched</span></h3>
      <div className="ct-grid" role="img" aria-label={`${label}: ${matched} of ${seats.length} members traded companies their committees oversee`}>
        {seats.map(([name, party, state, status], i) => (
          <i key={i} style={{ background: status === 2 ? PARTY[party] : status === 1 ? TINT[party] : NONE }} title={`${name} (${party}-${state}): ${STATUS[status]}`} />
        ))}
      </div>
    </div>
  );
}

function Grid() {
  return (
    <>
      <div className="ct-chambers">
        <SeatGrid seats={data.grid.house} label="House" cols={52} />
        <SeatGrid seats={data.grid.senate} label="Senate" cols={14} />
      </div>
      <div className="ct-key govuk-body-s">
        <span><i style={{ background: PARTY.D }} /><i style={{ background: PARTY.R }} />Traded companies their committees oversee</span>
        <span><i style={{ background: TINT.D }} /><i style={{ background: TINT.R }} />Traded other stocks</span>
        <span><i style={{ background: NONE }} />No stock trades</span>
      </div>
    </>
  );
}

function download() {
  const q = (s) => `"${String(s).replace(/"/g, '""')}"`;
  const csv = ["member,party,state,chamber,companies_traded,companies_linked_to_committee,matched_trades,committees",
    ...data.members.map((m) => [q(m.name), m.party, m.state, m.chamber, m.companiesTraded, m.linkedCompanies, m.matchedTrades, q(m.committees.join("; "))].join(","))].join("\n");
  const url = URL.createObjectURL(new Blob([csv + "\n"], { type: "text/csv" }));
  const a = document.createElement("a"); a.href = url; a.download = "congress-committee-trades.csv"; a.click(); URL.revokeObjectURL(url);
}

function MembersTable() {
  const [sort, setSort] = useState({ key: "matched", dir: "desc" });
  const rows = useMemo(() => {
    const val = { name: (m) => m.name, companies: (m) => m.companiesTraded, linked: (m) => m.linkedCompanies, matched: (m) => m.matchedTrades }[sort.key];
    return [...data.members].sort((a, b) => { const p = val(a), q = val(b); return (p < q ? -1 : p > q ? 1 : 0) * (sort.dir === "asc" ? 1 : -1); });
  }, [sort]);
  const onSort = (key) => setSort((s) => ({ key, dir: s.key === key && s.dir === "desc" ? "asc" : "desc" }));
  const columns = [
    { key: "name", header: "Member", sortable: true, render: (m) => <><Link to={`/filer/${m.filerId}`}>{m.name}</Link> <span style={{ color: "#505a5f" }}>{m.party}-{m.state}</span></> },
    { key: "committees", header: "Committees", hideBelow: "sm", render: (m) => m.committees.join(", ") },
    { key: "companies", header: "Companies traded", align: "right", sortable: true, hideBelow: "sm", render: (m) => fmtInt(m.companiesTraded) },
    { key: "linked", header: "Linked to a seat", align: "right", sortable: true, render: (m) => fmtInt(m.linkedCompanies) },
    { key: "matched", header: "Trades", align: "right", sortable: true, render: (m) => fmtInt(m.matchedTrades) },
  ];
  return <DataTable rows={rows} columns={columns} rowKey={(m) => m.filerId} sort={sort} onSort={onSort} />;
}

const MAX_CHIPS = 7;
const MAX_ROWS = 4;

function MemberCard({ card }) {
  const probe = card.rows.some((r) => r.companies.some((c) => c.probe));
  return (
    <article className="ct-card">
      <header className="ct-card__header">
        <img src={card.photo} alt="" width="56" height="68" loading="lazy" />
        <div>
          <h3 className="govuk-heading-m ct-card__name"><Link to={`/filer/${card.filerId}`}>{card.name}</Link></h3>
          <p className="govuk-body-s ct-card__role"><span className="ct-dot" style={{ background: PARTY[card.party] }} aria-label={PARTY_NAME[card.party]} />{ROLE[card.chamber]}, {card.party}-{card.state}</p>
        </div>
      </header>
      <div className="ct-card__body">
        <p className="govuk-body ct-card__sum">Traded {fmtInt(card.companiesTraded)} companies, <strong className="ct-mark">{card.linkedCompanies} linked to a committee seat</strong> ({card.matchedTrades} trades)</p>
        {card.rows.slice(0, MAX_ROWS).map((r) => (
          <div key={r.label} className="ct-row">
            <p className="ct-row__label"><b style={{ background: r.colour }} />{r.label}</p>
            <div className="ct-chips">
              {r.companies.slice(0, MAX_CHIPS).map((c) => (
                <Link key={c.ticker} to={`/ticker/${encodeURIComponent(c.ticker)}`} className="ct-chip" style={shade(r.colour, c.trades)} title={`${c.name}: ${c.trades} ${c.trades === 1 ? "trade" : "trades"}`}>{c.name}{c.probe ? "*" : ""}</Link>
              ))}
              {r.companies.length > MAX_CHIPS && <span className="ct-more">+{r.companies.length - MAX_CHIPS} more</span>}
            </div>
          </div>
        ))}
        {card.rows.length > MAX_ROWS && <p className="ct-more">and {card.rows.length - MAX_ROWS} more committee groups</p>}
        {probe && <p className="ct-note">* Traded while the committee was investigating the company</p>}
        <p className="ct-note">{card.owners}</p>
      </div>
    </article>
  );
}

const LEGEND = "#2a78d6";

export default function CommitteeTrades() {
  const [from, to] = data.period;
  const { median, runs, atLeastActual } = data.baseline;
  return (
    <>
      <h1 className="dk-h1">{data.membersMatched} members of Congress traded stocks in companies their committees oversee</h1>
      <p className="govuk-body-l max-w-3xl">
        Stock trades by members and their families, January 2025 to October 2026. Random committee seats give about as many: {median} in a typical run.
      </p>
      <section className="insight-chart-card" aria-label="Members who traded companies their committees oversee">
        <p className="govuk-body-s insight-date">Trades from {day(from)} to {day(to)}</p>
        <GovTabs tabs={[
          { label: "Chart", content: <Grid /> },
          { label: "Tabular data", content: <MembersTable /> },
          { label: "Download", content: <><p className="govuk-body">All {data.members.length} members as a CSV: companies traded, companies linked to a committee seat, matched trades and committees.</p><button type="button" className="govuk-button govuk-button--secondary" onClick={download}>Download CSV</button></> },
        ]} />
      </section>

      <h2 className="govuk-heading-l ct-section">Six of the {data.membersMatched}</h2>
      <p className="govuk-body-s ct-legend">
        Trades per company, darker means more:
        <span className="ct-chip" style={shade(LEGEND, 1)}>1 to 5</span>
        <span className="ct-chip" style={shade(LEGEND, 6)}>6 to 15</span>
        <span className="ct-chip" style={shade(LEGEND, 16)}>16 or more</span>
      </p>
      <div className="ct-cards">
        {data.cards.map((c) => <MemberCard key={c.filerId} card={c} />)}
      </div>

      {/* Background for readers who ask what is being counted. The figures are fixed to the period they name. */}
      <section className="ct-about">
        <h2 className="govuk-heading-m">About the data</h2>
        <ul>
          <li>These are stock trades that members of Congress reported for themselves, their spouses and their children from {day(from)} to {day(to)}, taken from <a className="govuk-link" href="https://disclosures-clerk.house.gov/FinancialDisclosure" target="_blank" rel="noreferrer">House</a> and <a className="govuk-link" href="https://efdsearch.senate.gov/" target="_blank" rel="noreferrer">Senate</a> disclosure filings.</li>
          <li>Only company stocks count. Funds, ETFs and bonds are left out, and so are filings reported twice.</li>
          <li>A trade is linked to a committee when the member sat on it that day and the committee oversees the company's main business. We also link contractors paid $100M or more by an agency the committee oversees, per <a className="govuk-link" href="https://www.usaspending.gov/" target="_blank" rel="noreferrer">USAspending</a>, and companies whose CEO testified before it.</li>
          <li>We sorted companies into committees using SEC industry codes and each committee's written remit, with an AI model doing the first pass.</li>
          <li>Filings give value ranges, not exact amounts, so we count trades rather than dollars.</li>
          <li>Is {data.membersMatched} a lot? We handed out the same committee seats at random {runs} times. A typical run gives {median} members, and {atLeastActual} of the {runs} runs gave {data.membersMatched} or more.</li>
          <li>The asterisks mark trades made within a year of a House Oversight letter to the company, for <a className="govuk-link" href="https://oversight.house.gov/release/comer-and-higgins-investigate-cvs-healths-use-of-confidential-patient-information-to-lobby-louisiana-state-legislature/" target="_blank" rel="noreferrer">CVS</a> and <a className="govuk-link" href="https://oversight.house.gov/release/mace-seeks-information-from-uber-on-safety-protocols-to-prevent-sexual-assault-and-misconduct/" target="_blank" rel="noreferrer">Uber</a>.</li>
        </ul>
      </section>
    </>
  );
}
