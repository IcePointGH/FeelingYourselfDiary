# Analysis Structured AI Report Design

## Summary

Upgrade the Analysis page AI result from raw markdown text into a structured, front-end-rendered emotional report.

The first implementation phase focuses on a stable structured report contract and a polished reveal experience. Chart/report linking and analysis intent selection are planned as later enhancements that build on the same structured data.

## Goals

- Make AI analysis visually richer and easier to scan than the current markdown-like text block.
- Give each AI conclusion supporting evidence that can be inspected in place.
- Preserve a warm, diary-like feeling through a restrained "open a letter" reveal.
- Keep the first implementation compatible with the current synchronous `/api/ai/analyze` request model.
- Add backend validation and repair retries so the frontend receives a reliable report object.

## Non-Goals

- Do not implement chart-to-insight highlighting in the first phase.
- Do not add pre-analysis intent selection in the first phase.
- Do not introduce a new frontend state management library.
- Do not convert AI analysis into an asynchronous job with polling in the first phase.
- Do not fall back to displaying raw markdown when structured parsing fails.

## User Flow

1. The user opens the Analysis page and chooses daily, weekly, monthly, or full-history AI analysis.
2. The user starts AI analysis.
3. The page shows staged progress:
   - Reading records
   - Generating insights
   - Validating report format
   - Preparing the letter
4. The backend returns a structured report or a strict failure after retry exhaustion.
5. On success, the frontend shows a sealed report letter.
6. The user can choose:
   - Open report: play a restrained envelope-to-report animation.
   - View directly: skip the animation and show the report immediately.
7. The report appears as structured modules.
8. Insight and turning-point cards can expand evidence inline, showing related schedule and diary summaries.

## Backend Design

### Response Contract

Extend `AiDTO.AnalyzeResponse` so it can return structured report data and metadata. The current `markdown` field may remain temporarily for compatibility during migration, but the new Analysis UI should prefer the structured object.

Recommended response shape:

```json
{
  "structured": true,
  "schemaVersion": "1.0",
  "retryCount": 1,
  "scheduleCount": 12,
  "diaryCount": 3,
  "dateRange": "2026-05-01 ~ 2026-05-14",
  "report": {
    "title": "Weekly mood review",
    "overview": {
      "headline": "Overall stable, with evening recovery",
      "summary": "Records in this range suggest a stable baseline, with mood dips after dense tasks.",
      "tone": "stable"
    },
    "trend": {
      "direction": "slightly_up",
      "volatility": "medium",
      "highlights": [
        "Evening entries often recover after a difficult afternoon.",
        "Low points cluster after consecutive high-effort tasks."
      ]
    },
    "patterns": [
      {
        "title": "Dense task sequences affect mood",
        "description": "Several lower-feeling records appear after back-to-back tasks.",
        "scheduleIds": [12, 18],
        "diaryIds": [4]
      }
    ],
    "turningPoints": [
      {
        "date": "2026-05-13",
        "type": "low",
        "title": "Notable low point",
        "reason": "Multiple low-feeling schedule items appear on this date.",
        "scheduleIds": [18],
        "diaryIds": []
      }
    ],
    "suggestions": [
      {
        "title": "Add a short buffer between dense tasks",
        "action": "Place a low-effort recovery activity between two demanding tasks.",
        "difficulty": "easy",
        "scheduleIds": [12, 18],
        "diaryIds": []
      }
    ],
    "gentleNote": "This AI-generated analysis is for reference only."
  }
}
```

### Schema Modules

- `overview`: top-level interpretation for the whole range.
- `trend`: direction, volatility, and concise highlights.
- `patterns`: repeated emotional patterns found in records.
- `turningPoints`: high points, low points, or meaningful shifts.
- `suggestions`: concrete, gentle actions the user can try.
- `gentleNote`: safety note and AI disclaimer.

### Evidence References

The model should reference concrete `scheduleIds` and `diaryIds`, not only dates or raw text snippets.

