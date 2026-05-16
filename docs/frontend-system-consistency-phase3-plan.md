# Frontend System Consistency Phase 3 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish a shared Seven Sense visual-interaction system, apply it to the highest-leverage primitives, and use the three mood-input components as the flagship proof of consistency.

**Architecture:** First codify reusable design tokens and motion rules in global styles, then normalize shared primitives and page-level usage before upgrading the mood-input family on top of the same system. Keep this phase focused on semantics and reusable patterns rather than page-specific redesign.

**Tech Stack:** React 19, TypeScript, CSS Modules, global CSS in `index.css` and `shared.css`, existing multi-theme system via `[data-theme='dark']`.

---

## File Map

### New files

- `docs/frontend-system-consistency-phase3-guidelines.md`
  - Implementation-facing rulebook distilled from the phase-3 spec.
- `frontend/src/styles/tokens.css`
  - Shared color roles, surface roles, border roles, motion durations, easing, radii, and focus-ring variables.

### Modified files

- `frontend/src/main.tsx`
  - Import the new token stylesheet once at app startup.
- `frontend/src/index.css`
  - Replace duplicated one-off dark-mode values where appropriate with token-backed semantics.
- `frontend/src/styles/shared.css`
  - Add shared button, card, surface, divider, state, and motion primitives.
- `frontend/src/components/PageState/PageState.module.css`
  - Align empty/error/loading containers with shared card and motion semantics.
- `frontend/src/components/DateInput/DateInput.tsx`
- `frontend/src/components/DateInput/DateInput.module.css`
  - Align focus and interaction feedback with the shared system.
- `frontend/src/components/FeelingSelector/FeelingSelector.tsx`
- `frontend/src/components/FeelingSelector/FeelingSelector.module.css`
  - Upgrade discrete mood selection under the new family rules.
- `frontend/src/components/FeelingSlider/FeelingSlider.tsx`
- `frontend/src/components/FeelingSlider/FeelingSlider.module.css`
  - Upgrade continuous mood interaction under the new family rules.
- `frontend/src/components/FeelingTuner/FeelingTuner.tsx`
- `frontend/src/components/FeelingTuner/FeelingTuner.module.css`
  - Bring the embodied tuner into the same token and state language.
- `frontend/src/components/ScheduleItemCard/ScheduleItemCard.tsx`
- `frontend/src/components/ScheduleItemCard/ScheduleItemCard.module.css`
  - Align interactive-card semantics with the new foundation layer.
- `frontend/src/pages/Schedule/Schedule.css`
- `frontend/src/pages/Thoughts/Thoughts.css`
- `frontend/src/pages/History/History.css`
- `frontend/src/pages/Analysis/Analysis.css`
- `frontend/src/pages/Settings/Settings.css`
- `frontend/src/pages/Login/Login.css`
- `frontend/src/pages/Register/Register.module.css`
  - Replace page-specific primitive styling where it conflicts with the shared system.
- `frontend/src/App.css`
  - Add page-transition utility classes if route-level shells need them.

### Existing docs to keep open

- `docs/frontend-system-consistency-phase3-spec.md`
- `docs/frontend-interaction-optimization.md`
- `frontend/AGENTS.md`

## Delivery Shape

1. Codify the visual language before broad component edits.
2. Unify primitives before upgrading mood inputs.
3. Keep token names semantic rather than page-specific.
4. Apply the system to representative high-frequency surfaces, not every page in the product.
5. Keep reduced-motion and dark-mode parity inside every relevant task instead of deferring them to the end.

---

## Task 1: Document the Operational Visual System

**Files:**
- Create: `docs/frontend-system-consistency-phase3-guidelines.md`

- [ ] **Step 1: Write the implementation-facing guidelines**

  Include concrete rules for:
  - surface levels
  - border strengths
  - button hierarchy
  - Seven Sense color roles
  - selected / hover / focus / disabled states
  - local and page-level motion ranges
  - light / dark equivalence
  - reduced-motion fallback

  Use explicit examples such as:

  ```md
  - `surface-page`: page background
  - `surface-card`: ordinary framed content
  - `surface-inset`: embedded secondary panel
  - `border-subtle`: passive grouping
  - `border-strong`: selected or interactive emphasis
  - `accent-spectrum`: mood-value semantics only
  ```

