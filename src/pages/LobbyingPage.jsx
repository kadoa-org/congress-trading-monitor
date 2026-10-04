import React from "react";
import LobbyingOverview from "../components/LobbyingOverview";

// Top-level Lobbying tab: members' trades in companies that lobby their committees.
export default function LobbyingPage({ data }) {
  return (
    <div className="dk-container">
      <main className="govuk-main-wrapper" id="main-content">
        {data.oversight ? <LobbyingOverview oversight={data.oversight} /> : <h1 className="dk-h1">Lobbying</h1>}
      </main>
    </div>
  );
}
