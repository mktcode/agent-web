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

* selecting a session affects only future prompt submissions
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

The default display mode is an intuitive chat transcript.
The dashboard must also expose the underlying streamed backend events through a secondary raw-events display mode.

Submission rules:

* if no session is selected, submit `prompt` only
* if a session is selected, submit `prompt` plus `sessionId`
* while a prompt stream is active, disable additional prompt submissions

Streaming rules:

* render streamed content in arrival order
* default to a chat-oriented presentation that is intuitive to read
* provide a raw-events mode that shows the underlying streamed backend event data
* raw-events mode may represent events as raw JSON or minimally formatted JSON
* the chat display must be derived from the streamed backend events and must not invent content that was not present in the stream
* if the backend returns `X-Agent-Session-Id`, update the active session selection to that value

Completion rules:

* when streaming completes, re-enable prompt submission
* refresh the session list so a newly created session appears in the dashboard

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
* streamed events for the current visible run

No background synchronization is required.

---

## Non-Goals

The following are out of scope:

* multiple dashboard pages for separate workflows
* markdown rendering for agent output
* diff viewers
* session rename
* prompt history beyond what the current streamed log shows
* automatic stream reconnection

---

## Invariant

At all times:

> The dashboard exposes every backend capability through direct, explicit controls, with an intuitive chat interface as the primary workflow and raw backend event data available on demand.