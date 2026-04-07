import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { DatabaseSync } from "node:sqlite";

const DEFAULT_BETTER_AUTH_URL = "http://localhost:3000";
const DEFAULT_AUTH_DB_PATH = join(process.cwd(), ".data", "auth.sqlite");

export function getBetterAuthUrl() {
  return process.env.BETTER_AUTH_URL || DEFAULT_BETTER_AUTH_URL;
}

export function getAuthDatabasePath() {
  return process.env.AUTH_DB_PATH || DEFAULT_AUTH_DB_PATH;
}

export function createAuthDatabase() {
  const databasePath = getAuthDatabasePath();

  mkdirSync(dirname(databasePath), { recursive: true });

  return new DatabaseSync(databasePath);
}

export function buildAuthOptions(overrides = {}) {
  const emailAndPassword = {
    enabled: true,
    disableSignUp: true,
    ...(overrides.emailAndPassword ?? {}),
  };

  return {
    baseURL: getBetterAuthUrl(),
    secret: process.env.BETTER_AUTH_SECRET,
    database: createAuthDatabase(),
    ...overrides,
    emailAndPassword,
  };
}