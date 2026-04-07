This project is a minimal authenticated dashboard for an existing agent API server.

The first implementation pass adds the authentication boundary:

- Better Auth email/password authentication with persistent SQLite storage
- A public `/login` route and a protected `/` route
- Automatic Better Auth schema migration on first server use
- An out-of-band provisioning script for creating dashboard users

## Setup

Copy `.env.example` to `.env` and fill in the required values.

Required auth variables:

- `BETTER_AUTH_URL`: base URL of the Next.js app, usually `http://localhost:3000`
- `BETTER_AUTH_SECRET`: long random secret used by Better Auth
- `AUTH_DB_PATH`: optional path for the SQLite database, defaults to `.data/auth.sqlite`

Existing backend variables remain required for later dashboard modules:

- `AGENT_API_BASE_URL`
- `AGENT_API_TOKEN`

This implementation uses Node's built-in `node:sqlite` module, so the runtime must support it.

## Provision A User

Public sign-up is disabled. Create dashboard users out of band:

```bash
npm run auth:provision -- --email admin@example.com --password strongpassword --name "Admin User"
```

The command creates the Better Auth schema if needed and then inserts the user if the email is not already present.

## Run The App

First, run the development server:

```bash
npm run dev
```

Open `http://localhost:3000/login` and sign in with the provisioned credentials.

## Current Scope

- `/login` is public
- `/` is protected
- The dashboard is currently a protected shell for the next implementation passes

The repository and agent API dashboard modules are not implemented yet.

## Commands

- `npm run dev`: start the Next.js dev server
- `npm run lint`: run ESLint
- `npm run auth:provision -- --email ... --password ... --name ...`: create a dashboard user

## References

- Next.js App Router documentation
- Better Auth documentation
- The specs in `specs/`
