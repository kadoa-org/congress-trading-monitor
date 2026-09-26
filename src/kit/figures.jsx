// Headline figures, section headings and chart cards, reverse engineered from the UKHSA data dashboard, which is
// built on the GOV.UK Design System. Shared by every dataset site so the patterns stay identical:
// - a section heading names the measure and its period, then a short italic line, then the date the data runs to;
// - headline figures sit in one grey row, a label, a value and a short note per cell, names before percentages;
// - a change is a GOV.UK tag with an arrow, red for up and green for down unless the caller says otherwise;
// - a chart sits in a grey card with Chart, Tabular data and Download tabs.
import React, { useId, useRef, useState } from "react";
import "./figures.css";

// `good` says which direction is good news: "down" by default (prices, layoffs), "up" for returns or hiring, and
// "none" for counts that are neither, which stay neutral. The arrow and sign carry the direction on their own, so
// the tag never depends on colour.
export function ChangeTag({ value, unit = "%", size, good = "down", children }) {
  if (value === null || value === undefined || !Number.isFinite(value)) return null;
  const dir = value > 0 ? "up" : value < 0 ? "down" : "flat";
  const tone = dir === "flat" || good === "none" ? "flat" : dir === good ? "good" : "bad";
  const arrow = dir === "up" ? "↑" : dir === "down" ? "↓" : "→";
  const abs = Math.abs(value);
  const figure = `${abs.toFixed(abs < 10 ? 1 : 0)}${unit}`;
  return (
    <strong className={`dk-change dk-change--${tone}${size === "small" ? " dk-change--small" : ""}`}>
      <span aria-hidden="true" className="dk-change__arrow">{arrow}</span>
      <span className="dk-visually-hidden">{dir === "up" ? "Up " : dir === "down" ? "Down " : "Unchanged "}</span>
      {children ?? figure}
    </strong>
  );
}

// Title, italic description and date, as UKHSA heads every card. `right` holds a link such as "See all".
export function SectionHeading({ title, description, date, right, as: H = "h2", id }) {
  return (
    <div className="dk-heading">
      <div className="dk-heading__top">
        <H className="dk-heading__title" id={id}>{title}</H>
        {right && <div className="dk-heading__right">{right}</div>}
      </div>
      {description && <p className="dk-heading__desc">{description}</p>}
      {date && <p className="dk-heading__date">{date}</p>}
    </div>
  );
}

// One grey row of headline figures. Each item is { label, value, note?, title? }.
export function KeyFigures({ title, description, date, right, items, label = "Headlines" }) {
  const shown = (items || []).filter(Boolean);
  if (!shown.length) return null;
  return (
    <section className="dk-figures" aria-label={title ? undefined : label}>
      {title && <SectionHeading title={title} description={description} date={date} right={right} />}
      <dl className={`dk-figures__row${shown.length % 2 ? " dk-figures__row--odd" : ""}`} style={{ "--dk-figures-columns": shown.length }}>
        {shown.map((f) => (
          <div className="dk-figures__item" key={typeof f.label === "string" ? f.label : f.key} title={f.title}>
            <dt className="dk-figures__label">{f.label}</dt>
            <dd className="dk-figures__value">{f.value}</dd>
            {f.note && <dd className="dk-figures__note">{f.note}</dd>}
          </div>
        ))}
      </dl>
    </section>
  );
}

// GOV.UK tabs with the design system's keyboard behaviour: arrow keys move between tabs.
export function Tabs({ tabs, initial = 0 }) {
  const [active, setActive] = useState(initial);
  const refs = useRef([]);
  const id = useId();
  const move = (to) => { const next = (to + tabs.length) % tabs.length; setActive(next); refs.current[next]?.focus(); };
  return (
    <div className="dk-tabs">
      <ul className="dk-tabs__list" role="tablist">
        {tabs.map((t, i) => (
          <li key={t.label} className={`dk-tabs__item${i === active ? " dk-tabs__item--selected" : ""}`} role="presentation">
            <button
              ref={(el) => { refs.current[i] = el; }}
              type="button"
              role="tab"
              id={`${id}-tab-${i}`}
              aria-controls={`${id}-panel-${i}`}
              aria-selected={i === active}
              tabIndex={i === active ? 0 : -1}
              className="dk-tabs__tab"
              onClick={() => setActive(i)}
              onKeyDown={(e) => {
                if (e.key === "ArrowRight") { e.preventDefault(); move(i + 1); }
                else if (e.key === "ArrowLeft") { e.preventDefault(); move(i - 1); }
              }}
            >{t.label}</button>
          </li>
        ))}
      </ul>
      {tabs.map((t, i) => (
        <div key={t.label} className="dk-tabs__panel" role="tabpanel" id={`${id}-panel-${i}`} aria-labelledby={`${id}-tab-${i}`} hidden={i !== active}>
          {t.content}
        </div>
      ))}
    </div>
  );
}

// A grey card with a heading and either tabs or plain content in a white panel.
export function ChartCard({ title, description, date, right, tabs, footer, children, id }) {
  return (
    <section className="dk-card" aria-labelledby={id}>
      <SectionHeading title={title} description={description} date={date} right={right} id={id} />
      {tabs ? <Tabs tabs={tabs} /> : <div className="dk-card__panel">{children}</div>}
      {footer && <div className="dk-card__footer">{footer}</div>}
    </section>
  );
}

// "Filter data by" and a GOV.UK select, used in place of segmented buttons for a time window.
export function FilterSelect({ label = "Filter data by", value, options, onChange }) {
  const id = useId();
  return (
    <div className="dk-filter">
      <label className="dk-filter__label" htmlFor={id}>{label}</label>
      <select className="dk-filter__select" id={id} value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </div>
  );
}
