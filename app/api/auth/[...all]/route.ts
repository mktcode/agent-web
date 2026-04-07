import { toNextJsHandler } from "better-auth/next-js";

import { auth } from "@/lib/auth";
import { ensureAuthSchema } from "@/lib/auth-schema";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const handler = toNextJsHandler(auth);

async function withSchema(
  request: Request,
  action: (request: Request) => Promise<Response>,
) {
  await ensureAuthSchema();

  return action(request);
}

export async function GET(request: Request) {
  return withSchema(request, handler.GET);
}

export async function POST(request: Request) {
  return withSchema(request, handler.POST);
}

export async function PATCH(request: Request) {
  return withSchema(request, handler.PATCH);
}

export async function PUT(request: Request) {
  return withSchema(request, handler.PUT);
}

export async function DELETE(request: Request) {
  return withSchema(request, handler.DELETE);
}