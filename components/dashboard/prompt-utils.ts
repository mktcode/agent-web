import type { PromptStreamEvent } from "@/lib/dashboard-types";

export type DisplayMode = "chat" | "raw";

export type TranscriptRun = {
  completed: boolean;
  events: PromptStreamEvent[];
  id: string;
  prompt: string;
  sessionId: string | null;
  streamError: string | null;
};

export type ChatItem = {
  body: string;
  id: string;
  kind: "assistant" | "system" | "user";
  label: string;
};

export type ActivityState = "thinking" | "working" | null;

export type PromptRunView = TranscriptRun & {
  activityState: ActivityState;
  chatItems: ChatItem[];
  hasFinalReply: boolean;
};

const SESSION_ENTRY_TYPES = new Set([
  "branch_summary",
  "compaction",
  "custom",
  "custom_message",
  "label",
  "message",
  "model_change",
  "session",
  "session_info",
  "thinking_level_change",
]);

const SESSION_ENTRY_WRAPPER_KEYS = [
  "data",
  "entries",
  "entry",
  "event",
  "payload",
  "sessionEntry",
  "sessionEntries",
  "value",
];

type ToolCallSummary = {
  arguments?: unknown;
  name: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getString(value: unknown) {
  return typeof value === "string" ? value : null;
}

function safeStringify(value: unknown) {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function pushIfPresent(target: string[], value: string | null) {
  if (!value) {
    return;
  }

  const trimmed = value.trim();

  if (trimmed) {
    target.push(trimmed);
  }
}

function getContentBlocks(content: unknown) {
  if (typeof content === "string") {
    return [{ type: "text", text: content }];
  }

  if (!Array.isArray(content)) {
    return [];
  }

  return content.filter(isRecord);
}

function getTextBlocks(content: unknown) {
  const fragments: string[] = [];

  for (const block of getContentBlocks(content)) {
    if (getString(block.type) === "text") {
      pushIfPresent(fragments, getString(block.text));
    }
  }

  return fragments;
}

function getThinkingBlocks(content: unknown) {
  const fragments: string[] = [];

  for (const block of getContentBlocks(content)) {
    if (getString(block.type) === "thinking") {
      pushIfPresent(fragments, getString(block.thinking));
    }
  }

  return fragments;
}

function getToolCalls(content: unknown) {
  const calls: ToolCallSummary[] = [];

  for (const block of getContentBlocks(content)) {
    if (getString(block.type) === "toolCall") {
      const name = getString(block.name);

      if (name) {
        calls.push({
          name,
          arguments: block.arguments,
        });
      }
    }
  }

  return calls;
}

function joinText(fragments: string[]) {
  return fragments.length > 0 ? fragments.join("\n\n") : null;
}

function summarizeToolCalls(toolCalls: ToolCallSummary[]) {
  return toolCalls
    .map((toolCall) => {
      const argumentsText = toolCall.arguments
        ? `\n${safeStringify(toolCall.arguments)}`
        : "";

      return `${toolCall.name}${argumentsText}`;
    })
    .join("\n\n");
}

function buildSystemItem(id: string, label: string, body: string) {
  return {
    body,
    id,
    kind: "system" as const,
    label,
  };
}

function isSessionEntryRecord(value: unknown): value is Record<string, unknown> {
  return isRecord(value) && typeof value.type === "string" && SESSION_ENTRY_TYPES.has(value.type);
}

function extractSessionEntries(value: unknown): Array<Record<string, unknown>> {
  if (Array.isArray(value)) {
    return value.flatMap((item) => extractSessionEntries(item));
  }

  if (!isRecord(value)) {
    return [];
  }

  if (isSessionEntryRecord(value)) {
    return [value];
  }

  const message = value["message"];

  if (isRecord(message) && typeof message["role"] === "string") {
    return [{ type: "message", message }];
  }

  const entries: Array<Record<string, unknown>> = [];

  for (const key of SESSION_ENTRY_WRAPPER_KEYS) {
    if (key in value) {
      entries.push(...extractSessionEntries(value[key]));
    }
  }

  return entries;
}

function getEntryKey(entry: Record<string, unknown>, index: number) {
  const entryType = getString(entry.type) || "unknown";
  const entryId = getString(entry.id);

  if (entryId) {
    return `${entryType}:${entryId}`;
  }

  const message = entry.message;

  if (isRecord(message)) {
    const role = getString(message.role) || "message";
    const timestamp = String(message.timestamp ?? entry.timestamp ?? index);
    const responseId = getString(message.responseId);

    if (responseId) {
      return `${entryType}:${role}:${responseId}`;
    }

    return `${entryType}:${role}:${timestamp}`;
  }

  return `${entryType}:${safeStringify(entry)}`;
}

function dedupeEntries(entries: Array<Record<string, unknown>>) {
  const uniqueEntries = new Map<string, Record<string, unknown>>();

  entries.forEach((entry, index) => {
    uniqueEntries.set(getEntryKey(entry, index), entry);
  });

  return Array.from(uniqueEntries.values());
}

function getMessageEntryView(
  entry: Record<string, unknown>,
  run: TranscriptRun,
  index: number,
) {
  const message = entry.message;

  if (!isRecord(message)) {
    return { activityState: null as ActivityState, hasFinalReply: false, items: [] as ChatItem[] };
  }

  const role = getString(message.role);

  if (!role) {
    return { activityState: null as ActivityState, hasFinalReply: false, items: [] as ChatItem[] };
  }

  if (role === "user") {
    const userText = joinText(getTextBlocks(message.content));

    if (userText && userText !== run.prompt) {
      return {
        activityState: null as ActivityState,
        hasFinalReply: false,
        items: [
          {
            body: userText,
            id: `${run.id}-message-${index}`,
            kind: "user" as const,
            label: "Prompt",
          },
        ],
      };
    }

    return { activityState: null as ActivityState, hasFinalReply: false, items: [] as ChatItem[] };
  }

  if (role === "assistant") {
    const assistantText = joinText(getTextBlocks(message.content));

    if (assistantText) {
      return {
        activityState: null as ActivityState,
        hasFinalReply: true,
        items: [
          {
            body: assistantText,
            id: `${run.id}-message-${index}`,
            kind: "assistant" as const,
            label: "Agent",
          },
        ],
      };
    }

    const toolCalls = getToolCalls(message.content);

    if (toolCalls.length > 0) {
      return {
        activityState: "working" as ActivityState,
        hasFinalReply: false,
        items: [
          buildSystemItem(
            `${run.id}-message-${index}`,
            "Tool call",
            summarizeToolCalls(toolCalls),
          ),
        ],
      };
    }

    const thinkingText = joinText(getThinkingBlocks(message.content));

    if (thinkingText) {
      return {
        activityState: "thinking" as ActivityState,
        hasFinalReply: false,
        items: [],
      };
    }

    const errorMessage = getString(message.errorMessage);

    if (errorMessage) {
      return {
        activityState: "working" as ActivityState,
        hasFinalReply: false,
        items: [buildSystemItem(`${run.id}-message-${index}`, "Assistant error", errorMessage)],
      };
    }

    return {
      activityState: "working" as ActivityState,
      hasFinalReply: false,
      items: [],
    };
  }

  if (role === "toolResult") {
    const body =
      joinText(getTextBlocks(message.content)) ||
      safeStringify(message.details ?? message.content ?? message);
    const toolName = getString(message.toolName);

    return {
      activityState: "working" as ActivityState,
      hasFinalReply: false,
      items: [
        buildSystemItem(
          `${run.id}-message-${index}`,
          toolName ? `Tool result · ${toolName}` : "Tool result",
          body,
        ),
      ],
    };
  }

  if (role === "bashExecution") {
    const command = getString(message.command);
    const output = getString(message.output);
    const body = [command ? `$ ${command}` : null, output]
      .filter((value): value is string => Boolean(value))
      .join("\n");

    return {
      activityState: "working" as ActivityState,
      hasFinalReply: false,
      items: [buildSystemItem(`${run.id}-message-${index}`, "Command", body || safeStringify(message))],
    };
  }

  if (role === "custom") {
    if (message.display === true) {
      const body = joinText(getTextBlocks(message.content)) || safeStringify(message.content);
      const customType = getString(message.customType) || "Extension";

      return {
        activityState: "working" as ActivityState,
        hasFinalReply: false,
        items: [buildSystemItem(`${run.id}-message-${index}`, customType, body)],
      };
    }

    return { activityState: null as ActivityState, hasFinalReply: false, items: [] as ChatItem[] };
  }

  if (role === "branchSummary") {
    const summary = getString(message.summary);

    return summary
      ? {
          activityState: "working" as ActivityState,
          hasFinalReply: false,
          items: [buildSystemItem(`${run.id}-message-${index}`, "Branch summary", summary)],
        }
      : { activityState: null as ActivityState, hasFinalReply: false, items: [] as ChatItem[] };
  }

  if (role === "compactionSummary") {
    const summary = getString(message.summary);

    return summary
      ? {
          activityState: "working" as ActivityState,
          hasFinalReply: false,
          items: [buildSystemItem(`${run.id}-message-${index}`, "Compaction summary", summary)],
        }
      : { activityState: null as ActivityState, hasFinalReply: false, items: [] as ChatItem[] };
  }

  return {
    activityState: "working" as ActivityState,
    hasFinalReply: false,
    items: [],
  };
}

function getEntryView(entry: Record<string, unknown>, run: TranscriptRun, index: number) {
  const entryType = getString(entry.type);

  if (!entryType) {
    return { activityState: null as ActivityState, hasFinalReply: false, items: [] as ChatItem[] };
  }

  if (entryType === "message") {
    return getMessageEntryView(entry, run, index);
  }

  if (entryType === "custom_message") {
    if (entry.display === true) {
      const customType = getString(entry.customType) || "Extension";
      const body = joinText(getTextBlocks(entry.content)) || safeStringify(entry.content);

      return {
        activityState: "working" as ActivityState,
        hasFinalReply: false,
        items: [buildSystemItem(`${run.id}-entry-${index}`, customType, body)],
      };
    }

    return { activityState: null as ActivityState, hasFinalReply: false, items: [] as ChatItem[] };
  }

  if (entryType === "compaction") {
    const summary = getString(entry.summary);

    return summary
      ? {
          activityState: "working" as ActivityState,
          hasFinalReply: false,
          items: [buildSystemItem(`${run.id}-entry-${index}`, "Compaction summary", summary)],
        }
      : { activityState: null as ActivityState, hasFinalReply: false, items: [] as ChatItem[] };
  }

  if (entryType === "branch_summary") {
    const summary = getString(entry.summary);

    return summary
      ? {
          activityState: "working" as ActivityState,
          hasFinalReply: false,
          items: [buildSystemItem(`${run.id}-entry-${index}`, "Branch summary", summary)],
        }
      : { activityState: null as ActivityState, hasFinalReply: false, items: [] as ChatItem[] };
  }

  return { activityState: null as ActivityState, hasFinalReply: false, items: [] as ChatItem[] };
}

function mergeChatItems(items: ChatItem[]) {
  const merged: ChatItem[] = [];

  for (const item of items) {
    const previousItem = merged[merged.length - 1];

    if (previousItem && previousItem.kind === item.kind && previousItem.label === item.label) {
      previousItem.body = `${previousItem.body}\n\n${item.body}`;
      continue;
    }

    merged.push({ ...item });
  }

  return merged;
}

export function buildPromptRunView(run: TranscriptRun): PromptRunView {
  const baseItems: ChatItem[] = [
    {
      body: run.prompt,
      id: `${run.id}-prompt`,
      kind: "user",
      label: "Prompt",
    },
  ];
  let activityState: ActivityState = run.completed ? null : "working";
  let hasFinalReply = false;
  const runEntries: Array<Record<string, unknown>> = [];

  run.events.forEach((event) => {
    const entries = extractSessionEntries(event.parsed);

    if (entries.length > 0) {
      runEntries.push(...entries);
      return;
    }

    if (isRecord(event.parsed)) {
      runEntries.push(event.parsed);
    }
  });

  dedupeEntries(runEntries).forEach((entry, index) => {
    const entryView = getEntryView(entry, run, index);

    if (entryView.items.length > 0) {
      baseItems.push(...entryView.items);
    }

    if (!hasFinalReply && entryView.hasFinalReply) {
      hasFinalReply = true;
    }

    if (!hasFinalReply && entryView.activityState) {
      activityState = entryView.activityState;
    }
  });

  if (run.streamError) {
    baseItems.push(
      buildSystemItem(`${run.id}-stream-error`, "Stream", run.streamError),
    );
  }

  return {
    ...run,
    activityState: run.completed || hasFinalReply ? null : activityState,
    chatItems: mergeChatItems(baseItems),
    hasFinalReply,
  };
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