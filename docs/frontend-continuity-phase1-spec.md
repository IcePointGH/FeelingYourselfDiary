# Frontend Continuity Phase 1 Design

> Date: 2026-05-16  
> Status: approved in discussion  
> Scope: phase 1 of the frontend experience roadmap

## Goal

Phase 1 protects user effort once they have already started a task. It focuses on continuity, recovery, and control rather than new product capabilities.

This phase covers:

1. passive session expiry handling
2. shared draft persistence for schedule, diary, and AI input
3. unsaved-change protection
4. AI long-task continuity

It intentionally does not include:

- search
- notifications
- onboarding
- export/share
- Markdown editing
- system theme following
- visual-system cleanup
- mobile redesign

## Current State

### Authentication

`useApi` logs the user out when a request returns `401`, but the user receives no explanation and is not redirected through a dedicated expiry flow.

### Draftable inputs

The following user inputs currently disappear if the page is closed or refreshed before submission:

- schedule creation form
- diary creation form
- diary edit form
- AI chat input box

### AI chat

`ChatView` already has:

- SSE streaming
- an `AbortController`
- client-side accumulation of streamed text

But it does not yet provide:

- a visible stop action
- explicit handling of partial outputs
- a recovery policy for interrupted work

## Design Principles

1. Protect what the user typed before protecting generated output.
2. Separate temporary departure from intentional discard.
3. Prefer one shared persistence mechanism over several page-specific ad hoc implementations.
4. Keep phase 1 compatible with the current backend contract.
5. Make interruption states explicit instead of silently collapsing them into success or failure.

## Terminology

### Passive session expiry

The system invalidates the user's current authenticated session without the user explicitly choosing to log out.

### Draft

A local, recoverable copy of user-authored input that has not yet been formally submitted to the backend.

### Temporary departure

The user leaves a page or refreshes while a draft already exists and can be recovered later.

### Intentional discard

The user explicitly cancels an editing session and chooses to abandon the current input.

### Partial AI response

Visible AI output that was interrupted before the backend completed the response.

## 1. Authentication Continuity

### Desired flow

When an authenticated request returns `401`:

1. clear auth state
2. show a Toast explaining that the session has expired
3. redirect the user to `/login`
4. preserve the current route as the intended return destination

After successful login:

1. return the user to the preserved route when it is still valid
2. otherwise fall back to the normal post-login destination

### Required distinctions

- passive session expiry must not look the same as active logout
- active logout should not show the expiry Toast
- expiry handling should be centralized rather than duplicated per page

### Acceptance criteria

- a user who is expired on `/analysis` is sent to login with an explanation
- after logging in again, the user returns to `/analysis`
- a user who clicks logout does not see the expiry message

## 2. Shared Draft Persistence

### Draft model

Use one shared draft mechanism with scenario-specific keys:

- `schedule.create`
- `thoughts.create`
- `thoughts.edit.<entryId>`
- `ai.chat.<sessionId>`

The shared layer owns:

- save
- load
- clear
- expiry check
- update timestamp handling

Each consumer still owns:

- its own schema
- its own restore prompt copy
- its own submit/clear timing

### Expiry rule

- drafts expire after 7 days
- every saved draft includes `updatedAt`
- expired drafts are deleted automatically and are not offered for restoration

### Restore rule

- if a valid draft exists on page entry, show a lightweight restore prompt
- restoration must be explicit where overwriting visible form data would surprise the user
- successful formal submission clears the corresponding draft immediately

### Per-surface expectations

#### Schedule creation

Persist:

- title
- description
- date
- time
- feeling
- description expanded state when relevant

#### Diary creation

Persist:

- title
- content
- date

#### Diary editing

Persist separately by entry id:

- title
- content
- date

This prevents an unfinished edit from overwriting a separate new-entry draft.

#### AI chat input

Persist:

- unsent textarea content per session id

Do not persist streamed AI output in phase 1.

