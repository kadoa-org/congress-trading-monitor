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

export function AboutPage({ title = "About the data", lede, sources, steps, methods, corrections }) {
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

      <section className="dk-about__kadoa" aria-labelledby="about-kadoa">
        <h2 className="dk-about__h3" id="about-kadoa">Built by Kadoa</h2>
        <p className="dk-about__text">
          <a href="https://www.kadoa.com/">Kadoa</a> is the web data layer for finance, building the most reliable public
          datasets for investors. We publish a few datasets like this one for free, because public records should be easy
          to use.
        </p>
        <p className="dk-about__links">
          <a href="https://www.kadoa.com/">How Kadoa works</a>
          <a href="https://www.kadoa.com/datasets">All datasets</a>
        </p>
      </section>

      {corrections && <p className="dk-about__corrections">{corrections}</p>}
    </div>
  );
}
