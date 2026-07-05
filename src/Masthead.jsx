import React from "react";
import { Button, NavBar, SiteHeader } from "./kit";
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
          <Button inverse onClick={onOpenCmdK} aria-label="Search (Cmd+K)">
            Search ⌘K
          </Button>
        }
      />
      <NavBar
        LinkComponent={Link}
        items={TABS.map((t) => ({ href: t.to, label: t.label, active: activeTab === t.match }))}
      />
    </>
  );
}
