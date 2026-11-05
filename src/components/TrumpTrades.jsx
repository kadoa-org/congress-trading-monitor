import data from "../static/trump-trades.json";
import { ChartCard, DataTable } from "../kit";
import { ExtLink, fmtInt, HOUSE_FILINGS, Link, SENATE_FILINGS } from "../ui";
import { MonthlyTrades, TopStocks } from "./TradeCharts";

// Trump's trades against Congress, and every stock his accounts traded. A frozen analysis shared with the POTUS Tracker,
// which publishes the same page; the data is built in the datasets repo (services/custom/datasets/trump-trades).
const OGE = "https://www.oge.gov/Web/OGE.nsf/Officials%20Individual%20Disclosures%20Search%20Collection?OpenForm";
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const monthLabel = (m) => `${MONTHS[+m.slice(5) - 1]} ${m.slice(0, 4)}`;
const cell = (v) => (v == null ? "" : /[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));

function download(file, header, rows) {
  const csv = [header.join(","), ...rows.map((r) => r.map(cell).join(","))].join("\n");
  const url = URL.createObjectURL(new Blob([csv + "\n"], { type: "text/csv" }));
  const a = document.createElement("a"); a.href = url; a.download = file; a.click(); URL.revokeObjectURL(url);
}

function Download({ intro, file, header, rows }) {
  return <><p className="govuk-body">{intro}</p><button type="button" className="govuk-button govuk-button--secondary" onClick={() => download(file, header, rows)}>Download CSV</button></>;
}

export default function TrumpTrades() {
  const { totals, months, mix } = data;
  return (
    <>
      <h1 className="dk-h1">Trump&apos;s accounts made more trades than all of Congress combined</h1>
      <p className="govuk-body-l">
        Since January 2025, Trump&apos;s {totals.accounts} accounts made {fmtInt(totals.trump)} trades. All of Congress, families included, made{" "}
        {fmtInt(totals.congress)}.
      </p>
      <ChartCard
        id="months-title"
        title={`His accounts made more trades in ${totals.monthsAhead} of ${months.length} months`}
        description="Disclosed trades per month. August 2026 is faded because its filings may not all be in yet."
        date="January 2025 to August 2026"
        tabs={[
          { label: "Chart", content: <MonthlyTrades months={months} totals={totals} /> },
          {
            label: "Tabular data", short: "Tabular", scroll: true,
            content: (
              <DataTable
                rows={months}
                rowKey={(m) => m.month}
                columns={[
                  { key: "month", header: "Month", render: (m) => monthLabel(m.month) },
                  { key: "trump", header: "Trump's accounts", align: "right", render: (m) => fmtInt(m.trump) },
                  { key: "congress", header: "Congress", align: "right", render: (m) => fmtInt(m.congress) },
                ]}
              />
            ),
          },
          {
            label: "Download",
            content: <Download intro="Disclosed trades per month as a CSV: Trump's accounts and all members of Congress." file="trump-congress-trades-by-month.csv" header={["month", "trump_accounts", "congress"]} rows={months.map((m) => [m.month, m.trump, m.congress])} />,
          },
        ]}
      />
      <ChartCard
        id="stocks-title"
        title="Stocks traded by Trump's accounts"
        description={`${fmtInt(mix.stockTickers)} stocks, none traded more than ${mix.top[0].buy + mix.top[0].sell} times. Outside managers run the accounts, the White House says.`}
        date={`${monthLabel(mix.from)} to ${monthLabel(mix.to)}`}
        tabs={[
          { label: "Chart", content: <TopStocks stocks={mix.all} /> },
          {
            label: "Tabular data", short: "Tabular", scroll: true,
            content: (
              <DataTable
                rows={mix.all}
                rowKey={(r) => r.ticker}
                columns={[
                  { key: "company", header: "Company", render: (r) => <Link to={`/ticker/${encodeURIComponent(r.ticker)}`}>{r.company}</Link> },
                  { key: "ticker", header: "Ticker", render: (r) => r.ticker },
                  { key: "buy", header: "Purchases", align: "right", render: (r) => fmtInt(r.buy) },
                  { key: "sell", header: "Sales", align: "right", render: (r) => fmtInt(r.sell) },
                ]}
              />
            ),
          },
          {
            label: "Download",
            content: <Download intro="Every stock the accounts traded as a CSV, with purchases and sales." file="trump-stocks-traded.csv" header={["company", "ticker", "purchases", "sales"]} rows={mix.all.map((r) => [r.company, r.ticker, r.buy, r.sell])} />,
          },
        ]}
      />
      <section className="insight-about">
        <h2>About the data</h2>
        <ul>
          <li>Trades come from Trump&apos;s filings with the <ExtLink href={OGE}>Office of Government Ethics</ExtLink>: the 2026 annual report, which lists 2025 trades not reported earlier, and every periodic transaction report through August 2026. We count each reported trade. Filings give value ranges, not exact amounts.</li>
          <li>Congress trades come from <ExtLink href={HOUSE_FILINGS}>House</ExtLink> and <ExtLink href={SENATE_FILINGS}>Senate</ExtLink> periodic transaction reports, with amended filings counted once.</li>
          <li>Reported values: ${(totals.trumpLo / 1e9).toFixed(1)}B to ${(totals.trumpHi / 1e9).toFixed(1)}B for Trump&apos;s accounts, ${(totals.congressLo / 1e9).toFixed(1)}B to ${(totals.congressHi / 1e9).toFixed(1)}B for Congress.</li>
          <li>The White House says outside managers run the accounts. The filings do not say who chose each trade, and most are small orders spread across hundreds of stocks on the same day.</li>
          <li>The stocks cover January to May 2026, the latest months whose periodic reports are complete. Trades without a ticker, such as bonds, are left out. Company names are cleaned from the filings.</li>
        </ul>
      </section>
    </>
  );
}
