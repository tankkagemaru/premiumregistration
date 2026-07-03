import { TRACKS } from "@/lib/config/tracks";
import { ENGLISH_PROGRAMS } from "@/lib/config/programs";
import { MALAYSIAN_INSTITUTIONS } from "@/lib/config/universities";
import { LOCALES } from "@/lib/i18n/config";

function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-card border border-border-warm bg-paper p-5">
      <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.22em] text-ink-muted">
        {title}
      </p>
      {children}
    </section>
  );
}

export default function SettingsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-ink-muted">
          Settings
        </p>
        <h1 className="font-serif text-3xl font-medium text-ink">Configuration</h1>
        <p className="mt-2 text-sm text-ink-soft">
          These are driven by config today. Editing UI (partner list, templates,
          agent codes, track toggles) is the next settings iteration.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card title="Tracks">
          <ul className="flex flex-col gap-1 text-sm text-ink">
            {TRACKS.map((t) => (
              <li key={t.id} className="flex justify-between">
                <span>{t.title}</span>
                <span className={t.enabled ? "text-status-present" : "text-ink-muted"}>
                  {t.enabled ? "On" : "Off"}
                </span>
              </li>
            ))}
          </ul>
        </Card>

        <Card title="English programs">
          <ul className="flex flex-col gap-1 text-sm text-ink">
            {ENGLISH_PROGRAMS.map((p) => (
              <li key={p.value}>{p.label}</li>
            ))}
          </ul>
        </Card>

        <Card title="Partner institutions">
          <p className="font-serif text-3xl text-ink tabular">
            {MALAYSIAN_INSTITUTIONS.length}
          </p>
          <p className="mt-1 text-sm text-ink-soft">
            universities and university colleges in the picker.
          </p>
        </Card>

        <Card title="Languages">
          <p className="text-sm text-ink">
            {LOCALES.map((l) => l.name).join(" · ")}
          </p>
          <p className="mt-1 text-xs text-ink-muted">
            Arabic renders right-to-left.
          </p>
        </Card>
      </div>
    </div>
  );
}
