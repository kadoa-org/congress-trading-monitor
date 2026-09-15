import React, { useEffect, useState } from "react";
import CommandPalette from "./components/CommandPalette";
import { SiteFooter } from "./kit";
import Masthead from "./Masthead";
import AboutPage from "./pages/AboutPage";
import FilerPage from "./pages/FilerPage";
import FilersPage from "./pages/FilersPage";
import OverviewPage from "./pages/OverviewPage";
import PrerenderShell from "./PrerenderShell";
import TickerPage from "./pages/TickerPage";
import TickersPage from "./pages/TickersPage";
import TradesPage from "./pages/TradesPage";
import { useRoute } from "./router";
import { usePrerenderReplacement } from "./prerender";
import { fetchData } from "./data";

async function loadAll() {
  const [stats, trades, filers, tickers, scatter, returns, prices, alphaIndex, adminStats] = await Promise.all(
    ["stats", "trades", "filers", "tickers", "scatter", "returns", "prices", "alpha-index", "admin-stats"]
      .map((name) => fetchData(`${import.meta.env.BASE_URL}data/${name}.json`)),
  );

  // Per-filer admin participation. A filer is considered "in" an administration
  // if they have at least one disclosed trade while that admin was sitting.
  // Trump II cabinet members are further flagged with `cabinet: true` — executive
  // branch officials with trades dated on/after 2025-01-20.
  const T2 = "2025-01-20",
    T1S = "2017-01-20",
    T1E = "2021-01-20",
    BIDS = T1E,
    BIDE = T2,
    OBAS = "2009-01-20",
    OBAE = T1S;
  const filerAdmins = new Map(); // id -> Set of admin.k
  for (const t of trades) {
    const d = t.transaction_date;
    if (!d || !t.filer_id) continue;
    if (!filerAdmins.has(t.filer_id)) filerAdmins.set(t.filer_id, new Set());
    const set = filerAdmins.get(t.filer_id);
    if (d >= T2) set.add("trump2");
    else if (d >= BIDS && d < BIDE) set.add("biden");
    else if (d >= T1S && d < T1E) set.add("trump1");
    else if (d >= OBAS && d < OBAE) set.add("obama");
  }

  const decoratedFilers = filers.map((f) => {
    const admins = [...(filerAdmins.get(f.id) || [])];
    const cabinet = f.branch === "executive" && admins.includes("trump2");
    return { ...f, admins, cabinet };
  });
  const filersById = new Map(decoratedFilers.map((f) => [f.id, f]));

  // Decorate returns with photo_url + office + cabinet + admins so leaderboards
  // can render avatars + admin context without each consumer doing its own join.
  const returnsEnriched = returns.map((r) => {
    const f = filersById.get(r.id);
    return f ? { ...r, photo_url: f.photo_url, office: f.office, admins: f.admins, cabinet: f.cabinet } : r;
  });
  return {
    stats,
    trades,
    filers: decoratedFilers,
    tickers,
    scatter,
    returns: returnsEnriched,
    prices,
    alphaIndex,
    adminStats,
    filersById,
  };
}

function LoadingScreen() {
  return <p role="status" className="max-w-[1440px] mx-auto px-4 sm:px-6 py-8">Loading interactive trading data…</p>;
}

const SUFFIX = "Congress Trading Monitor";

// Client-nav title, mirroring the prerendered <title> intent so the browser tab
// and any JS-rendering crawler stay in sync after pushState navigation. The
// prerendered static HTML remains the source of truth for first paint.
function routeTitle(route, data) {
  switch (route.name) {
    case "ticker":
      return `Who Traded ${route.symbol}? Congress Stock Trades | ${SUFFIX}`;
    case "filer": {
      const f = data.filersById.get(route.id);
      return f ? `${f.full_name} Stock Trades | ${SUFFIX}` : `Filer not found | ${SUFFIX}`;
    }
    case "filers":
      return `All Filers | ${SUFFIX}`;
    case "tickers":
      return `Most-Traded Stocks by Congress | ${SUFFIX}`;
    case "trades":
      return `Latest Congressional Stock Trades | ${SUFFIX}`;
    case "about":
      return `About the Data | ${SUFFIX}`;
    default:
      return `Congress & Executive Branch Stock Trades | ${SUFFIX}`;
  }
}

