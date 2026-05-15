# Analysis Archive Visual System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the Analysis AI flow and structured report UI into a coherent Seven Sense “personal mood archive” experience with monochrome-first styling, restrained Seven Sense accents, and archive-specific symbols.

**Architecture:** Keep the existing structured-report data model and `useAiAnalysis` state machine intact. Replace the current letter metaphor with archive-specific presentation components and re-style the Analysis control surface plus report modules so progress, reveal, and report all share one visual language.

**Tech Stack:** React 19, TypeScript, Vite, plain CSS, existing Font Awesome loading, existing `useAiAnalysis` hook, existing report DTOs.

---

## File Map

- Modify `frontend/src/pages/Analysis/Analysis.tsx`
  - Update visible labels and wire the page to archive terminology.
- Modify `frontend/src/pages/Analysis/Analysis.css`
  - Re-style top controls, AI stats, and dark mode toward the monochrome archive system.
- Modify `frontend/src/pages/Analysis/StagedProgress.tsx`
  - Replace letter-oriented progress copy with archive-oriented copy.
- Modify `frontend/src/pages/Analysis/StagedProgress.css`
  - Re-style progress visuals to match the archive system.
- Rename / replace `frontend/src/pages/Analysis/LetterReveal.tsx`
  - Convert the reveal metaphor from letter envelope to archive sleeve.
- Rename / replace `frontend/src/pages/Analysis/LetterReveal.css`
  - Implement archive sleeve visuals and transitions.
- Modify `frontend/src/pages/Analysis/report/StructuredReportView.tsx`
  - Introduce archive header, left rail, indexed body structure, and archive footer.
- Modify `frontend/src/pages/Analysis/report/StructuredReportView.css`
  - Implement archive page layout, report-sheet styling, and entry sequencing.
- Modify `frontend/src/pages/Analysis/report/OverviewCard.tsx`
  - Convert overview from generic hero card into archive cover summary content.
- Modify `frontend/src/pages/Analysis/report/TrendCard.tsx`
  - Reframe trend into a compact “trajectory index” rail module.
- Modify `frontend/src/pages/Analysis/report/PatternCard.tsx`
  - Present patterns as indexed archive entries.
- Modify `frontend/src/pages/Analysis/report/TurningPointCard.tsx`
  - Present turning points as indexed archive entries.
- Modify `frontend/src/pages/Analysis/report/SuggestionCard.tsx`
  - Present suggestions as indexed archive entries.
- Modify `frontend/src/pages/Analysis/report/GentleNote.tsx`
  - Turn final note into the archive footer note.
- Modify `frontend/src/pages/Analysis/report/ReportCard.css`
  - Replace warm report-card styling with shared archive entry primitives.
- Modify `frontend/src/pages/Analysis/report/EvidenceView.tsx`
  - Reframe evidence toggles as archive citations.
- Modify `frontend/src/pages/Analysis/report/EvidenceView.css`
  - Style citations using restrained Seven Sense markers.
- Keep `frontend/src/hooks/useAiAnalysis.ts`
  - Only update comments or phase terminology if required by the reveal rename; behavior should stay unchanged unless a defect is found during implementation.

## Task 1: Establish archive tokens and control-surface styling

**Files:**
- Modify: `frontend/src/pages/Analysis/Analysis.css`
- Modify: `frontend/src/pages/Analysis/Analysis.tsx`

- [ ] **Step 1: Capture the current baseline**

Run:

```bash
cd frontend
npm run lint
npm run build
```

Expected:

- `lint` passes.
- `build` passes.

- [ ] **Step 2: Add archive design tokens to the Analysis surface**

Update `Analysis.css` so the page defines a local monochrome system and Seven Sense accent variables:

```css
.analysis-page {
  --archive-paper: #ffffff;
  --archive-bg: #f6f6f4;
  --archive-ink: #151515;
  --archive-muted: #676767;
  --archive-line: #d8d8d3;
  --archive-line-strong: #181818;
  --sense-neg-3: #d75772;
  --sense-neg-2: #f5867b;
  --sense-neg-1: #fea979;
  --sense-zero: #ffe062;
  --sense-pos-1: #3cdfe9;
  --sense-pos-2: #12b8ec;
  --sense-pos-3: #1686ee;
}
```

Then re-style:

- `.analysis-control-card`
- `.tab-bar`
- `.tab-btn`
- `.analyze-row`
- `.analyze-btn`
- `.view-toggle-btn`
- `.ai-stats`

Target behavior:

