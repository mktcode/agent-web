# Dashboard UI

## Purpose

This module defines the minimal authenticated user interface.

It presents the backend capabilities directly, with as little interpretation as possible.

The centerpiece of the dashboard is an intuitive chat interface that matches the interaction pattern users already expect. Repository controls and session controls exist to support that main interaction model.

---

## Responsibilities

The dashboard owns:

* rendering repository status
* rendering branch controls
* rendering persisted session controls
* collecting prompt input
* rendering streamed agent output in a chat interface
* exposing raw streamed agent events on demand
* displaying success and error states for user-initiated actions

It must not:

* invent workflow automation
* hide backend failures
* invent agent content that was not present in the backend stream
* hide the underlying backend event data from the user

---

## Route Layout

The protected route `/` renders one dashboard page with four sections:

* header
* repository section
* sessions section
* prompt section

The layout may stack on smaller screens, but the information architecture stays the same.
The prompt section remains the primary visual focus of the page.

---

## Header

The header shows:

* application title
* current authenticated user identifier
* sign-out action
* manual refresh action

The refresh action reloads repository state and session state from the backend.

---

## Repository Section

This section shows the current repository state and all git actions.

### Read-only data

Display:

* current branch
* whether the workspace has uncommitted changes
* current local branch list

### Mutating actions

Provide controls for:

* checkout branch
* merge source branch into target branch
* push branch with required commit message
* revert uncommitted changes
* delete branch

Rules:

* each action is explicit and button-driven
* inputs are minimal and map directly to backend request fields
* after a successful mutation, the dashboard refreshes status and branches
* backend validation and domain errors are shown to the user without reinterpretation

---

## Sessions Section

This section shows persisted PI sessions returned by `GET /agent/sessions`.

Display for each session:

* `id`
* `name` when available
* `modified`
* `messageCount`
* `firstMessage` when available

Interactions:

* select a session as the active session for the next prompt
* clear the current selection to start a new session on the next prompt
* delete a persisted session

Rules:

* selecting a session sets the active session for future prompt submissions
* selecting a session also loads that session's persisted transcript history
* persisted transcript history is loaded from `GET /agent/session/:sessionId/items?format=ui`
* the dashboard may also load raw persisted history from `GET /agent/session/:sessionId/items?format=raw` for the raw-events mode
* deleting the active session clears the current selection
* after deletion, the dashboard refreshes the session list

---

## Prompt Section

This section provides the primary chat-like agent interaction surface.

Display:

* active session indicator
* prompt textarea
* submit button
* chat transcript
* display mode toggle
* in-flight activity indicator while the agent has not yet produced a final reply

The default display mode is an intuitive chat transcript.
The dashboard must also expose the underlying streamed backend events through a secondary raw-events display mode.

Submission rules:

* if no session is selected, submit `prompt` only
* if a session is selected, submit `prompt` plus `sessionId`
* prompt submissions must request `format: "ui"` for the primary transcript workflow
* while a prompt stream is active, disable additional prompt submissions

Streaming rules:

* render streamed content in arrival order
* default to a chat-oriented presentation that is driven directly by backend `ui` items rather than frontend projection of raw PI data
* repeated `ui` events with the same item `id` must replace the previous version of that item in the client
* chat mode must render only `UiSessionItem` values returned by the backend
* chat mode must not attempt to derive user-visible items from raw PI events when `ui` data is available
* `message` items render as user or assistant chat bubbles according to `role`
* `thinking` items render as secondary in-flight or historical thinking content
* `tool` items render as secondary system-style activity items
* while a prompt stream is active and no final assistant reply is available yet, the prompt section must show an activity indicator
* the activity indicator may use at least two user-facing states: `thinking` and `working`
* `thinking` is used when the latest relevant in-flight `ui` item has `kind: "thinking"` and `status: "streaming"`
* `working` is used for other in-flight activity, such as `tool` items or streaming assistant messages that are not thinking
* the activity indicator must disappear once a final assistant reply is available or the stream finishes without one
* provide a raw-events mode that shows the underlying backend `raw` history or `raw` streamed data
* raw-events mode may represent items as raw JSON or minimally formatted JSON
* the chat display must not invent content that was not present in backend `ui` items
* if the backend returns `X-Agent-Session-Id`, update the active session selection to that value
* when a new session becomes active, the dashboard must load its persisted `ui` items and render them as the current transcript baseline

Completion rules:

* when streaming completes, re-enable prompt submission
* refresh the session list so a newly created session appears in the dashboard
* refresh the active session's persisted `ui` items after completion so the visible transcript matches stored history

Failure rules:

* if the prompt request fails before streaming starts, show the returned backend error
* if the stream terminates unexpectedly, show that the stream ended unexpectedly without inventing a reason

---

## UI State Rules

The minimal UI state includes only:

* authenticated user session
* repository data snapshot
* session list snapshot
* selected agent session ID
* in-flight mutation state
* persisted `ui` items for the active session
* optional raw history or raw stream data for raw-events mode
* in-flight streamed `ui` item snapshots for the active prompt

No background synchronization is required.

---

## Non-Goals

The following are out of scope:

* multiple dashboard pages for separate workflows
* markdown rendering for agent output
* diff viewers
* session rename
* automatic stream reconnection

---

## Invariant

At all times:

> The dashboard exposes every backend capability through direct, explicit controls, with an intuitive chat interface driven by backend `ui` session items as the primary workflow and raw backend data available on demand.