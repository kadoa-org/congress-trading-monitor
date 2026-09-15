import React from "react";

export default function TradingSkeleton({ label = "Loading trading data…" }) {
  return <div className="max-w-[1440px] mx-auto px-4 sm:px-6 pt-8 pb-16">
    <p role="status" className="govuk-body-s">{label}</p>
    <div aria-busy="true"><div aria-hidden="true" className="ticker-skeleton">
      <div className="ticker-skeleton-bar ticker-skeleton-title" />
      <div className="ticker-skeleton-bar ticker-skeleton-subtitle" />
      <dl className="govuk-summary-list ticker-skeleton-summary">
        {Array.from({ length: 5 }, (_, i) => <div className="govuk-summary-list__row" key={i}><dt className="govuk-summary-list__key"><span className="ticker-skeleton-bar" /></dt><dd className="govuk-summary-list__value"><span className="ticker-skeleton-bar" /></dd></div>)}
      </dl>
      <div className="ticker-skeleton-chart" />
      {Array.from({ length: 4 }, (_, i) => <div className="ticker-skeleton-row" key={i}><span className="ticker-skeleton-bar" /><span className="ticker-skeleton-bar" /></div>)}
    </div></div>
  </div>;
}
