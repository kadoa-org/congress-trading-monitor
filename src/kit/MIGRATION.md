# Migrating a dataset micropage to data-kit

Battle-tested on congress.kadoa.com and layoffs.kadoa.com. A same-template
Vite/React micropage takes roughly half a day following this. Work on a
branch; the daily data pipeline is untouched by design changes.

## 0. Canonical home & sync

The canonical kit lives in `congress-trading-monitor/src/kit`. Never edit a
vendored copy — change the canonical, then sync every consumer:

```bash
npm run kit:sync   # each consumer repo has this script; add it if missing:
# "kit:sync": "for f in kit.css index.jsx README.md MIGRATION.md; do curl -fsS https://raw.githubusercontent.com/kadoa-org/congress-trading-monitor/main/src/kit/$f -o src/kit/$f; done"
```

If you improved the kit while migrating (this WILL happen): apply the change
to the canonical repo first, push it, then `kit:sync` everywhere, and rebuild
consumers the same day. Two copies drifting for even a day costs more than
the sync ceremony.

## 1. Install

1. `mkdir -p src/kit` and run the sync script (or copy the folder).
2. Import anywhere (`import { ... } from "./kit"`) — CSS loads with it.
3. No Tailwind dependency; coexists with it. React 18+.

## 2. Chrome (30 min)

Replace the app's Masthead/header with:
```jsx
<SiteHeader brand="📊 <Site Name>" LinkComponent={Link} right={
  <span style={{ display: "flex", alignItems: "center", gap: 14 }}>
    <LiveBadge>{freshness(stats?.generatedAt)}</LiveBadge>
    <Button inverse onClick={openSearch}>Search ⌘K</Button>
  </span>
} />
<NavBar LinkComponent={Link} items={tabs} />
```
- `LinkComponent` = the app's SPA link (kit falls back to plain `<a>`).
- `freshness()`: derive from the data's `generatedAt`; fall back to a static
  "Updated daily" only if no timestamp exists.

## 3. Primitives (30 min)

Alias the app's legacy primitives onto the kit so every call site converges
without touching pages: `Pill` → `Tag` (map tones), `SectionHeader` →
`dk-section-head` markup, `Link` → add `dk-link`, `Card` → square
`border-[#b1b4b6] bg-white`, `Segmented` → square rail (32px, `#1d70b8`
active). Check for a SECOND segmented/pill variant — apps drift; grep, don't
pattern-match from another repo.

## 4. Tables (bulk of the work)

Convert every div-grid or bespoke table to `DataTable`:
- Columns are config: `{ key, header, align, width, render, sortable,
  hideBelow, clamp }`.
- Sorting: adapt the app's sort state to `{key, dir}` + `onSort(key)`.
- Delete the separate mobile-card variants — responsive columns replace them.

Rules learned the hard way:
- **Mobile**: mark secondary columns `hideBelow: "sm"` so phones keep only
  the essentials (rank/name/value). Never rely on horizontal scroll for
  ranked lists.
- **Clamp**: the flexible text column gets `clamp: true` AND a proportional
  `width` ("28-35%" typical). Clamp without width truncates on desktop too.
- **No tags inside clamped cells** — they get mid-word ellipsized. Give
  status tags their own column (usually `hideBelow: "sm"`).
- **Never render an "Unknown" tag** — unknown status is a muted `--`, not a
  badge.

## 5. Toolbars

Search inputs → `dk-input` (or `SearchInput`), buttons → `dk-btn`/`Button`,
rows → `Toolbar`. Everything is 32px tall, 1px ink border, 15px text. If a
control is a different height, you missed a variant — grep for `h-7|h-8|
h-9|h-10|rounded`.

## 6. The sweep (do not skip)

The migration is not done after the visible pages. Run:
```bash
grep -rn "rounded-\(md\|lg\|sm\|\[\)" src/ --include="*.jsx"   # geometry violations
grep -rn "h-\(7\|8\|9\|10\)\b" src/ --include="*.jsx"          # rem-height controls
grep -rn "font-size" src/index.css                              # root scaling (see below)
```
- **px, never rem, in controls**: these apps set `html { font-size: 18px }`,
  so Tailwind rem heights are 1.125×. Use `h-[32px]`, not `h-8`.
- De-round everything except `rounded-full` (avatars/dots).
- Loading skeletons too — they must preview the layout they become.

## 7. Review protocol

1. Desktop screenshots of every page. Compare tables side by side — they
   must be indistinguishable in dialect (headers, sizes, colors).
2. Resize to 390px; walk every page. Check: header fits, nav wraps, tables
   show essential columns without horizontal scroll, summary lists compact.
3. Only then: full `npm run build` (prerender must regenerate all routes
   cleanly — titles/canonicals intact), merge, push.

## 8. Charts and visualizations

Keep custom charts (maps, timelines); recolor series to kit palette
(`#1d70b8` blue, `#0f7a52` green, `#ca3535` red) where trivially
parameterized. Square their container cards.
