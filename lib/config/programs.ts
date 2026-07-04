/** English program options (English track). */
export const ENGLISH_PROGRAMS = [
  { value: "general", label: "General English" },
  { value: "business", label: "Business English" },
  { value: "exam_prep", label: "Exam preparation" },
  { value: "corporate_other", label: "Corporate / other" },
] as const;

/** Why they want to learn English. */
export const ENGLISH_PURPOSES = [
  { value: "daily", label: "Everyday use" },
  { value: "academic", label: "Academic" },
  { value: "immigration", label: "Immigration" },
  { value: "business", label: "Business / work" },
] as const;

/**
 * English exams a learner may want to prepare for. Multi-select — a learner
 * can pick several, or none. "None" is handled by leaving the set empty.
 */
export const ENGLISH_EXAMS = [
  { value: "ielts", label: "IELTS" },
  { value: "muet", label: "MUET" },
  { value: "toefl", label: "TOEFL" },
  { value: "linguaskill", label: "Linguaskill" },
  { value: "pte", label: "PTE Academic" },
  { value: "cambridge", label: "Cambridge English" },
  { value: "toeic", label: "TOEIC" },
  { value: "other", label: "Other" },
] as const;

/** Self-rated CEFR level. The "not sure" path links out to the placement test. */
export const CEFR_LEVELS = [
  { value: "A1", label: "A1 — Beginner" },
  { value: "A2", label: "A2 — Elementary" },
  { value: "B1", label: "B1 — Intermediate" },
  { value: "B2", label: "B2 — Upper intermediate" },
  { value: "C1", label: "C1 — Advanced" },
  { value: "C2", label: "C2 — Proficient" },
] as const;

export const ENGLISH_SCHEDULES = [
  { value: "weekday", label: "Weekday" },
  { value: "weekend", label: "Weekend" },
  { value: "evening", label: "Evening" },
  { value: "intensive", label: "Intensive" },
] as const;

/**
 * External placement test app (link out — not embedded in v1). China reaches
 * Vercel unreliably, so zh users are sent to the Zeabur mirror. Use
 * placementTestUrl(locale) rather than a single constant.
 */
export const PLACEMENT_TEST_URL_GLOBAL = "https://premium-placement-test.vercel.app/";
export const PLACEMENT_TEST_URL_CHINA = "https://premium-placement-test.zeabur.app/";

export function placementTestUrl(locale?: string): string {
  return locale === "zh" ? PLACEMENT_TEST_URL_CHINA : PLACEMENT_TEST_URL_GLOBAL;
}

/** Corporate training need categories. */
export const CORPORATE_NEEDS = [
  { value: "business_english", label: "Business English" },
  { value: "communication", label: "Communication skills" },
  { value: "presentation", label: "Presentation skills" },
  { value: "custom", label: "Custom / other" },
] as const;

export const HEADCOUNT_RANGES = [
  { value: "1-10", label: "1–10" },
  { value: "11-25", label: "11–25" },
  { value: "26-50", label: "26–50" },
  { value: "51-100", label: "51–100" },
  { value: "100+", label: "More than 100" },
] as const;

export const TIMELINES = [
  { value: "asap", label: "As soon as possible" },
  { value: "1-3m", label: "In 1–3 months" },
  { value: "3-6m", label: "In 3–6 months" },
  { value: "exploring", label: "Just exploring" },
] as const;
