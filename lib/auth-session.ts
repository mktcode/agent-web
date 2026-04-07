import "server-only";

import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import { ensureAuthSchema } from "@/lib/auth-schema";

export async function getDashboardSession() {
  await ensureAuthSchema();

  return auth.api.getSession({
    headers: await headers(),
  });
}