import { redirect } from "next/navigation";
import { getProfile } from "@/lib/auth";
import { Wordmark } from "@/components/ui/Wordmark";
import { signOut } from "../actions";

export default async function ConsoleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getProfile();
  if (!profile) redirect("/admin/login");

  return (
    <div className="flex min-h-full flex-col">
      <header className="border-b border-border-warm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-baseline gap-3">
            <Wordmark size="md" />
            <span className="text-[11px] font-medium uppercase tracking-[0.22em] text-ink-muted">
              Staff console
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-ink-soft">{profile.full_name}</span>
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
      <div className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">{children}</div>
    </div>
  );
}
