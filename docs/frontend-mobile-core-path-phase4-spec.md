# Frontend Mobile Core Path Phase 4 Design

> Date: 2026-05-16  
> Status: approved in discussion  
> Scope: phase 4 of the frontend experience roadmap

## Goal

Phase 4 makes the product's core journey genuinely usable on mobile browsers.

Phase 1 protected user effort. Phase 2 improved clarity and workflow efficiency. Phase 3 established a coherent visual-interaction system. Phase 4 should ensure that users can complete the main product flow on a phone without desktop assumptions getting in the way.

The target mobile journey is:

1. add or edit schedule entries
2. write diary content
3. inspect history
4. read analysis
5. use AI chat

## Scope

This phase includes:

1. mobile application shell and navigation
2. safe-area, viewport, scroll-container, and soft-keyboard behavior
3. mobile adaptation of:
   - Schedule
   - Thoughts
   - History
   - Analysis
   - AI chat
4. mobile readability for charts, long reports, and long conversational content
5. mobile-safe handling for dialogs, drawers, toast, and fixed action regions
6. parity checks for light theme, dark theme, and reduced-motion behavior

This phase intentionally excludes:

- a separate mobile brand redesign
- mini-program-specific capabilities
- a full redesign of every page in the product
- browser-only interaction patterns that would make later mini-program migration harder
- over-customized "app-like" embellishments that are not required for task completion

## Delivery Strategy

Phase 4 should follow a container-first path:

1. establish the shared mobile shell and navigation model
2. solve cross-page mobile infrastructure once
3. adapt the highest-risk core pages on top of that foundation
4. close the loop with overlay, long-content, and theme verification

This is preferred over:

- page-by-page mobile patching, which would duplicate keyboard, spacing, and scroll fixes
- a broad desktop-plus-mobile redesign, which would expand scope without serving the current goal

## Mobile Information Architecture

### Navigation Model

Use a hybrid navigation structure:

- bottom navigation for high-frequency primary destinations
- a `More` drawer for lower-frequency destinations

Recommended bottom-navigation destinations:

1. Schedule
2. Thoughts
3. Analysis
4. AI

Recommended drawer destinations:

- History
- Settings
- account and session actions where appropriate

The mobile structure should:

- keep frequent tasks one tap away
- avoid packing too many destinations into the bottom bar
- stay clear enough that a later mini-program version can reuse the same hierarchy

### Shared Mobile Shell

Introduce or formalize a shared mobile shell responsible for:

- top-level layout
- bottom navigation
- page content padding
- safe-area spacing
- mobile breakpoint behavior
- consistent interaction between fixed regions and scrolling content

Core responsibilities should be centralized instead of reimplemented per page.

### Shared Mobile Page Layout

Provide a reusable mobile page layout pattern with:

- stable horizontal padding
- predictable vertical rhythm
- safe bottom spacing above persistent navigation
- one clear scroll container per page where possible
- no reliance on `100vh` assumptions that break under browser chrome or keyboards

## Interaction Principles

1. Desktop may optimize for side-by-side information density; mobile should optimize for sequential task completion.
2. No core task should depend on hover.
3. Keyboard appearance must not hide the active input or the next required action.
4. Fixed regions must not fight with safe areas, drawers, dialogs, or soft keyboards.
5. If a desktop layout becomes hard to understand once compressed, mobile should use a different flow rather than a smaller version of the same flow.
6. Mobile work should preserve the phase-3 system language rather than creating a separate visual universe.

## Page Directions

### Schedule

Mobile adaptation should:

- use a readable single-column form flow
- keep date, time, mood, and note inputs clearly separated
- ensure mood input controls remain legible and touchable
- keep save / cancel / destructive actions visible and reachable with the keyboard open
- avoid dense horizontal arrangements that only work on desktop

### Thoughts

Mobile adaptation should:

- prioritize long-form writing comfort
- keep the editing surface readable during keyboard use
- keep save status, draft recovery, and key actions available without crowding the text area
- ensure long text does not create awkward jumps between editor and fixed controls

### History

Mobile adaptation should:

- preserve a clear `select date -> inspect record -> return` flow
- replace desktop-style side-by-side compression with sequential or layered presentation when needed
- keep calendar interaction, record lists, and record detail understandable on narrow screens

### Analysis

Mobile adaptation should:

- give charts an explicit mobile reading strategy rather than only scaling them down
- reduce simultaneous information density where needed
- keep legends, tooltips, and range controls usable by touch
- make long reports readable through line length, spacing, section hierarchy, and evidence disclosure behavior suitable for narrow screens

### AI Chat

Mobile adaptation should:

- keep the message list and input composer working predictably with soft keyboards
- ensure long answers remain readable
- keep generation, stop, retry, and error states visible and operable
- avoid fixed controls covering the latest assistant response or the user's input

## Overlay and Fixed-Region Rules

Dialogs, drawers, toast, and fixed action regions must be reviewed as part of the mobile system, not as page-local exceptions.

Rules:

- mobile dialogs must remain readable without awkward compression
- when a centered dialog becomes too constrained, use a more suitable mobile presentation such as a bottom sheet
- drawers must account for safe areas
- toast placement must not block the most important next action
- fixed action bars must not overlap bottom navigation or keyboard-driven layouts

## Visual and Theme Principles

Phase 4 should preserve the phase-3 system:

- calm neutral structure
- Seven Sense accents used with purpose
- equivalent hierarchy in light and dark modes
- state semantics that remain legible without relying on hover

Mobile adaptation should not introduce a second styling language.

## Acceptance Criteria

Phase 4 is complete when:

1. users can complete the full mobile core path:
   - add schedule entries
   - write diary content
   - inspect history
   - read analysis
   - use AI chat
2. primary navigation is reachable, understandable, and appropriate for phone use
3. keyboard appearance does not hide active inputs or required next actions
4. fixed bars, dialogs, drawers, and toast do not conflict with safe areas or keyboards
5. charts, long reports, and long chat responses remain genuinely readable on narrow screens
6. core tasks do not depend on hover
7. light theme, dark theme, and reduced-motion behavior remain equivalent in meaning
8. the mobile structure remains compatible with later mini-program migration rather than being overfit to browser-only behavior

## Verification Focus

### Core Journey Review

Verify on representative phone widths:

1. Schedule creation / editing
2. Diary writing
3. History browsing
4. Analysis reading
5. AI conversation

### Mobile Stress Cases

Check:

1. soft keyboard open
2. long-form text
3. long report content
4. long AI responses
5. empty / loading / error states
6. dialogs and drawers
7. safe-area handling
8. reduced-motion
9. light and dark theme parity

### Interaction Review

Confirm:

1. no core path depends on hover
2. scroll ownership is clear
3. page transitions do not cause disruptive jumps
4. bottom navigation and drawer navigation remain understandable
5. important actions remain within comfortable reach

## Completion Definition

Phase 4 is complete when the mobile browser experience is no longer merely "available", but is reliable enough for ordinary daily use across the product's core journey, while keeping the structure simple enough to inform a future mini-program implementation.
