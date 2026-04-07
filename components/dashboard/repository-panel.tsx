import type { BackendError, RepositoryStatus } from "@/lib/dashboard-types";

import { ErrorPanel } from "@/components/dashboard/error-panel";

type RepositoryPanelProps = {
  actions: {
    onCheckoutBranchChange: (value: string) => void;
    onCommitMessageChange: (value: string) => void;
    onDeleteBranchChange: (value: string) => void;
    onMergeSourceChange: (value: string) => void;
    onMergeTargetChange: (value: string) => void;
    onPushBranchChange: (value: string) => void;
    runGitAction: (label: string, input: RequestInit & { url: string }) => Promise<void>;
  };
  state: {
    branches: string[];
    checkoutBranch: string;
    commitMessage: string;
    deleteBranch: string;
    gitActionError: BackendError | null;
    mergeSource: string;
    mergeTarget: string;
    pendingGitAction: string | null;
    pushBranch: string;
    repositoryError: BackendError | null;
    repositoryStatus: RepositoryStatus | null;
  };
};

export function RepositoryPanel({ actions, state }: RepositoryPanelProps) {
  return (
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

        <ErrorPanel error={state.repositoryError} title="Repository request failed" />
        <ErrorPanel error={state.gitActionError} title="Git action failed" />

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-3xl border border-(--border) bg-(--panel-strong) p-4">
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-(--muted)">
              Current branch
            </p>
            <p className="mt-3 text-2xl font-semibold text-foreground">
              {state.repositoryStatus?.branch || "Loading..."}
            </p>
          </div>
          <div className="rounded-3xl border border-(--border) bg-(--panel-strong) p-4">
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-(--muted)">
              Working tree
            </p>
            <p className="mt-3 text-2xl font-semibold text-foreground">
              {state.repositoryStatus
                ? state.repositoryStatus.hasUncommittedChanges
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
            {state.branches.length > 0 ? (
              state.branches.map((branch) => (
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
                onChange={(event) => actions.onCheckoutBranchChange(event.target.value)}
                value={state.checkoutBranch}
              >
                {state.branches.map((branch) => (
                  <option key={branch} value={branch}>
                    {branch}
                  </option>
                ))}
              </select>
              <button
                className="rounded-full bg-(--accent) px-5 py-3 text-sm font-semibold text-white transition hover:bg-(--accent-strong) disabled:cursor-not-allowed disabled:opacity-70"
                disabled={!state.checkoutBranch || state.pendingGitAction !== null}
                onClick={() =>
                  void actions.runGitAction("checkout", {
                    url: "/api/dashboard/git/checkout",
                    method: "POST",
                    headers: { "content-type": "application/json" },
                    body: JSON.stringify({ branch: state.checkoutBranch }),
                  })
                }
                type="button"
              >
                {state.pendingGitAction === "checkout" ? "Working..." : "Checkout"}
              </button>
            </div>
          </label>

          <div className="grid gap-3 md:grid-cols-2">
            <label className="grid gap-2">
              <span className="text-sm font-medium text-foreground">Merge source</span>
              <select
                className="rounded-2xl border border-(--border) bg-white px-4 py-3 text-sm text-foreground"
                onChange={(event) => actions.onMergeSourceChange(event.target.value)}
                value={state.mergeSource}
              >
                {state.branches.map((branch) => (
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
                onChange={(event) => actions.onMergeTargetChange(event.target.value)}
                value={state.mergeTarget}
              >
                {state.branches.map((branch) => (
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
              disabled={!state.mergeSource || !state.mergeTarget || state.pendingGitAction !== null}
              onClick={() =>
                void actions.runGitAction("merge", {
                  url: "/api/dashboard/git/merge",
                  method: "POST",
                  headers: { "content-type": "application/json" },
                  body: JSON.stringify({ source: state.mergeSource, target: state.mergeTarget }),
                })
              }
              type="button"
            >
              {state.pendingGitAction === "merge" ? "Working..." : "Merge"}
            </button>
          </div>

          <div className="grid gap-3 md:grid-cols-[0.75fr_1.25fr_auto]">
            <label className="grid gap-2">
              <span className="text-sm font-medium text-foreground">Push branch</span>
              <select
                className="rounded-2xl border border-(--border) bg-white px-4 py-3 text-sm text-foreground"
                onChange={(event) => actions.onPushBranchChange(event.target.value)}
                value={state.pushBranch}
              >
                {state.branches.map((branch) => (
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
                onChange={(event) => actions.onCommitMessageChange(event.target.value)}
                placeholder="Required by the backend push endpoint"
                value={state.commitMessage}
              />
            </label>
            <button
              className="self-end rounded-full bg-(--accent) px-5 py-3 text-sm font-semibold text-white transition hover:bg-(--accent-strong) disabled:cursor-not-allowed disabled:opacity-70"
              disabled={!state.pushBranch || !state.commitMessage.trim() || state.pendingGitAction !== null}
              onClick={() =>
                void actions.runGitAction("push", {
                  url: "/api/dashboard/git/push",
                  method: "POST",
                  headers: { "content-type": "application/json" },
                  body: JSON.stringify({
                    branch: state.pushBranch,
                    commitMessage: state.commitMessage.trim(),
                  }),
                })
              }
              type="button"
            >
              {state.pendingGitAction === "push" ? "Working..." : "Push"}
            </button>
          </div>

          <div className="grid gap-3 md:grid-cols-[1fr_auto_auto]">
            <label className="grid gap-2">
              <span className="text-sm font-medium text-foreground">Delete branch</span>
              <select
                className="rounded-2xl border border-(--border) bg-white px-4 py-3 text-sm text-foreground"
                onChange={(event) => actions.onDeleteBranchChange(event.target.value)}
                value={state.deleteBranch}
              >
                {state.branches.map((branch) => (
                  <option key={branch} value={branch}>
                    {branch}
                  </option>
                ))}
              </select>
            </label>
            <button
              className="self-end rounded-full border border-(--border) px-5 py-3 text-sm font-semibold text-foreground transition hover:border-(--accent) hover:text-(--accent-strong) disabled:cursor-not-allowed disabled:opacity-70"
              disabled={state.pendingGitAction !== null}
              onClick={() =>
                void actions.runGitAction("revert", {
                  url: "/api/dashboard/git/revert",
                  method: "POST",
                  headers: { "content-type": "application/json" },
                  body: JSON.stringify({}),
                })
              }
              type="button"
            >
              {state.pendingGitAction === "revert" ? "Working..." : "Revert changes"}
            </button>
            <button
              className="self-end rounded-full border border-[rgba(142,63,31,0.18)] px-5 py-3 text-sm font-semibold text-(--accent-strong) transition hover:border-(--accent) disabled:cursor-not-allowed disabled:opacity-70"
              disabled={!state.deleteBranch || state.pendingGitAction !== null}
              onClick={() =>
                void actions.runGitAction("delete-branch", {
                  url: "/api/dashboard/git/branch",
                  method: "DELETE",
                  headers: { "content-type": "application/json" },
                  body: JSON.stringify({ branch: state.deleteBranch }),
                })
              }
              type="button"
            >
              {state.pendingGitAction === "delete-branch" ? "Working..." : "Delete branch"}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}