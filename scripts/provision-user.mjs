import { betterAuth } from "better-auth";

import { buildAuthOptions } from "../lib/auth-config.mjs";

function readArgument(flag) {
  const index = process.argv.indexOf(flag);

  if (index === -1) {
    return undefined;
  }

  return process.argv[index + 1];
}

const email = readArgument("--email");
const password = readArgument("--password");
const name = readArgument("--name");

if (!email || !password || !name) {
  console.error(
    "Usage: npm run auth:provision -- --email you@example.com --password strongpassword --name \"Your Name\"",
  );
  process.exit(1);
}

const auth = betterAuth(
  buildAuthOptions({
    emailAndPassword: {
      enabled: true,
      disableSignUp: false,
    },
  }),
);

const database = auth.options.database;

try {
  await (await auth.$context).runMigrations();

  const existingUser = database
    .prepare('select id from "user" where email = ? limit 1')
    .get(email);

  if (existingUser) {
    console.error(`A user with email ${email} already exists.`);
    process.exit(1);
  }

  await auth.api.signUpEmail({
    body: {
      email,
      password,
      name,
    },
  });

  console.log(`Created dashboard user ${email}.`);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
} finally {
  database.close();
}