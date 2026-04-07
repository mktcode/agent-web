"use client";

import { startTransition, useState } from "react";
import { useRouter } from "next/navigation";

import { authClient } from "@/lib/auth-client";

export function SignOutButton() {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);

  async function handleClick() {
    setIsPending(true);

    const { error } = await authClient.signOut({});

    if (error) {
      setIsPending(false);
      return;
    }

    startTransition(() => {
      router.replace("/login");
      router.refresh();
    });
  }

  return (
    <button
      className="inline-flex items-center justify-center rounded-full border border-(--border) px-4 py-2 text-sm font-medium text-foreground transition hover:border-(--accent) hover:text-(--accent-strong) disabled:cursor-not-allowed disabled:opacity-70"
      disabled={isPending}
      onClick={handleClick}
      type="button"
    >
      {isPending ? "Signing out..." : "Sign out"}
    </button>
  );
}