import "server-only";

import type {
  CheckoutBranchRequest,
  DeleteBranchRequest,
  DeleteSessionRequest,
  MergeBranchRequest,
  PromptFormat,
  PromptRequest,
  PushBranchRequest,
} from "@/lib/dashboard-types";

type AgentApiRequestOptions = {
  body?: unknown;
  method?: "DELETE" | "GET" | "PATCH" | "POST" | "PUT";
};

function getAgentApiConfig() {
  const baseUrl = process.env.AGENT_API_BASE_URL;
  const token = process.env.AGENT_API_TOKEN;

  if (!baseUrl) {
    throw new Error("AGENT_API_BASE_URL is missing.");
  }

  if (!token) {
    throw new Error("AGENT_API_TOKEN is missing.");
  }

  return { baseUrl, token };
}

function buildAgentApiUrl(pathname: string) {
  const { baseUrl } = getAgentApiConfig();

  return new URL(pathname, baseUrl).toString();
}

async function requestAgentApi(
  pathname: string,
  options: AgentApiRequestOptions = {},
) {
  const { token } = getAgentApiConfig();
  const headers = new Headers({
    Authorization: `Bearer ${token}`,
  });

  if (options.body !== undefined) {
    headers.set("content-type", "application/json");
  }

  return fetch(buildAgentApiUrl(pathname), {
    method: options.method ?? "GET",
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    cache: "no-store",
  });
}

export function getGitStatus() {
  return requestAgentApi("/git/status");
}

export function getGitBranches() {
  return requestAgentApi("/git/branches");
}

export function postGitCheckout(payload: CheckoutBranchRequest) {
  return requestAgentApi("/git/checkout", {
    method: "POST",
    body: payload,
  });
}

export function postGitMerge(payload: MergeBranchRequest) {
  return requestAgentApi("/git/merge", {
    method: "POST",
    body: payload,
  });
}

export function postGitPush(payload: PushBranchRequest) {
  return requestAgentApi("/git/push", {
    method: "POST",
    body: payload,
  });
}

export function postGitRevert() {
  return requestAgentApi("/git/revert", {
    method: "POST",
    body: {},
  });
}

export function deleteGitBranch(payload: DeleteBranchRequest) {
  return requestAgentApi("/git/branch", {
    method: "DELETE",
    body: payload,
  });
}

export function getAgentSessions() {
  return requestAgentApi("/agent/sessions");
}

export function getAgentSession(sessionId: string) {
  return requestAgentApi(`/agent/session/${encodeURIComponent(sessionId)}`);
}

export function getAgentSessionItems(
  sessionId: string,
  format: PromptFormat = "raw",
) {
  return requestAgentApi(
    `/agent/session/${encodeURIComponent(sessionId)}/items?format=${format}`,
  );
}

export function deleteAgentSession(payload: DeleteSessionRequest) {
  return requestAgentApi("/agent/session", {
    method: "DELETE",
    body: payload,
  });
}

export function postAgentPrompt(payload: PromptRequest) {
  return requestAgentApi("/agent/prompt", {
    method: "POST",
    body: payload,
  });
}