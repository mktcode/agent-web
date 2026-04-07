import { postGitPush } from "@/lib/agent-api";
import { ensureDashboardRequestAccess, forwardJsonResponse } from "@/lib/dashboard-route";
import type { PushBranchRequest } from "@/lib/dashboard-types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const unauthorizedResponse = await ensureDashboardRequestAccess();

  if (unauthorizedResponse) {
    return unauthorizedResponse;
  }

  return forwardJsonResponse(
    await postGitPush((await request.json()) as PushBranchRequest),
  );
}