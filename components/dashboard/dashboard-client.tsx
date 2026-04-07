"use client";

import {
  startTransition,
  useEffect,
  useMemo,
  useState,
} from "react";

import { SignOutButton } from "@/components/auth/sign-out-button";
import type {
  AgentSession,
  AgentSessionList,
  BackendError,
  BackendErrorResponse,
  BranchList,
  PromptStreamEvent,
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

type TranscriptRun = {
  completed: boolean;
  events: PromptStreamEvent[];
  id: string;
  prompt: string;
  sessionId: string | null;
  streamError: string | null;
};

type DisplayMode = "chat" | "raw";

const preferredTextKeys = new Set([
  "content",
  "delta",
  "message",
  "output",
  "result",
  "stderr",
  "stdout",
  "summary",
  "text",
]);

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

function formatDate(value?: string) {
  if (!value) {
    return "Unknown";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
}

function getEventLabel(event: PromptStreamEvent) {
  if (
    event.parsed &&
    typeof event.parsed === "object" &&
    "type" in event.parsed &&
    typeof event.parsed.type === "string"
  ) {
    return event.parsed.type;
  }

  return "event";
}

function collectTextFragments(value: unknown, fragments: string[] = []) {
  if (typeof value === "string") {
    const trimmed = value.trim();

    if (trimmed) {
      fragments.push(trimmed);
    }

    return fragments;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      collectTextFragments(item, fragments);
    }

    return fragments;
  }

  if (!value || typeof value !== "object") {
    return fragments;
  }

  for (const [key, nestedValue] of Object.entries(value)) {
    if (preferredTextKeys.has(key) || key === "parts") {
      collectTextFragments(nestedValue, fragments);
    }
  }

  return fragments;
}

function getEventBody(event: PromptStreamEvent) {
  const fragments = collectTextFragments(event.parsed);

  if (fragments.length > 0) {
    return fragments.join("\n\n");
  }

  if (typeof event.parsed === "string") {
    return event.parsed;
  }

  return JSON.stringify(event.parsed, null, 2);
}

function parseSseFrames(buffer: string) {
  const frames = buffer.split(/\r?\n\r?\n/g);
  const rest = frames.pop() ?? "";
  const events: PromptStreamEvent[] = [];

  for (const frame of frames) {
    const lines = frame.split(/\r?\n/g);
    const dataLines = lines
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice(5).trimStart());

    if (dataLines.length === 0) {
      continue;
    }

    const raw = dataLines.join("\n");
    let parsed: unknown = raw;

    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = raw;
    }

    events.push({ raw, parsed });
  }

  return { events, rest };
}

