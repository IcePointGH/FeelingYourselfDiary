# Analysis Archive Visual System Design

## Goal

Refine the Analysis experience from a polished but generic report page into a distinctive Seven Sense visual system. The new direction should feel calm, restrained, and recognizable without becoming decorative or theatrical.

The approved direction is:

- Primary visual language: **personal archive**
- Secondary influence: a small amount of **hand-reviewed warmth**
- Excluded direction: mystical / ritual motifs
- Tone: quiet, precise, minimal, personal

## Core Visual Principles

### 1. Archive-first, not letter-first

The report should feel like a carefully organized personal mood archive rather than an opened letter. The experience may still feel considerate and human, but its dominant object language should come from:

- archive numbers
- date stamps
- section marks
- indexed entries
- evidence references
- subtle reader marks

### 2. Monochrome foundation

The page should use:

- white as the primary surface
- black and gray for structure, borders, dividers, typography, and controls
- dedicated dark-mode adaptations rather than simply inverting the page

The upper Analysis control area, including time-range selection and the analyze action, must move into the same black / white / gray system so the page reads as one visual whole.

### 3. Seven Sense color as semantic accent

Use the existing Seven Sense mood palette:

- `-3`: `#d75772`
- `-2`: `#f5867b`
- `-1`: `#fea979`
- `0`: `#ffe062`
- `1`: `#3cdfe9`
- `2`: `#12b8ec`
- `3`: `#1686ee`

Color has two roles:

1. **Semantic role** when directly tied to mood values.
2. **Accent role** when used as a low-area visual signature such as dots, narrow bars, or citation markers.

Decorative color usage should remain restrained, and the palette may be visually softened where needed to preserve the monochrome-first look.

## Narrative Shift

The current experience is built around a "letter" metaphor. The new system should shift to an **archive** metaphor while keeping some of the emotional warmth that made the previous experience appealing.

Recommended narrative:

- Before analysis: Xiaoqi is gathering and organizing the user's records.
- During analysis:
  1. Xiaoqi is retrieving your records.
  2. Xiaoqi is comparing your mood traces.
  3. Xiaoqi is organizing the key findings.
  4. Xiaoqi is sealing this archive for you.
- Completion object: an **archive sleeve / file envelope**, not a personal letter envelope.
- Reveal interaction: the user opens the archive sleeve and pulls out a structured report sheet.
- Emotional framing: visually it is an archive; emotionally it still feels like something prepared with care for the user.

This keeps the product from becoming cold while avoiding a split identity between the transition flow and the final report page.

## Recommended Approach

Choose the medium-scope redesign path:

### Dedicated symbol system plus archive layout

Keep the existing report information architecture, but reinterpret each area through a shared archive system:

- overview -> archive cover summary
- trend -> mood trajectory index
- patterns / turning points -> discovered entries
- suggestions -> follow-up entries
- evidence -> archived references

This path offers stronger identity than a light reskin while avoiding the cost and inconsistency risk of redesigning the whole Analysis product from scratch.

## Page Structure

### 1. Top control area

- Segmented black / white / gray range selector.
- Solid black primary action for report generation.
- Styling should feel like a control strip belonging to the archive system, not like unrelated page chrome.

### 2. Archive cover

Recommended contents:

- archive number, e.g. `Personal Mood Archive / No. 014`
- report title
- summary text
- date stamp
- archive status
- one slim Seven Sense spectrum strip used as a brand signature

The current generic large icon should be replaced with a dedicated archive mark.

### 3. Report body

Recommended two-zone composition:

- left rail for compact summary modules such as trend index and short note
- right content area for ordered archive entries

Each report item should look like a filed entry rather than a generic content card.

### 4. Footer

- short Xiaoqi note
- archive reference code

This closes the report as a saved object rather than a loose stack of cards.

## Symbol System

Start with the smallest complete set:

1. **Archive Number**
   - Gives the report object identity.

2. **Date Stamp**
   - Replaces plain date text with a stronger archival cue.

3. **Section Mark**
   - Compact index markers for report areas such as trend and note.

4. **Entry Index**
   - `ENTRY 01`, `ENTRY 02`, etc.
   - Shared across patterns, turning points, and suggestions.

5. **Evidence Reference**
   - Makes supporting data feel like a cited source.
   - This is a good place for small Seven Sense color dots.

6. **Reader Mark**
   - Sparse traces such as reviewed stamps, clipped notes, underline marks, or page-edge annotations.
   - These should be rare and deliberate.

The design should not try to place an icon everywhere. The goal is for every element to appear as though it belongs to the same archive system.

## Warmth Strategy

Use warmth selectively rather than globally.

Approved balance:

- primary structure: cool archive system
- secondary details: occasional signs that the archive has been carefully read and prepared

Good examples:

- reviewed / archived mark
- one short marginal note
- lightly emphasized excerpt
- gentle final note from Xiaoqi

Avoid:

- scrapbook density
- abundant stickers or tape
- handwriting everywhere
- decorative visual noise

## Motion Direction

Motion should support order and tactility rather than spectacle.

Recommended sequence:

1. archive sleeve appears
2. sleeve opens
3. report sheet slides out
4. archive cover resolves
5. indexed entries appear in sequence

Guidelines:

- short, restrained transitions
- order-first choreography
- reduced-motion mode removes translation and keeps only minimal fading
- evidence expansion should feel like revealing a citation, not launching a large accordion panel

## Explicit Non-Goals

- No mystical, celestial, or ritual graphics.
- No large-area rainbow gradients.
- No unrelated icon library styling as the primary source of personality.
- No dramatically different shape language per card.
- No dense stationery decoration.
- No separate visual system for the top control area.

## Prototype Direction

The approved prototype direction is represented by:

- `frontend/public/archive-analysis-prototype.html`

The prototype demonstrates:

- monochrome-led palette
- archive cover composition
- indexed report entries
- Seven Sense accent usage
- control-area alignment with the report system

## Implementation Scope

The likely implementation scope includes:

- Analysis top controls
- staged analysis flow copy and completion object
- reveal component metaphor change from letter envelope to archive sleeve
- structured report header and layout
- report card styling and symbol system
- evidence presentation styling
- dark-mode adaptation for all of the above

The existing report data model should remain unchanged unless implementation reveals a real display limitation.

## Acceptance Criteria

The redesign is successful when:

1. The Analysis page is recognizably Seven Sense without relying on generic decorative icons.
2. The full journey from analysis progress to revealed report uses one coherent archive metaphor.
3. The page reads primarily as black / white / gray, with mood color used intentionally rather than diffusely.
4. The upper control area and report area feel like parts of the same system.
5. The interface remains calm, readable, and restrained in both light and dark mode.
6. The page has more personality than the current version while remaining easier to maintain than a highly illustrated one-off design.