- white surfaces
- black / gray borders and dividers
- black primary button
- restrained spacing
- no warm brown gradients

- [ ] **Step 3: Update visible control-copy in `Analysis.tsx`**

Replace user-facing labels so the page reads as one archive system:

```tsx
const tabLabels: Record<TabType, string> = {
  daily: '日',
  weekly: '周',
  monthly: '月',
  full: '全部',
};
```

Use report-oriented action labels:

```tsx
{loading || s.loading ? '分析中...' : viewMode === 'ai' ? '生成报告' : '图表分析'}
```

Keep the existing chart/AI mode behavior unchanged.

- [ ] **Step 4: Verify**

Run:

```bash
cd frontend
npm run lint
npm run build
```

Expected:

- both commands pass
- control surface is monochrome-first and visually consistent with the archive prototype

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/Analysis/Analysis.tsx frontend/src/pages/Analysis/Analysis.css
git commit -m "style: align analysis controls with archive system"
```

## Task 2: Convert staged progress from “letter” to “archive”

**Files:**
- Modify: `frontend/src/pages/Analysis/StagedProgress.tsx`
- Modify: `frontend/src/pages/Analysis/StagedProgress.css`

- [ ] **Step 1: Replace the staged-copy model**

In `StagedProgress.tsx`, update the stage definitions to:

```tsx
const STAGES = [
  { label: '小七正在调取你的记录', detail: '把日程和日记中的线索整理到一起', icon: 'fa-folder-open' },
  { label: '小七正在比对情绪轨迹', detail: '寻找趋势、转折点和重复出现的感受', icon: 'fa-chart-line' },
  { label: '小七正在整理关键发现', detail: '把洞察归纳成可以阅读的档案条目', icon: 'fa-list-check' },
  { label: '小七正在封存这份档案', detail: '为你归档这段时间的情绪记录', icon: 'fa-box-archive' },
] as const;
```

Also replace the header copy:

```tsx
<p className="staged-kicker">Archive Processing</p>
<h3>{settling ? '档案已经整理好，正在为你封存' : '正在准备你的情绪档案'}</h3>
```

- [ ] **Step 2: Re-style the progress module**

Update `StagedProgress.css` so it uses:

- monochrome rails and borders
- small Seven Sense accent dots only for active / completed states
- square or rounded-square section markers instead of generic rounded icon bubbles
- restrained shadows

Preserve:

- `settling` visual completion behavior
- `prefers-reduced-motion`
- stable layout across all four stages

- [ ] **Step 3: Verify**

Run:

```bash
cd frontend
npm run lint
npm run build
```

Expected:

- commands pass
- final stage still turns completed and remains visible during settling

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/Analysis/StagedProgress.tsx frontend/src/pages/Analysis/StagedProgress.css
git commit -m "style: shift ai progress flow to archive metaphor"
```

## Task 3: Replace letter reveal with archive sleeve reveal

**Files:**
- Modify: `frontend/src/pages/Analysis/LetterReveal.tsx`
- Modify: `frontend/src/pages/Analysis/LetterReveal.css`
- Modify: `frontend/src/pages/Analysis/Analysis.tsx`

- [ ] **Step 1: Update reveal copy without changing behavior**

In `LetterReveal.tsx`, keep the current prop shape but replace user-facing language:

```tsx
aria-label="AI 分析档案"
```

```tsx
<span className="letter-kicker">Seven Sense Archive</span>
<h3 className="letter-title">你的情绪档案已经整理好</h3>
```

```tsx
aria-label="打开档案"
<span>{opening ? '正在打开' : '打开档案'}</span>
```

```tsx
aria-label="直接查看档案"
直接查看
```

- [ ] **Step 2: Convert envelope geometry into sleeve geometry**

In `LetterReveal.css`:

- keep the component filename for minimal churn in this pass
- replace the current envelope-flap styling with archive sleeve styling:
  - rectangular sleeve body
  - closure tab / label strip
  - visible archive sheet preview
  - date-stamp / reviewed-mark detail
- keep opening animation duration within the existing fast interaction range
- preserve reduced-motion short-circuit behavior

- [ ] **Step 3: Update any Analysis labels that still say “letter”**

In `Analysis.tsx`, keep `s.phase === 'letter'` for compatibility with `useAiAnalysis`, but remove letter-specific visible copy where present.

- [ ] **Step 4: Verify**

Run:

```bash
cd frontend
npm run lint
npm run build
```

Expected:

