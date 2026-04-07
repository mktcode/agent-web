import "server-only";

import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";

import { buildAuthOptions } from "@/lib/auth-config.mjs";

export const auth = betterAuth({
  ...buildAuthOptions(),
  plugins: [nextCookies()],
});