- [ ] **Step 2: Cross-check the guideline wording against the approved spec**

  Confirm that it preserves:
  - neutral structural base
  - richer but deliberate Seven Sense color roles
  - system-first delivery
  - bounded motion

- [ ] **Step 3: Commit**

  ```bash
  git add docs/frontend-system-consistency-phase3-guidelines.md
  git commit -m "docs: add phase three visual system guidelines"
  ```

---

## Task 2: Introduce Shared Visual Tokens

**Files:**
- Create: `frontend/src/styles/tokens.css`
- Modify: `frontend/src/main.tsx`
- Modify: `frontend/src/index.css`

- [ ] **Step 1: Add semantic CSS custom properties**

  Define light-theme defaults for:

  ```css
  :root {
    --surface-page: #ffffff;
    --surface-card: #ffffff;
    --surface-muted: #fafafa;
    --surface-inset: #f5f5f5;
    --text-strong: #2f2f2f;
    --text-default: #454545;
    --text-muted: #777777;
    --border-subtle: #e8e8e8;
    --border-default: #d0d0d0;
    --border-strong: #a8a8a8;
    --accent-negative-3: #d75772;
    --accent-negative-2: #f5867b;
    --accent-negative-1: #fea979;
    --accent-neutral: #ffe062;
    --accent-positive-1: #3cdfe9;
    --accent-positive-2: #12b8ec;
    --accent-positive-3: #1686ee;
    --focus-ring: rgba(22, 134, 238, 0.22);
    --motion-fast: 140ms;
    --motion-base: 200ms;
    --motion-slow: 320ms;
    --ease-standard: cubic-bezier(0.2, 0, 0, 1);
    --ease-emphasized: cubic-bezier(0.2, 0.8, 0.2, 1);
    --radius-sm: 6px;
    --radius-md: 8px;
    --radius-lg: 12px;
  }
  ```

- [ ] **Step 2: Add dark-theme equivalents**

  Use `[data-theme='dark']` overrides that preserve hierarchy:

  ```css
  [data-theme='dark'] {
    --surface-page: #454545;
    --surface-card: #3d3d3d;
    --surface-muted: #3a3a3a;
    --surface-inset: #343434;
    --text-strong: #f0f0f0;
    --text-default: #e0e0e0;
    --text-muted: #a5a5a5;
    --border-subtle: #4a4a4a;
    --border-default: #555555;
    --border-strong: #777777;
    --focus-ring: rgba(22, 134, 238, 0.3);
  }
  ```

- [ ] **Step 3: Import tokens globally**

  Add the stylesheet import to `frontend/src/main.tsx` before `index.css`.

- [ ] **Step 4: Replace only the highest-leverage literals in `index.css`**

  Start with:
  - body background / text
  - heading text
  - form focus ring
  - dark shared card styles

- [ ] **Step 5: Verify**

  ```bash
  cd frontend
  npm run lint
  npm run build
  ```

- [ ] **Step 6: Commit**

  ```bash
  git add frontend/src/styles/tokens.css frontend/src/main.tsx frontend/src/index.css
  git commit -m "feat: add shared visual tokens"
  ```

---

## Task 3: Build Shared Foundation Primitives

**Files:**
- Modify: `frontend/src/styles/shared.css`
- Modify: `frontend/src/components/PageState/PageState.module.css`

- [ ] **Step 1: Add shared button classes**

  Introduce reusable semantics:

  ```css
  .ui-btn {}
  .ui-btn-primary {}
  .ui-btn-secondary {}
  .ui-btn-quiet {}
  .ui-btn-danger {}
  ```

  Required shared behavior:
  - common radius
  - common focus-visible ring
  - common disabled state
  - common hover / pressed timing
  - consistent icon spacing

- [ ] **Step 2: Add shared surface classes**

  Introduce:

  ```css
  .surface-card {}
  .surface-interactive {}
  .surface-inset {}
  .divider-subtle {}
  ```

  Required behavior:
  - ordinary cards default to softer boundaries
  - interactive cards gain stronger feedback only when needed
  - inset areas visually recede without becoming a nested-card style

- [ ] **Step 3: Add shared state utilities**

  Include:
  - selected
  - focus-visible
  - disabled
  - reduced-motion overrides

