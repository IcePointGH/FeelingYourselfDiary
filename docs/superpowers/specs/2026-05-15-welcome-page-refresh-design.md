# Welcome Page Refresh Design

## Goal

Refresh the welcome page so it:

1. matches the newer Seven Sense visual language,
2. feels more distinctive and memorable,
3. still helps a new visitor understand the product and start using it.

The page should be warmer and more expressive than the in-app pages, while still feeling part of the same product family.

## Visual Direction

- Base palette: white background, black/gray structure, and the existing Seven Sense seven-color scale as semantic accents.
- Mood: calm, human, slightly playful, not sterile.
- The page should use the new archive-era restraint from the Analysis experience, but it should not become purely archival or overly cold.
- Light and dark modes both need dedicated treatment.

## Signature Motif: Emotion Orbit

The welcome page keeps decorative emotional elements, but they become a designed system rather than loose stickers.

- Seven mood expressions should be arranged along an implied orbital path around the hero region.
- Their order should map from lower mood to higher mood and echo the Seven Sense color scale.
- Weather cues such as sun/rain may remain, but only as secondary orbit companions.
- Motion should be light and slow: gentle drift, subtle orbiting, and small phase offsets.
- These elements must stay peripheral, never cover core text or controls, and collapse gracefully on small screens.

## Hero Structure

Use a balanced hero:

- Left side:
  - Seven Sense logo
  - a concise product claim
  - one short explanatory paragraph
  - primary CTA
  - optional secondary text link
- Right side:
  - a restrained product slice, not a phone mockup or glossy poster
  - the slice should show recognizable real product content such as one day of mood records, a compact trend view, or a short archive-style insight
- A seven-color spectrum line/bar should act as a central identity anchor in or near the hero.

The hero should communicate both brand and product:
- brand first through the orbit and spectrum,
- product immediately after through a concrete interface fragment.

## Page Narrative

Replace the current app-store-style stacking with a three-part story:

1. **记录**  
   Show that events and feelings are recorded together.
2. **看见**  
   Show how trends and changes become legible over time.
3. **理解**  
   Show how diary text and AI-assisted reflection help the user interpret their own patterns.

Each section should use one focused visual artifact rather than repeated generic feature cards.

## CTA Strategy

- Keep one main CTA in the hero and one closing CTA near the end.
- CTA copy should remain practical and direct.
- Logged-in users should still be routed into the product directly.
- The welcome page should support conversion, but it should not read like a marketing funnel.

## Content to Remove or Rework

- Replace the current phone-poster visual with a more product-native slice.
- Reduce generic feature-card repetition.
- Rework decorative emojis and floaters into the structured emotion orbit.
- Keep only the content needed to support the three-part story.

## Interaction Notes

- Use restrained transitions and transform/opacity-based motion.
- Motion should remain lightweight and should respect `prefers-reduced-motion`.
- Decorative orbit motion must never interfere with reading or CTA interaction.
- Hover interactions should feel polished but not theatrical.

## Responsive Notes

- On smaller screens, the hero should collapse to a single column.
- Orbit elements should reduce in count, scale, or radius when space is constrained.
- The product slice should remain legible without requiring a horizontal scroll.
- Typography should remain consistent with existing page conventions and not scale continuously with viewport width.

## Non-goals

- No full marketing-site rewrite across multiple routes.
- No new backend data requirements.
- No dependency additions for animation or illustration.

## Acceptance Criteria

- The page is visibly part of Seven Sense and not a generic landing page.
- It preserves warmth and emotional personality without becoming visually noisy.
- A first-time visitor can understand the product's basic value from the hero and the next three sections.
- Light mode and dark mode both look intentional.
- The page remains responsive, readable, and motion-safe.
