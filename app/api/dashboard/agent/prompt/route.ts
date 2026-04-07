import { postAgentPrompt } from "@/lib/agent-api";
import { ensureDashboardRequestAccess, forwardPromptResponse } from "@/lib/dashboard-route";
import type { PromptRequest } from "@/lib/dashboard-types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const unauthorizedResponse = await ensureDashboardRequestAccess();

  if (unauthorizedResponse) {
    return unauthorizedResponse;
  }

  return forwardPromptResponse(
    await postAgentPrompt((await request.json()) as PromptRequest),
  );
}