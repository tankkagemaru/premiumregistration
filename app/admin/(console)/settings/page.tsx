import { TRACKS } from "@/lib/config/tracks";
import { LOCALES } from "@/lib/i18n/config";
import { requireRole } from "@/lib/auth";
import { listInstitutions, listPrograms } from "@/lib/admin/catalog";
import { listDocRules } from "@/lib/admin/doc-rules";
import { getStalenessDays, getGateMode } from "@/lib/admin/settings";
import { CatalogManager } from "@/components/admin/CatalogManager";
import { DocRulesManager } from "@/components/admin/DocRulesManager";
import { StalenessSettings } from "@/components/admin/StalenessSettings";
import { GateModeSettings } from "@/components/admin/GateModeSettings";

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

export default async function SettingsPage() {
  await requireRole(["admin"]);
  const [institutions, programs, docRules, stalenessDays, gateMode] = await Promise.all([
    listInstitutions(true),
    listPrograms(true),
    listDocRules(true),
    getStalenessDays(),
    getGateMode(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-ink-muted">
          Settings
        </p>
        <h1 className="font-serif text-3xl font-medium text-ink">Configuration</h1>
        <p className="mt-2 max-w-2xl text-sm text-ink-soft">
          Programs and institutions are managed here and drive the public
          registration form. Tracks, languages and stale-record thresholds are
          config-driven for now.
        </p>
      </div>

      {/* Editable catalog — programs + institutions */}
      <section className="rounded-card border border-border-warm bg-paper p-5">
        <CatalogManager institutions={institutions} programs={programs} />
      </section>

      {/* Editable document requirements */}
      <section className="rounded-card border border-border-warm bg-paper p-5">
        <DocRulesManager rules={docRules} />
      </section>

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

        <Card title="Languages">
          <p className="text-sm text-ink">
            {LOCALES.map((l) => l.name).join(" · ")}
          </p>
          <p className="mt-1 text-xs text-ink-muted">
            Arabic renders right-to-left.
          </p>
        </Card>

        <Card title="Stale-record flags">
          <StalenessSettings days={stalenessDays} />
        </Card>

        <Card title="Stage handoffs">
          <p className="mb-2 text-xs text-ink-muted">
            How strictly a student must meet a stage's exit conditions before it
            hands off to the next team.
          </p>
          <GateModeSettings mode={gateMode} />
        </Card>
      </div>
    </div>
  );
}
