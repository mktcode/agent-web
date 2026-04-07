# Authentication

## Purpose

This module provides authentication for the Next.js dashboard.

It controls who may access the UI. It does not authenticate directly against the agent API server.

---

## External Dependency

Authentication must use Better Auth.

Authoritative reference:

* `https://better-auth.com/llms.txt`

Relevant Better Auth documentation sections include:

* Installation
* Integrations → Next.js
* Concepts → Client
* Concepts → Session Management
* Authentication → Email & Password

Implementation must follow Better Auth conventions instead of inventing a custom auth flow.

---

## Responsibilities

This module owns:

* Better Auth server configuration
* Better Auth client configuration for the Next.js app
* session cookie creation and validation
* redirecting anonymous users away from protected routes
* rendering the sign-in flow
* signing users out

It must not:

* expose the agent API bearer token
* call the agent API server directly from browser code
* implement roles, teams, or fine-grained permissions

---

## Minimal Authentication Model

The minimal implementation uses Better Auth email-and-password authentication with persistent storage.

Constraints:

* the UI exposes sign-in and sign-out only
* public sign-up is disabled
* users are provisioned out of band
* a valid Better Auth session is required for every dashboard route and every Next.js route handler that talks to the agent API server

This matches the single-tenant nature of the system.

---

## Route Protection

Rules:

* `/login` is public
* `/` is protected
* anonymous requests for `/` are redirected to `/login`
* authenticated requests for `/login` are redirected to `/`

The same protection rule applies to any route handler used by the dashboard for API proxying.

---

## Session Rules

The Better Auth session represents browser access to the dashboard only.

It does not represent:

* a PI agent session
* a git identity
* the backend bearer token

The dashboard may use Better Auth session data for display, such as showing the current user's email in the header.

---

## Failure Handling

Authentication failures must behave explicitly:

* invalid sign-in credentials stay on `/login` and show the returned Better Auth error
* expired or missing dashboard sessions redirect to `/login`
* unauthorized dashboard API proxy requests return `401`

No silent re-authentication.

---

## Non-Goals

The following are out of scope:

* self-service registration
* password reset
* email verification
* OAuth providers
* account settings pages
* multi-session account management UI

---

## Invariant

At all times:

> No dashboard page or dashboard-owned API proxy is accessible without a valid Better Auth session.