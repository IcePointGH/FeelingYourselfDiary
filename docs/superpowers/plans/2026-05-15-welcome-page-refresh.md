# Welcome Page Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refresh the welcome page into a warmer, more distinctive Seven Sense landing experience with an emotion orbit hero, product-native preview, and three-part product story.

**Architecture:** Keep the work scoped to the existing Welcome page module. `Welcome.tsx` will define the revised content and semantic structure; `Welcome.css` will own the new visual system, orbit treatment, responsive behavior, and light/dark mode styling. No backend or shared-state changes are needed.

**Tech Stack:** React 19, TypeScript, plain CSS, existing Font Awesome assets, existing theme context and auth context.

---

## File Map

- Modify: `frontend/src/pages/Welcome/Welcome.tsx`
  - Replace the current app-store-style section structure with the new hero, orbit, product slice, and three story sections.
- Modify: `frontend/src/pages/Welcome/Welcome.css`
  - Replace the current page visuals with the updated palette, emotion orbit, product-native surfaces, three-section layouts, responsive rules, and dark-mode variants.

### Task 1: Reframe Welcome Content Structure

**Files:**
- Modify: `frontend/src/pages/Welcome/Welcome.tsx`

- [ ] **Step 1: Replace the hero support data**

Replace the current `productHighlights`, `scenarioExamples`, and `previewItems` constants with content that matches the new story:

```tsx
const orbitItems = [
  { value: '-3', face: KAOMOJI['-3'], tone: 'neg-3' },
  { value: '-2', face: KAOMOJI['-2'], tone: 'neg-2' },
  { value: '-1', face: KAOMOJI['-1'], tone: 'neg-1' },
  { value: '0', face: KAOMOJI['0'], tone: 'zero' },
  { value: '+1', face: KAOMOJI['1'], tone: 'pos-1' },
  { value: '+2', face: KAOMOJI['2'], tone: 'pos-2' },
  { value: '+3', face: KAOMOJI['3'], tone: 'pos-3' },
] as const;

const heroRecords = [
  { time: '09:20', title: '晨间计划', mood: '+2' },
  { time: '14:10', title: '项目会议', mood: '-1' },
  { time: '22:40', title: '睡前日记', mood: '+1' },
] as const;

const storySections = [
  {
    kicker: '记录',
    title: '把发生的事和当时的感受放在一起',
    body: '不只记下今天做了什么，也留下它怎样影响了你。日程、情绪和文字会在同一条时间线上互相解释。',
    kind: 'record',
  },
  {
    kicker: '看见',
    title: '让零散波动慢慢显出轮廓',
    body: '当记录积累起来，趋势、转折和重复出现的片段会变得清楚，不必再只靠模糊记忆判断自己最近过得怎样。',
    kind: 'observe',
  },
  {
    kicker: '理解',
    title: '把感受整理成能回看的线索',
    body: '日记补上数字说不出的部分，AI 帮你复盘模式和变化，让你更容易理解自己，而不是被一次情绪带走。',
    kind: 'reflect',
  },
] as const;
```

- [ ] **Step 2: Replace the current decorative wrapper**

Swap the existing loose decoration block for an orbit-based structure:

```tsx
<div className="welcome-orbit" aria-hidden="true">
  <span className="orbit-weather orbit-sun">☀️</span>
  <span className="orbit-weather orbit-rain">🌧️</span>
  {orbitItems.map((item, index) => (
    <span className={`orbit-face orbit-${item.tone}`} key={item.value} data-index={index}>
      {item.face}
    </span>
  ))}
</div>
```

- [ ] **Step 3: Replace the hero markup**

Use a balanced hero with left-side copy and right-side product slice:

```tsx
<section className="welcome-hero" aria-labelledby="welcome-title">
  <div className="hero-copy">
    <img ... className="welcome-logo" />
    <p className="welcome-eyebrow">Seven Sense</p>
    <h1 id="welcome-title" className="welcome-title">七种颜色，记录一天的起伏</h1>
    <p className="welcome-tagline">
      把日程、情绪和复盘放在一起，让你慢慢看见自己是怎样度过每一天的。
    </p>
    <div className="welcome-spectrum" aria-hidden="true">
      <span /><span /><span /><span /><span /><span /><span />
    </div>
    <div className="welcome-actions">...</div>
  </div>

  <div className="welcome-preview" aria-label="产品预览">
    <div className="preview-sheet">
      <div className="preview-sheet-head">
        <span>今日记录</span>
        <strong>+0.7</strong>
      </div>
      <div className="preview-trend" aria-hidden="true">
        <span /><span /><span /><span /><span />
      </div>
      <div className="preview-records">
        {heroRecords.map(...)}
      </div>
      <div className="preview-insight">
        <span>小七整理</span>
        <p>下午略有下滑，晚间逐渐回稳。</p>
      </div>
    </div>
  </div>
</section>
```

- [ ] **Step 4: Replace the middle-page sections**

Remove the current feature-card, scenario-card, and old story sections. Render the three story sections from `storySections`:

```tsx
<section className="welcome-storyline" aria-label="产品路径">
  {storySections.map((section) => (
    <article className={`story-step story-step--${section.kind}`} key={section.kind}>
      <div className="story-step-copy">
        <span className="section-kicker">{section.kicker}</span>
        <h2>{section.title}</h2>
        <p>{section.body}</p>
      </div>
      <div className="story-step-visual" aria-hidden="true">
        ...
      </div>
    </article>
  ))}
</section>
```

