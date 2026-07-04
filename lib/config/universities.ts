export type InstitutionCategory =
  | "public"
  | "private"
  | "university-college"
  | "branch";

/** Human labels for the institution category groups (list section headers). */
export const INSTITUTION_GROUP_LABELS: Record<InstitutionCategory, string> = {
  public: "Public universities",
  private: "Private universities",
  "university-college": "University colleges",
  branch: "Foreign branch campuses",
};

/**
 * All universities and university colleges in Malaysia (University track).
 * Compiled from MOHE / Wikipedia / StudyMalaysia. Grouped by category; the
 * picker searches across the whole set.
 */
export const MALAYSIAN_INSTITUTIONS: {
  value: string;
  label: string;
  category: InstitutionCategory;
}[] = [
  // Public universities
  { value: "iium", label: "International Islamic University Malaysia (IIUM)", category: "public" },
  { value: "upnm", label: "National Defence University of Malaysia (UPNM)", category: "public" },
  { value: "ukm", label: "Universiti Kebangsaan Malaysia (UKM)", category: "public" },
  { value: "um", label: "Universiti Malaya (UM)", category: "public" },
  { value: "umk", label: "Universiti Malaysia Kelantan (UMK)", category: "public" },
  { value: "ump", label: "Universiti Malaysia Pahang Al-Sultan Abdullah (UMPSA)", category: "public" },
  { value: "unimap", label: "Universiti Malaysia Perlis (UniMAP)", category: "public" },
  { value: "ums", label: "Universiti Malaysia Sabah (UMS)", category: "public" },
  { value: "unimas", label: "Universiti Malaysia Sarawak (UNIMAS)", category: "public" },
  { value: "umt", label: "Universiti Malaysia Terengganu (UMT)", category: "public" },
  { value: "upsi", label: "Universiti Pendidikan Sultan Idris (UPSI)", category: "public" },
  { value: "upm", label: "Universiti Putra Malaysia (UPM)", category: "public" },
  { value: "usm", label: "Universiti Sains Malaysia (USM)", category: "public" },
  { value: "usim", label: "Universiti Sains Islam Malaysia (USIM)", category: "public" },
  { value: "unisza", label: "Universiti Sultan Zainal Abidin (UniSZA)", category: "public" },
  { value: "utem", label: "Universiti Teknikal Malaysia Melaka (UTeM)", category: "public" },
  { value: "utm", label: "Universiti Teknologi Malaysia (UTM)", category: "public" },
  { value: "uitm", label: "Universiti Teknologi MARA (UiTM)", category: "public" },
  { value: "uthm", label: "Universiti Tun Hussein Onn Malaysia (UTHM)", category: "public" },
  { value: "uum", label: "Universiti Utara Malaysia (UUM)", category: "public" },

  // Private universities
  { value: "aimst", label: "AIMST University", category: "private" },
  { value: "aiu", label: "Albukhary International University (AIU)", category: "private" },
  { value: "mediu", label: "Al-Madinah International University (MEDIU)", category: "private" },
  { value: "aeu", label: "Asia e University (AeU)", category: "private" },
  { value: "amu", label: "Asia Metropolitan University (AMU)", category: "private" },
  { value: "apu", label: "Asia Pacific University of Technology & Innovation (APU)", category: "private" },
  { value: "binary", label: "Binary University of Management & Entrepreneurship", category: "private" },
  { value: "cityu", label: "City University Malaysia (CityU)", category: "private" },
  { value: "dhu", label: "DRB-HICOM University of Automotive Malaysia (DHU)", category: "private" },
  { value: "globalnxt", label: "GlobalNxt University (GNU)", category: "private" },
  { value: "help", label: "HELP University", category: "private" },
  { value: "imu", label: "IMU University (formerly International Medical University)", category: "private" },
  { value: "inceif", label: "INCEIF University", category: "private" },
  { value: "inti", label: "INTI International University (INTI)", category: "private" },
  { value: "uim", label: "Islamic University of Malaysia (UIM)", category: "private" },
  { value: "klust", label: "Kuala Lumpur University of Science & Technology (KLUST)", category: "private" },
  { value: "limkokwing", label: "Limkokwing University of Creative Technology", category: "private" },
  { value: "mahsa", label: "MAHSA University", category: "private" },
  { value: "unimel", label: "Kolej Universiti Islam Melaka (UNIMEL)", category: "private" },
  { value: "must", label: "Malaysia University of Science & Technology (MUST)", category: "private" },
  { value: "msu", label: "Management & Science University (MSU)", category: "private" },
  { value: "mila", label: "MILA University", category: "private" },
  { value: "misi", label: "MISI University", category: "private" },
  { value: "mmu", label: "Multimedia University (MMU)", category: "private" },
  { value: "uniten", label: "National Energy University (UNITEN)", category: "private" },
  { value: "nilai", label: "Nilai University", category: "private" },
  { value: "oum", label: "Open University Malaysia (OUM)", category: "private" },
  { value: "perdana", label: "Perdana University (PU)", category: "private" },
  { value: "utp", label: "Universiti Teknologi PETRONAS (UTP)", category: "private" },
  { value: "uptm", label: "Poly-Tech University Malaysia (UPTM)", category: "private" },
  { value: "qiu", label: "Quest International University (QIU)", category: "private" },
  { value: "segi", label: "SEGi University", category: "private" },
  { value: "uis", label: "Selangor Islamic University (UIS)", category: "private" },
  { value: "unishams", label: "Sultan Abdul Halim Mu'adzam Shah International Islamic University (UniSHAMS)", category: "private" },
  { value: "usas", label: "Sultan Azlan Shah University (USAS)", category: "private" },
  { value: "sunway", label: "Sunway University", category: "private" },
  { value: "taylors", label: "Taylor's University", category: "private" },
  { value: "unirazak", label: "Universiti Tun Abdul Razak (UNIRAZAK)", category: "private" },
  { value: "utar", label: "Universiti Tunku Abdul Rahman (UTAR)", category: "private" },
  { value: "tarumt", label: "Tunku Abdul Rahman University of Management and Technology (TAR UMT)", category: "private" },
  { value: "ucsi", label: "UCSI University", category: "private" },
  { value: "unimy", label: "Universiti Malaysia of Computer Science & Engineering (UniMy)", category: "private" },
  { value: "unitar", label: "UNITAR International University", category: "private" },
  { value: "uoc", label: "University of Cyberjaya (UoC)", category: "private" },
  { value: "unikl", label: "University of Kuala Lumpur (UniKL)", category: "private" },
  { value: "umwales", label: "University of Malaya-Wales (UM-Wales)", category: "private" },
  { value: "unisel", label: "University of Selangor (UNISEL)", category: "private" },
  { value: "uts", label: "University of Technology Sarawak (UTS)", category: "private" },
  { value: "wou", label: "Wawasan Open University (WOU)", category: "private" },

  // University colleges
  { value: "berjaya-uc", label: "BERJAYA University College", category: "university-college" },
  { value: "cosmopoint-uc", label: "Cosmopoint International University College (CiUC)", category: "university-college" },
  { value: "firstcity-uc", label: "First City University College", category: "university-college" },
  { value: "genovasi-uc", label: "Genovasi University College", category: "university-college" },
  { value: "gmi-uc", label: "GMI-University College of Applied Sciences (GMI-UcAS)", category: "university-college" },
  { value: "hanchiang-uc", label: "Han Chiang University College of Communication (HCUC)", category: "university-college" },
  { value: "ijn-uc", label: "IJN University College (IJNUC)", category: "university-college" },
  { value: "insaniah-uc", label: "Insaniah University College (KUIN)", category: "university-college" },
  { value: "jesselton-uc", label: "Jesselton University College (JUC)", category: "university-college" },
  { value: "kpj-uc", label: "KPJ Healthcare University College (KPJUC)", category: "university-college" },
  { value: "lincoln-uc", label: "Lincoln University College (LUC)", category: "university-college" },
  { value: "linton-uc", label: "Linton University College", category: "university-college" },
  { value: "newera-uc", label: "New Era University College (NEUC)", category: "university-college" },
  { value: "saito-uc", label: "SAITO University College", category: "university-college" },
  { value: "southern-uc", label: "Southern University College", category: "university-college" },
  { value: "twintech-uc", label: "Twintech International University College of Technology", category: "university-college" },
  { value: "uniti-uc", label: "UNITI University College", category: "university-college" },
  { value: "unitar-klmuc", label: "UNITAR University College Kuala Lumpur (KLMUC)", category: "university-college" },
  { value: "ucsf", label: "University College Sabah Foundation (UCSF)", category: "university-college" },
  { value: "uctati", label: "University College TATI (UC TATI)", category: "university-college" },
  { value: "uow-kdu-uc", label: "UOW Malaysia KDU University College", category: "university-college" },
  { value: "widad-uc", label: "Widad University College", category: "university-college" },

  // Foreign branch campuses
  { value: "curtin-my", label: "Curtin University Malaysia", category: "branch" },
  { value: "heriotwatt-my", label: "Heriot-Watt University Malaysia", category: "branch" },
  { value: "monash-my", label: "Monash University Malaysia", category: "branch" },
  { value: "numed-my", label: "Newcastle University Medicine Malaysia (NUMed)", category: "branch" },
  { value: "raffles-my", label: "Raffles University (Iskandar)", category: "branch" },
  { value: "rumc-my", label: "RCSI & UCD Malaysia Campus (RUMC)", category: "branch" },
  { value: "swinburne-my", label: "Swinburne University of Technology Sarawak Campus", category: "branch" },
  { value: "nottingham-my", label: "University of Nottingham Malaysia (UNMC)", category: "branch" },
  { value: "reading-my", label: "University of Reading Malaysia (UoRM)", category: "branch" },
  { value: "southampton-my", label: "University of Southampton Malaysia (USMC)", category: "branch" },
  { value: "wollongong-my", label: "University of Wollongong Malaysia (UOW)", category: "branch" },
  { value: "xiamen-my", label: "Xiamen University Malaysia (XMUM)", category: "branch" },
];

