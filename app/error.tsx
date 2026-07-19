"use client";

/**
 * Branded error boundary — without this, any thrown server/client error showed
 * Next.js's unstyled crash screen to staff and applicants.
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[70vh] items-center justify-center px-6">
      <div className="w-full max-w-md rounded-card border border-border-warm bg-paper p-8 text-center">
        <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-brand-red">
          Something went wrong
        </p>
        <h1 className="mt-2 font-serif text-2xl font-medium text-ink">
          We couldn&apos;t load this page
        </h1>
        <p className="mt-2 text-sm text-ink-soft">
          The error has been logged. Try again — if it keeps happening, let the
          office know what you were doing.
        </p>
        {error.digest && (
          <p className="mt-2 font-mono text-[10px] text-ink-muted">Ref: {error.digest}</p>
        )}
        <button
          onClick={reset}
          className="mt-5 rounded-md bg-brand-red px-4 py-2 text-sm font-medium text-oncolor transition-colors hover:bg-brand-red-soft"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
