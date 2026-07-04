import { z } from "zod";
import type { TrackId } from "@/lib/config/tracks";

/*
  One flat-ish form object. Track sections are optional at the type level but
  conditionally required via superRefine when their chip is selected — so a
  person who picks English alone is never asked to fill university fields.
*/

const yesNo = z.enum(["yes", "no"]);

/** Whole years between `dob` (ISO yyyy-mm-dd) and today; null if unparseable. */
export function ageFromDob(dob?: string): number | null {
  if (!dob) return null;
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age -= 1;
  return age;
}

// Parent/guardian declaration — required when the registrant is under 18.
export const guardianSchema = z.object({
  full_name: z.string().optional(),
  relationship: z.string().optional(),
  consent: z.boolean().optional(),
});

export const englishSchema = z.object({
  program: z.string().optional(),
  learning_purpose: z.string().optional(), // everyday | academic | immigration | business
  exam_interest: z.array(z.string()).optional(), // IELTS, MUET, TOEFL, ...
  current_level: z.string().optional(), // CEFR self-rating; may be left blank
  preferred_start_date: z.string().optional(),
  preferred_schedule: z.string().optional(),
});

export const universitySchema = z.object({
  home_country: z.string().optional(),
  current_education_level: z.string().optional(),
  intended_qualification: z.string().optional(), // foundation | diploma | degree | master | phd
  study_mode: z.string().optional(), // coursework | research | mixed | any
  intended_field: z.string().optional(),
  preferred_universities: z.array(z.string()).optional(),
  recommend_institution: yesNo.optional(), // "not sure — recommend for me"
  intake_preference: z.string().optional(),
  scholarship_interest: yesNo.optional(),
});

export const corporateSchema = z.object({
  company_name: z.string().optional(),
  contact_role: z.string().optional(),
  headcount: z.string().optional(),
  training_need: z.string().optional(),
  hrdf_claimable: yesNo.optional(),
  preferred_timeline: z.string().optional(),
});

export const registrationSchema = z
  .object({
    tracks: z
      .array(z.enum(["english", "university", "corporate"]))
      .min(1, "Choose at least one."),
    // shared contact
    full_name: z.string().trim().min(2, "Enter your full name."),
    email: z.string().trim().email("Enter a valid email address."),
    phone: z.string().trim().min(6, "Enter a contactable phone number."),
    whatsapp: z.string().trim().optional(),
    nationality: z.string().trim().min(2, "Enter your nationality."),
    // Date of birth — required for student tracks (english/university) so we can
    // check age; a minor (<18) must add a guardian declaration. See superRefine.
    dob: z.string().optional(),
    guardian: guardianSchema.optional(),
    // attribution (captured silently — Phase 6 fills these from the URL)
    agent_code: z.string().optional(),
    english: englishSchema.optional(),
    university: universitySchema.optional(),
    corporate: corporateSchema.optional(),
  })
  .superRefine((val, ctx) => {
    const require = (
      cond: boolean,
      path: (string | number)[],
      message: string,
    ) => {
      if (cond)
        ctx.addIssue({ code: z.ZodIssueCode.custom, path, message });
    };

    // Age / guardian — only the student tracks; corporate registers an HR contact.
    const isStudentReg =
      val.tracks.includes("english") || val.tracks.includes("university");
    if (isStudentReg) {
      const age = ageFromDob(val.dob);
      if (!val.dob || age === null || age < 0 || age > 120) {
        require(true, ["dob"], "Enter a valid date of birth.");
      } else if (age < 18) {
        require(
          !val.guardian?.full_name?.trim(),
          ["guardian", "full_name"],
          "Enter the parent or guardian's name.",
        );
        require(
          !val.guardian?.relationship?.trim(),
          ["guardian", "relationship"],
          "Select the relationship.",
        );
        require(
          val.guardian?.consent !== true,
          ["guardian", "consent"],
          "Guardian consent is required to register someone under 18.",
        );
      }
    }

    if (val.tracks.includes("english")) {
      require(!val.english?.program, ["english", "program"], "Select a program.");
      require(
        !val.english?.learning_purpose,
        ["english", "learning_purpose"],
        "Tell us your main purpose.",
      );
      require(
        !val.english?.preferred_schedule,
        ["english", "preferred_schedule"],
        "Select a schedule.",
      );
    }
    if (val.tracks.includes("university")) {
      require(
        !val.university?.home_country,
        ["university", "home_country"],
        "Enter your home country.",
      );
      require(
        !val.university?.current_education_level,
        ["university", "current_education_level"],
        "Select your current level.",
      );
      require(
        !val.university?.intended_qualification,
        ["university", "intended_qualification"],
        "Select what you want to study.",
      );
      // Institutions are optional if the applicant asks us to recommend for them.
      require(
        val.university?.recommend_institution !== "yes" &&
          !val.university?.preferred_universities?.length,
        ["university", "preferred_universities"],
        "Pick at least one institution, or ask us to recommend.",
      );
    }
    if (val.tracks.includes("corporate")) {
      require(
        !val.corporate?.company_name,
        ["corporate", "company_name"],
        "Enter your company name.",
      );
      require(
        !val.corporate?.training_need,
        ["corporate", "training_need"],
        "Tell us the training need.",
      );
    }
  });

export type RegistrationValues = z.infer<typeof registrationSchema>;

/** Field paths validated when leaving each step (for react-hook-form trigger). */
export const STEP_FIELDS = {
  contact: [
    "full_name",
    "email",
    "phone",
    "nationality",
    "dob",
    "guardian.full_name",
    "guardian.relationship",
    "guardian.consent",
  ],
  english: [
    "english.program",
    "english.learning_purpose",
    "english.preferred_schedule",
  ],
  university: [
    "university.home_country",
    "university.current_education_level",
    "university.intended_qualification",
    "university.preferred_universities",
  ],
  corporate: ["corporate.company_name", "corporate.training_need"],
} as const satisfies Record<"contact" | TrackId, readonly string[]>;
