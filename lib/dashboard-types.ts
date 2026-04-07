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
  id: string;
  name?: string;
  created?: string;
  modified?: string;
  messageCount?: number;
  firstMessage?: string;
};

export type AgentSessionList = {
  sessions: AgentSession[];
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
  prompt: string;
  sessionId?: string;
};

export type PromptStreamEvent = {
  raw: string;
  parsed: unknown;
};