- [ ] **Step 4: Align `PageState` styling with the new foundation layer**

  Replace bespoke surface and motion styling with token-backed values.

- [ ] **Step 5: Verify**

  ```bash
  cd frontend
  npm run lint
  npm run build
  ```

- [ ] **Step 6: Commit**

  ```bash
  git add frontend/src/styles/shared.css frontend/src/components/PageState/PageState.module.css
  git commit -m "feat: add shared visual foundation primitives"
  ```

---

## Task 4: Normalize Shared Primitive Consumers

**Files:**
- Modify: `frontend/src/components/DateInput/DateInput.tsx`
- Modify: `frontend/src/components/DateInput/DateInput.module.css`
- Modify: `frontend/src/components/ScheduleItemCard/ScheduleItemCard.tsx`
- Modify: `frontend/src/components/ScheduleItemCard/ScheduleItemCard.module.css`
- Modify: `frontend/src/pages/Login/Login.css`
- Modify: `frontend/src/pages/Register/Register.module.css`
- Modify: `frontend/src/pages/Settings/Settings.css`

- [ ] **Step 1: Bring `DateInput` onto the shared state language**

  Required behavior:
  - token-backed borders and surfaces
  - focus-visible treatment consistent with forms
  - hover weaker than selected / focus

- [ ] **Step 2: Bring `ScheduleItemCard` onto shared interactive-card semantics**

  Required behavior:
  - passive state uses softened boundary
  - hover uses restrained lift / tint
  - selected or editing state uses stronger commitment than hover

- [ ] **Step 3: Replace auth and settings button lookalikes with shared classes**

  Migrate representative buttons in:
  - login
  - register
  - settings

  Keep semantics page-appropriate, but stop local copies from defining their own primitive style.

- [ ] **Step 4: Verify light and dark modes manually**

  Check:
  - same control hierarchy
  - equivalent focus visibility
  - no accidental over-saturation in dark mode

- [ ] **Step 5: Verify**

  ```bash
  cd frontend
  npm run lint
  npm run build
  ```

- [ ] **Step 6: Commit**

  ```bash
  git add frontend/src/components/DateInput frontend/src/components/ScheduleItemCard frontend/src/pages/Login frontend/src/pages/Register frontend/src/pages/Settings
  git commit -m "feat: normalize shared primitive consumers"
  ```

---

## Task 5: Unify Page-Level Usage on Core Surfaces

**Files:**
- Modify: `frontend/src/pages/Schedule/Schedule.css`
- Modify: `frontend/src/pages/Thoughts/Thoughts.css`
- Modify: `frontend/src/pages/History/History.css`
- Modify: `frontend/src/pages/Analysis/Analysis.css`
- Modify: `frontend/src/App.css`

- [ ] **Step 1: Normalize buttons and cards on core pages**

  Focus on:
  - Schedule
  - Thoughts
  - History
  - Analysis

  Replace obvious local deviations in:
  - primary / secondary button appearance
  - card border strength
  - selected / active states

- [ ] **Step 2: Add route-level transition utilities**

  Define consistent classes such as:

  ```css
  .page-enter {}
  .page-enter-active {}
  ```

  or a lightweight equivalent compatible with current routing structure.

  Required behavior:
  - page transition lives within `280-360ms`
  - reduced-motion collapses to no-transform minimal fade

- [ ] **Step 3: Align selected-state semantics**

  Cover at least:
  - tabs
  - calendar selection
  - batch-selection surfaces
  - analysis toggles

- [ ] **Step 4: Verify representative routes**

  Manually inspect:
  1. Schedule
  2. Thoughts
  3. History
  4. Analysis

  In both themes, confirm:
  - cards feel related
  - button hierarchy is stable
  - selected state reads stronger than hover
  - transitions feel like the same system

- [ ] **Step 5: Verify**

  ```bash
  cd frontend
  npm run lint
  npm run build
  ```

- [ ] **Step 6: Commit**

  ```bash
  git add frontend/src/pages/Schedule frontend/src/pages/Thoughts frontend/src/pages/History frontend/src/pages/Analysis frontend/src/App.css
  git commit -m "feat: unify core page interaction styling"
  ```

---

## Task 6: Upgrade the Mood-Input Family

