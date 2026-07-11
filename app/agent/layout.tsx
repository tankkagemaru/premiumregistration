import { redirect } from "next/navigation";
import { getProfile } from "@/lib/auth";
import { Wordmark } from "@/components/ui/Wordmark";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { AgentNav } from "@/components/agent/AgentNav";
import { signOut } from "../admin/actions";

export default async function AgentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getProfile();
  if (!profile) redirect("/admin/login");

  return (
    <div className="flex min-h-full flex-col">
      <header className="border-b border-border-warm">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-6">
          <div className="flex items-baseline gap-3">
            <Wordmark size="md" />
            <span className="text-[11px] font-medium uppercase tracking-[0.22em] text-ink-muted">
              Partner portal
            </span>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <form action={signOut}>
              <button
                type="submit"
                className="rounded-md border border-border-warm bg-paper px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:bg-cream-50"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>
      <AgentNav />
      <div className="mx-auto w-full max-w-4xl flex-1 px-6 py-8">{children}</div>
    </div>
  );
}
