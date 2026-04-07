import type { BackendError } from "@/lib/dashboard-types";

export function ErrorPanel({
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