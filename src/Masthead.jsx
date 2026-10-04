import React from "react";
import { Button, GitHubButton, LiveBadge, NavBar, SiteHeader } from "./kit";
import { Link } from "./ui";

const TABS = [
  { to: "/", label: "Overview", match: "overview" },
  { to: "/filers", label: "Politicians", match: "filers" },
  { to: "/tickers", label: "Stocks", match: "tickers" },
  { to: "/trades", label: "Trades", match: "trades" },
  { to: "/lobbying", label: "Lobbying", match: "lobbying" },
  { to: "/insights", label: "Insights", match: "insights" },
  { to: "/about", label: "About", match: "about" },
];

// Kit-based chrome: brand bar + tab navigation. The SPA Link is injected so
// cmd/ctrl-click and client-side routing both work.
function freshness(generatedAt, asOf) {
  if (!generatedAt) return "Updated daily";
  const days = Math.floor((asOf - Date.parse(generatedAt)) / 86400_000);
  if (days <= 0) return "Updated today";
  if (days === 1) return "Updated yesterday";
  return `Updated ${days}d ago`;
}

export default function Masthead({ stats, onOpenCmdK, route, asOf }) {

  const activeTab = (() => {
    if (route.name === "filer") return "filers";
    if (route.name === "ticker") return "tickers";
    return route.name;
  })();

  return (
    <>
      <SiteHeader
        brand="🏛️ Congress Trading Monitor"
        LinkComponent={Link}
        brandSuffix={
          <a href="https://www.kadoa.com" target="_blank" rel="noreferrer" className="dk-header-link">
            by Kadoa
          </a>
        }
        right={
          <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <LiveBadge>{freshness(stats?.generatedAt, asOf)}</LiveBadge>
            <GitHubButton repo="kadoa-org/congress-trading-monitor" />
            {/* Icon only on phones, like the GitHub button, so the header stays on one line. */}
            <Button inverse onClick={onOpenCmdK} aria-label="Search (Cmd+K)">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" />
              </svg>
              <span className="dk-btn-label">Search ⌘K</span>
            </Button>
          </span>
        }
      />
      <NavBar collapse
        LinkComponent={Link}
        items={TABS.map((t) => ({ href: t.to, label: t.label, end: t.match === "about", active: activeTab === t.match }))}
      />
    </>
  );
}
