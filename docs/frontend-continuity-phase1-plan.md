# Frontend Continuity Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Protect user effort across authentication expiry, editable drafts, and interrupted AI interactions without expanding the backend contract.

**Architecture:** Add one centralized passive-expiry path, one reusable draft persistence layer, then wire the three draftable surfaces into that shared layer. Keep AI response recovery intentionally narrow in phase 1: preserve unsent user input and visibly distinguish partial output states, but do not persist interrupted assistant text.

**Tech Stack:** React 19, TypeScript, React Router DOM 7, browser `localStorage`, existing Context/hooks architecture, existing Toast system.

---

## File Map

### New files

- `frontend/src/hooks/useDraft.ts`
  - Owns draft save/load/clear, 7-day expiry handling, dirty-vs-saved tracking, and restore helpers.

### Modified files

- `frontend/src/contexts/AuthContext.tsx`
  - Add a passive-expiry-aware logout path distinct from active logout.
- `frontend/src/hooks/useApi.ts`
  - Route `401` responses into the passive-expiry flow.
- `frontend/src/pages/Login/Login.tsx`
  - Restore the pre-expiry route after successful login.
- `frontend/src/pages/Schedule/Schedule.tsx`
  - Wire create-form draft persistence and departure protection.
- `frontend/src/pages/Thoughts/Thoughts.tsx`
  - Wire create/edit draft persistence, restore prompts, and cancel-discard confirmation.
- `frontend/src/pages/AI/ChatView.tsx`
  - Persist unsent input by session, add stop generation action, and render explicit incomplete/interrupted states.

### Existing docs to check while implementing

- `docs/frontend-continuity-phase1-spec.md`
- `frontend/AGENTS.md`

## Delivery Shape

1. Ship the shared foundations first.
2. Connect one surface at a time.
3. Keep each task independently testable.
4. Do not broaden scope into visual redesign, backend sync, or cross-device recovery.

---

## Task 1: Centralize Passive Session Expiry

**Files:**
- Modify: `frontend/src/contexts/AuthContext.tsx`
- Modify: `frontend/src/hooks/useApi.ts`
- Modify: `frontend/src/pages/Login/Login.tsx`

- [ ] **Step 1: Add passive-expiry state and actions to `AuthContext`**

  Implement a dedicated `expireSession(returnTo: string)` action alongside the existing active `logout()` action.

  Required behavior:
  - remove `token` and `user` from `localStorage`
  - clear auth state
  - store the intended return path in session storage or route state
  - expose an expiry flag or message source that distinguishes passive expiry from active logout

- [ ] **Step 2: Route `401` handling through `expireSession`**

  Update `useApi` so that `401` does not call generic `logout()` directly.

  Required behavior:
  - read the current `window.location.pathname + window.location.search`
  - invoke the passive-expiry path
  - throw the existing request error after the expiry side effect

- [ ] **Step 3: Redirect expired users through login**

  Update the login flow so that:
  - expired users see a Toast such as `会话已过期，请重新登录`
  - login success returns them to the preserved route when available
  - active logout does not reuse the expiry message

- [ ] **Step 4: Manually verify the expiry flow**

  Verify:
  1. navigating on `/analysis` with an invalid token sends the user to `/login`
  2. the expiry Toast is shown
  3. logging in returns the user to `/analysis`
  4. normal logout does not show the expiry Toast

- [ ] **Step 5: Run frontend verification**

  Run:
  ```bash
  cd frontend
  npm run lint
  npm run build
  ```

- [ ] **Step 6: Commit**

  ```bash
  git add frontend/src/contexts/AuthContext.tsx frontend/src/hooks/useApi.ts frontend/src/pages/Login/Login.tsx
  git commit -m "feat: add passive session expiry flow"
  ```

---

## Task 2: Build the Shared Draft Layer

**Files:**
- Create: `frontend/src/hooks/useDraft.ts`

- [ ] **Step 1: Define the draft envelope**

  Use a generic persisted structure like:
  ```ts
  interface DraftEnvelope<T> {
    value: T;
    updatedAt: number;
  }
  ```

  Implement a constant for the 7-day expiry window.

- [ ] **Step 2: Implement reusable draft helpers**

  The hook should provide, at minimum:
  - `draft`
  - `restore`
  - `save`
  - `clear`
  - `hasDraft`
  - `hasUnsavedChanges`
  - `markSaved`

  Required behavior:
  - expired drafts are removed on read
  - storage keys are caller-provided
  - the hook tracks whether local form changes are newer than the last successful draft save