Inside each visual branch, use existing simple HTML shapes only:

```tsx
{section.kind === 'record' && (
  <div className="record-visual">
    <div><span>09:20</span><strong>晨间计划</strong><b>+2</b></div>
    <div><span>14:10</span><strong>项目会议</strong><b>-1</b></div>
    <div><span>22:40</span><strong>睡前日记</strong><b>+1</b></div>
  </div>
)}
{section.kind === 'observe' && (
  <div className="observe-visual">
    <span /><span /><span /><span /><span /><span /><span />
  </div>
)}
{section.kind === 'reflect' && (
  <div className="reflect-visual">
    <small>小七批注</small>
    <p>这周不是一直低落，而是在高压之后更需要恢复时间。</p>
  </div>
)}
```

- [ ] **Step 5: Run frontend verification**

Run:

```bash
cd frontend
npm run lint
npm run build
```

Expected: both commands pass.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/pages/Welcome/Welcome.tsx
git commit -m "feat: restructure welcome page content"
```

### Task 2: Build the New Welcome Visual System

**Files:**
- Modify: `frontend/src/pages/Welcome/Welcome.css`

- [ ] **Step 1: Replace the page background and base tokens**

Define a lighter visual base with dark-mode counterparts:

```css
.welcome-page {
  --welcome-ink: #272727;
  --welcome-muted: #666;
  --welcome-line: rgba(39, 39, 39, 0.12);
  --welcome-soft: #f7f7f5;
  --welcome-paper: #fff;
  min-height: 100dvh;
  background: #fff;
  color: var(--welcome-ink);
}
```

Add dark-mode overrides using `[data-theme='dark']`.

- [ ] **Step 2: Implement the hero and product slice**

Create styles for:

```css
.welcome-hero
.hero-copy
.welcome-title
.welcome-tagline
.welcome-spectrum
.preview-sheet
.preview-sheet-head
.preview-trend
.preview-records
.preview-insight
```

Use border-led surfaces instead of poster gradients. Keep CTA dark in light mode and light in dark mode.

- [ ] **Step 3: Implement the emotion orbit**

Create:

```css
.welcome-orbit
.orbit-face
.orbit-weather
.orbit-neg-3 ... .orbit-pos-3
```

Position seven faces along an implied arc around the hero and give them staggered, slow float animations:

```css
@keyframes orbitDrift {
  0%, 100% { transform: translate3d(0, 0, 0); }
  50% { transform: translate3d(0, -10px, 0); }
}
```

Use explicit top/left/right coordinates per face and matching Seven Sense colors.

- [ ] **Step 4: Implement the three story sections**

Create:

```css
.welcome-storyline
.story-step
.story-step-copy
.story-step-visual
.record-visual
.observe-visual
.reflect-visual
```

Alternate content alignment with restrained borders, whitespace, and focused visual artifacts.

- [ ] **Step 5: Add responsive and reduced-motion behavior**

Add breakpoints so:

- hero becomes one column below `980px`,
- story steps become one column below `860px`,
- orbit shrinks/hides the most peripheral elements below `640px`,
- `prefers-reduced-motion` disables orbit drift and hover motion.

- [ ] **Step 6: Verify light and dark themes**

Run the app and manually inspect:

```bash
cd frontend
npm run dev -- --host localhost
```

Check:
- desktop light
- desktop dark
- mobile light
- mobile dark

Expected:
- no overlap between orbit items and text,
- hero CTA remains clear,
- all three story sections remain legible,
- dark mode does not fall back to the old poster palette.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/pages/Welcome/Welcome.css
git commit -m "style: refresh welcome page visuals"
```

### Task 3: Final Polish and Regression Check

**Files:**
- Modify if needed:
  - `frontend/src/pages/Welcome/Welcome.tsx`
  - `frontend/src/pages/Welcome/Welcome.css`

- [ ] **Step 1: Inspect the page in-browser**

Open:

```text
http://localhost:3000/
```

Check:
- hero reads correctly within the first viewport,
- next section peeks into view on desktop and mobile,
- orbit does not cover CTA or status bar,
- text does not overflow buttons or cards,
- the new page still feels warmer than in-app pages.

- [ ] **Step 2: Make only targeted polish adjustments**

Allowed examples:

```css
.orbit-face { opacity: 0.88; }
.story-step { gap: 36px; }
.preview-sheet { box-shadow: 0 18px 48px rgba(0, 0, 0, 0.08); }
```

Avoid reintroducing:
- generic feature-card grids,
- excessive gradients,
- floating cards nested inside cards.

- [ ] **Step 3: Run final verification**

```bash
cd frontend
npm run lint
npm run build
```

Expected: both commands pass.

- [ ] **Step 4: Commit final polish**

```bash
git add frontend/src/pages/Welcome/Welcome.tsx frontend/src/pages/Welcome/Welcome.css
git commit -m "style: polish welcome page experience"
```

## Self-Review

- Spec coverage:
  - visual refresh, emotion orbit, balanced hero, three-part story, CTA strategy, responsive behavior, reduced motion, and dark mode all map to explicit tasks above.
- Placeholder scan:
  - no `TODO`, `TBD`, or unspecified implementation steps remain.
- Type consistency:
  - `orbitItems`, `heroRecords`, and `storySections` are defined in Task 1 and consumed consistently in later markup.
