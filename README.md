# Congress Trading Monitor

**Live demo: [kadoa.com/congress](https://www.kadoa.com/congress/)**

Interactive dashboard and open dataset of every stock trade disclosed by U.S. Senators, Representatives, and senior executive branch officials under the STOCK Act.

Three official public sources are aggregated into one unified, searchable dataset: the House Clerk's Financial Disclosure portal, the Senate eFD system, and the Office of Government Ethics (OGE) for the executive branch.

## What's in the data?

- **54,000+ disclosed transactions** from 2012 to present
- **380+ filers** across House, Senate, and executive branch (incl. cabinet officials)
- **$5B+ in estimated notional volume** across stocks, bonds, ETFs, crypto, and other assets
- Transaction-level detail: ticker, asset name, buy/sell, amount range, disclosure latency
- Late-filing flags where the 45-day STOCK Act deadline was missed
- Administration tagging (Obama, Trump I, Biden, Trump II) for cross-term comparisons
- Per-filer and per-ticker drill-downs with return computations against a price join

## Quick start

```bash
bun install && bun run dev
```

Open [http://localhost:5183](http://localhost:5183)

## Features

- **Overview dashboard** with global KPIs, alpha index, cabinet spotlight, and leaderboards
- **Filers page** ranked by activity, volume, late-filing rate, and buy/sell split
- **Tickers page** showing which securities attract the most political money
- **Filter bar** by administration, branch, chamber, party, source, and date range
- **Per-filer and per-ticker pages** with personal timelines and return overlays
- **Command palette** (Cmd+K) for quick navigation between filers and tickers

## Data

All data is served as static JSON in `public/data/` and loaded client-side. No backend required.

## Data sources

All data is parsed from publicly available STOCK Act disclosures — the House Clerk's Financial Disclosure portal, the Senate eFD system, and the Office of Government Ethics for the executive branch. These are public records under the Ethics in Government Act.

We use [kadoa.com](https://kadoa.com) to collect, parse, and normalize the filings at scale. Need the full historical dataset with continuous updates? [Get in touch](https://www.kadoa.com/contact/sales).

## What's next

- LLM-grounded ticker resolver for higher coverage on free-text asset names
- OGE Form 201 request workflow for request-only entries (~80% of OGE filings)
- Senate pre-2015 paper-filing PDFs (currently skipped)
- Net worth and portfolio derivation from annual 278 reports
- Live updates
- Notifications

## License

MIT -- see [LICENSE](LICENSE).

The disclosure data is sourced from public filings and provided for research and educational purposes.
