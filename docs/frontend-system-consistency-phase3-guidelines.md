# Phase 3 Visual System Guidelines

> Implementation-facing rulebook. Distilled from `frontend-system-consistency-phase3-spec.md`.
> When adding or modifying any frontend component, consult this document.

## Quick Reference

| Concern | Token | Light Default | Dark Default |
|---|---|---|---|
| Page background | `--surface-page` | `#ffffff` | `#454545` |
| Card background | `--surface-card` | `#ffffff` | `#3d3d3d` |
| Muted container | `--surface-muted` | `#fafafa` | `#3a3a3a` |
| Inset panel | `--surface-inset` | `#f5f5f5` | `#343434` |
| Heading text | `--text-strong` | `#2f2f2f` | `#f0f0f0` |
| Body text | `--text-default` | `#454545` | `#e0e0e0` |
| Muted text | `--text-muted` | `#777777` | `#a5a5a5` |
| Passive border | `--border-subtle` | `#e8e8e8` | `#4a4a4a` |
| Default border | `--border-default` | `#d0d0d0` | `#555555` |
| Emphasis border | `--border-strong` | `#a8a8a8` | `#777777` |

## 1. Surface Levels

Four defined surface depths. Never introduce ad-hoc card shades.

- **`--surface-page`** — page background. Applied to `body` or page root.
- **`--surface-card`** — ordinary framed content. Cards, modals, panels.
- **`--surface-muted`** — slightly recessed secondary areas. Section headers, muted lists.
- **`--surface-inset`** — embedded sub-panels that need visual recession. Sidebar sections, nested panels.

CSS classes: `surface-card`, `surface-interactive`, `surface-inset` (defined in `shared.css`).

**Rule**: Never stack more than 2 surface levels. A card inside an inset is OK. A card inside a card inside an inset is not.

## 2. Border Strengths

Three levels, from passive to emphatic:

- **`--border-subtle`** — passive structural grouping. Default for cards and dividers.
- **`--border-default`** — standard interactive boundary. Form inputs, default buttons.
- **`--border-strong`** — selected, focused, or emphasis. Active tabs, selected cards.

CSS class: `.divider-subtle` (defined in `shared.css`).

**Rule**: Cards default to `--border-subtle`. Interactive cards may escalate to `--border-default` on hover. Selected cards use `--border-strong`.

## 3. Button Hierarchy

Four levels, defined as CSS classes:

| Class | Visual | When to use |
|---|---|---|
| `.ui-btn-primary` | Filled, `--accent-positive-3` bg + white text | Primary action per view (1 max) |
| `.ui-btn-secondary` | Outlined, `--border-default` border | Secondary actions |
| `.ui-btn-quiet` | No border, text only | Tertiary or inline actions |
| `.ui-btn-danger` | Filled, `--accent-negative-3` bg + white text | Destructive actions (delete, clear) |

All share via `.ui-btn`:
- `border-radius: var(--radius-md)`
- `transition: all var(--motion-fast) var(--ease-standard)`
- `:focus-visible` → `box-shadow: 0 0 0 2px var(--focus-ring)`
- `:disabled` → `opacity: 0.45; pointer-events: none`
- Icon spacing: `gap: 6px`

**Rule**: Page-specific button overrides are forbidden. Use the classes.

## 4. Interaction States (Hierarchy)

Stronger state always wins:

```
rest < hover < focus-visible < active < selected
```

| State | Visual treatment |
|---|---|
| **Rest** | Default styling |
| **Hover** | Slight tint lift / border strengthen (never opacity change alone) |
| **Focus-visible** | `box-shadow: 0 0 0 2px var(--focus-ring)` — always visible, both themes |
| **Active / Pressed** | Slight scale (0.97-0.99) or color deepen |
| **Selected** | Strongest: filled bg, stronger border, or check-mark overlay |
| **Disabled** | `opacity: 0.45`, no pointer-events, no hover effect |

CSS utility classes:
- `.state-selected` — shared selected appearance
- `.state-focus-visible` — keyboard focus ring
- `.state-disabled` — disabled appearance

