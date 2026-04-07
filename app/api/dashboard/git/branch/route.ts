import { deleteGitBranch } from "@/lib/agent-api";
import { ensureDashboardRequestAccess, forwardJsonResponse } from "@/lib/dashboard-route";
import type { DeleteBranchRequest } from "@/lib/dashboard-types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function DELETE(request: Request) {
  const unauthorizedResponse = await ensureDashboardRequestAccess();

  if (unauthorizedResponse) {
    return unauthorizedResponse;
  }

  return forwardJsonResponse(
    await deleteGitBranch((await request.json()) as DeleteBranchRequest),
  );
}