import { redirect } from "next/navigation";

import { SignOutButton } from "@/components/auth/sign-out-button";
import { getDashboardSession } from "@/lib/auth-session";

export const runtime = "nodejs";

const focusAreas = [
  {
    label: "Repository control",
    detail: "Branch state, checkout, merge, push, revert, and branch deletion live here next.",
  },
  {
    label: "Session ledger",
    detail: "Persisted agent sessions will be listed and removable from this surface.",
  },
  {
    label: "Live event stream",
    detail: "Prompt execution and raw agent events will anchor the center of the dashboard.",
  },
];

export default async function Home() {
  const session = await getDashboardSession();

  if (!session) {
    redirect("/login");
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-1 flex-col gap-8 px-6 py-8 sm:px-10 lg:px-12">
      <section className="rounded-4xl border border-(--border) bg-(--panel) p-6 shadow-(--shadow) backdrop-blur sm:p-8">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl space-y-5">
            <p className="font-mono text-xs uppercase tracking-[0.3em] text-(--muted)">
              Authenticated shell
            </p>
            <div className="space-y-3">
              <h1 className="max-w-2xl text-4xl font-semibold tracking-[-0.04em] text-foreground sm:text-5xl">
                Agent control starts with a locked dashboard boundary.
              </h1>
              <p className="max-w-2xl text-base leading-7 text-(--muted) sm:text-lg">
                The authentication module is in place. The next passes can fill in the
                repository controls, persisted sessions, and the live event stream without
                exposing backend credentials to the browser.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-4 rounded-3xl border border-(--border) bg-(--panel-strong) p-5 lg:min-w-[18rem]">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.24em] text-(--muted)">
                Signed in as
              </p>
              <p className="mt-2 text-lg font-medium text-foreground">
                {session.user.email}
              </p>
              <p className="mt-1 text-sm text-(--muted)">
                {session.user.name}
              </p>
            </div>
            <SignOutButton />
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        {focusAreas.map((area) => (
          <article
            key={area.label}
            className="rounded-[1.75rem] border border-(--border) bg-(--panel) p-6 shadow-(--shadow) backdrop-blur"
          >
            <p className="font-mono text-xs uppercase tracking-[0.24em] text-(--muted)">
              Next module
            </p>
            <h2 className="mt-4 text-2xl font-semibold tracking-[-0.03em] text-foreground">
              {area.label}
            </h2>
            <p className="mt-3 text-sm leading-7 text-(--muted)">
              {area.detail}
            </p>
          </article>
        ))}
      </section>
    </main>
  );
}
