# Frontend Clarity and Efficiency Phase 2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make core pages easier to understand and frequent workflows easier to complete through unified page states, inline validation, stronger history navigation, analysis-to-record continuity, and better batch selection.

**Architecture:** First establish shared state primitives and copy conventions, then wire those primitives into the highest-impact pages. Keep analysis drill-down frontend-driven by reusing same-date source records rather than expanding backend contracts in this phase.

**Tech Stack:** React 19, TypeScript, React Router DOM 7, existing CSS Modules/shared CSS, existing `useFetch`/`useApi` hooks, existing Recharts analysis stack.

---

## File Map

### New files

- `frontend/src/components/PageState/PageState.tsx`
  - Shared empty/error/loading wrappers and retry action composition.
- `frontend/src/components/PageState/PageState.module.css`
  - Visual treatment for shared states.
- `frontend/src/hooks/useFieldValidation.ts`
  - Small reusable helper for touched-state inline validation.

### Modified files

- `frontend/src/pages/History/History.tsx`
  - Add shared states and `今天` navigation.
- `frontend/src/pages/History/History.css`
  - Style the new date-navigation affordance.
- `frontend/src/pages/Analysis/Analysis.tsx`
  - Use shared page states and host selected-day summary state.
- `frontend/src/pages/Analysis/MoodTrendChart.tsx`
  - Expose data-point selection callbacks.
- `frontend/src/pages/Analysis/MoodSummary.tsx`
  - Render selected-day summary content and source-record bridge.
- `frontend/src/pages/Analysis/Analysis.css`
  - Style selected-day summary and shared-state placements.
- `frontend/src/pages/Schedule/Schedule.tsx`
  - Inline validation, shared empty state, improved batch selection behavior.
- `frontend/src/pages/Schedule/Schedule.css`
  - Batch-selection and inline-validation styling.
- `frontend/src/pages/Thoughts/Thoughts.tsx`
  - Inline validation and shared review empty state.
- `frontend/src/pages/Thoughts/Thoughts.css`
  - Inline-validation styling as needed.
- `frontend/src/pages/Login/Login.tsx`
  - Inline validation for username/password.
- `frontend/src/pages/Register/Register.tsx`
  - Inline validation for username/password/confirm password.
- `frontend/src/pages/AI/ChatView.tsx`
  - Replace bespoke empty/loading expressions where appropriate with shared state language.
- `frontend/src/styles/shared.css`
  - Shared form-error styles if they are used across auth and content forms.

### Existing docs to keep open

- `docs/frontend-clarity-efficiency-phase2-spec.md`
- `docs/frontend-interaction-optimization.md`
- `frontend/AGENTS.md`

## Delivery Shape

1. Build reusable primitives before touching multiple pages.
2. Land comprehension improvements before efficiency improvements.
3. Keep each task independently reviewable and shippable.
4. Do not expand scope into phase-3 visual-system cleanup or phase-4 mobile restructuring.

---

## Task 1: Build Shared Page-State Primitives

**Files:**
- Create: `frontend/src/components/PageState/PageState.tsx`
- Create: `frontend/src/components/PageState/PageState.module.css`

- [ ] **Step 1: Add shared page-state component contracts**

  Implement a typed API:

  ```tsx
  type PageStateAction = {
    label: string;
    onClick: () => void;
  };

  type EmptyStateProps = {
    title: string;
    description: string;
    action?: PageStateAction;
    icon?: string;
  };

  type ErrorStateProps = {
    title: string;
    description: string;
    retry?: PageStateAction;
  };

  type LoadingStateProps = {
    label?: string;
    compact?: boolean;
  };
  ```

- [ ] **Step 2: Implement `EmptyState`, `InlineErrorState`, and `LoadingState`**

  Required behavior:
  - consistent title/body/action stacking
  - support compact inline layout for embedded panels
  - avoid page-specific copy inside the shared components

- [ ] **Step 3: Add visual styles**

  Required behavior:
  - reusable spacing and hierarchy
  - both light and dark theme support
  - no card-within-card nesting when embedded inside existing cards

- [ ] **Step 4: Run frontend verification**

  ```bash
  cd frontend
  npm run lint
  npm run build
  ```

- [ ] **Step 5: Commit**

  ```bash
  git add frontend/src/components/PageState
  git commit -m "feat: add shared page state primitives"
  ```

---

## Task 2: Establish Reusable Inline Validation

**Files:**
- Create: `frontend/src/hooks/useFieldValidation.ts`
- Modify: `frontend/src/styles/shared.css`

- [ ] **Step 1: Add a tiny touched-state validation hook**

  Provide helpers like:

  ```ts
  export function useFieldValidation<T extends Record<string, string>>(
    values: T,
    validators: { [K in keyof T]?: (value: T[K]) => string | null },
  ) {
    // returns touched, errors, touchField, validateAll, hasErrors
  }
  ```

- [ ] **Step 2: Add shared field-error styles**

  Add classes for:
  - field error text
  - invalid input border state
  - compact spacing that works in auth, diary, and schedule forms

