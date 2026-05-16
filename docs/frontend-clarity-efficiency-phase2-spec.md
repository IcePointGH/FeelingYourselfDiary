# Frontend Clarity and Efficiency Phase 2 Design

> Date: 2026-05-16  
> Status: approved in discussion  
> Scope: phase 2 of the frontend experience roadmap

## Goal

Phase 2 improves how quickly users understand the interface and how smoothly they can complete frequent actions.

Phase 1 protected user effort once work had already begun. Phase 2 focuses on what happens before and during ordinary use:

1. users should understand what a page is showing
2. users should see a natural next step when content is absent or loading fails
3. users should move more easily between trends, evidence, and original records
4. frequent actions should begin to feel more efficient without broadening the product scope

## Scope

This phase includes:

1. unified page-state language
2. real-time validation for high-frequency forms
3. stronger date navigation in history
4. trend-to-record continuity in analysis
5. better batch-selection efficiency

This phase intentionally excludes:

- global search
- full keyboard-shortcut system
- visual-system redesign
- mobile layout overhaul
- advanced filters
- new AI capabilities
- export/share workflows

## Design Principles

1. Explain first, accelerate second.
2. Prefer shared interaction language over page-specific one-off fixes.
3. Keep users in their current reasoning flow before sending them elsewhere.
4. Improve existing workflows before introducing new ones.
5. Treat efficiency features as support for core tasks, not as a separate product layer.

## 1. Unified Page-State Language

### Problem

Several pages currently handle empty states, loading states, and errors with different visual and textual conventions. Some pages still rely on plain text placeholders, which explain little and rarely suggest a next step.

### Design

Create a shared state vocabulary with reusable building blocks:

- `EmptyState`
- `InlineErrorState`
- `LoadingBlock`
- `PageLoading`
- `RetryAction`

The goal is not only shared components, but shared semantics.

### Copy rules

Every important empty state should answer:

1. why this area is empty
2. what the user can do next

Errors should distinguish:

1. network or service failure
2. insufficient conditions
3. no available data

Loading should distinguish:

1. first-page load
2. local card or panel refresh
3. user-triggered action feedback

### Priority surfaces

Apply first to:

- `History`
- `Analysis`
- `Schedule`
- `Thoughts`
- `AI Chat`

### Acceptance criteria

- core pages no longer present key empty states as plain unexplained text
- equivalent page states use equivalent visual language and action placement
- users can see an appropriate next action from major empty states
- loading and error states are visually distinct from empty states

## 2. Real-Time Validation for High-Frequency Forms

### Problem

Most form feedback currently appears only at submit time, and field-level problems can be collapsed into generic Toast feedback.

### Design

Add inline validation only for high-certainty, high-frequency rules:

#### Login and registration

- username required
- password required
- password confirmation mismatch on registration

#### Schedule

- title required

#### Diary

- title required
- content required

### Interaction behavior

- show a field error only after the user has interacted with or left the field
- remove or update the error immediately once the input becomes valid
- keep Toasts for submit failures and server-side errors
- do not convert business explanations, such as future-date reminders, into validation errors

### Acceptance criteria

- common field mistakes are visible before submit
- field-level errors are no longer communicated primarily through Toasts
- correcting the input clears the error without requiring resubmission
- business guidance and validation feedback remain separate concepts

## 3. Stronger Date Navigation in History

### Problem

After moving away from the current month, users lack a quick route back to the present day.

### Design

Add a lightweight `今天` action to the calendar header.

Behavior:

- show it when the selected month or date is no longer today
- clicking it returns to the current month
- select today's date
- refresh the detail panel for today
- if today has no record, show today's empty state directly

### Acceptance criteria

- users can return from any browsed month to today in one action
- the selected date and visible details stay synchronized after return
- the control disappears or de-emphasizes when already on today

## 4. Trend-to-Record Continuity in Analysis

### Problem

The analysis page can show trends, but users cannot yet move naturally from a data point to the underlying daily evidence.

### Design

Use a two-step flow:

1. clicking a chart point opens an in-page daily summary
2. the summary includes a clear `查看当天记录` action that routes to `History` on the corresponding date

### Daily summary contents

The summary should include:

- date
- average mood
- record count
- short representative schedule or diary evidence when available
- explicit route to the original records

### Data source

Phase 2 should keep this summary on the frontend side.

When the user selects a chart point:

1. derive the date from the clicked data point
2. request or reuse the existing schedule and diary records for that date
3. compose the summary from those loaded source records

This keeps the first implementation within the current backend contract and avoids introducing a second analysis-specific summary model before it is clearly needed.

### Rationale

This keeps users inside the analytical reading flow first, rather than ejecting them immediately into another page. It also creates a complete path:

`趋势 -> 摘要 -> 原始记录`

### Acceptance criteria

- users can inspect a chart point without leaving analysis immediately
- users can then navigate to the exact corresponding day in history
- the bridge between aggregate trend and original record is explicit
- the summary is built from the same dated source records that the history page would show
- when no underlying record exists, the summary explains that clearly instead of producing a dead end

## 5. Better Batch-Selection Efficiency

### Problem

Batch operations currently require repeated individual clicks, which is slow for users managing many schedule items.

### Design

Keep the existing batch mode and enhance selection behavior:

- ordinary click: toggle one item
- `Shift` click: select a continuous range
- `Ctrl/Cmd` click: preserve existing selection while toggling one item

Retain the current explicit actions:

- select all
- deselect all
- batch complete
- batch delete

### UX requirement

Selection feedback must remain highly visible. The user should always be able to tell:

- which items are selected
- how many are selected
- what action will affect them

### Acceptance criteria

- users can select a continuous range without clicking every item
- users can build a non-contiguous selection predictably
- the selected count always matches the visible set
- existing batch operations continue to work without regression

## Suggested Delivery Order

1. unified page-state language
2. real-time validation for high-frequency forms
3. history `今天` navigation
4. analysis trend-to-record continuity
5. batch-selection efficiency

This order first reduces comprehension cost, then improves continuity, and finally adds efficiency for heavier users.

## Optional Enhancement

Global keyboard shortcuts are not part of the phase-2 acceptance scope.

If pursued later, the only initially justified candidates are:

- `Esc` for dismissing the topmost transient layer
- `Ctrl/Cmd + N` for creating within the current high-frequency page

They should not delay or complicate the phase-2 core.

## Out of Scope

The following are explicitly deferred:

- comprehensive shortcut help or shortcut customization
- redesigning the full visual system
- mobile-first navigation restructuring
- AI capability expansion
- global search
- onboarding
- export and sharing

## Verification Focus

### Manual scenarios

1. open a key page with no data and confirm the empty state explains both status and next step
2. simulate a failed load and confirm retry language and action are available
3. enter invalid schedule and diary fields, confirm errors appear inline before submit
4. browse away from the current month in history, return to today with one click
5. click an analysis data point, inspect its daily summary, then route to the matching history date
6. select schedule items using ordinary click, `Shift`, and `Ctrl/Cmd`, then apply an existing batch action

## Completion Definition

Phase 2 is complete when:

- users can understand key page states without inferring meaning from blank space
- common form mistakes become visible before submit
- history navigation back to the present day is one-step
- analysis can lead users from trend to evidence to source record
- batch operations are materially faster for multi-item workflows
