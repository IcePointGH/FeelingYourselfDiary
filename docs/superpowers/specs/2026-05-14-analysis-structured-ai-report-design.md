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
  "evidenceSummary": {
    "schedules": [
      {
        "id": 12,
        "date": "2026-05-11",
        "time": "18:30",
        "title": "Evening walk",
        "feeling": 2
      }
    ],
    "diaries": [
      {
        "id": 4,
        "date": "2026-05-11",
        "title": "After a dense workday",
        "excerpt": "Short diary excerpt for evidence display."
      }
    ]
  },
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

### Analysis History Persistence

The existing `/api/ai/analyze` controller persists range analysis into AI session history through `saveRangeAnalysis` when `markdown` is present. The first implementation must preserve analysis history behavior.

Implementation options are intentionally narrow:

- Preferred: generate a concise markdown/text summary from the validated `report` object and pass that to the existing session-history persistence path.
- Acceptable: store the serialized structured report as assistant content only if the AI session UI can render or tolerate that content without breaking.

Do not drop history persistence silently while migrating the response contract.

### Schema Modules

- `overview`: top-level interpretation for the whole range.
- `trend`: direction, volatility, and concise highlights.
- `patterns`: repeated emotional patterns found in records.
- `turningPoints`: high points, low points, or meaningful shifts.
- `suggestions`: concrete, gentle actions the user can try.
- `gentleNote`: safety note and AI disclaimer.

### Field Constraints

Backend validation must enforce more than field presence.

Required constraints:

| Field | Constraint |
| --- | --- |
| `schemaVersion` | String. First phase uses `"1.0"`. |
| `structured` | Boolean. Must be `true` on successful structured responses. |
| `retryCount` | Integer from `0` to `3`. |
| `dateRange` | Display string generated by backend from request dates. |
| `report.title` | Non-empty string, max 60 chars. |
| `overview.headline` | Non-empty string, max 80 chars. |
| `overview.summary` | Non-empty string, max 240 chars. |
| `overview.tone` | One of `positive`, `stable`, `mixed`, `low`, `unknown`. |
| `trend.direction` | One of `up`, `down`, `flat`, `slightly_up`, `slightly_down`, `mixed`, `unknown`. |
| `trend.volatility` | One of `low`, `medium`, `high`, `unknown`. |
| `trend.highlights` | Array, 0-4 items, each max 120 chars. |
| `patterns` | Array, 0-4 items. |
| `patterns[].title` | Non-empty string, max 80 chars. |
| `patterns[].description` | Non-empty string, max 220 chars. |
| `turningPoints` | Array, 0-5 items. |
| `turningPoints[].date` | ISO date string `YYYY-MM-DD` inside the requested range. |
| `turningPoints[].type` | One of `high`, `low`, `shift`, `recovery`, `unknown`. |
| `turningPoints[].title` | Non-empty string, max 80 chars. |
| `turningPoints[].reason` | Non-empty string, max 220 chars. |
| `suggestions` | Array, 1-4 items. |
| `suggestions[].title` | Non-empty string, max 80 chars. |
| `suggestions[].action` | Non-empty string, max 220 chars. |
| `suggestions[].difficulty` | One of `easy`, `medium`, `hard`, `unknown`. |
| `scheduleIds`, `diaryIds` | Arrays of positive integers. Duplicates should be removed by validation. |
| `evidenceSummary.schedules[].feeling` | Integer from `-3` to `3`. |
| `evidenceSummary.schedules[].time` | `HH:mm` string or null. |
| `evidenceSummary.diaries[].excerpt` | String generated by backend, max 120 chars. |
| `gentleNote` | Non-empty string, max 160 chars. |

### Evidence References

The model should reference concrete `scheduleIds` and `diaryIds`, not only dates or raw text snippets.

For the first phase, the backend is responsible for returning `evidenceSummary` in the same `/api/ai/analyze` response. The frontend should not depend on an external schedule/diary cache to resolve evidence ids.

`evidenceSummary` is authoritative backend data, not model-generated content. The model may output only evidence references (`scheduleIds` and `diaryIds`). The backend must build `evidenceSummary` from records already loaded from the database for the authenticated user and requested date range.

`evidenceSummary.schedules` should include:

- `id`
- `date`
- `time`
- `title`
- `feeling`

`evidenceSummary.diaries` should include:

- `id`
- `date`
- `title`
- `excerpt`

The report modules continue to reference evidence by `scheduleIds` and `diaryIds`. The frontend resolves those ids against `evidenceSummary` and displays concise summaries by default, not long diary content.

Backend evidence validation rules:

- Reject or repair any report that references ids outside the loaded schedule/diary set for the authenticated user and requested range.
- Treat cross-user, cross-range, nonexistent, non-numeric, or wrong-type ids as invalid references.
- Remove duplicate ids during validation.
- If invalid references remain after repair retries, fail the structured report rather than showing unverifiable evidence.
- The model must not be trusted to provide `title`, `feeling`, diary excerpts, or other evidence summary fields.