### Acceptance criteria

- a new schedule draft restores only into the schedule form
- editing diary A never restores into diary B or into a new-entry form
- unsent AI input restores only for the same session
- drafts older than 7 days do not reappear
- successful submission removes the matching draft

## 3. Unsaved-Change Protection

### Core rule

Only block temporary departure when there are changes that have not yet been successfully auto-saved as a draft.

### Temporary departure

- if the latest changes are already persisted as a draft, allow departure without warning
- if the latest changes are newer than the last successful draft save, warn before departure

### Intentional discard

Explicit cancel actions still require confirmation when they would abandon current form content, even if a draft exists.

Examples:

- cancel diary edit
- reset an in-progress form

### Interaction with auto-save

Auto-save and discard confirmation solve different problems:

- auto-save protects against accidental interruption
- discard confirmation protects against intentional destruction

The UI must not present both as contradictory messages for the same action.

### Acceptance criteria

- leaving after a completed draft save does not trigger a warning
- leaving before the latest change has been saved does trigger a warning
- canceling an edit with meaningful content still asks for confirmation

## 4. AI Long-Task Continuity

### Phase 1 recovery boundary

Phase 1 restores only the user's unsent input draft.

It does not restore half-finished AI output after refresh.

### Rationale

- streamed AI text currently exists only as client-side in-flight state
- recovering it robustly would require a broader backend/state contract
- partial generated text can contain sensitive material and introduces additional retention questions
- user-authored input is the higher-value content to preserve first

### Required states

AI generation should visibly distinguish:

1. generating
2. stopped by user
3. failed
4. interrupted by network conditions
5. completed

### Required behavior

- while generating, the UI shows a visible `停止生成` action
- stopping generation aborts the active request
- already visible output remains on screen
- stopped output is marked as incomplete rather than presented as a normal completed answer
- if the page refreshes, unsent user input may restore; partial AI output does not

### Acceptance criteria

- users can stop a long response themselves
- after stopping, the visible text remains and is clearly marked incomplete
- users can tell the difference between a stopped response and a failed request
- a refresh restores unsent user input for that chat session but not interrupted AI output

## 5. Suggested Implementation Boundaries

### Shared hooks/utilities

Prefer extracting:

- a reusable draft persistence hook or utility
- a centralized auth-expiry flow

Do not scatter nearly identical `localStorage` code across pages.

### Existing files likely touched

- `frontend/src/hooks/useApi.ts`
- `frontend/src/contexts/AuthContext.tsx`
- `frontend/src/pages/Schedule/Schedule.tsx`
- `frontend/src/pages/Thoughts/Thoughts.tsx`
- `frontend/src/pages/AI/ChatView.tsx`

Potential new frontend modules:

- a shared draft utility or hook
- route-return handling helpers if current auth flow needs them

## 6. Test and Verification Focus

Frontend has no existing automated test harness, so phase 1 should at minimum be verified through focused manual scenarios unless frontend tests are introduced alongside the work.

### Manual scenarios

1. expire a session from `/analysis`, confirm redirect + message + return path
2. type a schedule, refresh, restore it, submit it, confirm draft clears
3. start a diary edit, cancel it, confirm discard warning
4. type a diary, wait for auto-save, navigate away, confirm no redundant warning
5. type unsent AI input, refresh the same session, confirm restoration
6. start AI generation, stop it, confirm visible incomplete state
7. interrupt network during AI generation, confirm distinct feedback from manual stop

## 7. Out of Scope

The following are explicitly deferred:

- restoring partial AI responses after refresh
- server-side draft sync
- cross-device draft recovery
- offline-first editing
- global visual refresh
- mobile navigation redesign

## 8. Open Decisions Left for Implementation Planning

1. exact UI copy for restore prompts and incomplete AI state
2. whether draft persistence should use a hook API, utility module, or both
3. route-state shape for preserving and restoring the pre-expiry destination