**Files:**
- Modify: `frontend/src/components/FeelingSelector/FeelingSelector.tsx`
- Modify: `frontend/src/components/FeelingSelector/FeelingSelector.module.css`
- Modify: `frontend/src/components/FeelingSlider/FeelingSlider.tsx`
- Modify: `frontend/src/components/FeelingSlider/FeelingSlider.module.css`
- Modify: `frontend/src/components/FeelingTuner/FeelingTuner.tsx`
- Modify: `frontend/src/components/FeelingTuner/FeelingTuner.module.css`

- [ ] **Step 1: Establish shared family rules**

  Apply:
  - the same seven-color spectrum
  - the same selected-state hierarchy
  - the same focus-visible system
  - the same motion tokens
  - the same disabled semantics

- [ ] **Step 2: Upgrade `FeelingSelector`**

  Required behavior:
  - clearer discrete-value selection
  - stronger selected state than hover
  - semantic color accents without noisy full-surface saturation

- [ ] **Step 3: Upgrade `FeelingSlider`**

  Required behavior:
  - smoother progression across the spectrum
  - richer feedback around the active value
  - consistent thumb, track, and focus treatment

- [ ] **Step 4: Upgrade `FeelingTuner`**

  Required behavior:
  - retain richer physicality
  - align its surfaces, focus, and timing with the same family rules
  - avoid becoming a separate visual universe

- [ ] **Step 5: Verify the trio side by side**

  Inspect:
  1. light theme
  2. dark theme
  3. keyboard focus
  4. reduced motion

  Confirm they read as siblings rather than unrelated experiments.

- [ ] **Step 6: Verify**

  ```bash
  cd frontend
  npm run lint
  npm run build
  ```

- [ ] **Step 7: Commit**

  ```bash
  git add frontend/src/components/FeelingSelector frontend/src/components/FeelingSlider frontend/src/components/FeelingTuner
  git commit -m "feat: unify mood input visual language"
  ```

---

## Task 7: End-to-End Visual QA and Spec Closure

**Files:**
- Modify if needed: `docs/frontend-system-consistency-phase3-guidelines.md`
- Verify only elsewhere unless polish fixes are necessary

- [ ] **Step 1: Run the visual QA checklist**

  Check:
  1. buttons across core pages
  2. cards and border strengths across core pages
  3. hover / selected / focus / disabled semantics
  4. route transitions
  5. all three mood-input components
  6. light / dark parity
  7. reduced-motion fallback

- [ ] **Step 2: Compare implementation against the approved spec**

  Confirm direct coverage of:
  - color roles
  - border / card hierarchy
  - shared states
  - motion rules
  - theme equivalence
  - mood-input family consistency

- [ ] **Step 3: Tighten the guideline doc if implementation exposed better wording**

  Only update the guide to reflect deliberate final decisions, not accidental drift.

- [ ] **Step 4: Run final verification**

  ```bash
  cd frontend
  npm run lint
  npm run build
  ```

- [ ] **Step 5: Commit final closure**

  ```bash
  git add docs/frontend-system-consistency-phase3-guidelines.md frontend/src
  git commit -m "chore: verify phase three visual system"
  ```

---

## Risk Notes

1. Token introduction can become a cosmetic refactor if semantics are not defined first.
2. A shared visual system can become bland if Seven Sense color roles are reduced too aggressively.
3. Mood-input controls can drift apart again if each is polished independently after the shared rules are written.
4. Dark mode must be treated as equivalent semantics, not an afterthought or a simple inversion.
5. Page transitions can become performative if they are introduced before the motion rules are clear.
6. Without frontend test infrastructure, manual visual QA is part of delivery, not optional cleanup.

## Spec Coverage Check

- visual tokens and component rules: Tasks 1, 2, 3
- button hierarchy: Tasks 1, 3, 4, 5
- card / border / divider hierarchy: Tasks 1, 3, 4, 5
- shared interaction states: Tasks 1, 3, 4, 5, 6
- motion system: Tasks 1, 2, 3, 5, 6
- mood-input family: Task 6
- light / dark equivalence: Tasks 2, 4, 5, 6, 7
- reduced-motion support: Tasks 1, 3, 5, 6, 7
- future-guidance documentation: Tasks 1, 7
