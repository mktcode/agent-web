import type { DisplayMode, PromptRunView } from "@/components/dashboard/prompt-utils";

type PromptRunCardProps = {
  displayMode: DisplayMode;
  run: PromptRunView;
};

function formatActivityLabel(activityState: PromptRunView["activityState"]) {
  if (!activityState) {
    return null;
  }

  return activityState === "thinking" ? "Thinking" : "Working";
}

export function PromptRunCard({ displayMode, run }: PromptRunCardProps) {
  const activityLabel = formatActivityLabel(run.activityState);
  const statusLabel = run.completed
    ? "Completed"
    : activityLabel || (run.hasFinalReply ? "Reply ready" : "Streaming");

  return (
    <article className="rounded-4xl border border-(--border) bg-(--panel-strong) p-4">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-(--muted)">
            Session
          </p>
          <p className="mt-2 text-sm text-foreground">{run.sessionId || "New session"}</p>
        </div>
        <div className="rounded-full border border-(--border) px-3 py-1 text-xs font-medium text-(--muted)">
          {statusLabel}
        </div>
      </div>

      <div className="mt-4 space-y-4">
        {displayMode === "chat" ? (
          <div className="space-y-4">
            {run.chatItems.map((item) =>
              item.kind === "user" ? (
                <div key={item.id} className="flex justify-end">
                  <div className="max-w-[85%] rounded-[1.75rem] rounded-br-md bg-(--accent) px-5 py-4 text-white shadow-(--shadow)">
                    <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/70">
                      {item.label}
                    </p>
                    <p className="mt-3 whitespace-pre-wrap text-sm leading-7">{item.body}</p>
                  </div>
                </div>
              ) : item.kind === "assistant" ? (
                <div key={item.id} className="flex justify-start gap-3">
                  <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-foreground text-xs font-semibold uppercase tracking-[0.2em] text-(--panel-strong)">
                    AI
                  </div>
                  <div className="max-w-[88%] rounded-[1.75rem] rounded-bl-md border border-(--border) bg-white/75 px-5 py-4">
                    <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-(--muted)">
                      {item.label}
                    </p>
                    <pre className="mt-3 overflow-x-auto whitespace-pre-wrap wrap-break-word text-sm leading-7 text-foreground">
                      {item.body}
                    </pre>
                  </div>
                </div>
              ) : (
                <div key={item.id} className="flex justify-center">
                  <div className="max-w-[90%] rounded-3xl border border-dashed border-(--border) bg-white/55 px-4 py-3">
                    <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-(--muted)">
                      {item.label}
                    </p>
                    <pre className="mt-2 overflow-x-auto whitespace-pre-wrap wrap-break-word text-xs leading-6 text-(--muted)">
                      {item.body}
                    </pre>
                  </div>
                </div>
              ),
            )}
          </div>
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

      {run.completed && run.events.length === 0 && !run.streamError ? (
        <div className="mt-4 rounded-3xl border border-dashed border-(--border) p-4 text-sm text-(--muted)">
          No events were received for this run.
        </div>
      ) : null}
    </article>
  );
}