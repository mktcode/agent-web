import { getGitStatus } from "@/lib/agent-api";
import { ensureDashboardRequestAccess, forwardJsonResponse } from "@/lib/dashboard-route";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const unauthorizedResponse = await ensureDashboardRequestAccess();

  if (unauthorizedResponse) {
    return unauthorizedResponse;
  }

  return forwardJsonResponse(await getGitStatus());
}