import { redirect } from "next/navigation";

import { DashboardClient } from "@/components/dashboard/dashboard-client";
import { getDashboardSession } from "@/lib/auth-session";

export const runtime = "nodejs";

export default async function Home() {
  const session = await getDashboardSession();

  if (!session) {
    redirect("/login");
  }

  return <DashboardClient user={session.user} />;
}
