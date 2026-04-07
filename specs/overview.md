# Agent UI – Overview

## Purpose

This frontend is a minimal authenticated dashboard for the existing agent API server.

Its centerpiece is a chat-like interface for interacting with the coding agent, with repository and session controls surrounding that core workflow.

It provides a browser interface for:

* signing in
* inspecting repository state
* performing git actions
* listing and deleting persisted agent sessions
* chatting with the agent by sending prompts and viewing live agent events

The frontend does not implement agent logic or git logic. It is a thin UI and transport layer over the existing API service.

---

## Core Principles

The UI remains intentionally constrained:

* Single dashboard application
* Single authenticated user class
* No client-side access to the agent API bearer token
* Explicit user actions over automation
* Raw agent event visibility over interpreted summaries
* Minimal state, minimal routing, minimal abstraction

Every implementation decision must preserve these properties.

---

## System Model

The frontend is a single Next.js application using the default App Router setup with Tailwind CSS.

It contains:

* one sign-in route
* one protected dashboard route
* one chat-like agent interaction surface as the primary dashboard focus
* Better Auth for browser authentication
* a server-only client for the existing agent API service

The browser authenticates against the Next.js app.
The Next.js app authenticates against the agent API server.

These two authentication systems are separate and must not be merged.

---

## Authentication Model

Browser authentication uses Better Auth session cookies.

Backend API authentication uses the existing bearer token required by the agent API server.

Rules:

* Better Auth protects access to the UI
* the agent API bearer token is stored only in server environment variables
* the browser never receives or stores the agent API bearer token
* every call from Next.js to the agent API server is performed server-side

---

## Module Architecture

The frontend is composed of strictly separated modules, each defined in `specs/`.

Dependency direction is one-way:

```text
Dashboard UI
   ↓
Authentication Guard
   ↓
Agent API Client
```

### Module Specifications

* Authentication → `specs/authentication.md`
* Agent API Client → `specs/agent-api.md`
* Dashboard UI → `specs/dashboard.md`

---

## Route Model

The minimal route set is:

* `/login` → public sign-in page
* `/` → protected dashboard

No other application routes are required for the minimal implementation.

---

## Supported Features

The dashboard must expose all existing agent API features.

### Git

* read current branch and dirty state
* list branches
* checkout branch
* merge branch into branch
* push branch with commit message
* revert uncommitted changes
* delete branch

### Agent

* list persisted sessions
* delete persisted session
* start a new prompt session
* continue an existing session by `sessionId`
* stream live agent events for a prompt request

---

## External Dependencies

* Next.js App Router docs
* Tailwind CSS docs
* Better Auth docs via `https://better-auth.com/llms.txt`
* Existing agent API specification in `specs/`
* Published agent API specification via `https://raw.githubusercontent.com/mktcode/agent/refs/heads/main/specs/api.md`

The Better Auth documentation is authoritative for auth setup and session handling.
The agent API specifications are authoritative for backend request and response behavior.

---

## Non-Goals

The following are explicitly out of scope:

* public sign-up
* roles or permissions
* multi-tenant workspaces
* background polling
* agent event interpretation or summarization
* optimistic UI for mutating operations
* offline support
* mobile-native applications

---

## Testing

Automated tests are not planned for this project at this time, but the implementation must be testable and maintainable enough to support future tests.

---

## Invariant

At all times:

> An authenticated browser user can operate the full agent API through a minimal chat-centered dashboard, while the agent API bearer token remains server-only.