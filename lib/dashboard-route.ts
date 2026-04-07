import "server-only";

import { getDashboardSession } from "@/lib/auth-session";

export async function ensureDashboardRequestAccess() {
  const session = await getDashboardSession();

  if (!session) {
    return new Response(
      JSON.stringify({
        error: {
          code: "UNAUTHORIZED",
          message: "Unauthorized",
          details: {},
        },
      }),
      {
        status: 401,
        headers: {
          "content-type": "application/json",
        },
      },
    );
  }

  return null;
}

export function forwardJsonResponse(response: Response) {
  const headers = new Headers();
  const contentType = response.headers.get("content-type");

  if (contentType) {
    headers.set("content-type", contentType);
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export function forwardPromptResponse(response: Response) {
  const headers = new Headers();

  for (const headerName of [
    "cache-control",
    "connection",
    "content-type",
    "x-agent-session-id",
  ]) {
    const headerValue = response.headers.get(headerName);

    if (headerValue) {
      headers.set(headerName, headerValue);
    }
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}