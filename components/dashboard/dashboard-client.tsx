"use client";

import { startTransition, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";

import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { PromptPanel } from "@/components/dashboard/prompt-panel";
import {
  buildPromptRunView,
  parseSseFrames,
  type DisplayMode,
  type TranscriptRun,
} from "@/components/dashboard/prompt-utils";
import { RepositoryPanel } from "@/components/dashboard/repository-panel";
import { SessionsPanel } from "@/components/dashboard/sessions-panel";
import type {
  AgentSession,
  AgentSessionList,
  BackendError,
  BackendErrorResponse,
  BranchList,
  RepositoryStatus,
} from "@/lib/dashboard-types";

type DashboardClientProps = {
  user: {
    email: string;
    name?: string | null;
  };
};

type RequestResult<T> =
  | {
      data: T;
      error: null;
    }
  | {
      data: null;
      error: BackendError;
    };

function createNetworkError(message: string): BackendError {
  return {
    code: "NETWORK_ERROR",
    message,
    details: {},
  };
}

async function requestJson<T>(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<RequestResult<T>> {
  try {
    const response = await fetch(input, init);
    const rawText = await response.text();
    const payload = rawText ? (JSON.parse(rawText) as T | BackendErrorResponse) : {};

    if (!response.ok) {
      const error = (payload as BackendErrorResponse).error;

      return {
        data: null,
        error:
          error ||
          createNetworkError(`Request failed with status ${response.status}.`),
      };
    }

    return {
      data: payload as T,
      error: null,
    };
  } catch (error) {
    return {
      data: null,
      error: createNetworkError(
        error instanceof Error ? error.message : "Unknown request failure.",
      ),
    };
  }
}

async function loadDashboardSnapshots({
  includeRepository = true,
  includeSessions = true,
  setBranches,
  setIsRefreshing,
  setRepositoryError,
  setRepositoryStatus,
  setSessions,
  setSessionsError,
}: {
  includeRepository?: boolean;
  includeSessions?: boolean;
  setBranches: (branches: string[]) => void;
  setIsRefreshing: (isRefreshing: boolean) => void;
  setRepositoryError: (error: BackendError | null) => void;
  setRepositoryStatus: (status: RepositoryStatus | null) => void;
  setSessions: (sessions: AgentSession[]) => void;
  setSessionsError: (error: BackendError | null) => void;
}) {
  setIsRefreshing(true);

  const tasks: Array<Promise<void>> = [];

  if (includeRepository) {
    tasks.push(
      Promise.all([
        requestJson<RepositoryStatus>("/api/dashboard/git/status"),
        requestJson<BranchList>("/api/dashboard/git/branches"),
      ]).then(([statusResult, branchResult]) => {
        if (statusResult.data) {
          setRepositoryStatus(statusResult.data);
        }

        if (branchResult.data) {
          setBranches(branchResult.data.branches);
        }

        setRepositoryError(statusResult.error || branchResult.error);
      }),
    );
  }

  if (includeSessions) {
    tasks.push(
      requestJson<AgentSessionList>("/api/dashboard/agent/sessions").then(
        (result) => {
          if (result.data) {
            setSessions(result.data.sessions);
          }

          setSessionsError(result.error);
        },
      ),
    );
  }

  await Promise.all(tasks);
  setIsRefreshing(false);
}

export function DashboardClient({ user }: DashboardClientProps) {
  const [repositoryStatus, setRepositoryStatus] = useState<RepositoryStatus | null>(null);
  const [branches, setBranches] = useState<string[]>([]);
  const [sessions, setSessions] = useState<AgentSession[]>([]);
  const [repositoryError, setRepositoryError] = useState<BackendError | null>(null);
  const [sessionsError, setSessionsError] = useState<BackendError | null>(null);
  const [gitActionError, setGitActionError] = useState<BackendError | null>(null);
  const [sessionActionError, setSessionActionError] = useState<BackendError | null>(null);
  const [promptError, setPromptError] = useState<BackendError | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(true);
  const [pendingGitAction, setPendingGitAction] = useState<string | null>(null);
  const [pendingSessionDeletion, setPendingSessionDeletion] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [displayMode, setDisplayMode] = useState<DisplayMode>("chat");
  const [prompt, setPrompt] = useState("");
  const [runs, setRuns] = useState<TranscriptRun[]>([]);
  const [checkoutBranch, setCheckoutBranch] = useState("");
  const [mergeSource, setMergeSource] = useState("");
  const [mergeTarget, setMergeTarget] = useState("");
  const [pushBranch, setPushBranch] = useState("");
  const [commitMessage, setCommitMessage] = useState("");
  const [deleteBranch, setDeleteBranch] = useState("");

  async function refreshSnapshots({ includeRepository = true, includeSessions = true } = {}) {
    await loadDashboardSnapshots({
      includeRepository,
      includeSessions,
      setBranches,
      setIsRefreshing,
      setRepositoryError,
      setRepositoryStatus,
      setSessions,
      setSessionsError,
    });
  }

  useEffect(() => {
    void loadDashboardSnapshots({
      setBranches,
      setIsRefreshing,
      setRepositoryError,
      setRepositoryStatus,
      setSessions,
      setSessionsError,
    });
  }, []);

  useEffect(() => {
    if (repositoryStatus?.branch) {
      setCheckoutBranch((currentBranch) =>
        currentBranch && branches.includes(currentBranch)
          ? currentBranch
          : repositoryStatus.branch,
      );
      setPushBranch((currentBranch) =>
        currentBranch && branches.includes(currentBranch)
          ? currentBranch
          : repositoryStatus.branch,
      );
      setMergeTarget((currentBranch) =>
        currentBranch && branches.includes(currentBranch)
          ? currentBranch
          : repositoryStatus.branch,
      );
      setDeleteBranch((currentBranch) =>
        currentBranch && branches.includes(currentBranch)
          ? currentBranch
          : repositoryStatus.branch,
      );
    }

    if (branches.length > 0) {
      setMergeSource((currentBranch) => {
        if (currentBranch && branches.includes(currentBranch)) {
          return currentBranch;
        }

        return branches.find((branch) => branch !== repositoryStatus?.branch) ?? branches[0];
      });
    }
  }, [branches, repositoryStatus]);

  const selectedSession = useMemo(
    () => sessions.find((session) => session.id === selectedSessionId) ?? null,
    [selectedSessionId, sessions],
  );

  const runViews = useMemo(() => runs.map(buildPromptRunView), [runs]);

  async function runGitAction(label: string, input: RequestInit & { url: string }) {
    setPendingGitAction(label);
    setGitActionError(null);

    const result = await requestJson<Record<string, never>>(input.url, input);

    if (result.error) {
      setGitActionError(result.error);
      setPendingGitAction(null);
      return;
    }

    setPendingGitAction(null);
    await refreshSnapshots({ includeRepository: true, includeSessions: false });
  }

  async function handleDeleteSession(sessionId: string) {
    setPendingSessionDeletion(sessionId);
    setSessionActionError(null);

    const result = await requestJson<Record<string, never>>(
      "/api/dashboard/agent/session",
      {
        method: "DELETE",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ sessionId }),
      },
    );

    if (result.error) {
      setSessionActionError(result.error);
      setPendingSessionDeletion(null);
      return;
    }

    if (selectedSessionId === sessionId) {
      setSelectedSessionId(null);
    }

    setPendingSessionDeletion(null);
    await refreshSnapshots({ includeRepository: false, includeSessions: true });
  }

  async function handlePromptSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!prompt.trim() || isStreaming) {
      return;
    }

    setPromptError(null);
    setIsStreaming(true);

    const runId = crypto.randomUUID();
    const submittedPrompt = prompt.trim();
    const startingSessionId = selectedSessionId;

    setPrompt("");
    setRuns((currentRuns) => [
      ...currentRuns,
      {
        completed: false,
        events: [],
        id: runId,
        prompt: submittedPrompt,
        sessionId: startingSessionId,
        streamError: null,
      },
    ]);

    let streamStarted = false;

    try {
      const response = await fetch("/api/dashboard/agent/prompt", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          prompt: submittedPrompt,
          ...(startingSessionId ? { sessionId: startingSessionId } : {}),
        }),
      });

      if (!response.ok) {
        const payload = (await response.json()) as BackendErrorResponse;
        setRuns((currentRuns) => currentRuns.filter((run) => run.id !== runId));
        setPromptError(payload.error);
        setIsStreaming(false);
        return;
      }

      streamStarted = true;

      const nextSessionId = response.headers.get("x-agent-session-id");

      if (nextSessionId) {
        setSelectedSessionId(nextSessionId);
        setRuns((currentRuns) =>
          currentRuns.map((run) =>
            run.id === runId ? { ...run, sessionId: nextSessionId } : run,
          ),
        );
      }

      const reader = response.body?.getReader();

      if (!reader) {
        throw new Error("Prompt stream was missing a response body.");
      }

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          const parsed = parseSseFrames(buffer + "\n\n");

          if (parsed.events.length > 0) {
            setRuns((currentRuns) =>
              currentRuns.map((run) =>
                run.id === runId
                  ? { ...run, completed: true, events: [...run.events, ...parsed.events] }
                  : run,
              ),
            );
          } else {
            setRuns((currentRuns) =>
              currentRuns.map((run) =>
                run.id === runId ? { ...run, completed: true } : run,
              ),
            );
          }

          break;
        }

        buffer += decoder.decode(value, { stream: true });

        const parsed = parseSseFrames(buffer);
        buffer = parsed.rest;

        if (parsed.events.length > 0) {
          setRuns((currentRuns) =>
            currentRuns.map((run) =>
              run.id === runId
                ? { ...run, events: [...run.events, ...parsed.events] }
                : run,
            ),
          );
        }
      }
    } catch {
      setRuns((currentRuns) =>
        currentRuns.map((run) =>
          run.id === runId
            ? {
                ...run,
                completed: true,
                streamError: "The stream ended unexpectedly.",
              }
            : run,
        ),
      );
    } finally {
      setIsStreaming(false);

      if (streamStarted) {
        await refreshSnapshots({ includeRepository: false, includeSessions: true });
      }
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-384 flex-1 flex-col gap-6 px-6 py-8 sm:px-10 lg:px-12">
      <DashboardHeader
        isRefreshing={isRefreshing}
        onRefresh={() => {
          startTransition(() => {
            void refreshSnapshots();
          });
        }}
        user={user}
      />

      <section className="grid gap-6 xl:grid-cols-[1fr_1fr_1.35fr]">
        <RepositoryPanel
          actions={{
            onCheckoutBranchChange: setCheckoutBranch,
            onCommitMessageChange: setCommitMessage,
            onDeleteBranchChange: setDeleteBranch,
            onMergeSourceChange: setMergeSource,
            onMergeTargetChange: setMergeTarget,
            onPushBranchChange: setPushBranch,
            runGitAction,
          }}
          state={{
            branches,
            checkoutBranch,
            commitMessage,
            deleteBranch,
            gitActionError,
            mergeSource,
            mergeTarget,
            pendingGitAction,
            pushBranch,
            repositoryError,
            repositoryStatus,
          }}
        />

        <SessionsPanel
          actions={{
            onDeleteSession: handleDeleteSession,
            onSelectSession: setSelectedSessionId,
          }}
          state={{
            pendingSessionDeletion,
            selectedSessionId,
            sessionActionError,
            sessions,
            sessionsError,
          }}
        />

        <PromptPanel
          actions={{
            onDisplayModeChange: setDisplayMode,
            onPromptChange: setPrompt,
            onSubmit: handlePromptSubmit,
          }}
          state={{
            displayMode,
            isStreaming,
            prompt,
            promptError,
            runViews,
            selectedSession,
            selectedSessionId,
          }}
        />
      </section>
    </main>
  );
}