- commands pass
- the completion object visually reads as an archive sleeve
- direct-view and open actions still both transition to report view

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/Analysis/LetterReveal.tsx frontend/src/pages/Analysis/LetterReveal.css frontend/src/pages/Analysis/Analysis.tsx
git commit -m "style: replace ai letter reveal with archive sleeve"
```

## Task 4: Rebuild the structured report shell

**Files:**
- Modify: `frontend/src/pages/Analysis/report/StructuredReportView.tsx`
- Modify: `frontend/src/pages/Analysis/report/StructuredReportView.css`
- Modify: `frontend/src/pages/Analysis/report/GentleNote.tsx`

- [ ] **Step 1: Recompose `StructuredReportView.tsx`**

Refactor the view into:

```tsx
<div className="sr-archive">
  <header className="sr-archive-head">...</header>
  <div className="sr-spectrum">...</div>
  <div className="sr-archive-body">
    <aside className="sr-rail">...</aside>
    <main className="sr-entries">...</main>
  </div>
  <GentleNote text={report.gentleNote} />
</div>
```

Use current report data only:

- title from `report.title`
- overview from `report.overview`
- trend from `report.trend`
- patterns / turning points / suggestions as ordered content

Do not introduce new backend fields.

- [ ] **Step 2: Move trend into the left rail**

Render:

- overview summary in the archive header
- `TrendCard` inside `.sr-rail`
- a short note section in the rail if useful from existing text

- [ ] **Step 3: Add archive-spectrum markup**

Use seven decorative spans only:

```tsx
<div className="sr-spectrum" aria-hidden="true">
  <span />
  <span />
  <span />
  <span />
  <span />
  <span />
  <span />
</div>
```

CSS maps each child to the Seven Sense palette.

- [ ] **Step 4: Re-style `StructuredReportView.css`**

Implement:

- white archive sheet
- strong black header divider
- two-column desktop layout
- stacked mobile layout
- monochrome borders
- indexed entry spacing
- dark-mode equivalent
- existing staggered reveal behavior with reduced-motion fallback

- [ ] **Step 5: Update `GentleNote.tsx`**

Use footer semantics and archive copy, for example:

```tsx
<footer className="gentle-note">
  <span><strong>小七批注：</strong>{text}</span>
  <span className="archive-ref">Archive Ref.</span>
</footer>
```

Keep the final displayed text from the backend unchanged.

- [ ] **Step 6: Verify**

Run:

```bash
cd frontend
npm run lint
npm run build
```

Expected:

- both commands pass
- report shell matches the approved prototype structure

- [ ] **Step 7: Commit**

```bash
git add frontend/src/pages/Analysis/report/StructuredReportView.tsx frontend/src/pages/Analysis/report/StructuredReportView.css frontend/src/pages/Analysis/report/GentleNote.tsx
git commit -m "style: rebuild structured report as archive sheet"
```

## Task 5: Convert report modules into archive entries

**Files:**
- Modify: `frontend/src/pages/Analysis/report/OverviewCard.tsx`
- Modify: `frontend/src/pages/Analysis/report/TrendCard.tsx`
- Modify: `frontend/src/pages/Analysis/report/PatternCard.tsx`
- Modify: `frontend/src/pages/Analysis/report/TurningPointCard.tsx`
- Modify: `frontend/src/pages/Analysis/report/SuggestionCard.tsx`
- Modify: `frontend/src/pages/Analysis/report/ReportCard.css`

- [ ] **Step 1: Re-scope `OverviewCard`**

Reduce `OverviewCard` from a generic hero card into content usable inside the archive header:

- dedicated archive mark
- tone label
- headline
- summary

Remove visual dependency on a generic hero orb.

- [ ] **Step 2: Re-scope `TrendCard`**

Present the trend as a compact left-rail module:

- section marker
- main trend label
- volatility label
- highlight list

Keep all existing defensive fallbacks such as `trend.highlights ?? []`.

- [ ] **Step 3: Convert pattern / turning point / suggestion cards**

Each entry should use a shared archive pattern:

```tsx
<article className="archive-entry">
  <div className="archive-entry-index">ENTRY<span>01</span></div>
  <div className="archive-entry-body">...</div>
