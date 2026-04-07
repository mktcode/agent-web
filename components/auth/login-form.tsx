"use client";

import { startTransition, useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";

import { authClient } from "@/lib/auth-client";

export function LoginForm() {
  const router = useRouter();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsPending(true);
    setErrorMessage(null);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");
    const rememberMe = formData.get("rememberMe") === "on";

    const { error } = await authClient.signIn.email({
      email,
      password,
      rememberMe,
    });

    if (error) {
      setErrorMessage(error.message || "Unable to sign in.");
      setIsPending(false);
      return;
    }

    startTransition(() => {
      router.replace("/");
      router.refresh();
    });
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <fieldset className="space-y-5" disabled={isPending}>
        <label className="block space-y-2">
          <span className="text-sm font-medium text-foreground">
            Email
          </span>
          <input
            autoComplete="email"
            className="w-full rounded-2xl border border-(--border) bg-white px-4 py-3 text-sm text-foreground outline-none transition focus:border-(--accent)"
            name="email"
            placeholder="you@example.com"
            required
            type="email"
          />
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-medium text-foreground">
            Password
          </span>
          <input
            autoComplete="current-password"
            className="w-full rounded-2xl border border-(--border) bg-white px-4 py-3 text-sm text-foreground outline-none transition focus:border-(--accent)"
            name="password"
            placeholder="Enter your password"
            required
            type="password"
          />
        </label>

        <label className="flex items-center gap-3 text-sm text-(--muted)">
          <input
            className="h-4 w-4 rounded border-(--border) text-(--accent) focus:ring-(--accent)"
            defaultChecked
            name="rememberMe"
            type="checkbox"
          />
          Keep this session active across browser restarts
        </label>
      </fieldset>

      {errorMessage ? (
        <p className="rounded-2xl border border-[rgba(142,63,31,0.18)] bg-[rgba(185,93,51,0.08)] px-4 py-3 text-sm text-(--accent-strong)">
          {errorMessage}
        </p>
      ) : null}

      <button
        className="inline-flex w-full items-center justify-center rounded-full bg-(--accent) px-5 py-3 text-sm font-semibold text-white transition hover:bg-(--accent-strong) disabled:cursor-not-allowed disabled:opacity-70"
        disabled={isPending}
        type="submit"
      >
        {isPending ? "Signing in..." : "Sign in"}
      </button>
    </form>
  );
}