function ErrorPanel({
  error,
  title,
}: {
  error: BackendError | null;
  title: string;
}) {
  if (!error) {
    return null;
  }

  return (
    <div className="rounded-3xl border border-[rgba(142,63,31,0.18)] bg-[rgba(185,93,51,0.08)] p-4 text-sm text-(--accent-strong)">
      <p className="font-medium text-foreground">{title}</p>
      <p className="mt-2">{error.message}</p>
      <pre className="mt-3 overflow-x-auto rounded-2xl bg-white/60 p-3 text-xs text-(--muted)">
        {JSON.stringify(error, null, 2)}
      </pre>
    </div>
  );
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

  async function handlePromptSubmit(event: React.FormEvent<HTMLFormElement>) {
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
      <header className="rounded-4xl border border-(--border) bg-(--panel) p-6 shadow-(--shadow) backdrop-blur sm:p-8">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-4xl space-y-4">
            <p className="font-mono text-xs uppercase tracking-[0.32em] text-(--muted)">
              Agent dashboard
            </p>
            <div className="space-y-3">
              <h1 className="text-4xl font-semibold tracking-[-0.04em] text-foreground sm:text-5xl">
                Repository controls, persisted sessions, and live agent events in one place.
              </h1>
              <p className="max-w-3xl text-base leading-7 text-(--muted) sm:text-lg">
                Every action stays explicit. Browser requests stop at Next.js, and the
                backend bearer token stays on the server.
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto] xl:min-w-120">
            <div className="rounded-3xl border border-(--border) bg-(--panel-strong) px-5 py-4">
              <p className="font-mono text-xs uppercase tracking-[0.24em] text-(--muted)">
                Signed in as
              </p>
              <p className="mt-2 text-base font-semibold text-foreground">{user.email}</p>
              <p className="mt-1 text-sm text-(--muted)">{user.name || "Dashboard user"}</p>
            </div>
            <button
              className="inline-flex items-center justify-center rounded-full border border-(--border) px-5 py-3 text-sm font-medium text-foreground transition hover:border-(--accent) hover:text-(--accent-strong) disabled:cursor-not-allowed disabled:opacity-70"
              disabled={isRefreshing}
              onClick={() => {
                startTransition(() => {
                  void refreshSnapshots();
                });
              }}
              type="button"
            >
              {isRefreshing ? "Refreshing..." : "Refresh"}
            </button>
            <SignOutButton />
          </div>
        </div>
      </header>

      <section className="grid gap-6 xl:grid-cols-[1fr_1fr_1.35fr]">
        <div className="space-y-6">
          <section className="rounded-4xl border border-(--border) bg-(--panel) p-6 shadow-(--shadow) backdrop-blur">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.24em] text-(--muted)">
                  Repository
                </p>
                <h2 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-foreground">
                  Git state and actions
                </h2>
              </div>
            </div>

            <ErrorPanel error={repositoryError} title="Repository request failed" />
            <ErrorPanel error={gitActionError} title="Git action failed" />

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="rounded-3xl border border-(--border) bg-(--panel-strong) p-4">
                <p className="font-mono text-xs uppercase tracking-[0.2em] text-(--muted)">
                  Current branch
                </p>
                <p className="mt-3 text-2xl font-semibold text-foreground">
                  {repositoryStatus?.branch || "Loading..."}
                </p>
              </div>
              <div className="rounded-3xl border border-(--border) bg-(--panel-strong) p-4">
                <p className="font-mono text-xs uppercase tracking-[0.2em] text-(--muted)">
                  Working tree
                </p>
                <p className="mt-3 text-2xl font-semibold text-foreground">
                  {repositoryStatus
                    ? repositoryStatus.hasUncommittedChanges
                      ? "Uncommitted changes"
                      : "Clean"
                    : "Loading..."}
                </p>
              </div>
            </div>

            <div className="mt-6 rounded-3xl border border-(--border) bg-(--panel-strong) p-4">
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-(--muted)">
                Local branches
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {branches.length > 0 ? (
                  branches.map((branch) => (
                    <span
                      key={branch}
                      className="rounded-full border border-(--border) px-3 py-1 text-sm text-foreground"
                    >
                      {branch}
                    </span>
                  ))
                ) : (
                  <span className="text-sm text-(--muted)">No branch data loaded.</span>
                )}
              </div>
            </div>

            <div className="mt-6 grid gap-4">
              <label className="grid gap-2">
                <span className="text-sm font-medium text-foreground">Checkout branch</span>
                <div className="flex gap-3">
                  <select
                    className="min-w-0 flex-1 rounded-2xl border border-(--border) bg-white px-4 py-3 text-sm text-foreground"
                    onChange={(event) => setCheckoutBranch(event.target.value)}
                    value={checkoutBranch}
                  >
                    {branches.map((branch) => (
                      <option key={branch} value={branch}>
                        {branch}
                      </option>
                    ))}
                  </select>
                  <button
                    className="rounded-full bg-(--accent) px-5 py-3 text-sm font-semibold text-white transition hover:bg-(--accent-strong) disabled:cursor-not-allowed disabled:opacity-70"
                    disabled={!checkoutBranch || pendingGitAction !== null}
                    onClick={() =>
                      void runGitAction("checkout", {
                        url: "/api/dashboard/git/checkout",
                        method: "POST",
                        headers: { "content-type": "application/json" },
                        body: JSON.stringify({ branch: checkoutBranch }),
                      })
                    }
                    type="button"
                  >
                    {pendingGitAction === "checkout" ? "Working..." : "Checkout"}
                  </button>
                </div>
              </label>

              <div className="grid gap-3 md:grid-cols-2">
                <label className="grid gap-2">
                  <span className="text-sm font-medium text-foreground">Merge source</span>
                  <select
                    className="rounded-2xl border border-(--border) bg-white px-4 py-3 text-sm text-foreground"
                    onChange={(event) => setMergeSource(event.target.value)}
                    value={mergeSource}
                  >
                    {branches.map((branch) => (
                      <option key={branch} value={branch}>
                        {branch}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-2">
                  <span className="text-sm font-medium text-foreground">Merge target</span>
                  <select
                    className="rounded-2xl border border-(--border) bg-white px-4 py-3 text-sm text-foreground"
                    onChange={(event) => setMergeTarget(event.target.value)}
                    value={mergeTarget}
                  >
                    {branches.map((branch) => (
                      <option key={branch} value={branch}>
                        {branch}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  className="rounded-full bg-(--accent) px-5 py-3 text-sm font-semibold text-white transition hover:bg-(--accent-strong) disabled:cursor-not-allowed disabled:opacity-70"
                  disabled={!mergeSource || !mergeTarget || pendingGitAction !== null}
                  onClick={() =>
                    void runGitAction("merge", {
                      url: "/api/dashboard/git/merge",
                      method: "POST",
                      headers: { "content-type": "application/json" },
                      body: JSON.stringify({ source: mergeSource, target: mergeTarget }),
                    })
                  }
                  type="button"
                >
                  {pendingGitAction === "merge" ? "Working..." : "Merge"}
                </button>
              </div>

              <div className="grid gap-3 md:grid-cols-[0.75fr_1.25fr_auto]">
                <label className="grid gap-2">
                  <span className="text-sm font-medium text-foreground">Push branch</span>
                  <select
                    className="rounded-2xl border border-(--border) bg-white px-4 py-3 text-sm text-foreground"
                    onChange={(event) => setPushBranch(event.target.value)}
                    value={pushBranch}
                  >
                    {branches.map((branch) => (
                      <option key={branch} value={branch}>
                        {branch}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-2">
                  <span className="text-sm font-medium text-foreground">Commit message</span>
                  <input
                    className="rounded-2xl border border-(--border) bg-white px-4 py-3 text-sm text-foreground"
                    onChange={(event) => setCommitMessage(event.target.value)}
                    placeholder="Required by the backend push endpoint"
                    value={commitMessage}
                  />
                </label>
                <button
                  className="self-end rounded-full bg-(--accent) px-5 py-3 text-sm font-semibold text-white transition hover:bg-(--accent-strong) disabled:cursor-not-allowed disabled:opacity-70"
                  disabled={!pushBranch || !commitMessage.trim() || pendingGitAction !== null}
                  onClick={() =>
                    void runGitAction("push", {
                      url: "/api/dashboard/git/push",
                      method: "POST",
                      headers: { "content-type": "application/json" },
                      body: JSON.stringify({
                        branch: pushBranch,
                        commitMessage: commitMessage.trim(),
                      }),
                    })
                  }
                  type="button"
                >
                  {pendingGitAction === "push" ? "Working..." : "Push"}
                </button>
              </div>

              <div className="grid gap-3 md:grid-cols-[1fr_auto_auto]">
                <label className="grid gap-2">
                  <span className="text-sm font-medium text-foreground">Delete branch</span>
                  <select
                    className="rounded-2xl border border-(--border) bg-white px-4 py-3 text-sm text-foreground"
                    onChange={(event) => setDeleteBranch(event.target.value)}
                    value={deleteBranch}
                  >
                    {branches.map((branch) => (
                      <option key={branch} value={branch}>
                        {branch}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  className="self-end rounded-full border border-(--border) px-5 py-3 text-sm font-semibold text-foreground transition hover:border-(--accent) hover:text-(--accent-strong) disabled:cursor-not-allowed disabled:opacity-70"
                  disabled={pendingGitAction !== null}
                  onClick={() =>
                    void runGitAction("revert", {
                      url: "/api/dashboard/git/revert",
                      method: "POST",
                      headers: { "content-type": "application/json" },
                      body: JSON.stringify({}),
                    })
                  }
                  type="button"
                >
                  {pendingGitAction === "revert" ? "Working..." : "Revert changes"}
                </button>
                <button
                  className="self-end rounded-full border border-[rgba(142,63,31,0.18)] px-5 py-3 text-sm font-semibold text-(--accent-strong) transition hover:border-(--accent) disabled:cursor-not-allowed disabled:opacity-70"
                  disabled={!deleteBranch || pendingGitAction !== null}
                  onClick={() =>
                    void runGitAction("delete-branch", {
                      url: "/api/dashboard/git/branch",
                      method: "DELETE",
                      headers: { "content-type": "application/json" },
                      body: JSON.stringify({ branch: deleteBranch }),
                    })
                  }
                  type="button"
                >
                  {pendingGitAction === "delete-branch" ? "Working..." : "Delete branch"}
                </button>
              </div>
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <section className="rounded-4xl border border-(--border) bg-(--panel) p-6 shadow-(--shadow) backdrop-blur">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.24em] text-(--muted)">
                  Sessions
                </p>
                <h2 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-foreground">
                  Persisted PI sessions
                </h2>
              </div>
              <button
                className="rounded-full border border-(--border) px-4 py-2 text-sm font-medium text-foreground transition hover:border-(--accent) hover:text-(--accent-strong)"
                onClick={() => setSelectedSessionId(null)}
                type="button"
              >
                Clear selection
              </button>
            </div>

            <ErrorPanel error={sessionsError} title="Session list request failed" />
            <ErrorPanel error={sessionActionError} title="Session action failed" />

            <div className="mt-6 space-y-3">
              {sessions.length > 0 ? (
                sessions.map((session) => {
                  const isActive = session.id === selectedSessionId;

                  return (
                    <article
                      key={session.id}
                      className={`rounded-3xl border p-4 transition ${
                        isActive
                          ? "border-(--accent) bg-[rgba(185,93,51,0.08)]"
                          : "border-(--border) bg-(--panel-strong)"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-foreground">
                            {session.name || session.id}
                          </p>
                          <p className="mt-1 break-all font-mono text-xs text-(--muted)">
                            {session.id}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            className="rounded-full border border-(--border) px-3 py-1.5 text-xs font-medium text-foreground transition hover:border-(--accent) hover:text-(--accent-strong)"
                            onClick={() => setSelectedSessionId(session.id)}
                            type="button"
                          >
                            {isActive ? "Active" : "Select"}
                          </button>
                          <button
                            className="rounded-full border border-[rgba(142,63,31,0.18)] px-3 py-1.5 text-xs font-medium text-(--accent-strong) transition hover:border-(--accent) disabled:cursor-not-allowed disabled:opacity-70"
                            disabled={pendingSessionDeletion === session.id}
                            onClick={() => void handleDeleteSession(session.id)}
                            type="button"
                          >
                            {pendingSessionDeletion === session.id ? "Deleting..." : "Delete"}
                          </button>
                        </div>
                      </div>

                      <dl className="mt-4 grid gap-2 text-sm text-(--muted)">
                        <div className="flex items-center justify-between gap-4">
                          <dt>Modified</dt>
                          <dd>{formatDate(session.modified)}</dd>
                        </div>
                        <div className="flex items-center justify-between gap-4">
                          <dt>Created</dt>
                          <dd>{formatDate(session.created)}</dd>
                        </div>
                        <div className="flex items-center justify-between gap-4">
                          <dt>Messages</dt>
                          <dd>{session.messageCount ?? "Unknown"}</dd>
                        </div>
                      </dl>

                      {session.firstMessage ? (
                        <p className="mt-4 rounded-2xl bg-white/50 p-3 text-sm leading-6 text-foreground">
                          {session.firstMessage}
                        </p>
                      ) : null}
                    </article>
                  );
                })
              ) : (
                <div className="rounded-3xl border border-dashed border-(--border) p-5 text-sm text-(--muted)">
                  No persisted sessions available.
                </div>
              )}
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <section className="rounded-4xl border border-(--border) bg-(--panel) p-6 shadow-(--shadow) backdrop-blur sm:p-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.24em] text-(--muted)">
                  Prompt
                </p>
                <h2 className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-foreground">
                  Chat-like agent interaction
                </h2>
              </div>

              <div className="inline-flex rounded-full border border-(--border) bg-(--panel-strong) p-1">
                {(["chat", "raw"] as const).map((mode) => (
                  <button
                    key={mode}
                    className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                      displayMode === mode
                        ? "bg-(--accent) text-white"
                        : "text-foreground hover:text-(--accent-strong)"
                    }`}
                    onClick={() => setDisplayMode(mode)}
                    type="button"
                  >
                    {mode === "chat" ? "Chat" : "Raw events"}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-6 rounded-3xl border border-(--border) bg-(--panel-strong) p-4">
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-(--muted)">
                Active session
              </p>
              <p className="mt-3 text-sm text-foreground">
                {selectedSession
                  ? `${selectedSession.name || selectedSession.id} (${selectedSession.id})`
                  : selectedSessionId
                    ? selectedSessionId
                    : "A new persisted session will be created on the next prompt."}
              </p>
            </div>

            <ErrorPanel error={promptError} title="Prompt request failed" />

            <form className="mt-6 space-y-4" onSubmit={handlePromptSubmit}>
              <label className="grid gap-2">
                <span className="text-sm font-medium text-foreground">Prompt</span>
                <textarea
                  className="min-h-40 rounded-3xl border border-(--border) bg-white px-4 py-4 text-sm leading-7 text-foreground"
                  disabled={isStreaming}
                  onChange={(event) => setPrompt(event.target.value)}
                  placeholder="Describe the change or ask the agent what to do next."
                  value={prompt}
                />
              </label>

              <div className="flex items-center justify-between gap-4">
                <p className="text-sm text-(--muted)">
                  {isStreaming
                    ? "A prompt stream is active. Additional submissions stay disabled until it finishes."
                    : "Prompts submit as prompt only or prompt plus sessionId, depending on the current selection."}
                </p>
                <button
                  className="rounded-full bg-(--accent) px-6 py-3 text-sm font-semibold text-white transition hover:bg-(--accent-strong) disabled:cursor-not-allowed disabled:opacity-70"
                  disabled={!prompt.trim() || isStreaming}
                  type="submit"
                >
                  {isStreaming ? "Streaming..." : "Send prompt"}
                </button>
              </div>
            </form>

            <div className="mt-6 space-y-4">
              {runs.length > 0 ? (
                runs.map((run) => (
                  <article key={run.id} className="rounded-4xl border border-(--border) bg-(--panel-strong) p-4">
                    <div className="rounded-3xl bg-white/70 p-4">
                      <p className="font-mono text-xs uppercase tracking-[0.2em] text-(--muted)">
                        Prompt
                      </p>
                      <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-foreground">
                        {run.prompt}
                      </p>
                    </div>

                    <div className="mt-4 space-y-3">
                      {displayMode === "chat" ? (
                        run.events.length > 0 ? (
                          run.events.map((streamEvent, index) => (
                            <div key={`${run.id}-${index}`} className="rounded-3xl border border-(--border) bg-white/60 p-4">
                              <p className="font-mono text-xs uppercase tracking-[0.2em] text-(--muted)">
                                {getEventLabel(streamEvent)}
                              </p>
                              <pre className="mt-3 overflow-x-auto whitespace-pre-wrap wrap-break-word text-sm leading-7 text-foreground">
                                {getEventBody(streamEvent)}
                              </pre>
                            </div>
                          ))
                        ) : (
                          <div className="rounded-3xl border border-dashed border-(--border) p-4 text-sm text-(--muted)">
                            {run.completed
                              ? "No events were received for this run."
                              : "Waiting for the first streamed event..."}
                          </div>
                        )
                      ) : run.events.length > 0 ? (
                        run.events.map((streamEvent, index) => (
                          <pre
                            key={`${run.id}-${index}`}
                            className="overflow-x-auto rounded-3xl border border-(--border) bg-white/60 p-4 text-xs leading-6 text-foreground"
                          >
                            {JSON.stringify(streamEvent.parsed, null, 2)}
                          </pre>
                        ))
                      ) : (
                        <div className="rounded-3xl border border-dashed border-(--border) p-4 text-sm text-(--muted)">
                          {run.completed
                            ? "No raw events were received for this run."
                            : "Waiting for streamed events..."}
                        </div>
                      )}
                    </div>

                    {run.streamError ? (
                      <div className="mt-4 rounded-3xl border border-[rgba(142,63,31,0.18)] bg-[rgba(185,93,51,0.08)] p-4 text-sm text-(--accent-strong)">
                        {run.streamError}
                      </div>
                    ) : null}
                  </article>
                ))
              ) : (
                <div className="rounded-4xl border border-dashed border-(--border) p-6 text-sm text-(--muted)">
                  Submit a prompt to start the transcript.
                </div>
              )}
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}