</article>
```

Use existing `index` values where already available. Add `index` props only where the parent already has stable iteration order.

- [ ] **Step 4: Rebuild `ReportCard.css`**

Replace:

- warm gradients
- circular decorative hero orb
- unrelated per-card styles

With:

- archive entry primitives
- shared borders
- monochrome typography
- restrained mood-color accents
- consistent spacing
- dark mode support

- [ ] **Step 5: Verify**

Run:

```bash
cd frontend
npm run lint
npm run build
```

Expected:

- commands pass
- report modules visually belong to one system
- suggestions, patterns, and turning points still render their data correctly

- [ ] **Step 6: Commit**

```bash
git add frontend/src/pages/Analysis/report/OverviewCard.tsx frontend/src/pages/Analysis/report/TrendCard.tsx frontend/src/pages/Analysis/report/PatternCard.tsx frontend/src/pages/Analysis/report/TurningPointCard.tsx frontend/src/pages/Analysis/report/SuggestionCard.tsx frontend/src/pages/Analysis/report/ReportCard.css
git commit -m "style: convert report modules into archive entries"
```

## Task 6: Reframe evidence as archive citations

**Files:**
- Modify: `frontend/src/pages/Analysis/report/EvidenceView.tsx`
- Modify: `frontend/src/pages/Analysis/report/EvidenceView.css`

- [ ] **Step 1: Update evidence labels**

Change the language toward citations:

```tsx
查看引用
收起引用
```

Keep the schedule / diary grouping and all current null-safe fallbacks.

- [ ] **Step 2: Restyle the evidence view**

Implement:

- text-link-like trigger
- small reference arrow / footnote mark
- small mood-color dots only where semantically relevant
- nested evidence rows that feel like cited source lines
- dark-mode support

- [ ] **Step 3: Verify**

Run:

```bash
cd frontend
npm run lint
npm run build
```

Expected:

- commands pass
- evidence remains readable and discoverable
- expanded evidence does not visually break archive rhythm

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/Analysis/report/EvidenceView.tsx frontend/src/pages/Analysis/report/EvidenceView.css
git commit -m "style: present report evidence as archive citations"
```

## Task 7: Dark mode, regression pass, and cleanup

**Files:**
- Modify as needed:
  - `frontend/src/pages/Analysis/Analysis.css`
  - `frontend/src/pages/Analysis/StagedProgress.css`
  - `frontend/src/pages/Analysis/LetterReveal.css`
  - `frontend/src/pages/Analysis/report/StructuredReportView.css`
  - `frontend/src/pages/Analysis/report/ReportCard.css`
  - `frontend/src/pages/Analysis/report/EvidenceView.css`

- [ ] **Step 1: Check dark-mode equivalents**

Ensure dark mode has:

- separate background / paper / line values
- enough contrast for black-gray substitutions
- restrained Seven Sense accent colors
- no leftover warm-paper gradients from the previous design

- [ ] **Step 2: Manual UI regression pass**

Run the app and verify these flows:

1. chart mode still works for daily / weekly / monthly
2. AI mode starts from every tab
3. staged progress reaches the final completed state and visibly lingers
4. archive sleeve opens
5. “直接查看” still enters report view
6. report renders with and without optional arrays
7. evidence expands and collapses
8. narrow viewport stacks correctly
9. reduced-motion mode avoids translation-heavy motion
10. dark mode remains legible

- [ ] **Step 3: Final automated verification**

Run:

```bash
cd frontend
npm run lint
npm run build
```

Expected:

- both commands pass

- [ ] **Step 4: Remove temporary implementation scaffolding**

Delete the throwaway prototypes if they are no longer needed:

```bash
git rm --ignore-unmatch frontend/public/archive-analysis-prototype.html frontend/public/visual-richness-prototype.html
```

Expected:

- prototype-only files are not shipped with the production frontend unless intentionally retained.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/Analysis
git add frontend/public/archive-analysis-prototype.html frontend/public/visual-richness-prototype.html
git commit -m "style: finalize archive analysis visual system"
```

## Self-Review

### Spec coverage

- Archive-first visual language -> Tasks 3, 4, 5
- Monochrome control area -> Task 1
- Seven Sense accent usage -> Tasks 1, 4, 5, 6
- Narrative shift from letter to archive -> Tasks 2, 3
- Symbol system -> Tasks 4, 5, 6
- Reader-mark warmth -> Tasks 4, 5
- Motion direction -> Tasks 2, 3, 4, 7
- Dark mode -> Tasks 1, 4, 5, 6, 7

### Placeholder scan

- No `TODO`, `TBD`, or vague “implement later” steps remain.

### Type consistency

- Keeps existing `AiAnalysisState` phases and data model.
- Keeps current report DTO shape.
- Uses current `patterns`, `turningPoints`, `suggestions`, `evidenceSummary`, and `stats` fields.
