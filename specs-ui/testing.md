# Testing

## Purpose

This module defines the minimum required test coverage for the frontend.

Tests must prove that the dashboard is authenticated, server-mediated, and feature-complete with respect to the existing agent API.

---

## Determinism Requirements

Tests must:

* not depend on external network access
* not call a real auth provider beyond the local Better Auth test setup
* not call a real LLM or real agent API server on the public network
* not rely on timing-sensitive assertions for streamed output

---

## Required Test Areas

### Authentication

Required tests:

* anonymous users are redirected from `/` to `/login`
* authenticated users can load `/`
* authenticated users are redirected away from `/login`
* sign-out removes dashboard access

### Agent API client

Required tests:

* backend requests include the configured bearer token
* backend requests are made only from server code
* backend JSON success bodies are forwarded unchanged
* backend JSON error bodies are forwarded unchanged
* prompt SSE responses are forwarded in order
* `X-Agent-Session-Id` is preserved for prompt responses

### Dashboard

Required tests:

* repository status renders current branch and dirty state
* branch list renders all backend branches
* each git action calls the correct backend endpoint with the correct payload
* sessions list renders backend session metadata
* deleting a session refreshes the list and clears selection when necessary
* a prompt without a selected session starts a new session
* a prompt with a selected session continues that session
* streamed prompt events appear in order

---

## Test Doubles

Tests may use:

* a local Better Auth test configuration
* a mocked or local in-process backend HTTP server for the agent API

Tests must not require the existing backend repository workspace, git repository, or PI session storage to be present.

---

## Non-Goals

The following are out of scope:

* visual regression testing
* cross-browser matrix testing
* performance benchmarking
* load testing

---

## Invariant

At all times:

> The frontend test suite proves that authentication is enforced and that every backend feature is available through the dashboard without changing backend semantics.