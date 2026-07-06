# data-kit

Self-contained design system for Kadoa's dataset micropages (congress, layoffs,
quant jobs, potus). GOV.UK-derived idioms (square, 1px rules, yellow
:focus-visible, tint tags) at data-app density.

## Canonical home

This folder in `congress-trading-monitor` is the single source of truth.
Consumers vendor it via `npm run kit:sync` — never edit a vendored copy;
change it here, push, sync all consumers the same day. See MIGRATION.md for
the full migration playbook.

## Reuse in another project (copy-paste, zero deps)

1. Copy this folder (`kit.css` + `index.jsx`) into the target repo.
2. `import { ... } from "./kit"` — importing any component loads the CSS.
3. Requirements: React 18+, any bundler that imports CSS. No Tailwind needed
   (kit CSS is standalone); coexists fine with it.
4. Pass your app's SPA link as `LinkComponent` to `SiteHeader`/`NavBar`.

## Rules that keep it consistent

- **All px, never rem.** Host apps may scale `html { font-size }` (Linear-style);
  px keeps every kit control identical everywhere.
- **Tokens only.** Components read the `--dk-*` custom properties in `kit.css`.
  Change a token, not a component.
- **One control rail.** Inputs/buttons/chips are 32px tall, 1px ink borders,
  15px text. If you add a control, match the rail.
- **Clamp needs width.** A `clamp: true` column must also set a proportional
  `width` ("28-35%"), or desktop truncates too. No tags inside clamped cells
  (they mid-word ellipsize) — status tags get their own `hideBelow` column.
- **Semantic colours are reserved.** Green/red mean positive/negative
  (`.dk-pos`/`.dk-neg`, `Tag` green/red). `TickerTag` and decoration draw from
  the non-semantic hues only.

## Components

| Component | Use |
|---|---|
| `SiteHeader` / `NavBar` | Brand bar + tab navigation chrome |
| `LiveBadge` | Freshness indicator ("Updated today") in the header |
| `Toolbar`, `SearchInput`, `Button` | Aligned filter/search rows |
| `DataTable` | Every table. Config-driven columns, numeric alignment, sorting, empty states |
| `Tag` | Status/category chips (grey/green/red/blue/purple/orange/yellow/teal/slate) |
| `TickerTag` | Stock-symbol chips, hash-stable non-semantic hue, mono glyphs |
| `Section` | Titled content block with hint + right-slot |
| `Stat` / `StatGrid` | KPI panels |
| `Delta` | Green/red numeric wrapper |