- [ ] **Step 3: Add browser departure integration**

  Use `beforeunload` only when `hasUnsavedChanges` is true.

  Required behavior:
  - no warning after a successful autosave
  - warning only when latest edits are newer than the last saved draft

- [ ] **Step 4: Add focused self-check coverage through inline scenarios**

  Verify manually in dev tools or temporary local usage:
  - a fresh draft loads
  - a 7-day-old draft is discarded
  - `clear()` removes the storage entry
  - `hasUnsavedChanges` flips back to false after `markSaved()`

- [ ] **Step 5: Run frontend verification**

  ```bash
  cd frontend
  npm run lint
  npm run build
  ```

- [ ] **Step 6: Commit**

  ```bash
  git add frontend/src/hooks/useDraft.ts
  git commit -m "feat: add shared draft persistence hook"
  ```

---

## Task 3: Add Schedule Draft Recovery

**Files:**
- Modify: `frontend/src/pages/Schedule/Schedule.tsx`

- [ ] **Step 1: Attach `useDraft` with key `schedule.create`**

  Persist:
  - `title`
  - `description`
  - `date`
  - `time`
  - `feeling`
  - `showDesc`

- [ ] **Step 2: Add debounced autosave**

  Autosave after edits settle.

  Required behavior:
  - saving a draft marks the current local state as saved
  - an empty untouched form should not produce a meaningless draft

- [ ] **Step 3: Add restore prompt**

  When a valid draft exists on entry:
  - show a lightweight prompt
  - restoring should repopulate all persisted fields
  - discarding should clear only `schedule.create`

- [ ] **Step 4: Clear the draft after successful submission**

  Required behavior:
  - draft remains if submit fails
  - draft clears only after the backend confirms success

- [ ] **Step 5: Verify schedule scenarios**

  Manually verify:
  1. type a schedule, refresh, restore it
  2. submit successfully, refresh, confirm no restore prompt
  3. edit a field and immediately leave before autosave, confirm warning
  4. wait for autosave, leave again, confirm no redundant warning

- [ ] **Step 6: Run frontend verification**

  ```bash
  cd frontend
  npm run lint
  npm run build
  ```

- [ ] **Step 7: Commit**

  ```bash
  git add frontend/src/pages/Schedule/Schedule.tsx
  git commit -m "feat: preserve schedule drafts"
  ```

---

## Task 4: Add Diary Create/Edit Draft Recovery

**Files:**
- Modify: `frontend/src/pages/Thoughts/Thoughts.tsx`

- [ ] **Step 1: Attach separate draft keys**

  Use:
  - `thoughts.create`
  - `thoughts.edit.<entryId>`

  Persist:
  - `title`
  - `content`
  - `date`

- [ ] **Step 2: Add autosave for both create and edit modes**

  Required behavior:
  - switching from create mode into edit mode must not overwrite the create draft
  - switching to a different entry must use that entry's own edit draft key

- [ ] **Step 3: Add restore prompts**

  Required behavior:
  - new-entry draft restores only into create mode
  - edit draft restores only when editing the matching entry
  - prompts should explain whether the draft is for a new diary or an edited diary

- [ ] **Step 4: Add intentional-discard confirmation**

  Required behavior:
  - clicking `取消编辑` requires confirmation when meaningful edits exist
  - the confirmation remains necessary even if a draft is already saved
  - canceling an edit clears the matching `thoughts.edit.<entryId>` draft only after confirmation

- [ ] **Step 5: Clear drafts only after successful formal save**

  Required behavior:
  - create save clears `thoughts.create`
  - edit save clears `thoughts.edit.<entryId>`
  - failed saves keep their drafts

- [ ] **Step 6: Verify diary scenarios**

  Manually verify:
  1. new-entry draft restores after refresh
  2. edit draft for entry A never appears for entry B
  3. canceling a meaningful edit asks for confirmation
  4. successful save clears the correct draft key

- [ ] **Step 7: Run frontend verification**

  ```bash
  cd frontend
  npm run lint
  npm run build
  ```

- [ ] **Step 8: Commit**

  ```bash
  git add frontend/src/pages/Thoughts/Thoughts.tsx
  git commit -m "feat: preserve diary drafts"
  ```

---

