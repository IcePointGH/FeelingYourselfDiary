# Schedule Quick Capture Design

## Goal

Improve the daily schedule capture flow on `/schedule` so adding a record feels immediate, continuous, and lightly rewarding. The main user value is reducing the break between "I saved this" and "I can keep recording the next thing."

## Scope

This design only covers the add-record flow on the Schedule page:

- Submit a new schedule item.
- Insert a temporary saving card immediately.
- Replace it with the saved item on success.
- Restore the submitted form on failure.
- Preserve the existing edit, complete, batch, and future-date reminder behavior.

This design does not cover delete confirmation, batch operation redesign, diary writing, History page interactions, Analysis, or AI chat.

## User Experience

The Schedule page remains optimized for quick capture. The user enters a title, chooses date and time, selects a feeling, optionally expands description, and submits.

After submit, the page immediately inserts a temporary card into the current day's list at the correct time position. The temporary card communicates that the record is being saved and cannot be edited, deleted, or completed yet.

When the request succeeds, the temporary card is replaced by the real saved record. The saved card receives one short highlight using the selected feeling color. The highlight should feel like confirmation from the card itself, not a separate notification. Successful saves do not show a toast.

When the request fails, the temporary card is removed. The form is restored to the exact submitted values, the title input receives focus, and an error toast explains that saving failed.

## Sorting

The list should display records in time order. A new temporary card participates in the same ordering rule as saved items.

Records with a time should be sorted by `time`. Records without a time should appear after records that have a time. If two records have the same time, preserve a stable order where possible.

This keeps the daily list acting like a timeline. If a user records an event at `09:00`, it should appear near other morning records rather than always being inserted at the top.

## Form Reset And Focus

After submit starts:

- Clear `title`.
- Clear `description`.
- Reset `feeling` to `0`.
- Keep the selected `date`.
- If `date` is today, update `time` to the current time.
- If `date` is not today, keep the submitted `time`.
- Focus the title input so the user can immediately enter another record.

The user should not need to manually return to the first input after a successful quick capture.

## Viewport Behavior

The form remains the user's main anchor for rapid consecutive recording. The page should not always force-scroll to the new card.

After inserting the temporary card:

- If the card is already visible, rely on the saving state first and the success highlight later.
- If the card is outside the viewport, scroll smoothly near the card, then restore focus to the title input.

This gives confirmation without making every save feel like navigation away from the input flow.

## Temporary Saving Card

The temporary item should be local to `SchedulePage` state. It can use an internal extended type instead of changing the global `ScheduleItem` type.

Recommended state fields:

- A temporary id, such as a negative number.
- `saving: true`.
- `justAdded: false`.

While saving:

- Disable edit, delete, and complete actions.
- Show a small saving indicator or saving label.
- Keep the card visually aligned with normal schedule cards, but slightly muted.

On success:

- Replace the temporary item with the persisted item.
- Mark the persisted item as `justAdded`.
- Remove `justAdded` after the highlight animation finishes.

On failure:

- Remove the temporary item.
- Restore the form snapshot captured at submit time.
- Show an error toast.

## Error Handling

The submit handler must keep a snapshot of the submitted form values before resetting the form. That snapshot is the source of truth for failure restoration.

If the request fails, restore:

- `title`
- `description`
- `date`
- `time`
- `feeling`
- expanded description state if there was submitted description

The user must not lose typed content because of a network or server failure.

## Existing Behavior To Preserve

- Future-date reminder still appears before a future item is submitted, unless dismissed by the user.
- Existing complete toggle optimistic updates continue to work.
- Existing edit behavior continues to work.
- Existing batch mode continues to work.
- Existing schedule fetch and toast patterns remain in place.
- No new dependencies are introduced.
- No backend API changes are required.

## Acceptance Criteria

1. With normal network behavior, clicking submit immediately inserts a saving card.
2. The saving card is sorted into the correct time position.
3. The saving card cannot be edited, deleted, completed, or selected for batch actions.
4. On success, the saving card becomes a normal card and receives one short feeling-color highlight.
5. On success, no success toast appears.
6. After submit starts, the title input is focused for the next entry.
7. For today's date, the time field refreshes to the current time after submit starts.
8. For non-today dates, the time field keeps the submitted time after submit starts.
9. If the new card is outside the viewport, the page scrolls smoothly near it without leaving focus stranded.
10. On failure, the temporary card disappears, the submitted form values are restored, and an error toast appears.
11. Existing edit, complete, batch, and future-date reminder flows still work.

## Implementation Notes

Keep the implementation inside Schedule page related files unless a tiny, reusable card prop is needed in `ScheduleItemCard`.

A likely implementation shape:

- Add a `titleInputRef`.
- Add internal list item metadata for `saving` and `justAdded`.
- Introduce a sorting helper local to `SchedulePage`.
- Update `doSubmit` to create a submitted snapshot and temporary item.
- Replace the temporary item after the POST succeeds.
- Roll back and restore the snapshot if the POST fails.
- Add CSS classes for saving and just-added card states.
- Use `prefers-reduced-motion` to disable highlight or scroll-related animation where appropriate.

Avoid unrelated cleanup. In particular, do not redesign confirmation dialogs or batch actions as part of this change.
