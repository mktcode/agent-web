import { SignOutButton } from "@/components/auth/sign-out-button";

type DashboardHeaderProps = {
  isRefreshing: boolean;
  onRefresh: () => void;
  user: {
    email: string;
    name?: string | null;
  };
};

export function DashboardHeader({
  isRefreshing,
  onRefresh,
  user,
}: DashboardHeaderProps) {
  return (
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
            onClick={onRefresh}
            type="button"
          >
            {isRefreshing ? "Refreshing..." : "Refresh"}
          </button>

          <SignOutButton />
        </div>
      </div>
    </header>
  );
}