- [ ] **Step 3: Verify hook behavior through manual scenarios**

  Confirm:
  - untouched field shows no error
  - blurred invalid field shows an error
  - correcting a field clears the error
  - `validateAll()` reveals missing required fields before submit

- [ ] **Step 4: Run frontend verification**

  ```bash
  cd frontend
  npm run lint
  npm run build
  ```

- [ ] **Step 5: Commit**

  ```bash
  git add frontend/src/hooks/useFieldValidation.ts frontend/src/styles/shared.css
  git commit -m "feat: add shared inline validation helpers"
  ```

---

## Task 3: Upgrade History Page Clarity and Navigation

**Files:**
- Modify: `frontend/src/pages/History/History.tsx`
- Modify: `frontend/src/pages/History/History.css`

- [ ] **Step 1: Replace plain empty copy with shared states**

  Cover:
  - no selected-day records
  - failed month-load or failed day-load states where present

- [ ] **Step 2: Add a `今天` control to the calendar header**

  Required behavior:
  - visible only when month/date is not today
  - restores current month
  - selects today
  - refreshes visible details

- [ ] **Step 3: Keep selected-day and visible details synchronized**

  Ensure the clicked `今天` action updates both navigation and detail content in one flow.

- [ ] **Step 4: Verify history scenarios**

  Manually verify:
  1. empty day shows explanation plus next step
  2. moving to another month reveals `今天`
  3. clicking `今天` returns to current month and today's detail
  4. when today has no records, today's empty state is shown directly

- [ ] **Step 5: Run frontend verification**

  ```bash
  cd frontend
  npm run lint
  npm run build
  ```

- [ ] **Step 6: Commit**

  ```bash
  git add frontend/src/pages/History/History.tsx frontend/src/pages/History/History.css
  git commit -m "feat: improve history states and today navigation"
  ```

---

## Task 4: Add Inline Validation to Core Forms

**Files:**
- Modify: `frontend/src/pages/Schedule/Schedule.tsx`
- Modify: `frontend/src/pages/Thoughts/Thoughts.tsx`
- Modify: `frontend/src/pages/Login/Login.tsx`
- Modify: `frontend/src/pages/Register/Register.tsx`
- Modify as needed: `frontend/src/pages/Schedule/Schedule.css`
- Modify as needed: `frontend/src/pages/Thoughts/Thoughts.css`

- [ ] **Step 1: Wire schedule title validation**

  Required behavior:
  - blank title shows inline error after blur or submit attempt
  - valid title clears the error immediately
  - future-date reminder remains a business explanation, not a validation error

- [ ] **Step 2: Wire diary title/content validation**

  Required behavior:
  - title and content validate independently
  - submit reveals missing fields
  - errors clear during correction

- [ ] **Step 3: Wire auth-form validation**

  Required behavior:
  - login validates username and password required states
  - register validates username, password, and password confirmation mismatch
  - server-side auth failures still use existing message paths

- [ ] **Step 4: Verify form scenarios**

  Manually verify:
  1. untouched fields do not start red
  2. blur reveals required-field errors
  3. correction clears errors immediately
  4. submit attempts reveal untouched invalid required fields
  5. server failures still show separately from field validation

- [ ] **Step 5: Run frontend verification**

  ```bash
  cd frontend
  npm run lint
  npm run build
  ```

- [ ] **Step 6: Commit**

  ```bash
  git add frontend/src/pages/Schedule frontend/src/pages/Thoughts frontend/src/pages/Login frontend/src/pages/Register frontend/src/styles/shared.css frontend/src/hooks/useFieldValidation.ts
  git commit -m "feat: add inline validation to core forms"
  ```

---

## Task 5: Connect Analysis Trends to Daily Evidence

**Files:**
- Modify: `frontend/src/pages/Analysis/Analysis.tsx`
- Modify: `frontend/src/pages/Analysis/MoodTrendChart.tsx`
- Modify: `frontend/src/pages/Analysis/MoodSummary.tsx`
- Modify: `frontend/src/pages/Analysis/Analysis.css`

- [ ] **Step 1: Expose chart-point selection**

  Update `MoodTrendChart` to accept a selection callback such as:

  ```ts
  onSelectDate?: (date: string) => void;
  ```

  Use the chart data point's date as the selection key.

- [ ] **Step 2: Add selected-day state to `AnalysisPage`**

  Required behavior:
  - clicking a data point stores the selected date
  - selection can be cleared
  - selecting a new point replaces the prior summary

- [ ] **Step 3: Load or reuse same-day source records**

  Compose the summary from source records for the selected date:
  - schedule items
  - diary entries

  Keep this within the existing backend contract for phase 2.

- [ ] **Step 4: Render the daily summary**

  Include:
  - date
  - average mood
  - record count
  - representative evidence when available
  - `查看当天记录` action

- [ ] **Step 5: Route to the matching history date**

  Required behavior:
  - route includes the selected date in a form the history page can consume
  - arriving history page shows that exact day

