"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authConfigured } from "@/lib/admin/leads-shared";
import { Wordmark } from "@/components/ui/Wordmark";

export default function AdminLogin() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { createClient } = await import("@/lib/supabase/client");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) {
      setError("Those credentials didn't work. Try again.");
      return;
    }
    router.push("/admin");
    router.refresh();
  }

  return (
    <main className="flex min-h-full items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <Wordmark size="lg" />
          <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-ink-muted">
            Staff console
          </p>
        </div>

        {!authConfigured ? (
          <div className="rounded-card border border-border-warm bg-paper p-6 text-center">
            <p className="text-sm leading-relaxed text-ink-soft">
              Supabase isn&apos;t configured yet, so login is bypassed in
              development.
            </p>
            <a
              href="/admin"
              className="mt-5 inline-flex rounded-md bg-brand-red px-6 py-2.5 text-sm font-medium text-cream transition-colors hover:bg-brand-red-soft"
            >
              Enter console
            </a>
          </div>
        ) : (
          <form
            onSubmit={submit}
            className="flex flex-col gap-4 rounded-card border border-border-warm bg-paper p-6"
          >
            <input
              type="email"
              required
              placeholder="you@premium.edu.my"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border border-border-warm bg-cream-50 px-3 py-2.5 text-sm text-ink outline-none focus:border-brand-red focus:ring-1 focus:ring-brand-red"
            />
            <input
              type="password"
              required
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border border-border-warm bg-cream-50 px-3 py-2.5 text-sm text-ink outline-none focus:border-brand-red focus:ring-1 focus:ring-brand-red"
            />
            {error && <p className="text-xs text-brand-red">{error}</p>}
            <button
              type="submit"
              disabled={busy}
              className="rounded-md bg-brand-red px-6 py-2.5 text-sm font-medium text-cream transition-colors hover:bg-brand-red-soft disabled:opacity-60"
            >
              {busy ? "Signing in…" : "Sign in"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
