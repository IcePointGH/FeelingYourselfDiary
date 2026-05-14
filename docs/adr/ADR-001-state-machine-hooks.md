# ADR-001: Extract state machines into dedicated hooks

**Status**: Accepted  
**Date**: 2026-05-14  
**Deciders**: Architecture review triggered by Bug #2 (AI analysis stuck progress on tab switch)

## Context

The Analysis page (`Analysis.tsx`) managed an AI analysis lifecycle with 8 `useState` hooks (`aiPhase`, `aiLoading`, `aiResult`, `aiStats`, `structuredReport`, `evidenceSummary`, `aiErrorMsg`, `progressSettling`) plus 4 refs (`requestTokenRef`, `abortRef`, `pendingReportRef`, `settleTimerRef`) — all scattered across the component body.

This created an **implicit state machine** (`idle → progress → letter → report | error`) with no enforcement of invariants. Two bugs were caused by this:

1. **Tab-switch cleared analysis results** — The tab-caching `useEffect` had to manually snapshot/restore all 8 AI state fields. Missing fields in the cache caused incomplete restores.
2. **AI progress stuck after tab switch** — `aiPhase='progress'` was cached from aborted requests, but `aiLoading` was not in the cache. Restoring created a phantom "analyzing" state with no active request.

The same pattern was found in `ChatView.tsx` (21 `useState` hooks managing SSE streaming, sessions, context picker, and messages).

## Decision

**Extract state machines from page components into dedicated custom hooks.** Each hook owns all state transitions and guarantees internal consistency.

A state machine hook:
- Exposes a single `state` object (not scattered setters)
- Exposes action functions (`analyze()`, `abort()`, `openReport()`) as the only way to trigger transitions
- Manages all refs (AbortController, timers, tokens) internally
- Accepts injected dependencies (`apiFetch`, `addToast`) for testability

### Implemented

- `useAiAnalysis` — Consolidates the 12-variable AI analysis state machine into one hook with a typed `AiAnalysisState` interface.
- `useTabCache<T>` — Generic tab-state caching primitives, replacing ad-hoc `TabCache` types and `snapTabState`/`applyTabState` functions.

### Not yet done (future candidates)

- `useSseChat` — extract SSE streaming lifecycle from `ChatView.tsx`
- `useOptimisticMutation` — standardize the try/catch + rollback pattern duplicated in Schedule, History, Settings

## Consequences

### Positive
- **Locality**: All AI request logic (abort, token tracking, settling timer, letter reveal transition) moved from Analysis.tsx (~100 lines) into one 160-line hook.
- **Leverage**: `useTabCache` is a generic utility usable by any future tabbed page.
- **Testability**: `useAiAnalysis` accepts `apiFetch` and `addToast` as injectable dependencies. The state machine transitions can be unit-tested without mounting a component.
- **Invariant enforcement**: The hook guarantees that `phase='progress'` always implies `loading=true` and an active `abortRef`. Cannot be broken by scattered `setX()` calls.

### Negative
- Additional abstraction layer — developers must understand the hook interface rather than reading inline `useState` calls.
- The `letter → report` transition requires an explicit `openReport()` action exposed by the hook (previously a direct `setAiPhase('report')` call).

### Neutral
- `Analysis.tsx` is still ~350 lines. Further splitting (Candidate 4 from the architecture review) is a separate decision.

## Rejected Alternatives

### `useReducer` directly in the component
Would consolidate state but not extract the lifecycle logic (abort, token tracking, timers) — the component would still be large. A hook wraps both the reducer AND the side-effect logic.

### External state library (XState, etc.)
Violates the project's "React Context only" convention. Adds a dependency. Overkill for a 5-phase machine.

### Single `useAiRequest` hook shared between Analysis and AI Chat
The Analysis page uses request-response with post-processing phases. The AI Chat uses SSE streaming. A single hook would be too generic (leaky abstraction). Two separate hooks are better.
