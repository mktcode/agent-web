# Agent API Client

## Purpose

This module is the frontend application's server-only transport layer for the existing agent API service.

It translates authenticated dashboard actions into HTTP requests to the backend API.

It must remain a thin wrapper.

Authoritative backend reference:

* `https://raw.githubusercontent.com/mktcode/agent/refs/heads/main/specs/api.md`

---

## Responsibilities

This module owns:

* building backend request URLs
* attaching the backend bearer token
* sending requests to the agent API server
* returning JSON responses for non-streaming endpoints
* proxying SSE responses for prompt execution

The prompt SSE proxy is the transport foundation of the dashboard's chat-like agent interface.

It must not:

* implement business logic
* invent frontend-only endpoint semantics
* store the backend bearer token in client code
* transform agent events beyond the minimum needed to forward the SSE stream

---

## Configuration

The module requires server-only configuration:

* `AGENT_API_BASE_URL`
* `AGENT_API_TOKEN`

These values must never be exposed to the browser.

---

## Supported Backend Operations

The module must expose one function or handler per existing backend capability.

### Git

* `GET /git/status`
* `GET /git/branches`
* `POST /git/checkout`
* `POST /git/merge`
* `POST /git/push`
* `POST /git/revert`
* `DELETE /git/branch`

### Agent

* `GET /agent/sessions`
* `GET /agent/session/:sessionId`
* `GET /agent/session/:sessionId/items`
* `DELETE /agent/session`
* `POST /agent/prompt`

No frontend feature may bypass this module.

---

## Request Rules

For every backend request:

* include `Authorization: Bearer <AGENT_API_TOKEN>`
* send JSON bodies for non-GET requests
* reject anonymous dashboard users before making the backend call

For prompt execution:

* accept `prompt`
* accept optional `sessionId`
* accept optional `format`
* forward the backend SSE response body to the browser in order
* forward the effective session ID from `X-Agent-Session-Id`

For persisted session history:

* fetch session metadata by `sessionId`
* fetch session items by `sessionId`
* support optional `format` query forwarding for session items

---

## Response Rules

### Non-streaming responses

For successful JSON endpoints, return the backend response body unchanged.

### Error responses

For backend failures, return the standard backend error shape unchanged:

```json
{
  "error": {
    "code": "STRING_CODE",
    "message": "Human readable description",
    "details": {}
  }
}
```

### Streaming responses

For `POST /agent/prompt`:

* preserve event order
* do not buffer the full stream before sending
* do not reinterpret event payloads
* end the browser response when the backend stream ends
* support both `raw` and `ui` prompt formats exactly as defined by the backend

For `GET /agent/session/:sessionId/items`:

* return the backend response body unchanged
* support both `raw` and `ui` history formats exactly as defined by the backend

---

## UI Data Contract

The backend exposes two representations for turn or history data:

* `raw` → PI-native events or session entries
* `ui` → UI-friendly projected items derived from PI data

If `format` is omitted, the backend defaults to `raw`.

The dashboard relies on the following backend shapes:

### Repository status

```json
{
  "branch": "main",
  "hasUncommittedChanges": true
}
```

### Branch list

```json
{
  "branches": ["main", "feature-x"]
}
```

### Session list

```json
{
  "sessions": [
    {
      "id": "session-1",
      "path": "path/to/session.jsonl",
      "cwd": "/repo/path",
      "name": "Session session-1",
      "created": "date",
      "modified": "date",
      "messageCount": 1,
      "firstMessage": "text",
      "allMessagesText": "all concatenated messages"
    }
  ]
}
```

### Session metadata

```json
{
  "session": {
    "id": "session-1",
    "path": "path/to/session.jsonl",
    "cwd": "/repo/path",
    "name": "Session session-1",
    "created": "date",
    "modified": "date",
    "messageCount": 1,
    "firstMessage": "text",
    "allMessagesText": "all concatenated messages"
  }
}
```

### UI session item

```json
{
  "id": "item-1",
  "sessionId": "session-1",
  "timestamp": "ISO date string",
  "kind": "message",
  "status": "final",
  "role": "assistant",
  "text": "Hello",
  "isError": false
}
```

### UI prompt stream event

```json
{
  "type": "session_item",
  "item": {
    "id": "item-1",
    "sessionId": "session-1",
    "timestamp": "ISO date string",
    "kind": "message",
    "status": "streaming",
    "role": "assistant",
    "text": "Hel",
    "isError": false
  }
}
```

Rules:

* repeated UI events with the same item `id` replace the previous version of that item in the client
* `ui` payloads must be treated as authoritative UI state and must not be reprojected from raw PI data inside the frontend
* `raw` payloads remain available for inspection and debugging only

The frontend may display additional fields returned by the backend, but it must not require fields not already provided by the API.

---

## Non-Goals

The following are out of scope:

* browser-to-backend direct calls
* request batching
* retries
* caching beyond normal Next.js request behavior
* transforming raw PI events into a richer protocol inside the frontend

---

## Invariant

At all times:

> Every agent API request originates on the server, includes the backend bearer token, and preserves the backend contract seen by the dashboard for both `raw` and `ui` formats.