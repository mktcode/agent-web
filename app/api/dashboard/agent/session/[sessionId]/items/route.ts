import { getAgentSessionItems } from "@/lib/agent-api";
import { ensureDashboardRequestAccess, forwardJsonResponse } from "@/lib/dashboard-route";
import type { PromptFormat } from "@/lib/dashboard-types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function getFormat(request: Request): PromptFormat {
  const { searchParams } = new URL(request.url);
  const format = searchParams.get("format");

  return format === "ui" ? "ui" : "raw";
}

export async function GET(
  request: Request,
  context: { params: Promise<{ sessionId: string }> },
) {
  const unauthorizedResponse = await ensureDashboardRequestAccess();

  if (unauthorizedResponse) {
    return unauthorizedResponse;
  }

  const { sessionId } = await context.params;

  return forwardJsonResponse(await getAgentSessionItems(sessionId, getFormat(request)));
}