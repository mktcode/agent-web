<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Agent Instructions

## Purpose

This UI project is specified via modular documents in `specs/`.

You must treat these specifications as **authoritative** and follow them exactly.

---

## How to Work with the Specs

1. Start with `specs/overview.md`
2. Then read **only the module you are implementing**
3. Read other UI specs **only if required by dependency**
4. Read backend API specs only when the current UI module depends on backend transport behavior

Rules:

* Do not preload multiple specs for context
* Do not combine responsibilities across UI modules
* Do not mix frontend module responsibilities with backend module responsibilities

---

## Updates and Changes

If asked to implement a new feature or change behavior:

1. Update the relevant `specs/` document(s) to include the new behavior
2. **Ask for confirmation that the spec update is correct before implementation**
3. Implement the feature according to the updated spec

---

## Final Rule

When in doubt:

* Do less
* Stay within the current UI module
* Preserve the server-only auth boundary
* Fail explicitly

Do not deviate from the specifications.