import React from "react";
import { Button, LiveBadge, NavBar, SiteHeader } from "./kit";
import { useRoute } from "./router";
import { Link } from "./ui";

const TABS = [
  { to: "/", label: "Overview", match: "overview" },
  { to: "/filers", label: "Filers", match: "filers" },
  { to: "/tickers", label: "Tickers", match: "tickers" },
  { to: "/trades", label: "Trades", match: "trades" },
  { to: "/about", label: "About", match: "about" },
];

// Kit-based chrome: brand bar + tab navigation. The SPA Link is injected so
// cmd/ctrl-click and client-side routing both work.
function freshness(generatedAt) {
  if (!generatedAt) return "Updated daily";
  const days = Math.floor((Date.now() - Date.parse(generatedAt)) / 86400_000);
  if (days <= 0) return "Updated today";
  if (days === 1) return "Updated yesterday";
  return `Updated ${days}d ago`;
}

export default function Masthead({ stats, onOpenCmdK }) {
  const route = useRoute();

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
        right={
          <span style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <LiveBadge>{freshness(stats?.generatedAt)}</LiveBadge>
            <Button inverse onClick={onOpenCmdK} aria-label="Search (Cmd+K)">
              Search ⌘K
            </Button>
          </span>
        }
      />
      <NavBar
        LinkComponent={Link}
        items={TABS.map((t) => ({ href: t.to, label: t.label, active: activeTab === t.match }))}
      />
    </>
  );
}
