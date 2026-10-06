import React, { useEffect } from "react";
import "./about.css";

// The About page every dataset site shares: what it is, how it is made, its sources and method, and who builds it. Sites pass their own content; the Kadoa block is the same everywhere.
// A link to a section's id (/about#lobbying) opens it.
function useOpenHash() {
  useEffect(() => {
    const id = window.location.hash.slice(1);
    const el = id && document.getElementById(id);
    if (el?.tagName === "DETAILS") {
      el.open = true;
      el.scrollIntoView();
    }
  }, []);
}

// Where the dataset CTAs point: the kadoa.com contact form, which opens as "Get this dataset" (ref=live-dataset) or as
// a sample request (ref=sample), and records which dataset and which button the request came from.
export const datasetContactHref = (ref, cta, dataset) =>
  `https://www.kadoa.com/contact/sales?${new URLSearchParams({ ref, cta, ...(dataset ? { dataset } : {}) })}`;

export function AboutPage({ title = "About the data", lede, sources, steps, methods, corrections, dataset }) {
  useOpenHash();
  const sections = [
    ...(sources?.length
      ? [
          {
            id: "sources",
            title: "Sources",
            content: (
              <ul className="dk-about__source-list">
                {sources.map((src) => (
                  <li key={src.href}>
                    <a href={src.href}>{src.name}</a>
                    {src.what && <span>{src.what}</span>}
                  </li>
                ))}
              </ul>
            ),
          },
        ]
      : []),
    ...(methods ?? []).map((m) => ({
      id: m.id ?? m.title.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      title: m.title,
      content: (
        <>
          {(Array.isArray(m.body) ? m.body : [m.body]).map((b) => (
            <p key={b}>{b}</p>
          ))}
          {m.sources?.map(([label, href]) => (
            <p key={href}>
              <a href={href}>{label}</a>
            </p>
          ))}
        </>
      ),
    })),
  ];
  return (
    <div className="dk-about">
      <h1 className="dk-h1">{title}</h1>
      <p className="dk-about__lede">{lede}</p>

      <section className="dk-about__section" aria-labelledby="about-how">
        <h2 className="dk-about__h2" id="about-how">How it works</h2>
        <div className="dk-timeline">
          <ol className="dk-timeline__items">
            {steps.map((s, i) => (
              <li key={s.title} className="dk-timeline__item">
                <h3 className="dk-timeline__heading">
                  {i + 1}. {s.title}
                </h3>
                <p className="dk-timeline__by-line">{s.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {sections.length > 0 && (
        <section className="dk-about__section" aria-labelledby="about-method">
          <h2 className="dk-about__h2" id="about-method">Sources and method</h2>
          <div className="dk-about__methods">
            {sections.map((m) => (
              <details key={m.id} id={m.id} className="dk-about__method">
                <summary>{m.title}</summary>
                <div>{m.content}</div>
              </details>
            ))}
          </div>
        </section>
      )}

      {/* Who builds it, and the way to work with them: license this dataset with delivery, or get one built. */}
      <section className="dk-about__kadoa" aria-labelledby="about-kadoa">
        <h2 className="dk-about__h3" id="about-kadoa">Use Kadoa for your research</h2>
        <p className="dk-about__text">
          <a href="https://www.kadoa.com/">Kadoa</a> is the web data layer for finance, building the most reliable public
          datasets for investors. License this dataset with daily delivery, or get a custom one built for your questions.
        </p>
        <p className="dk-about__actions">
          <a className="dk-cta dk-cta--primary" href={datasetContactHref("live-dataset", "microsite-about", dataset)}>
            Get this dataset <span aria-hidden="true">→</span>
          </a>
          <a className="dk-cta" href={datasetContactHref("sample", "microsite-about", dataset)}>
            Get a custom dataset
          </a>
        </p>
      </section>

      {corrections && <p className="dk-about__corrections">{corrections}</p>}
    </div>
  );
}