## Task 5: Preserve AI Input Drafts

**Files:**
- Modify: `frontend/src/pages/AI/ChatView.tsx`

- [ ] **Step 1: Attach session-scoped draft keys**

  Use:
  - `ai.chat.<sessionId>`

  Persist:
  - unsent textarea content only

- [ ] **Step 2: Restore input per session**

  Required behavior:
  - switching sessions loads that session's own draft
  - empty input after successful send clears the matching draft
  - one session never restores another session's input

- [ ] **Step 3: Respect phase-1 recovery boundaries**

  Do not persist:
  - `streamContent`
  - partial assistant output
  - temporary typing indicator state

- [ ] **Step 4: Verify AI input scenarios**

  Manually verify:
  1. type unsent input in session A, refresh, restore it
  2. switch to session B, confirm session A text does not leak
  3. send successfully, confirm the draft clears

- [ ] **Step 5: Run frontend verification**

  ```bash
  cd frontend
  npm run lint
  npm run build
  ```

- [ ] **Step 6: Commit**

  ```bash
  git add frontend/src/pages/AI/ChatView.tsx
  git commit -m "feat: preserve ai input drafts"
  ```

---

## Task 6: Add AI Stop Generation and Explicit Partial States

**Files:**
- Modify: `frontend/src/pages/AI/ChatView.tsx`

- [ ] **Step 1: Model explicit stream termination states**

  Add state that can distinguish:
  - `generating`
  - `stopped`
  - `failed`
  - `interrupted`
  - `completed`

- [ ] **Step 2: Add a visible stop action**

  Required behavior:
  - visible only while streaming
  - invokes the existing abort controller
  - does not discard text already shown

- [ ] **Step 3: Render incomplete-result messaging**

  Required behavior:
  - manually stopped responses are labeled incomplete
  - failed responses use failure copy
  - interrupted responses use interruption copy distinct from manual stop

- [ ] **Step 4: Keep current stream text after manual stop**

  Required behavior:
  - partial text remains visible in the transcript area
  - it is not promoted into an ordinary completed assistant message without an incomplete marker

- [ ] **Step 5: Verify AI termination scenarios**

  Manually verify:
  1. long response can be stopped
  2. visible text remains after stop
  3. stopped state looks different from failed state
  4. network interruption looks different from manual stop

- [ ] **Step 6: Run frontend verification**

  ```bash
  cd frontend
  npm run lint
  npm run build
  ```

- [ ] **Step 7: Commit**

  ```bash
  git add frontend/src/pages/AI/ChatView.tsx
  git commit -m "feat: add ai stop generation states"
  ```

---

## Task 7: End-to-End Regression Pass

**Files:**
- Verify only

- [ ] **Step 1: Run the full phase-1 manual checklist**

  1. passive expiry on `/analysis`
  2. schedule draft restore and clear
  3. diary create draft restore
  4. diary edit draft isolation
  5. meaningful cancel confirmation
  6. AI input restoration by session
  7. AI stop generation
  8. interrupted vs failed response distinction

- [ ] **Step 2: Run frontend verification**

  ```bash
  cd frontend
  npm run lint
  npm run build
  ```

- [ ] **Step 3: Review code against the spec**

  Confirm each spec section has corresponding behavior:
  - auth continuity
  - shared draft persistence
  - unsaved-change protection
  - AI long-task continuity

- [ ] **Step 4: Commit final polish if needed**

  ```bash
  git add frontend/src docs/frontend-continuity-phase1-spec.md docs/frontend-continuity-phase1-plan.md
  git commit -m "chore: verify continuity phase one"
  ```

---

## Risk Notes

1. `beforeunload` only covers browser-level departure; in-app route transitions need a separate guard if the app should warn before navigation.
2. Diary create/edit drafts must remain fully isolated or recovery will feel untrustworthy.
3. Passive expiry handling must not create redirect loops when the user is already on `/login`.
4. Manual-stop handling should not silently discard partial text or collapse into generic failure.
5. The absence of frontend automated tests increases the importance of explicit manual regression cases in this phase.

## Spec Coverage Check

- Passive session expiry: Task 1
- Shared draft persistence: Task 2
- Schedule draft recovery: Task 3
- Diary create/edit draft recovery: Task 4
- AI input recovery boundary: Task 5
- AI stop generation and partial state handling: Task 6
- Verification against all acceptance criteria: Task 7

