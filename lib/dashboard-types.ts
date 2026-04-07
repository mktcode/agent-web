export type BackendError = {
  code: string;
  message: string;
  details?: Record<string, unknown>;
};

export type BackendErrorResponse = {
  error: BackendError;
};

export type RepositoryStatus = {
  branch: string;
  hasUncommittedChanges: boolean;
};

export type BranchList = {
  branches: string[];
};

export type AgentSession = {
  allMessagesText?: string;
  cwd?: string;
  id: string;
  path?: string;
  name?: string;
  created?: string;
  modified?: string;
  messageCount?: number;
  firstMessage?: string;
};

export type AgentSessionList = {
  sessions: AgentSession[];
};

export type AgentSessionResponse = {
  session: AgentSession;
};

export type PromptFormat = "raw" | "ui";

export type UiSessionItem = {
  id: string;
  sessionId: string;
  timestamp: string;
  kind: "message" | "thinking" | "tool";
  status: "streaming" | "final" | "error";
  isError: boolean;
  role?: "user" | "assistant";
  text?: string;
  toolName?: string;
  toolCallId?: string;
};

export type UiSessionItemEvent = {
  type: "session_item";
  item: UiSessionItem;
};

export type AgentSessionItemsResponse<TItem = unknown> = {
  items: TItem[];
};

export type CheckoutBranchRequest = {
  branch: string;
};

export type MergeBranchRequest = {
  source: string;
  target: string;
};

export type PushBranchRequest = {
  branch: string;
  commitMessage: string;
};

export type DeleteBranchRequest = {
  branch: string;
};

export type DeleteSessionRequest = {
  sessionId: string;
};

export type PromptRequest = {
  format?: PromptFormat;
  prompt: string;
  sessionId?: string;
};

export type PromptStreamEvent = {
  raw: string;
  parsed: unknown;
};