import type {
  PromptStreamEvent,
  UiSessionItem,
  UiSessionItemEvent,
} from "@/lib/dashboard-types";

export type DisplayMode = "chat" | "raw";

export type ActivityState = "thinking" | "working" | null;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function isUiSessionItemEvent(value: unknown): value is UiSessionItemEvent {
  if (!isRecord(value) || value.type !== "session_item") {
    return false;
  }

  const item = value.item;

  return (
    isRecord(item) &&
    typeof item.id === "string" &&
    typeof item.sessionId === "string" &&
    typeof item.kind === "string" &&
    typeof item.status === "string" &&
    typeof item.timestamp === "string" &&
    typeof item.isError === "boolean"
  );
}

export function upsertUiSessionItem(
  items: UiSessionItem[],
  nextItem: UiSessionItem,
): UiSessionItem[] {
  const index = items.findIndex((item) => item.id === nextItem.id);

  if (index === -1) {
    return [...items, nextItem];
  }

  return items.map((item, itemIndex) => (itemIndex === index ? nextItem : item));
}

export function getUiSessionActivityState(items: UiSessionItem[]): ActivityState {
  const latestStreamingItem = [...items]
    .reverse()
    .find((item) => item.status === "streaming");

  if (!latestStreamingItem) {
    return null;
  }

  return latestStreamingItem.kind === "thinking" ? "thinking" : "working";
}

export function parseSseFrames(buffer: string) {
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