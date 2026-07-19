/** Agent-portal page-transition skeleton. */
export default function AgentLoading() {
  return (
    <div className="mx-auto w-full max-w-4xl animate-pulse px-6 py-8">
      <div className="h-3 w-28 rounded bg-cream-50" />
      <div className="mt-2 h-8 w-56 rounded bg-cream-50" />
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-20 rounded-card border border-border-warm bg-paper" />
        ))}
      </div>
      <div className="mt-6 h-64 rounded-card border border-border-warm bg-paper" />
    </div>
  );
}
