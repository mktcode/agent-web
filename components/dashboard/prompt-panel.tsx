import type { FormEvent } from "react";

import { ErrorPanel } from "@/components/dashboard/error-panel";
import { PromptRunCard } from "@/components/dashboard/prompt-run-card";
import type { DisplayMode, PromptRunView } from "@/components/dashboard/prompt-utils";
import type { AgentSession, BackendError } from "@/lib/dashboard-types";

type PromptPanelProps = {
  actions: {
    onDisplayModeChange: (mode: DisplayMode) => void;
    onPromptChange: (value: string) => void;
    onSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  };
  state: {
    displayMode: DisplayMode;
    isStreaming: boolean;
    prompt: string;
    promptError: BackendError | null;
    runViews: PromptRunView[];
    selectedSession: AgentSession | null;
    selectedSessionId: string | null;
  };
};

function getLatestActivity(runViews: PromptRunView[]) {
  return [...runViews].reverse().find((run) => run.activityState !== null) ?? null;
}

export function PromptPanel({ actions, state }: PromptPanelProps) {
  const latestActivityRun = getLatestActivity(state.runViews);
  const activityLabel = latestActivityRun?.activityState
    ? latestActivityRun.activityState === "thinking"
      ? "Thinking"
      : "Working"
    : null;

  return (
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
                  state.displayMode === mode
                    ? "bg-(--accent) text-white"
                    : "text-foreground hover:text-(--accent-strong)"
                }`}
                onClick={() => actions.onDisplayModeChange(mode)}
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
            {state.selectedSession
              ? `${state.selectedSession.name || state.selectedSession.id} (${state.selectedSession.id})`
              : state.selectedSessionId
                ? state.selectedSessionId
                : "A new persisted session will be created on the next prompt."}
          </p>

          {activityLabel ? (
            <div className="mt-4 inline-flex items-center gap-3 rounded-full border border-(--border) bg-white/70 px-4 py-2 text-sm font-medium text-foreground">
              <span className="h-2.5 w-2.5 rounded-full bg-(--accent) animate-pulse" />
              {activityLabel}
            </div>
          ) : null}
        </div>

        <ErrorPanel error={state.promptError} title="Prompt request failed" />

        <form className="mt-6 space-y-4" onSubmit={actions.onSubmit}>
          <label className="grid gap-2">
            <span className="text-sm font-medium text-foreground">Prompt</span>
            <textarea
              className="min-h-40 rounded-3xl border border-(--border) bg-white px-4 py-4 text-sm leading-7 text-foreground"
              disabled={state.isStreaming}
              onChange={(event) => actions.onPromptChange(event.target.value)}
              placeholder="Describe the change or ask the agent what to do next."
              value={state.prompt}
            />
          </label>

          <div className="flex items-center justify-between gap-4">
            <p className="text-sm text-(--muted)">
              {state.isStreaming
                ? "A prompt stream is active. Additional submissions stay disabled until it finishes."
                : "Prompts submit as prompt only or prompt plus sessionId, depending on the current selection."}
            </p>
            <button
              className="rounded-full bg-(--accent) px-6 py-3 text-sm font-semibold text-white transition hover:bg-(--accent-strong) disabled:cursor-not-allowed disabled:opacity-70"
              disabled={!state.prompt.trim() || state.isStreaming}
              type="submit"
            >
              {state.isStreaming ? "Streaming..." : "Send prompt"}
            </button>
          </div>
        </form>

        <div className="mt-6 space-y-4">
          {state.runViews.length > 0 ? (
            state.runViews.map((run) => (
              <PromptRunCard key={run.id} displayMode={state.displayMode} run={run} />
            ))
          ) : (
            <div className="rounded-4xl border border-dashed border-(--border) p-6 text-sm text-(--muted)">
              Submit a prompt to start the transcript.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}