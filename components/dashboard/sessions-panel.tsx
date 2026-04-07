import type { AgentSession, BackendError } from "@/lib/dashboard-types";

import { ErrorPanel } from "@/components/dashboard/error-panel";

type SessionsPanelProps = {
  actions: {
    onDeleteSession: (sessionId: string) => Promise<void>;
    onSelectSession: (sessionId: string | null) => void;
  };
  state: {
    pendingSessionDeletion: string | null;
    selectedSessionId: string | null;
    sessionActionError: BackendError | null;
    sessions: AgentSession[];
    sessionsError: BackendError | null;
  };
};

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

export function SessionsPanel({ actions, state }: SessionsPanelProps) {
  return (
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
            onClick={() => actions.onSelectSession(null)}
            type="button"
          >
            Clear selection
          </button>
        </div>

        <ErrorPanel error={state.sessionsError} title="Session list request failed" />
        <ErrorPanel error={state.sessionActionError} title="Session action failed" />

        <div className="mt-6 space-y-3">
          {state.sessions.length > 0 ? (
            state.sessions.map((session) => {
              const isActive = session.id === state.selectedSessionId;

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
                        onClick={() => actions.onSelectSession(session.id)}
                        type="button"
                      >
                        {isActive ? "Active" : "Select"}
                      </button>
                      <button
                        className="rounded-full border border-[rgba(142,63,31,0.18)] px-3 py-1.5 text-xs font-medium text-(--accent-strong) transition hover:border-(--accent) disabled:cursor-not-allowed disabled:opacity-70"
                        disabled={state.pendingSessionDeletion === session.id}
                        onClick={() => void actions.onDeleteSession(session.id)}
                        type="button"
                      >
                        {state.pendingSessionDeletion === session.id ? "Deleting..." : "Delete"}
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
  );
}