**Rule**: Selected must always be visibly stronger than hover. If they look the same, the component is wrong.

## 5. Motion System

| Token | Value | Use |
|---|---|---|
| `--motion-fast` | `140ms` | Micro-interactions: hover, press, toggle |
| `--motion-base` | `200ms` | Local transitions: open/close, expand/collapse |
| `--motion-slow` | `320ms` | Page-level: route transitions, modal enter/exit |
| `--ease-standard` | `cubic-bezier(0.2, 0, 0, 1)` | Standard transitions |
| `--ease-emphasized` | `cubic-bezier(0.2, 0.8, 0.2, 1)` | Entry animations, expressive moments |

**Reduced motion**:
```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

**Rule**: Local feedback 120-240ms. Page transitions 280-360ms. No animation over 400ms without explicit reason.

## 6. Seven Sense Color Roles

The seven mood colors are semantic, not decorative:

| Variable | Hex | Role |
|---|---|---|
| `--accent-negative-3` | `#d75772` | Worst mood, danger, delete |
| `--accent-negative-2` | `#f5867b` | Bad mood, warning |
| `--accent-negative-1` | `#fea979` | Slightly bad mood |
| `--accent-neutral` | `#ffe062` | Neutral mood |
| `--accent-positive-1` | `#3cdfe9` | Slightly good mood |
| `--accent-positive-2` | `#12b8ec` | Good mood |
| `--accent-positive-3` | `#1686ee` | Best mood, primary action |

Usage rules:
1. Color appears as dots, lines, chips, small fills, gradients — never broad surface flooding.
2. One dominant chromatic accent per view, with restrained supporting accents.
3. The spectrum is semantic: position on the scale carries meaning.
4. Dark theme: same colors, slightly lifted luminance for readability.

## 7. Focus Ring

```css
--focus-ring: rgba(22, 134, 238, 0.22);   /* light theme */
--focus-ring: rgba(22, 134, 238, 0.30);   /* dark theme (slightly stronger) */
```

Applied via `box-shadow: 0 0 0 2px var(--focus-ring)`. Never use `outline` — it can't be rounded.
Must be visible in both themes. Keyboard-only (`:focus-visible`), not `:focus`.

## 8. Radii

| Token | Value | Use |
|---|---|---|
| `--radius-sm` | `6px` | Small controls: inputs, chips, badges |
| `--radius-md` | `8px` | Buttons, cards, panels |
| `--radius-lg` | `12px` | Modals, large cards, hero sections |

## 9. Component Rules

### Cards
- Default: `--surface-card` bg, `--border-subtle` border, `--radius-md`.
- Interactive cards: add `cursor: pointer`, hover → strengthen to `--border-default`, optional subtle lift.
- Selected cards: `--border-strong` border + subtle bg from accent spectrum.

### Mood Inputs (Family Rules)
- All three share: seven-color spectrum, same state hierarchy, same motion tokens, same focus-visible.
- `FeelingSelector`: discrete choice, stronger selected state.
- `FeelingSlider`: continuous, smooth track gradient, richer active-value feedback.
- `FeelingTuner`: embodied interaction, same color/motion system as siblings.
- They differ in form, not in visual language.

### Page Transitions
- Route transitions live in `App.css` or layout component.
- Duration: `280-360ms` (`--motion-slow` range).
- Reduced motion: collapse to no-transform minimal fade (`opacity` only).

## 10. Light / Dark Equivalence

Not simple inversion. Rules:
- Same hierarchy: selected > hover in both themes.
- Same color roles: accent-negative-3 means the same thing in both themes.
- Text contrast: `--text-default` must meet WCAG AA (4.5:1) in both themes.
- Focus ring: slightly stronger opacity in dark (0.30 vs 0.22) to maintain visibility.
- Borders: dark theme borders are slightly lighter to maintain visibility against dark surfaces.

## 11. File Conventions

- New tokens → `tokens.css`
- Shared component classes → `shared.css`
- Page-specific overrides → page CSS/Module file
- Dark mode overrides → `[data-theme='dark']` block in the same file
- Never duplicate a token value as a raw hex. Use `var(--token-name)`.