### JSON Generation And Retry

The analysis prompt should instruct the model to return strict JSON only.

Backend parsing rules:

1. Call the model for the initial structured report.
2. Parse and validate the JSON against the expected schema.
3. If parsing or schema validation fails, call the model again with a repair prompt that includes the invalid output and asks for valid JSON only.
4. Retry repair up to 3 times.
5. If all retries fail, return a strict error response and let the user retry manually.

The response should include `retryCount` when successful. Failed attempts should be logged with enough detail to tune prompts, without logging sensitive full diary content unless existing logging policy allows it.

Retry attempts should also be used for invalid evidence references. The repair prompt should identify the allowed schedule and diary ids, not resend unnecessary full record content.

## Frontend Design

### Progress State

Use a staged progress component while the synchronous request is in flight.

The progress is a hybrid model:

- Frontend advances through friendly staged labels on a fixed timer while the request is in flight.
- Backend still returns the final report synchronously.
- The final response metadata can show `retryCount` or explain that the report needed extra formatting work.

Progress stages:

- Reading records
- Generating insights
- Validating report format
- Preparing the letter

Timing rules:

- Advance at most one stage every 1.6 seconds while the request is pending.
- Do not show a percentage value, because the backend is not streaming real progress.
- If the request completes before all stages have appeared, immediately advance to "Preparing the letter" and hold for 250-400 ms before showing the sealed letter.
- If the request remains pending after all stages have appeared, keep the final stage active with subtle motion until the request resolves.
- If the request fails, stop the staged progress and show the error state; do not continue the sequence animation.

Concurrency and cleanup rules:

- Disable the analyze button while an analysis request is in flight.
- Associate each request with a request token. If an older response resolves after a newer request has started, ignore the older response.
- Clear progress timers when the request resolves, when the selected tab/range changes, and when the component unmounts.
- If the request wrapper supports aborting, abort the in-flight request when the tab/range changes or the component unmounts. If abort is not available, request-token ignoring is still required.

### Letter Reveal

On successful report generation, show a sealed letter card instead of immediately rendering the full report.

Controls:

- Open report: plays a restrained envelope-to-report animation.
- View directly: skips animation and immediately shows the report.

The animation should be short and restrained:

- Envelope opens lightly.
- Report sheet/card slides out.
- Report modules fade or settle into place.

Implementation constraints:

- Use CSS transitions/keyframes with `transform` and `opacity` only.
- Do not add Lottie, canvas, or a new animation dependency for the first phase.
- Keep the total reveal duration at or below 400 ms.
- Use a gentle easing curve such as `cubic-bezier(0.2, 0.8, 0.2, 1)`; avoid springy or bouncing motion.
- The animation must not trigger layout shifts in surrounding Analysis content.

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

Structured report retry exhaustion should use the existing `ApiResponse<T>` envelope with a non-success code and no partial report data. The first implementation should use:

```json
{
  "code": 422,
  "message": "AI_STRUCTURED_REPORT_INVALID",
  "data": null
}
```

HTTP status may remain aligned with the project's existing exception handling conventions, but the response body must expose the stable `AI_STRUCTURED_REPORT_INVALID` message so the frontend can show a retryable structured-report error.

## Testing And Verification

Backend:

- Unit test successful structured parse.
- Unit test parse failure followed by repair success.
- Unit test retry exhaustion after 3 attempts.
- Unit test response metadata: `structured`, `schemaVersion`, `retryCount`.
- Unit test validation rejects missing required modules.
- Unit test validation rejects invalid enum values and out-of-range feeling values.
- Unit test validation rejects evidence ids outside the authenticated user's requested range.
- Unit test validation removes duplicate evidence ids.
- Unit test retry exhaustion returns the `AI_STRUCTURED_REPORT_INVALID` `ApiResponse` shape.

Frontend:

- TypeScript build must pass.
- Lint must pass.
- Unit-level coverage is not required because the frontend currently has no test framework.
- Manual verification on Analysis page:
  - staged progress appears during request,
  - successful report shows sealed letter,
  - open and direct-view actions both reveal the report,
  - evidence expands inline,
  - duplicate analyze clicks are disabled or ignored while a request is in flight,
  - switching range or tab during an in-flight request does not render stale results,
  - reduced-motion behavior avoids heavy animation,
  - strict failure shows a retryable error state.

## Later Enhancements

- Chart-to-insight linking: click a pattern or turning point to highlight related dates and points on the chart.
- Insight-to-record navigation: optionally open the original schedule or diary in context.
- Analysis intent selection: before requesting AI, let the user choose goals such as finding triggers, summarizing trends, or preparing next-week suggestions.
- Persist generated reports as first-class history items if users need to revisit the same report without regenerating it.
