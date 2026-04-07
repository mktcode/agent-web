import "server-only";

import { auth } from "@/lib/auth";

let authSchemaPromise: Promise<void> | undefined;

export function ensureAuthSchema() {
  if (!authSchemaPromise) {
    authSchemaPromise = auth.$context
      .then((context) => context.runMigrations())
      .catch((error) => {
        authSchemaPromise = undefined;
        throw error;
      });
  }

  return authSchemaPromise;
}