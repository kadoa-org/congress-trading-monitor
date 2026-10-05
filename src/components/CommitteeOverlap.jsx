import React from "react";
import { CommitteeName } from "../committees";
import LobbyEvidenceTable from "./LobbyEvidenceTable";
import { fmtInt, Link, SectionHeader } from "../ui";

// A member's committees, then their stock trades in companies that lobbied on bills sent to those committees, with
// the bill behind each match.
export default function CommitteeOverlap({ oversight }) {
  if (!oversight?.trades) return null;
  const { committees, trades, linked, topLinked } = oversight;
  return (
    <section className="mb-10 max-w-3xl" aria-labelledby="committee-overlap">
      <SectionHeader title={<span id="committee-overlap">Committees</span>} />
      <p className="govuk-body committee-seats">
        <span className="committee-seats__label">Sits on</span>
        {committees.map((c, i) => (
          <span key={c.code} className="committee-seats__item">
            {i > 0 && <span className="committee-seats__sep" aria-hidden="true"> · </span>}
            <CommitteeName full={c.name} />
          </span>
        ))}
      </p>
      {topLinked.length === 0 ? (
        <p className="govuk-body" style={{ color: "#505a5f" }}>
          None of their {fmtInt(trades)} {trades === 1 ? "stock trade" : "stock trades"} since January 2025 was in a company lobbying their committees.
        </p>
      ) : (
        <LobbyEvidenceTable topLinked={topLinked} trades={trades} linked={linked} />
      )}
      <p className="govuk-body-s">
        <Link to="/lobbying">More on lobbying</Link>
      </p>
    </section>
  );
}