export default function App({ initialPage = null }) {
  const [clientReady, setClientReady] = useState(initialPage !== null);
  const route = useRoute(initialPage?.route);
  const [data, setData] = useState({
    stats: null,
    trades: [],
    filers: [],
    tickers: [],
    scatter: { filers: [], trades: [] },
    returns: [],
    prices: {},
    filersById: new Map((initialPage?.filers ?? []).map((f) => [f.id, f])),
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  usePrerenderReplacement(!loading && !error && route.name !== "filer" && route.name !== "ticker");
  const [cmdkOpen, setCmdkOpen] = useState(false);

  useEffect(() => {
    setClientReady(true);
  }, []);

  useEffect(() => {
    let active = true;
    loadAll().then((d) => {
      if (!active) return;
      setData(d);
      setLoading(false);
    }).catch((cause) => {
      if (!active) return;
      console.error("Failed to load trading data", cause);
      setError(cause);
      setLoading(false);
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [route.name, route.id, route.symbol]);

  // Per-route <head> management. Prerendered pages ship a correct
  // self-referencing canonical, title, and (implicitly) indexable status. But
  // an unknown entity URL — a delisted ticker, a deduped/renamed filer, or a
  // stale inbound link — is served the raw index.html shell via the SPA
  // rewrite: it returns HTTP 200 while inheriting the *homepage* canonical and
  // title, i.e. a soft-404 duplicate Google may index. Fix on the client:
  //   - re-point canonical + title at the current route on every navigation
  //   - noindex,follow entity pages whose key isn't in the loaded data
  // notFound is derived from the already-loaded indexes rather than the page's
  // async fetch state: a ticker in tickers.json always has a detail file and a
  // filer in filers.json is always prerendered, so "key missing from index"
  // is exactly the set of pages that fall through to the raw shell.
  useEffect(() => {
    if (loading || error) return;
    const url = `${window.location.origin}${window.location.pathname}`;

    let link = document.head.querySelector('link[rel="canonical"]');
    if (!link) {
      link = document.createElement("link");
      link.rel = "canonical";
      document.head.appendChild(link);
    }
    link.href = url;

    document.title = routeTitle(route, data);

    const notFound =
      (route.name === "ticker" && !data.tickers.some((t) => t.ticker === route.symbol)) ||
      (route.name === "filer" && !data.filersById.has(route.id));
    let robots = document.head.querySelector('meta[name="robots"]');
    if (notFound) {
      if (!robots) {
        robots = document.createElement("meta");
        robots.name = "robots";
        document.head.appendChild(robots);
      }
      robots.content = "noindex,follow";
    } else if (robots) {
      robots.remove();
    }
  }, [route.name, route.symbol, route.id, loading, error, data.tickers, data.filersById]);

  // Global Cmd+K / Ctrl+K
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCmdkOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (!clientReady) return <PrerenderShell />;

  if ((loading || error) && route.name !== "ticker") {
    return (
      <div className="min-h-screen bg-canvas text-ink">
        <Masthead route={route} stats={null} onOpenCmdK={() => setCmdkOpen(true)} />
        {error ? <div role="alert" className="max-w-[1440px] mx-auto px-4 sm:px-6 py-8">
          <p>Failed to load interactive trading data. Any initial page content shown below remains available.</p>
          <button type="button" className="govuk-button" onClick={() => window.location.reload()}>Reload page</button>
        </div> : <LoadingScreen />}
      </div>
    );
  }

  return (
    // overflow-x-clip: keep any accidental wide element (data tables have their
    // own overflow-x-auto scrollers) from pushing the page wider than the phone
    // viewport, which was eating the container's left gutter on mobile.
    // `clip` (not `hidden`) avoids creating a scroll container that would break
    // sticky positioning.
    <div className="min-h-screen bg-canvas text-ink overflow-x-clip">
      <Masthead route={route} stats={data.stats} onOpenCmdK={() => setCmdkOpen(true)} />
      {route.name === "overview" && <OverviewPage data={data} />}
      {error && <div role="alert" className="max-w-[1440px] mx-auto px-4 sm:px-6 py-4">
        <p>Search and dashboard data could not load.</p>
        <button type="button" className="govuk-button" onClick={() => window.location.reload()}>Reload page</button>
      </div>}
      {/* data.trades already available */}
      {route.name === "filers" && <FilersPage data={data} />}
      {route.name === "tickers" && <TickersPage data={data} />}
      {route.name === "trades" && <TradesPage data={data} />}
      {route.name === "about" && <AboutPage data={data} />}
      {route.name === "filer" && (
        <FilerPage
          key={route.id}
          filerId={route.id}
          filersIndex={data.filers}
          filersById={data.filersById}
          prices={data.prices}
          returns={data.returns}
        />
      )}
      {route.name === "ticker" && <TickerPage key={route.symbol} symbol={route.symbol} filersById={data.filersById} initialData={initialPage?.route.symbol === route.symbol ? initialPage.tickerData : null} />}

      <CommandPalette open={cmdkOpen} onClose={() => setCmdkOpen(false)} filers={data.filers} tickers={data.tickers} />
      <SiteFooter current="congress" />
    </div>
  );
}