/** Qualification the applicant wants to pursue in Malaysia. */
export const QUALIFICATION_LEVELS = [
  { value: "foundation", label: "Foundation" },
  { value: "diploma", label: "Diploma" },
  { value: "degree", label: "Bachelor's degree" },
  { value: "master", label: "Master's" },
  { value: "phd", label: "PhD / Doctorate" },
] as const;

/** Study mode — matters most for postgraduate applicants. ODL = Open Distance
 *  Learning (a growing option for working / overseas students). */
export const STUDY_MODES = [
  { value: "coursework", label: "Coursework" },
  { value: "research", label: "Research" },
  { value: "mixed", label: "Mixed mode" },
  { value: "odl", label: "Open Distance Learning (ODL)" },
  { value: "any", label: "Any / not sure" },
] as const;

/** Applicant's CURRENT education level (what they've completed). Includes
 *  international equivalents since many applicants study from abroad. */
export const EDUCATION_LEVELS = [
  { value: "high_school", label: "High school / secondary" },
  { value: "spm", label: "SPM / O-Level" },
  { value: "stpm", label: "STPM / A-Level" },
  { value: "ib", label: "International Baccalaureate (IB)" },
  { value: "foundation", label: "Foundation" },
  { value: "diploma", label: "Diploma" },
  { value: "bachelor", label: "Bachelor's degree" },
  { value: "master", label: "Master's degree" },
  { value: "other", label: "Other" },
] as const;

export const INTAKE_PREFERENCES = [
  { value: "jan", label: "January" },
  { value: "may", label: "May" },
  { value: "sep", label: "September" },
  { value: "flexible", label: "Flexible" },
] as const;