- [ ] **Step 6: Verify analysis scenarios**

  Manually verify:
  1. click a data point and open a daily summary
  2. click another point and replace the summary
  3. click `查看当天记录` and arrive on matching history date
  4. when source records are absent, the summary explains that state instead of appearing broken

- [ ] **Step 7: Run frontend verification**

  ```bash
  cd frontend
  npm run lint
  npm run build
  ```

- [ ] **Step 8: Commit**

  ```bash
  git add frontend/src/pages/Analysis
  git commit -m "feat: connect analysis trends to daily records"
  ```

---

## Task 6: Unify Remaining Core Empty and Loading States

**Files:**
- Modify: `frontend/src/pages/Schedule/Schedule.tsx`
- Modify: `frontend/src/pages/Thoughts/Thoughts.tsx`
- Modify: `frontend/src/pages/Analysis/Analysis.tsx`
- Modify: `frontend/src/pages/AI/ChatView.tsx`

- [ ] **Step 1: Replace remaining plain empty-state text**

  Priority cases:
  - schedule list empty
  - diary review empty
  - analysis no-data state
  - AI empty chat / no session state where the shared language fits

- [ ] **Step 2: Normalize loading and retry expression**

  Replace page-specific loading/error copy where possible with shared state patterns while keeping page-specific content in props.

- [ ] **Step 3: Verify state consistency**

  Check:
  - action placement is predictable
  - copy answers "what happened" and "what next"
  - empty, loading, and error states are visually distinguishable

- [ ] **Step 4: Run frontend verification**

  ```bash
  cd frontend
  npm run lint
  npm run build
  ```

- [ ] **Step 5: Commit**

  ```bash
  git add frontend/src/pages frontend/src/components/PageState
  git commit -m "feat: unify core page states"
  ```

---

## Task 7: Improve Batch Selection Efficiency

**Files:**
- Modify: `frontend/src/pages/Schedule/Schedule.tsx`
- Modify: `frontend/src/pages/Schedule/Schedule.css`

- [ ] **Step 1: Track the last selected anchor**

  Add state for the previous selection anchor so range selection can be calculated predictably.

- [ ] **Step 2: Add modifier-aware selection handling**

  Required behavior:
  - ordinary click toggles one item
  - `Shift` click selects a continuous range
  - `Ctrl/Cmd` click preserves existing selection while toggling one item

- [ ] **Step 3: Keep selected count and visuals synchronized**

  Ensure visual selection, selected ids, and displayed count always agree after:
  - ordinary click
  - shift range selection
  - ctrl/cmd toggling
  - select all
  - deselect all

- [ ] **Step 4: Verify batch scenarios**

  Manually verify:
  1. contiguous range select
  2. non-contiguous select
  3. select all / deselect all after modifier-based selection
  4. existing batch-complete and batch-delete actions still work

- [ ] **Step 5: Run frontend verification**

  ```bash
  cd frontend
  npm run lint
  npm run build
  ```

- [ ] **Step 6: Commit**

  ```bash
  git add frontend/src/pages/Schedule
  git commit -m "feat: improve batch selection efficiency"
  ```

---

## Task 8: End-to-End Phase-2 Regression Pass

**Files:**
- Verify only

- [ ] **Step 1: Run the phase-2 manual checklist**

  1. empty states explain status and next step
  2. failed load offers consistent retry affordance
  3. schedule, diary, login, register inline validation works
  4. history returns to today in one action
  5. analysis point opens summary and routes to the matching history date
  6. modifier-assisted batch selection works without count mismatch

- [ ] **Step 2: Run frontend verification**

  ```bash
  cd frontend
  npm run lint
  npm run build
  ```

- [ ] **Step 3: Review implementation against the spec**

  Confirm direct coverage of:
  - unified page-state language
  - real-time form validation
  - history date navigation
  - analysis trend-to-record continuity
  - batch-selection efficiency

- [ ] **Step 4: Commit final polish if needed**

  ```bash
  git add frontend/src docs/frontend-clarity-efficiency-phase2-spec.md docs/frontend-clarity-efficiency-phase2-plan.md
  git commit -m "chore: verify clarity efficiency phase two"
  ```

---

## Risk Notes

1. Shared page states can become too generic if page-specific copy is flattened; keep semantics shared but copy contextual.
2. Analysis drill-down must use the same-date source records that history uses, or users will see contradictory evidence.
3. Inline validation can become noisy if shown too early; touched-state gating matters.
4. `Shift` range selection depends on stable visible ordering; if sorted items change after selection, recompute carefully.
5. The absence of frontend automated tests makes the manual checklist part of the real delivery, not optional ceremony.

## Spec Coverage Check

- Unified page-state language: Tasks 1, 3, 6
- Real-time validation: Tasks 2, 4
- History `今天` navigation: Task 3
- Analysis trend-to-record continuity: Task 5
- Batch-selection efficiency: Task 7
- Final verification: Task 8

