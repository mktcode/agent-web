import { redirect } from "next/navigation";

import { LoginForm } from "@/components/auth/login-form";
import { getDashboardSession } from "@/lib/auth-session";

export const runtime = "nodejs";

export default async function LoginPage() {
  const session = await getDashboardSession();

  if (session) {
    redirect("/");
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-1 items-center px-6 py-10 sm:px-10 lg:px-12">
      <section className="grid w-full gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-4xl border border-(--border) bg-(--panel) p-8 shadow-(--shadow) backdrop-blur sm:p-10">
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-(--muted)">
            Agent dashboard
          </p>
          <div className="mt-8 space-y-5">
            <h1 className="max-w-xl text-4xl font-semibold tracking-[-0.04em] text-foreground sm:text-5xl">
              Sign in to the single-tenant control surface.
            </h1>
            <p className="max-w-2xl text-base leading-7 text-(--muted) sm:text-lg">
              Browser access is guarded here. The agent API token remains server-only,
              and every later dashboard action will pass through the authenticated
              Next.js boundary.
            </p>
          </div>
        </div>

        <div className="rounded-4xl border border-(--border) bg-(--panel-strong) p-6 shadow-(--shadow) backdrop-blur sm:p-8">
          <div className="mb-6 space-y-2">
            <p className="font-mono text-xs uppercase tracking-[0.24em] text-(--muted)">
              Protected access
            </p>
            <h2 className="text-2xl font-semibold tracking-[-0.03em] text-foreground">
              Email and password
            </h2>
            <p className="text-sm leading-6 text-(--muted)">
              Accounts are provisioned out of band. Public sign-up stays disabled.
            </p>
          </div>

          <LoginForm />
        </div>
      </section>
    </main>
  );
}