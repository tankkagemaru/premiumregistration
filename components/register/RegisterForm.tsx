"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useForm, Controller, type UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import {
  BookOpen,
  GraduationCap,
  Briefcase,
  Check,
  ArrowRight,
  ArrowLeft,
  CircleCheck,
} from "lucide-react";
import {
  registrationSchema,
  STEP_FIELDS,
  type RegistrationValues,
} from "@/lib/schema";
import { ENABLED_TRACKS, type TrackId } from "@/lib/config/tracks";
import {
  ENGLISH_PROGRAMS,
  ENGLISH_PURPOSES,
  ENGLISH_EXAMS,
  CEFR_LEVELS,
  ENGLISH_SCHEDULES,
  PLACEMENT_TEST_URL,
  HEADCOUNT_RANGES,
  TIMELINES,
} from "@/lib/config/programs";
import {
  MALAYSIAN_INSTITUTIONS,
  INSTITUTION_GROUP_LABELS,
  QUALIFICATION_LEVELS,
  STUDY_MODES,
  EDUCATION_LEVELS,
  INTAKE_PREFERENCES,
} from "@/lib/config/universities";
import { COUNTRIES } from "@/lib/config/countries";
import {
  Field,
  TextInput,
  Select,
  TextArea,
  Segmented,
  MultiChips,
  SearchableSelect,
  SearchableMultiSelect,
} from "@/components/form/Fields";
import { captureAttribution, type Attribution } from "@/lib/attribution";
import { trackEvent } from "@/lib/analytics";
import { PRIVACY_URL } from "@/lib/config/site";
import { Turnstile } from "@/components/form/Turnstile";
import { FileUpload } from "@/components/form/FileUpload";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { useI18n } from "@/lib/i18n/context";
import { cn } from "@/lib/utils";

const BUCKET = "registration-docs";

const TRACK_ICONS = { BookOpen, GraduationCap, Briefcase } as const;

type StepId = "intent" | "contact" | TrackId | "review";
type Form = UseFormReturn<RegistrationValues>;
type T = (path: string, params?: Record<string, string | number>) => string;

/** Translate a config option list's labels via options.<group>.<value>. */
function tOptions(
  t: T,
  group: string,
  list: readonly { value: string }[],
) {
  return list.map((o) => ({ value: o.value, label: t(`options.${group}.${o.value}`) }));
}

function findLabel(list: readonly { value: string; label: string }[], value?: string) {
  return value ? list.find((o) => o.value === value)?.label ?? value : undefined;
}

