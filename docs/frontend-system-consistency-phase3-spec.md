# Frontend System Consistency Phase 3 Design

> Date: 2026-05-16  
> Status: approved in discussion  
> Scope: phase 3 of the frontend experience roadmap

## Goal

Phase 3 establishes a coherent visual and interaction system across the product.

Phase 1 protected user effort. Phase 2 improved clarity and workflow efficiency. Phase 3 should make the interface feel like one designed system rather than a collection of individually improved pages.

The phase has three outputs:

1. a lightweight but executable system specification
2. a unified layer of shared foundations
3. a set of upgraded flagship components that prove the system works in practice

## Scope

This phase includes:

1. visual tokens and component rules
2. button hierarchy
3. card, border, divider, and container hierarchy
4. shared hover, active, selected, focus, and disabled semantics
5. shared motion timing and transition rules
6. unified upgrade of the three mood-input components:
   - `FeelingSelector`
   - `FeelingSlider`
   - `FeelingTuner`
7. equivalent light and dark theme behavior

This phase intentionally excludes:

- mobile layout restructuring
- welcome-page redesign
- another AI-report visual redesign
- new product features
- large new decorative asset sets
- page-by-page total redesign

## Delivery Strategy

Phase 3 should follow a system-first path:

1. define the core language
2. consolidate shared foundations
3. apply the rules to the highest-leverage primitives
4. use the mood-input family as the flagship proof of consistency

This is preferred over:

- upgrading one flagship component first and deriving the rest later, which risks producing another local visual island
- polishing page by page, which risks allowing page-specific exceptions to define the system

## System Layers

### 1. Specification Layer

Create a compact, implementation-facing rule set for:

- color roles
- border strength
- card hierarchy
- button hierarchy
- selected, focus, hover, active, and disabled states
- motion timing and easing
- page-enter and local-feedback transitions
- light-theme and dark-theme equivalence
- `prefers-reduced-motion` fallback behavior

The specification should be concise enough to guide future additions, not a detached brand manual.

### 2. Foundation Layer

Unify the primitives most responsible for cross-page inconsistency:

- buttons
- cards
- borders
- dividers
- selected states
- page-transition rhythm

The goal is not identical appearance everywhere. The goal is stable semantics:

- same hierarchy
- same state language
- same interaction rhythm

### 3. Flagship Validation Layer

Upgrade the three mood-input components as one family:

- `FeelingSelector`
- `FeelingSlider`
- `FeelingTuner`

They may keep different interaction forms, but they should share:

- the same Seven Sense color grammar
- the same focus and selected semantics
- the same motion values
- the same degree of physicality and polish

If these three can look distinct yet clearly related, the system is strong enough to scale.

## Visual Principles

### Structural Base

- black, white, and gray form the structural skeleton
- large areas, typography, spacing, and major containers remain calm and restrained
- cards default to softened boundaries
- stronger borders are reserved for emphasis, segmentation, or clear interactivity
- buttons should be distinguished through hierarchy, fill, border, and semantics rather than ad hoc page-specific recoloring

### Seven Sense Color System

The seven colors are not secondary decoration. They are a core part of the product identity and may play several stable roles:

1. emotion encoding
2. status emphasis
3. interaction focus
4. information layering
5. atmosphere accents

Usage rules:

- use color repeatedly but deliberately
- favor dots, lines, chips, small fills, gradients with clear purpose, and limited accents over broad surface flooding
- preserve a mostly neutral structural base
- usually allow one dominant chromatic accent per view, with restrained supporting accents
- treat the seven colors as a semantic spectrum, not as random rainbow decoration

### Personality Boundary

The product should remain calm, concise, and restrained, but not sterile.

Allowed:

- localized vivid feedback
- richer Seven Sense accents
- slight physicality in key controls
- expressive mood-input interactions

Avoid:

- broad decorative color saturation
- theatrical motion across ordinary pages
- turning all interactions into novelty

## Interaction Principles

1. Similar actions use similar feedback.
2. Selected state must be clearer than hover state.
3. Focus treatment takes priority over decorative styling.
4. Local feedback should usually live in the `120-240ms` range.
5. Page-level transitions should usually live in the `280-360ms` range.
6. Embodied or object-like behavior is reserved for key controls, not generalized across the whole app.
7. Motion should clarify change, not compete with content.

## Theme Principles

### Light Theme

- white remains the main field
- black and gray carry layout structure
- Seven Sense colors provide identity, orientation, and emotional context

### Dark Theme

- dark mode is not simple inversion
- hierarchy, contrast, and interaction meaning should remain equivalent to light mode
- Seven Sense colors may be slightly lifted for readability, but the interface should not become an all-color theme

## Component Direction

### Buttons

Establish a small shared hierarchy, for example:

- primary
- secondary
- quiet / text
- destructive

Rules:

- button type should communicate importance before color does
- hover, pressed, focus, and disabled behavior should be shared
- icon and text spacing should follow one pattern

### Cards and Containers

Establish levels such as:

- page section
- standard card
- interactive card
- inset or supporting panel

Rules:

- page sections should not look like arbitrary repeated floating boxes
- interactive cards may strengthen borders or background only when the interaction requires it
- nested card visuals should remain controlled and rare

### State Language

Create shared visual meaning for:

- hover
- active
- selected
- focus-visible
- disabled

Rules:

- selected state uses stronger commitment than hover
- focus-visible must remain clearly accessible in both themes
- disabled controls should remain legible but unmistakably inactive

### Motion

Unify:

- enter
- exit
- hover feedback
- pressed feedback
- selected-state transition
- page transition

Rules:

- one motion family should cover equivalent interactions
- reduced-motion mode should preserve state clarity without depending on movement

### Mood Inputs

The three mood-input components should form one recognizable family:

- same seven-color logic
- same state semantics
- same motion cadence
- same restraint-to-expression balance

They do not need the same layout or same metaphor.

Expected direction:

- `FeelingSelector`: clearer discrete choice language
- `FeelingSlider`: smoother continuous progression
- `FeelingTuner`: richer embodied interaction, still disciplined by the shared system

## Acceptance Criteria

Phase 3 is complete when:

1. equivalent controls across pages express the same hierarchy and state meaning
2. light and dark themes preserve equivalent semantics
3. the seven-color system is visibly present as part of the product language without overwhelming neutral structure
4. `FeelingSelector`, `FeelingSlider`, and `FeelingTuner` look related even though they differ in form
5. page transitions and local feedback follow a recognizable rhythm
6. the interface remains understandable with motion reduced or disabled
7. future contributors can infer how a new component should look and behave from the documented rules

## Verification Focus

### Visual Review

Review at minimum:

- button hierarchy across core pages
- card and boundary treatment across core pages
- selected and focus states across light and dark themes
- all three mood-input components side by side
- page transitions between representative routes

### Interaction Review

Check:

1. equivalent actions produce equivalent feedback
2. selected state is always stronger than hover
3. focus-visible remains obvious by keyboard
4. reduced-motion still leaves states understandable
5. mood inputs remain expressive without diverging into separate visual systems

## Completion Definition

Phase 3 is complete when the product has a stable visual-interaction language that:

- feels unmistakably like Seven Sense
- stays restrained in ordinary use
- becomes more expressive at the right emotional touchpoints
- can be extended without re-deciding the fundamentals on every new screen