The backend should include enough source-record summary data in the response for frontend evidence expansion, or the frontend should derive summaries from records already loaded for the same analysis range. The UI should display concise summaries by default, not long diary content.

### JSON Generation And Retry

The analysis prompt should instruct the model to return strict JSON only.

Backend parsing rules:

1. Call the model for the initial structured report.
2. Parse and validate the JSON against the expected schema.
3. If parsing or schema validation fails, call the model again with a repair prompt that includes the invalid output and asks for valid JSON only.
4. Retry repair up to 3 times.
5. If all retries fail, return a strict error response and let the user retry manually.

The response should include `retryCount` when successful. Failed attempts should be logged with enough detail to tune prompts, without logging sensitive full diary content unless existing logging policy allows it.

## Frontend Design

### Progress State

Use a staged progress component while the synchronous request is in flight.

The progress is a hybrid model:

- Frontend advances through friendly staged labels based on elapsed time and request state.
- Backend still returns the final report synchronously.
- The final response metadata can show `retryCount` or explain that the report needed extra formatting work.

Progress stages:

- Reading records
- Generating insights
- Validating report format
- Preparing the letter

### Letter Reveal

On successful report generation, show a sealed letter card instead of immediately rendering the full report.

Controls:

- Open report: plays a restrained envelope-to-report animation.
- View directly: skips animation and immediately shows the report.

The animation should be short and restrained:

- Envelope opens lightly.
- Report sheet/card slides out.
- Report modules fade or settle into place.

Accessibility requirements:

- The skip action must be keyboard reachable.
- The reveal must respect reduced-motion preferences by showing the report directly or using a minimal fade.
- The report content must be reachable without requiring pointer-only interaction.

### Report Layout

Render the structured report as rich modules:

- Overview hero card with headline, summary, and tone.
- Trend card with direction, volatility, and highlights.
- Pattern cards for recurring emotional patterns.
- Turning-point cards for high, low, or shift moments.
- Suggestion cards with action text and difficulty.
- Gentle note section at the bottom.

The UI should feel like a personal report, not a generic dashboard. Use restrained color, compact cards, and scannable hierarchy consistent with the existing CSS Modules/global CSS style.

### Inline Evidence

Cards that reference `scheduleIds` or `diaryIds` should show a "view evidence" action.

When expanded, the card displays concise related record summaries in place:

- Schedule title, date/time, feeling value.
- Diary title/date and a short excerpt if available.

Do not open a drawer in the first phase. Do not navigate away from the report when inspecting evidence.

## Error Handling

- Empty analysis range keeps the existing user-facing empty/error behavior.
- AI request failure shows a toast and an inline error state.
- Structured parsing failure after 3 retries returns a strict error. The frontend should show a clear retry affordance and should not display raw invalid JSON or raw markdown.
- If individual evidence ids cannot be resolved on the frontend, show the report card without the missing evidence item and optionally display a small "some evidence is unavailable" note inside the expanded evidence area.

## Testing And Verification

Backend:

- Unit test successful structured parse.
- Unit test parse failure followed by repair success.
- Unit test retry exhaustion after 3 attempts.
- Unit test response metadata: `structured`, `schemaVersion`, `retryCount`.
- Unit test validation rejects missing required modules.

Frontend:

- TypeScript build must pass.
- Lint must pass.
- Manual verification on Analysis page:
  - staged progress appears during request,
  - successful report shows sealed letter,
  - open and direct-view actions both reveal the report,
  - evidence expands inline,
  - reduced-motion behavior avoids heavy animation,
  - strict failure shows a retryable error state.

## Later Enhancements

- Chart-to-insight linking: click a pattern or turning point to highlight related dates and points on the chart.
- Insight-to-record navigation: optionally open the original schedule or diary in context.
- Analysis intent selection: before requesting AI, let the user choose goals such as finding triggers, summarizing trends, or preparing next-week suggestions.
- Persist generated reports as first-class history items if users need to revisit the same report without regenerating it.