export function RegisterForm() {
  const { t } = useI18n();
  const [stepIndex, setStepIndex] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [token, setToken] = useState("");
  const [passport, setPassport] = useState<File[]>([]);
  const [transcripts, setTranscripts] = useState<File[]>([]);
  const [consent, setConsent] = useState(false);
  const attribution = useRef<Attribution>({});

  // Capture marketing attribution silently on mount (first-touch).
  useEffect(() => {
    attribution.current = captureAttribution();
  }, []);

  // Draft persistence — an accidental refresh no longer wipes the form.
  // (Files can't be persisted; the applicant re-attaches those.)
  const DRAFT_KEY = "pecsb-register-draft";
  useEffect(() => {
    try {
      const saved = window.sessionStorage.getItem(DRAFT_KEY);
      if (saved) form.reset(JSON.parse(saved));
    } catch {
      /* corrupt draft — start fresh */
    }
    const sub = form.watch((values) => {
      window.sessionStorage.setItem(DRAFT_KEY, JSON.stringify(values));
    });
    return () => sub.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const form = useForm<RegistrationValues>({
    resolver: zodResolver(registrationSchema),
    mode: "onTouched",
    defaultValues: {
      tracks: [],
      full_name: "",
      email: "",
      phone: "",
      whatsapp: "",
      nationality: "",
      english: {},
      university: { preferred_universities: [] },
      corporate: {},
    },
  });

  const tracks = form.watch("tracks");

  const steps = useMemo<StepId[]>(() => {
    const trackSteps = ENABLED_TRACKS.filter((t) => tracks.includes(t.id)).map(
      (t) => t.id,
    );
    return ["intent", "contact", ...trackSteps, "review"];
  }, [tracks]);

  const current = steps[Math.min(stepIndex, steps.length - 1)];
  const progress = Math.round(((stepIndex + 1) / steps.length) * 100);

  async function next() {
    const fields = STEP_FIELDS[current as keyof typeof STEP_FIELDS];
    if (current === "intent") {
      if (!(await form.trigger("tracks"))) return;
    } else if (fields) {
      if (!(await form.trigger(fields as never))) return;
    }
    setStepIndex((i) => Math.min(i + 1, steps.length - 1));
  }

  function back() {
    setStepIndex((i) => Math.max(i - 1, 0));
  }

  async function onSubmit(values: RegistrationValues) {
    if (!consent) {
      setSubmitError(t("consent.error"));
      return;
    }
    const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
    if (siteKey && !token) {
      setSubmitError(t("submit.verify"));
      return;
    }
    setSubmitting(true);
    setSubmitError(null);

    // Documents (university track). Order here == order of returned uploads.
    const files = [
      ...passport.map((file) => ({ kind: "passport" as const, file })),
      ...transcripts.map((file) => ({ kind: "transcript" as const, file })),
    ];
    const documents = files.map(({ kind, file }) => ({
      kind,
      filename: file.name,
      contentType: file.type,
      size: file.size,
    }));

    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          values,
          turnstileToken: token,
          documents,
          attribution: attribution.current,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error ?? "error");

      if (Array.isArray(data.uploads) && data.uploads.length > 0) {
        const { createClient } = await import("@/lib/supabase/client");
        const supabase = createClient();
        await Promise.all(
          data.uploads.map(
            (u: { path: string; token: string }, i: number) => {
              const file = files[i]?.file;
              if (!file) return Promise.resolve();
              return supabase.storage
                .from(BUCKET)
                .uploadToSignedUrl(u.path, u.token, file);
            },
          ),
        );
      }
      trackEvent("registration_complete", {
        tracks: values.tracks.join(","),
        source: attribution.current.utm_source ?? "direct",
      });
      window.sessionStorage.removeItem(DRAFT_KEY);
      setSubmitted(true);
    } catch {
      setSubmitError(t("submit.error"));
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) return <Confirmation form={form} t={t} />;

  return (
    <div>
      {/* Progress */}
      <div className="mb-8 flex items-center gap-3">
        <div className="h-1 flex-1 overflow-hidden rounded-full bg-border-warm">
          <div
            className="h-full rounded-full bg-brand-red transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="font-mono text-[11px] text-ink-muted">
          {stepIndex + 1} / {steps.length}
        </span>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
        {current === "intent" && <IntentStep form={form} t={t} />}
        {current === "contact" && <ContactStep form={form} t={t} />}
        {current === "english" && <EnglishStep form={form} t={t} />}
        {current === "university" && <UniversityStep form={form} t={t} />}
        {current === "corporate" && <CorporateStep form={form} t={t} />}
        {current === "review" && (
          <ReviewStep
            form={form}
            t={t}
            passport={passport}
            setPassport={setPassport}
            transcripts={transcripts}
            setTranscripts={setTranscripts}
            onToken={setToken}
            consent={consent}
            setConsent={setConsent}
          />
        )}

        {submitError && (
          <p className="mt-6 rounded-md border border-brand-red/40 bg-brand-red-bg px-4 py-2.5 text-sm text-brand-red">
            {submitError}
          </p>
        )}

        <div className="mt-8 flex items-center justify-between">
          {stepIndex > 0 ? (
            <button
              type="button"
              onClick={back}
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-md border border-border-warm bg-paper px-4 py-2.5 text-sm font-medium text-ink transition-colors hover:bg-cream-50 disabled:opacity-50"
            >
              <ArrowLeft className="h-4 w-4 rtl:rotate-180" aria-hidden />
              {t("nav.back")}
            </button>
          ) : (
            <span />
          )}

          {current === "review" ? (
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-md bg-brand-red px-6 py-2.5 text-sm font-medium text-cream transition-colors hover:bg-brand-red-soft disabled:opacity-60"
            >
              {submitting ? t("submit.sending") : t("review.submit")}
              {!submitting && <Check className="h-4 w-4" aria-hidden />}
            </button>
          ) : (
            <button
              type="button"
              onClick={next}
              className="inline-flex items-center gap-2 rounded-md bg-brand-red px-6 py-2.5 text-sm font-medium text-cream transition-colors hover:bg-brand-red-soft"
            >
              {t("nav.continue")}
              <ArrowRight className="h-4 w-4 rtl:rotate-180" aria-hidden />
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

/* ---------------------------------------------------------------- steps --- */

function StepHead({
  n,
  kicker,
  title,
  sub,
}: {
  n: string;
  kicker: string;
  title: string;
  sub?: string;
}) {
  return (
    <div className="mb-8">
      <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.22em] text-ink-muted">
        <span className="text-brand-red">{n}</span> · {kicker}
      </p>
      <h1 className="font-serif text-3xl font-medium leading-tight text-ink">
        {title}
      </h1>
      {sub && <p className="mt-3 text-base leading-relaxed text-ink-soft">{sub}</p>}
    </div>
  );
}

function IntentStep({ form, t }: { form: Form; t: T }) {
  const error = form.formState.errors.tracks?.message
    ? t("intent.error")
    : undefined;
  return (
    <div>
      <StepHead
        n="01"
        kicker={t("intent.kicker")}
        title={t("intent.title")}
        sub={t("intent.sub")}
      />
      <Controller
        control={form.control}
        name="tracks"
        render={({ field }) => (
          <div className="flex flex-col gap-3">
            {ENABLED_TRACKS.map((track) => {
              const Icon = TRACK_ICONS[track.icon];
              const active = field.value.includes(track.id);
              return (
                <button
                  key={track.id}
                  type="button"
                  onClick={() =>
                    field.onChange(
                      active
                        ? field.value.filter((x) => x !== track.id)
                        : [...field.value, track.id],
                    )
                  }
                  className={cn(
                    "flex items-center gap-4 rounded-card border bg-paper px-5 py-4 text-start transition-colors",
                    active
                      ? "border-brand-red ring-1 ring-brand-red"
                      : "border-border-warm hover:bg-cream-50",
                  )}
                >
                  <Icon
                    className={cn(
                      "h-5 w-5 shrink-0",
                      active ? "text-brand-red" : "text-ink-muted",
                    )}
                    aria-hidden
                  />
                  <div className="flex-1">
                    <div className="text-[15px] font-medium text-ink">
                      {t(`tracks.${track.id}.title`)}
                    </div>
                    <div className="text-xs text-ink-muted">
                      {t(`tracks.${track.id}.blurb`)}
                    </div>
                  </div>
                  {active ? (
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-red text-cream">
                      <Check className="h-3 w-3" aria-hidden />
                    </span>
                  ) : (
                    <span className="h-5 w-5 shrink-0 rounded-full border-2 border-border-warm" />
                  )}
                </button>
              );
            })}
          </div>
        )}
      />
      {error && <p className="mt-3 text-xs text-brand-red">{error}</p>}
    </div>
  );
}

function ContactStep({ form, t }: { form: Form; t: T }) {
  const { register, control, formState } = form;
  const e = formState.errors;
  return (
    <div>
      <StepHead
        n="02"
        kicker={t("contact.kicker")}
        title={t("contact.title")}
        sub={t("contact.sub")}
      />
      <div className="flex flex-col gap-5">
        <Field label={t("contact.fullName")} htmlFor="full_name" error={e.full_name && t("contact.errName")}>
          <TextInput
            id="full_name"
            placeholder={t("contact.fullNamePh")}
            error={e.full_name?.message}
            {...register("full_name")}
          />
        </Field>
        <Field label={t("contact.email")} htmlFor="email" error={e.email && t("contact.errEmail")}>
          <TextInput
            id="email"
            type="email"
            placeholder={t("contact.emailPh")}
            error={e.email?.message}
            {...register("email")}
          />
        </Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label={t("contact.phone")} htmlFor="phone" error={e.phone && t("contact.errPhone")}>
            <TextInput
              id="phone"
              type="tel"
              placeholder={t("contact.phonePh")}
              error={e.phone?.message}
              {...register("phone")}
            />
          </Field>
          <Field label={t("contact.whatsapp")} htmlFor="whatsapp" optionalLabel={t("common.optional")}>
            <TextInput
              id="whatsapp"
              type="tel"
              placeholder={t("contact.whatsappPh")}
              {...register("whatsapp")}
            />
          </Field>
        </div>
        <Field label={t("contact.nationality")} error={e.nationality && t("contact.errNationality")}>
          <Controller
            control={control}
            name="nationality"
            render={({ field }) => (
              <SearchableSelect
                options={COUNTRIES}
                value={field.value}
                onChange={field.onChange}
                placeholder={t("contact.nationalityPh")}
                error={e.nationality?.message}
              />
            )}
          />
        </Field>
      </div>
    </div>
  );
}

function EnglishStep({ form, t }: { form: Form; t: T }) {
  const { register, control, formState } = form;
  const e = formState.errors.english ?? {};
  return (
    <div>
      <StepHead n="03" kicker={t("english.kicker")} title={t("english.title")} />
      <div className="flex flex-col gap-5">
        <Field label={t("english.program")} htmlFor="en_program" error={e.program && t("english.errProgram")}>
          <Select
            id="en_program"
            placeholder={t("english.programPh")}
            options={tOptions(t, "programs", ENGLISH_PROGRAMS)}
            error={e.program?.message}
            {...register("english.program")}
          />
        </Field>
        <Field label={t("english.purpose")} error={e.learning_purpose && t("english.errPurpose")}>
          <Controller
            control={control}
            name="english.learning_purpose"
            render={({ field }) => (
              <Segmented
                options={tOptions(t, "purposes", ENGLISH_PURPOSES)}
                value={field.value}
                onChange={field.onChange}
                error={e.learning_purpose?.message}
              />
            )}
          />
        </Field>
        <Field label={t("english.exam")} optionalLabel={t("common.optional")} hint={t("english.examHint")}>
          <Controller
            control={control}
            name="english.exam_interest"
            render={({ field }) => (
              <MultiChips
                options={ENGLISH_EXAMS}
                value={field.value ?? []}
                onChange={field.onChange}
              />
            )}
          />
        </Field>
        <Field
          label={t("english.level")}
          htmlFor="en_level"
          optionalLabel={t("common.optional")}
          hint={
            <>
              {t("english.placementHint")}{" "}
              <a
                href={PLACEMENT_TEST_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand-red underline underline-offset-2"
              >
                {t("english.placementLink")}
              </a>
              .
            </>
          }
        >
          <Select
            id="en_level"
            placeholder={t("english.levelPh")}
            options={tOptions(t, "cefr", CEFR_LEVELS)}
            {...register("english.current_level")}
          />
        </Field>
        <Field label={t("english.startDate")} htmlFor="en_start" optionalLabel={t("common.optional")}>
          <TextInput id="en_start" type="date" {...register("english.preferred_start_date")} />
        </Field>
        <Field label={t("english.schedule")} error={e.preferred_schedule && t("english.errSchedule")}>
          <Controller
            control={control}
            name="english.preferred_schedule"
            render={({ field }) => (
              <Segmented
                options={tOptions(t, "schedules", ENGLISH_SCHEDULES)}
                value={field.value}
                onChange={field.onChange}
                error={e.preferred_schedule?.message}
              />
            )}
          />
        </Field>
      </div>
    </div>
  );
}

function UniversityStep({ form, t }: { form: Form; t: T }) {
  const { register, control, formState } = form;
  const e = formState.errors.university ?? {};
  return (
    <div>
      <StepHead n="03" kicker={t("university.kicker")} title={t("university.title")} sub={t("university.sub")} />
      <div className="flex flex-col gap-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label={t("university.homeCountry")} error={e.home_country && t("university.errHomeCountry")}>
            <Controller
              control={control}
              name="university.home_country"
              render={({ field }) => (
                <SearchableSelect
                  options={COUNTRIES}
                  value={field.value}
                  onChange={field.onChange}
                  placeholder={t("university.homeCountryPh")}
                  error={e.home_country?.message}
                />
              )}
            />
          </Field>
          <Field label={t("university.currentLevel")} htmlFor="uni_level" error={e.current_education_level && t("university.errCurrentLevel")}>
            <Select
              id="uni_level"
              placeholder={t("university.currentLevelPh")}
              options={tOptions(t, "educationLevels", EDUCATION_LEVELS)}
              error={e.current_education_level?.message}
              {...register("university.current_education_level")}
            />
          </Field>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label={t("university.want")} error={e.intended_qualification && t("university.errWant")}>
            <Controller
              control={control}
              name="university.intended_qualification"
              render={({ field }) => (
                <Segmented
                  options={tOptions(t, "qualification", QUALIFICATION_LEVELS)}
                  value={field.value}
                  onChange={field.onChange}
                  error={e.intended_qualification?.message}
                />
              )}
            />
          </Field>
          <Field label={t("university.studyMode")} optionalLabel={t("common.optional")}>
            <Controller
              control={control}
              name="university.study_mode"
              render={({ field }) => (
                <Segmented
                  options={tOptions(t, "studyModes", STUDY_MODES)}
                  value={field.value}
                  onChange={field.onChange}
                />
              )}
            />
          </Field>
        </div>
        <Field label={t("university.field")} htmlFor="uni_field" optionalLabel={t("common.optional")}>
          <TextInput id="uni_field" placeholder={t("university.fieldPh")} {...register("university.intended_field")} />
        </Field>
        <Field
          label={t("university.institutions")}
          error={e.preferred_universities && t("university.errInstitutions")}
          hint={t("university.institutionsHint")}
        >
          <Controller
            control={control}
            name="university.preferred_universities"
            render={({ field }) => (
              <SearchableMultiSelect
                options={MALAYSIAN_INSTITUTIONS}
                value={field.value ?? []}
                onChange={field.onChange}
                placeholder={t("university.institutionsPh")}
                groupLabels={INSTITUTION_GROUP_LABELS}
                error={e.preferred_universities?.message as string | undefined}
              />
            )}
          />
        </Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label={t("university.intake")} htmlFor="uni_intake" optionalLabel={t("common.optional")}>
            <Select
              id="uni_intake"
              placeholder={t("university.intakePh")}
              options={tOptions(t, "intake", INTAKE_PREFERENCES)}
              {...register("university.intake_preference")}
            />
          </Field>
          <Field label={t("university.scholarship")}>
            <Controller
              control={control}
              name="university.scholarship_interest"
              render={({ field }) => (
                <Segmented
                  options={[
                    { value: "yes", label: t("common.yes") },
                    { value: "no", label: t("common.no") },
                  ]}
                  value={field.value}
                  onChange={field.onChange}
                />
              )}
            />
          </Field>
        </div>
      </div>
    </div>
  );
}

function CorporateStep({ form, t }: { form: Form; t: T }) {
  const { register, control, formState } = form;
  const e = formState.errors.corporate ?? {};
  return (
    <div>
      <StepHead n="03" kicker={t("corporate.kicker")} title={t("corporate.title")} />
      <div className="flex flex-col gap-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label={t("corporate.company")} htmlFor="co_name" error={e.company_name && t("corporate.errCompany")}>
            <TextInput
              id="co_name"
              placeholder={t("corporate.companyPh")}
              error={e.company_name?.message}
              {...register("corporate.company_name")}
            />
          </Field>
          <Field label={t("corporate.role")} htmlFor="co_role" optionalLabel={t("common.optional")}>
            <TextInput id="co_role" placeholder={t("corporate.rolePh")} {...register("corporate.contact_role")} />
          </Field>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label={t("corporate.teamSize")} htmlFor="co_head" optionalLabel={t("common.optional")}>
            <Select
              id="co_head"
              placeholder={t("corporate.teamSizePh")}
              options={tOptions(t, "headcount", HEADCOUNT_RANGES)}
              {...register("corporate.headcount")}
            />
          </Field>
          <Field label={t("corporate.timeline")} htmlFor="co_time" optionalLabel={t("common.optional")}>
            <Select
              id="co_time"
              placeholder={t("corporate.timelinePh")}
              options={tOptions(t, "timelines", TIMELINES)}
              {...register("corporate.preferred_timeline")}
            />
          </Field>
        </div>
        <Field label={t("corporate.need")} htmlFor="co_need" error={e.training_need && t("corporate.errNeed")}>
          <TextArea
            id="co_need"
            placeholder={t("corporate.needPh")}
            error={e.training_need?.message}
            {...register("corporate.training_need")}
          />
        </Field>
        <Field label={t("corporate.hrdf")}>
          <Controller
            control={control}
            name="corporate.hrdf_claimable"
            render={({ field }) => (
              <Segmented
                options={[
                  { value: "yes", label: t("common.yes") },
                  { value: "no", label: t("common.no") },
                ]}
                value={field.value}
                onChange={field.onChange}
              />
            )}
          />
        </Field>
      </div>
    </div>
  );
}

/* --------------------------------------------------------------- review --- */

function Row({ k, v }: { k: string; v?: React.ReactNode }) {
  if (v === undefined || v === "" || v === null) return null;
  return (
    <div className="flex justify-between gap-6 py-1.5 text-sm">
      <span className="text-ink-muted">{k}</span>
      <span className="text-end font-medium text-ink">{v}</span>
    </div>
  );
}

function ReviewStep({
  form,
  t,
  passport,
  setPassport,
  transcripts,
  setTranscripts,
  onToken,
  consent,
  setConsent,
}: {
  form: Form;
  t: T;
  passport: File[];
  setPassport: (f: File[]) => void;
  transcripts: File[];
  setTranscripts: (f: File[]) => void;
  onToken: (token: string) => void;
  consent: boolean;
  setConsent: (v: boolean) => void;
}) {
  const v = form.getValues();
  const yesNo = (x?: string) => (x ? t(`common.${x}`) : undefined);
  const tOpt = (group: string, value?: string) =>
    value ? t(`options.${group}.${value}`) : undefined;

  return (
    <div>
      <StepHead n="04" kicker={t("review.kicker")} title={t("review.title")} sub={t("review.sub")} />
      <div className="rounded-card border border-border-warm bg-paper px-5 py-4">
        <SectionLabel>{t("review.yourDetails")}</SectionLabel>
        <Row k={t("review.rName")} v={v.full_name} />
        <Row k={t("review.rEmail")} v={v.email} />
        <Row k={t("review.rPhone")} v={v.phone} />
        {v.whatsapp && <Row k={t("review.rWhatsapp")} v={v.whatsapp} />}
        <Row k={t("review.rNationality")} v={findLabel(COUNTRIES, v.nationality)} />
        <Row
          k={t("review.rInterested")}
          v={v.tracks.map((x) => t(`tracks.${x}.title`)).join(", ")}
        />
      </div>

      {v.tracks.includes("english") && (
        <div className="mt-4 rounded-card border border-border-warm bg-paper px-5 py-4">
          <SectionLabel>{t("tracks.english.title")}</SectionLabel>
          <Row k={t("review.rProgram")} v={tOpt("programs", v.english?.program)} />
          <Row k={t("review.rPurpose")} v={tOpt("purposes", v.english?.learning_purpose)} />
          {v.english?.exam_interest?.length ? (
            <Row
              k={t("review.rExams")}
              v={v.english.exam_interest.map((x) => findLabel(ENGLISH_EXAMS, x)).join(", ")}
            />
          ) : null}
          <Row k={t("review.rLevel")} v={tOpt("cefr", v.english?.current_level)} />
          <Row k={t("review.rStart")} v={v.english?.preferred_start_date} />
          <Row k={t("review.rSchedule")} v={tOpt("schedules", v.english?.preferred_schedule)} />
        </div>
      )}

      {v.tracks.includes("university") && (
        <div className="mt-4 rounded-card border border-border-warm bg-paper px-5 py-4">
          <SectionLabel>{t("tracks.university.title")}</SectionLabel>
          <Row k={t("review.rHomeCountry")} v={findLabel(COUNTRIES, v.university?.home_country)} />
          <Row k={t("review.rCurrentLevel")} v={tOpt("educationLevels", v.university?.current_education_level)} />
          <Row k={t("review.rWants")} v={tOpt("qualification", v.university?.intended_qualification)} />
          <Row k={t("review.rStudyMode")} v={tOpt("studyModes", v.university?.study_mode)} />
          <Row k={t("review.rField")} v={v.university?.intended_field} />
          <Row
            k={t("review.rInstitutions")}
            v={v.university?.preferred_universities
              ?.map((u) => findLabel(MALAYSIAN_INSTITUTIONS, u))
              .join(", ")}
          />
        </div>
      )}

      {v.tracks.includes("corporate") && (
        <div className="mt-4 rounded-card border border-border-warm bg-paper px-5 py-4">
          <SectionLabel>{t("tracks.corporate.title")}</SectionLabel>
          <Row k={t("review.rCompany")} v={v.corporate?.company_name} />
          <Row k={t("review.rRole")} v={v.corporate?.contact_role} />
          <Row k={t("review.rTeamSize")} v={tOpt("headcount", v.corporate?.headcount)} />
          <Row k={t("review.rNeed")} v={v.corporate?.training_need} />
          <Row k={t("review.rTimeline")} v={tOpt("timelines", v.corporate?.preferred_timeline)} />
          <Row k={t("review.rHrdf")} v={yesNo(v.corporate?.hrdf_claimable)} />
        </div>
      )}

      {v.tracks.includes("university") && (
        <div className="mt-4 rounded-card border border-border-warm bg-paper px-5 py-4">
          <SectionLabel>{t("upload.title")}</SectionLabel>
          <p className="mb-4 text-sm text-ink-soft">{t("upload.sub")}</p>
          <div className="flex flex-col gap-5">
            <FileUpload
              label={t("upload.passport")}
              chooseLabel={t("upload.choose")}
              removeLabel={t("upload.remove")}
              hint={t("upload.hint")}
              files={passport}
              onChange={setPassport}
            />
            <FileUpload
              label={t("upload.transcript")}
              chooseLabel={t("upload.choose")}
              removeLabel={t("upload.remove")}
              hint={t("upload.hint")}
              multiple
              files={transcripts}
              onChange={setTranscripts}
            />
          </div>
        </div>
      )}

      {/* PDPA consent */}
      <label className="mt-6 flex cursor-pointer items-start gap-3 text-sm text-ink-soft">
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 accent-brand-red"
        />
        <span>
          {t("consent.text")}{" "}
          <a
            href={PRIVACY_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand-red underline underline-offset-2"
          >
            {t("consent.link")}
          </a>
          .
        </span>
      </label>

      <div className="mt-6">
        <Turnstile onToken={onToken} />
      </div>
    </div>
  );
}

function Confirmation({ form, t }: { form: Form; t: T }) {
  const name = form.getValues("full_name").split(" ")[0] || "";
  return (
    <div className="py-10 text-center">
      <CircleCheck className="mx-auto h-12 w-12 text-brand-red" aria-hidden />
      <h1 className="mt-5 font-serif text-3xl font-medium text-ink">
        {t("confirm.title", { name })}
      </h1>
      <p className="mx-auto mt-3 max-w-md text-base leading-relaxed text-ink-soft">
        {t("confirm.body")}
      </p>
      <p className="mt-6 text-xs text-ink-muted">{t("confirm.note")}</p>
      <Link
        href="/"
        className="mt-8 inline-flex items-center gap-2 rounded-md border border-border-warm bg-paper px-5 py-2.5 text-sm font-medium text-ink transition-colors hover:bg-cream-50"
      >
        {t("confirm.back")}
      </Link>
    </div>
  );
}
