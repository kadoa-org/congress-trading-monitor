import React from "react";
import { useRoute } from "./router";
import { Link } from "./ui";

const TABS = [
  { to: "/", label: "Overview", match: "overview" },
  { to: "/filers", label: "Filers", match: "filers" },
  { to: "/tickers", label: "Tickers", match: "tickers" },
  { to: "/trades", label: "Trades", match: "trades" },
  { to: "/about", label: "About", match: "about" },
];

// GOV.UK-style chrome: black header with service name (crown omitted — it is
// licence-restricted to gov.uk services), service navigation, and a phase
// banner marking this design as an experiment.
export default function Masthead({ stats, onOpenCmdK }) {
  const route = useRoute();

  const activeTab = (() => {
    if (route.name === "filer") return "filers";
    if (route.name === "ticker") return "tickers";
    return route.name;
  })();

  return (
    <>
      <header className="govuk-header" data-module="govuk-header">
        <div className="govuk-header__container govuk-width-container">
          <div
            className="govuk-header__logo"
            style={{
              width: "auto",
              float: "none",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Link to="/" className="govuk-header__link govuk-header__link--homepage">
              <span className="govuk-header__logotype" style={{ fontWeight: 700, color: "#ffffff" }}>
                🏛️ Congress Trading Monitor
              </span>
            </Link>
            <button
              type="button"
              onClick={onOpenCmdK}
              aria-label="Search (Cmd+K)"
              style={{
                background: "none",
                border: "1px solid rgba(255,255,255,0.5)",
                color: "#ffffff",
                font: "inherit",
                fontSize: 16,
                padding: "2px 10px",
                cursor: "pointer",
              }}
            >
              Search ⌘K
            </button>
          </div>
        </div>
      </header>

      <section aria-label="Service information" className="govuk-service-navigation">
        <div className="govuk-width-container">
          <div className="govuk-service-navigation__container">
            <nav aria-label="Menu" className="govuk-service-navigation__wrapper">
              <ul className="govuk-service-navigation__list">
                {TABS.map((t) => {
                  const active = activeTab === t.match;
                  return (
                    <li
                      key={t.to}
                      className={`govuk-service-navigation__item${active ? " govuk-service-navigation__item--active" : ""}`}
                    >
                      <Link
                        to={t.to}
                        className="govuk-service-navigation__link"
                        aria-current={active ? "true" : undefined}
                      >
                        {active ? (
                          <strong className="govuk-service-navigation__active-fallback">{t.label}</strong>
                        ) : (
                          t.label
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>
          </div>
        </div>
      </section>

    </>
  );
}
