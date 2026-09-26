# Xtreme Design System (XDS) v3.0: "Black & Gold"

The look of Xtreme Marketing, taken out of the old single-page stylesheet and turned into one
reusable, token-based system that matches the Xtreme Facilities Management brand.

| File | What it is |
| --- | --- |
| `public/xds.css` | The system itself: tokens, base styles, components, utilities, responsive rules. |
| `design-tokens.json` | The same tokens in W3C Design Tokens format (for Figma, Canva brand kits, other apps). |
| `public/x.js` | The website snippet; its buttons and quote form use the same gold and black. |

## What changed from v2

- **One accent.** Gold carries the brand; green, amber, red and blue only mean status (won, due, overdue, new).
  The cyan "radar" colour, scanlines, dotted grid and sweeping tile shine are gone.
- **Tokens everywhere.** Every colour, size, radius and shadow comes from a named token, so the whole app can
  be re-themed from the top of `xds.css`.
- **Desktop layout.** From 1024px wide the bottom bar becomes a left side rail, content widens to 1120px,
  home tiles go four across and pop-up panels open as centred dialogs.
- **Fixes.** The "+" button now sits in the corner on every screen (v2's page animation trapped it inside the page),
  and home tiles no longer overflow narrow phones.

## Principles

1. **Premium, calm, readable.** Near-black surfaces, warm off-white text, gold used sparingly for what matters.
2. **Colour means something.** Gold = brand and main action. Green = good or won. Amber = due or waiting.
   Red = overdue, lost or delete. Blue = new or informational.
3. **Thumb first.** Controls are at least 48px tall (38px for `.sm`), and everything works one-handed on a phone.
4. **Arabic-ready.** `--font-arabic` (Noto Kufi Arabic) for any right-to-left text.

## Tokens

Primitives (`--x-*`) are the raw palette. Components only use **semantic** tokens.

### Colour

| Token | Value | Use |
| --- | --- | --- |
| `--color-bg` | `#050506` | Page background |
| `--color-surface` | `#111214` | Panels, cards, tiles, sheets |
| `--color-surface-raised` / `-hover` | `#17181b` / `#1e1f23` | Secondary buttons, hover states |
| `--color-field` | `#0a0b0c` | Inputs, segmented controls, inner boxes |
| `--color-border` / `-strong` / `-accent` | `#2a2b30` / `#3a3b42` / gold 35% | Hairlines, hover outlines, gold outlines |
| `--color-text` / `-soft` / `-muted` / `-faint` | `#f6f1e6` / `#d9d1bf` / `#a39c8c` / `#6d6a62` | Text hierarchy |
| `--color-accent` | `#d4af5a` | Brand gold (fills, bars, focus) |
| `--color-accent-text` / `-hi` / `-lo` | `#e2c170` / `#f6de9e` / `#9c7a2e` | Gold text, highlights, gradient end |
| `--gradient-accent` | gold 300 → 500 → 700 | Primary buttons, selected chips, avatar |
| `--color-on-accent` | `#120f08` | Text on gold |
| `--color-ok` / `-warn` / `-err` / `-info` | green / amber / red / blue | Status only |

### Type

Poppins for everything, IBM Plex Mono for numbers and codes, Noto Kufi Arabic for Arabic.
Scale: `3xs` 10.5 · `2xs` 11.5 · `xs` 12.5 · `sm` 13.5 · `md` 14.5 · `base` 16 · `lg` 17 · `xl` 20 · `2xl` 24 · `3xl` 30.
Weights: 400, 500, 600, 700, 800.

### Space, shape, depth, motion

- Space (4px grid): `--space-1` 4 · `2` 8 · `3` 12 · `4` 16 · `5` 20 · `6` 24 · `8` 32 · `10` 40.
- Radius: `sm` 8 · `md` 10 · `lg` 12 · `xl` 16 (panels, tiles) · `2xl` 22 (sheets, sign-in) · `full`.
- Shadow: `sm`, `md` (toasts), `lg` (sheets, nav), `accent` (primary button glow), `ring-focus`.
- Motion: `--dur-fast` .15s, `--dur` .25s, `--dur-slow` .4s with `--ease`. Everything turns off with "reduce motion".
- Layers: sticky 20 · top bar 40 · nav 50 · sheet 200 · zoom 260 · sign-in 300 · toast 400 · splash 500.

## Components

| Component | Markup | Variants |
| --- | --- | --- |
| Button | `<button class="btn">` | `.primary` · `.danger` · `.wa` · `.sm` · `.icon` |
| Panel | `<div class="panel">` / `.hud` | heading `<h3 class="ph">` |
| Home tile | `<button class="tile">` | `.wide`, `.badge`, `.readout` (`.hot`) |
| Row link | `<button class="td">` | icon `<i>` `.red` `.green` `.amber` |
| KPI | `.kpis > .kpi` with `small`, `b`, `span` | `.delta.up/.dn` |
| Choice chip | `<button class="chip" aria-pressed>` | `.n` count |
| Segmented / tabs | `.seg > button[aria-pressed]` | scrolls sideways on narrow phones |
| Switch | `<label class="switch"><input type=checkbox><span class="tg">` | |
| Status pill | `<span class="pill new">` | `new` `contacted` `quoted` `won` `lost` · `idea` `draft` `ready` `posted` · `todo` `submitted` `live-l` `published` |
| Bars | `.hbars > .hb` | lead sources, traffic sources |
| Gauge | `gauge(value,label,size)` in JS | green ≥ 80, amber ≥ 50, red below |
| Score rows | `.score-hero > .score-parts > .sp-row` | `.stack` stacks on phones |
| List row | `.lst` | listings, pages, customers to ask |
| Code box | `<pre class="snippet">`, `.out pre.code-box` | |
| Sheet | `openSheet(title, html)` | bottom sheet on phones, dialog on desktop |
| Toast | `toast(message)` | |

## Rules for new screens

- Use semantic tokens, never raw hex. If a new colour is truly needed, add a primitive and a semantic token.
- Build from existing components first. New components go in `xds.css` under **Components** and in the table above.
- Don't use colour alone to carry meaning: every status pill also has a word.
- Keep `design-tokens.json` in step with `xds.css`.
