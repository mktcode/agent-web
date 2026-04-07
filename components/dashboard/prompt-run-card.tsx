import type { ActivityState, DisplayMode } from "./prompt-utils";
import type { UiSessionItem } from "@/lib/dashboard-types";

type PromptRunCardProps = {
  activityState: ActivityState;
  displayMode: DisplayMode;
  isTranscriptLoading: boolean;
  rawItems: unknown[];
  selectedSessionId: string | null;
  uiItems: UiSessionItem[];
};

function formatActivityLabel(activityState: ActivityState) {
  if (!activityState) {
    return null;
  }

  return activityState === "thinking" ? "Thinking" : "Working";
}

function getToolLabel(item: UiSessionItem) {
  return item.toolName ? `Tool · ${item.toolName}` : "Tool";
}

function getSecondaryText(item: UiSessionItem) {
  if (item.text?.trim()) {
    return item.text;
  }

  if (item.kind === "thinking") {
    return item.status === "streaming" ? "Thinking..." : "No thinking text available.";
  }

  if (item.kind === "tool") {
    return item.status === "streaming" ? "Working..." : "No tool details available.";
  }

  return "";
}

export function PromptRunCard({
  activityState,
  displayMode,
  isTranscriptLoading,
  rawItems,
  selectedSessionId,
  uiItems,
}: PromptRunCardProps) {
  const activityLabel = formatActivityLabel(activityState);
  const statusLabel = isTranscriptLoading ? "Loading..." : activityLabel || "Ready";

  return (
    <article className="rounded-4xl border border-(--border) bg-(--panel-strong) p-4">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-(--muted)">
            Session
          </p>
          <p className="mt-2 text-sm text-foreground">{selectedSessionId || "New session"}</p>
        </div>
        <div className="rounded-full border border-(--border) px-3 py-1 text-xs font-medium text-(--muted)">
          {statusLabel}
        </div>
      </div>

      <div className="mt-4 space-y-4">
        {displayMode === "chat" ? (
          uiItems.length > 0 ? (
            <div className="space-y-4">
              {uiItems.map((item) =>
                item.kind === "message" && item.role === "user" ? (
                <div key={item.id} className="flex justify-end">
                  <div className="max-w-[85%] rounded-[1.75rem] rounded-br-md bg-(--accent) px-5 py-4 text-white shadow-(--shadow)">
                    <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/70">
                      {item.status === "streaming" ? "Prompt · streaming" : "Prompt"}
                    </p>
                    <p className="mt-3 whitespace-pre-wrap text-sm leading-7">{item.text ?? ""}</p>
                  </div>
                </div>
                ) : item.kind === "message" && item.role === "assistant" ? (
                <div key={item.id} className="flex justify-start gap-3">
                  <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-foreground text-xs font-semibold uppercase tracking-[0.2em] text-(--panel-strong)">
                    AI
                  </div>
                  <div className="max-w-[88%] rounded-[1.75rem] rounded-bl-md border border-(--border) bg-white/75 px-5 py-4">
                    <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-(--muted)">
                      {item.status === "streaming"
                        ? "Agent · streaming"
                        : item.isError
                          ? "Agent · error"
                          : "Agent"}
                    </p>
                    <pre className="mt-3 overflow-x-auto whitespace-pre-wrap wrap-break-word text-sm leading-7 text-foreground">
                      {item.text ?? ""}
                    </pre>
                  </div>
                </div>
              ) : (
                <div key={item.id} className="flex justify-center">
                  <div className="max-w-[90%] rounded-3xl border border-dashed border-(--border) bg-white/55 px-4 py-3">
                    <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-(--muted)">
                      {item.kind === "thinking" ? "Thinking" : getToolLabel(item)}
                    </p>
                    <pre className="mt-2 overflow-x-auto whitespace-pre-wrap wrap-break-word text-xs leading-6 text-(--muted)">
                      {getSecondaryText(item)}
                    </pre>
                  </div>
                </div>
              ),
              )}
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-(--border) p-4 text-sm text-(--muted)">
              {isTranscriptLoading
                ? "Loading transcript..."
                : selectedSessionId
                  ? "No UI transcript items are available for this session yet."
                  : "Select a session or submit a prompt to start the transcript."}
            </div>
          )
        ) : rawItems.length > 0 ? (
          rawItems.map((item, index) => (
            <pre
              key={`${selectedSessionId ?? "new"}-${index}`}
              className="overflow-x-auto rounded-3xl border border-(--border) bg-white/60 p-4 text-xs leading-6 text-foreground"
            >
              {JSON.stringify(item, null, 2)}
            </pre>
          ))
        ) : (
          <div className="rounded-3xl border border-dashed border-(--border) p-4 text-sm text-(--muted)">
            {isTranscriptLoading
              ? "Loading transcript..."
              : selectedSessionId
                ? "No raw history is available for this session yet."
                : "Select a session to inspect raw history."}
          </div>
        )}
      </div>
    </article>
  );
}