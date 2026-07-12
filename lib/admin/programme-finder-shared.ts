/**
 * Malaysia University Programme Finder — pure filter/derivation logic, ported
 * from the original standalone HTML tool. Client + server safe (no imports).
 *
 * The finder stores NO extra per-programme columns: study level, specialty,
 * duration, IELTS and study mode are all DERIVED at runtime from the programme
 * name; institution type / location / intake come from the university row. So
 * it runs directly on the existing `universities` catalogue.
 */

import type { University } from "@/lib/admin/universities-shared";

/** Field of study → keywords matched against the programme name (80+). */
export const SPECIALTIES: Record<string, string[]> = {
  "Accounting & Taxation": ["accounting", "accountancy", "taxation", "audit"],
  "Actuarial Science": ["actuarial"],
  "Aerospace & Aviation": ["aerospace", "aeronautic", "aviation", "aircraft", "aeroplane", "helicopter"],
  "Agriculture & Forestry": ["agriculture", "forestry", "plantation", "wood", "timber", "aquaculture"],
  "Animation & Visual Effects": ["animation", "visual effects", "vfx", "3d modelling"],
  "Architecture & Built Environment": ["architecture", "built environment", "building surveying"],
  "Artificial Intelligence (AI)": ["artificial intelligence", "ai ", "intelligent system", "robotics"],
  "Automotive Engineering": ["automotive"],
  "Banking & Islamic Finance": ["banking", "islamic finance", "muamalat"],
  "Biochemistry & Microbiology": ["biochemistry", "microbiology"],
  "Biology & Biological Sciences": ["biology", "botany", "zoology"],
  "Biomedical Science & Engineering": ["biomedical"],
  "Biotechnology": ["biotechnology"],
  "Broadcasting & Journalism": ["broadcasting", "journalism"],
  "Business Administration & Management": ["business administration", "bba", "management", "business management", "mba ", "dba "],
  "Chemical Engineering": ["chemical engineering", "chemical"],
  "Chemistry": ["chemistry"],
  "Civil Engineering": ["civil engineering", "civil"],
  "Clinical Psychology": ["clinical psychology"],
  "Communication & Media": ["communication", "media", "corporate communication", "mass communication"],
  "Computer Science (General)": ["computer science", "computing"],
  "Construction Management": ["construction"],
  "Counselling & Guidance": ["counselling", "guidance"],
  "Culinary Arts": ["culinary", "patisserie", "food preparation"],
  "Cyber Security & Info Security": ["cyber security", "information security", "network security"],
  "Data Science & Analytics": ["data science", "analytics", "business intelligence", "data analytics"],
  "Dentistry & Dental Surgery": ["dental", "dentistry", "dds", "bds", "orthodontic", "periodontology", "orofacial", "maxillofacial"],
  "Dietetics & Nutrition": ["dietetic", "nutrition"],
  "Early Childhood Education": ["early childhood"],
  "Economics": ["economic"],
  "Education & Teaching (General)": ["education", "teaching", "pedagogy"],
  "Electrical & Electronic Engineering": ["electrical", "electronic", "electromechanical", "microelectronic", "telecommunication"],
  "English, TESL & TESOL": ["tesl", "tesol", "english", "linguistics"],
  "Entrepreneurship": ["entrepreneurship", "technopreneurship"],
  "Environmental Science & Management": ["environment", "ecology"],
  "Event Management": ["event management"],
  "Fashion Design": ["fashion"],
  "Finance & Investment": ["finance", "investment"],
  "Fine Arts & Performing Arts": ["fine arts", "performing arts", "dance", "drama", "theater", "cinematic", "acting"],
  "Food Science & Technology": ["food science", "food technology", "food manufacturing", "food service"],
  "Forensic Science": ["forensic"],
  "Game Design & Development": ["game design", "games development", "computer games"],
  "Geography": ["geography"],
  "Graphic Design & Visual Comm.": ["graphic design", "visual communication", "advertising"],
  "Halal Industry": ["halal"],
  "History": ["history"],
  "Hospitality & Hotel Management": ["hospitality", "hotel"],
  "Human Resource Management (HR)": ["human resource", "hr ", "hrd"],
  "Industrial Design": ["industrial design", "product design"],
  "Information Systems": ["information system", " mis "],
  "Information Technology (IT)": ["information technology", "it ", " ict ", "internet of things", "iot"],
  "Interior Architecture / Design": ["interior architecture", "interior design"],
  "International Business": ["international business"],
  "International Relations & Affairs": ["international relations", "international affairs"],
  "Islamic Studies & Syariah": ["islamic", "syariah", "shariah", "usuluddin", "quran", "hadith", "fiqh", "aqidah"],
  "Languages & Linguistics (Other)": ["arabic", "mandarin", "chinese", "japanese", "french", "german", "translation", "language"],
  "Law & Jurisprudence": ["law", "llb", "llm", "jurisprudence"],
  "Logistics & Supply Chain": ["logistics", "supply chain"],
  "Manufacturing Engineering": ["manufacturing"],
  "Marine & Naval Engineering": ["marine", "naval", "offshore", "ship"],
  "Marketing": ["marketing"],
  "Mathematics & Statistics": ["mathematics", "math", "statistic"],
  "Mechanical Engineering": ["mechanical"],
  "Mechatronics & Robotics": ["mechatronic", "robotics", "automation"],
  "Medical Imaging & Radiography": ["medical imaging", "radiography", "radiology", "diagnostic imaging"],
  "Medicine & Surgery (MBBS/MD)": ["medicine", "mbbs", " md ", "surgery", "medical", "clinical medicine", "paediatric", "internal med"],
  "Multimedia & Creative Technology": ["multimedia", "creative multimedia", "interactive"],
  "Music": ["music"],
  "Nursing": ["nursing", "midwifery", "gerontology", "perioperative"],
  "Occupational Safety & Health": ["occupational safety", "occupational health", "osh"],
  "Optometry & Ophthalmic": ["optometry", "ophthalmic"],
  "Petroleum & Oil Gas Engineering": ["petroleum", "oil and gas", "oil & gas"],
  "Pharmacy & Pharmacology": ["pharmacy", "pharmaceutical", "pharmacology"],
  "Physics": ["physics", "geophysics"],
  "Physiotherapy & Rehabilitation": ["physiotherapy", "rehabilitation", "chiropractic"],
  "Political Science & Public Policy": ["political science", "public policy", "governance"],
  "Psychology": ["psychology"],
  "Public Administration & Management": ["public administration", "public management"],
  "Public Health": ["public health"],
  "Quantity Surveying": ["quantity surveying"],
  "Real Estate & Property Management": ["real estate", "property management"],
  "Retail Management": ["retail"],
  "Risk Management & Insurance": ["risk management", "insurance"],
  "Social Science & Sociology": ["social science", "sociology", "anthropology", "social work"],
  "Software Engineering": ["software engineering"],
  "Sports Science & Management": ["sports science", "sports management"],
  "Tourism Management": ["tourism"],
  "Traditional Chinese Medicine": ["traditional chinese medicine", "tcm"],
  "Urban & Regional Planning": ["urban planning", "regional planning", "urban design"],
  "Veterinary Medicine": ["veterinary", "bioveterinary"],
};

/** Country accreditation rules — restrict which universities/programmes qualify
 *  for degree equivalency, plus an advisory notice. */
export const ACCREDITATION_RULES: Record<
  string,
  { allowedUnis: string[] | null; notice: string }
> = {
  Oman: {
    allowedUnis: null,
    notice:
      "Oman: Mandatory pre-approval from MOHE. Dual degrees must be fully MQA accredited. MBBS/MD generally restricted unless it's a PhD programme.",
  },
  UAE: {
    allowedUnis: ["MSU", "UKM", "UPM", "USM", "UTM", "UTP", "UM", "UCSI", "Taylor's"],
    notice:
      "UAE: Accreditation may differ between main and branch campuses. Full-time, face-to-face study is required for equivalency.",
  },
  "Saudi Arabia": {
    allowedUnis: ["APU", "IMU", "LUC", "MSU", "MEDIU", "MMU", "UNITEN", "UiTM", "UKM", "UPM", "USM", "UTM", "UTP", "UM", "UCSI", "UniSZA", "IIUM", "USIM", "Taylor's", "Monash", "UGM"],
    notice:
      "Saudi Arabia: Strict full-time, regular attendance required. Distance Learning (ODL) programmes are not accepted.",
  },
  Iraq: {
    allowedUnis: ["UKM", "UPM", "USM", "UTM", "UTP", "UUM", "UM"],
    notice:
      "Iraq: Showing universities recognised under MOHESR Group A. Verify specific degree recognition before enrolling.",
  },
};

/** Authoritative Public/Private override by short name (falls back to the row). */
export const UNIVERSITY_TYPE_OVERRIDE: Record<string, string> = {
  UM: "Public", USM: "Public", UKM: "Public", UPM: "Public", UTM: "Public", UiTM: "Public",
  UUM: "Public", IIUM: "Public", UNIMAS: "Public", UMS: "Public", UPSI: "Public", USIM: "Public",
  UTeM: "Public", UTHM: "Public", UMPSA: "Public",
  UCSI: "Private", UNITEN: "Private", UniKL: "Private", OUM: "Private", MMU: "Private",
  MSU: "Private", MAHSA: "Private", LUC: "Private", Nilai: "Private", IMU: "Private",
  IUKL: "Private", APU: "Private", UniRazak: "Private", MEDIU: "Private", "Taylor's": "Private",
};

export const LEVELS = [
  { value: "Foundation", label: "Foundation & Certificate" },
  { value: "Diploma", label: "Diploma" },
  { value: "Bachelor", label: "Bachelor's Degree" },
  { value: "Master", label: "Master's Degree" },
  { value: "PhD", label: "PhD & Doctorate" },
];
export const MODES = ["Coursework", "Research", "Mixed"];
export const DURATIONS = ["1", "2", "3", "4", "5"];
export const LOCATIONS = [
  "Kuala Lumpur", "Selangor", "Penang", "Johor", "Kedah", "Perak", "Negeri Sembilan", "Melaka", "Pahang",
];
export const INTAKE_MONTHS = ["Jan", "Feb", "Mar", "May", "Jul", "Sep", "Oct", "Nov"];
export const SORTS = [
  { value: "default", label: "Default" },
  { value: "priceAsc", label: "Price (Low to High)" },
  { value: "priceDesc", label: "Price (High to Low)" },
  { value: "type", label: "Type (Public/Private)" },
];

export function uniType(u: Pick<University, "short_name" | "type">): string {
  return (u.short_name && UNIVERSITY_TYPE_OVERRIDE[u.short_name]) || u.type || "—";
}

/** Derive an indicative duration + IELTS band from a programme name. */
export function getProgramSpecs(progName: string): { duration: string; ielts: string } {
  const lower = progName.toLowerCase();
  let duration = "Check website";
  let ielts = "Check website";

  if (/foundation|certificate|a-level|ausmat/.test(lower)) {
    duration = "1 Year"; ielts = "5.0 - 5.5";
  } else if (lower.includes("diploma")) {
    duration = /nursing|medical|health/.test(lower) ? "3 Years" : "2 - 2.5 Years";
    ielts = "5.0 - 5.5";
  } else if (/doctor of medicine|mbbs|dental|dentistry/.test(lower)) {
    if (/master|phd|doctor in|doctorate/.test(lower)) { duration = "3 - 4 Years"; ielts = "6.0 - 7.0"; }
    else { duration = "5 Years"; ielts = "6.0 - 7.0"; }
  } else if (/bachelor|bsc|ba |bba/.test(lower) || /\b(beng|bmus|bca)\b/.test(lower)) {
    if (/engineering|pharmacy|law |dentistry/.test(lower)) { duration = "4 Years"; ielts = "6.0"; }
    else if (lower.includes("architecture")) { duration = "3 - 4 Years"; ielts = "6.0"; }
    else { duration = "3 - 3.5 Years"; ielts = "5.5 - 6.0"; }
  } else if (/master|msc|mba/.test(lower) || /\b(mmed|mphil|ma)\b/.test(lower)) {
    duration = "1 - 2 Years"; ielts = "6.0 - 6.5";
  } else if (/phd|doctor of philosophy|dba|doctor of business|doctor of education|doctor of technology/.test(lower)) {
    duration = "3 - 4 Years"; ielts = "6.0 - 6.5";
  }
  return { duration, ielts };
}

/** Whether a programme name matches a study level. */
export function levelMatch(progName: string, level: string): boolean {
  if (!level) return true;
  const l = progName.toLowerCase();
  if (level === "Foundation") return /foundation|certificate|a-level|ausmat/.test(l);
  if (level === "Diploma") return l.includes("diploma") && !l.includes("postgraduate");
  if (level === "Bachelor") {
    if (l.includes("doctor of medicine") || l.includes("doctor of dental")) return true;
    return l.includes("bachelor") || l.includes("degree") || /\b(bsc|ba|beng|bba|bca|bmus|bds|mbbs|md)\b/.test(l);
  }
  if (level === "Master") return l.includes("master") || l.includes("postgraduate") || /\b(msc|mba|mmed|mphil|ma)\b/.test(l);
  if (level === "PhD") {
    if (l.includes("doctor of medicine") || l.includes("doctor of dental")) return false;
    return l.includes("doctor") || l.includes("phd") || /\b(dba|edd|deng|dtm|drph)\b/.test(l);
  }
  return true;
}

const SYNONYMS: Record<string, string[]> = {
  medicine: ["medicine", "medical", "mbbs", "md"],
  medical: ["medicine", "medical", "mbbs", "md"],
  mbbs: ["medicine", "medical", "mbbs", "md"],
  dentist: ["dentist", "dental", "dentistry", "bds", "dds"],
  dentistry: ["dentist", "dental", "dentistry", "bds", "dds"],
  dental: ["dentist", "dental", "dentistry", "bds", "dds"],
  engineering: ["engineering", "engineer"],
  engineer: ["engineering", "engineer"],
  it: ["it", "information technology", "computer"],
  computer: ["it", "information technology", "computer", "computing", "software"],
  software: ["software", "computer"],
  ai: ["ai", "artificial intelligence"],
  hr: ["hr", "human resource"],
  business: ["business", "bba", "mba", "dba", "management"],
  management: ["business", "management"],
  accounting: ["accounting", "accountancy"],
  master: ["master", "postgraduate", "msc", "mba", "ma"],
  bachelor: ["bachelor", "degree", "bsc", "ba", "beng", "bba"],
  phd: ["phd", "doctorate", "doctor of philosophy"],
};
export function getSynonyms(word: string): string[] {
  return SYNONYMS[word] ?? [word];
}

/** First numeric value in a fee string, semester fees doubled for fair sorting. */
export function getPriceNum(str: string): number {
  if (!str) return Infinity;
  const first = str.split("-")[0];
  const m = first.replace(/,/g, "").match(/\d+(\.\d+)?/);
  const val = m ? parseFloat(m[0]) : Infinity;
  if (val === Infinity) return val;
  const lower = str.toLowerCase();
  if (lower.includes("semester") || lower.includes("sem")) return val * 2;
  return val;
}

/** Format a fee string into the target currency, preserving the period suffix. */
export function formatPrice(
  priceStr: string,
  baseCurrency: string,
  targetCurrency: string,
  usdPerMyr: number,
): string {
  if (!priceStr) return "Check website";
  const m = priceStr.replace(/,/g, "").match(/\d+(\.\d+)?/);
  if (!m) return priceStr;
  const num = parseFloat(m[0]);

  let converted = num;
  if (baseCurrency === "MYR" && targetCurrency === "USD") converted = num * usdPerMyr;
  if (baseCurrency === "USD" && targetCurrency === "MYR") converted = num / usdPerMyr;

  const formatted = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: targetCurrency,
    maximumFractionDigits: 0,
  }).format(converted);

  const lower = priceStr.toLowerCase();
  let suffix = "";
  if (lower.includes("semester")) suffix = " (Per Sem)";
  else if (lower.includes("year")) suffix = " (Per Year)";
  else if (lower.includes("total")) suffix = " (Total)";
  return `${formatted}${suffix}`;
}

export interface FinderFilters {
  search: string;
  specialty: string;
  level: string;
  type: string;
  location: string;
  intake: string;
  duration: string;
  mode: string;
  accreditation: string;
  sort: string;
}

export interface MatchedUniversity extends University {
  matchedProgrammes: [string, string][]; // [name, fee]
  minPrice: number;
  maxPrice: number;
}

/** Apply every active filter and return matched universities (each carrying
 *  only its matching programmes), sorted per `filters.sort`. */
export function filterUniversities(
  universities: University[],
  filters: FinderFilters,
): MatchedUniversity[] {
  const searchTokens = filters.search.toLowerCase().trim().split(/\s+/).filter(Boolean);
  const specKeywords = filters.specialty ? SPECIALTIES[filters.specialty] : null;
  const accRule = filters.accreditation ? ACCREDITATION_RULES[filters.accreditation] : null;

  const out: MatchedUniversity[] = [];

  for (const u of universities) {
    const type = uniType(u);
    if (filters.type && type !== filters.type) continue;
    if (filters.location && u.location !== filters.location) continue;
    if (filters.intake && (!u.intakes || !u.intakes.includes(filters.intake))) continue;
    if (accRule?.allowedUnis && (!u.short_name || !accRule.allowedUnis.includes(u.short_name))) continue;

    const matched: [string, string][] = [];
    let minPrice = Infinity;
    let maxPrice = -Infinity;

    for (const [progName, price] of Object.entries(u.programmes ?? {})) {
      const l = progName.toLowerCase();
      if (filters.level && !levelMatch(progName, filters.level)) continue;
      if (specKeywords && !specKeywords.some((kw) => l.includes(kw))) continue;

      if (searchTokens.length > 0) {
        const ok = searchTokens.every((tok) => getSynonyms(tok).some((syn) => l.includes(syn)));
        if (!ok) continue;
      }

      if (filters.duration && !getProgramSpecs(progName).duration.includes(filters.duration)) continue;

      if (filters.mode) {
        const isPostgrad = /master|phd|doctor/.test(l);
        if (filters.mode === "Research" && !l.includes("research")) continue;
        if (filters.mode === "Mixed" && !l.includes("mixed")) continue;
        if (filters.mode === "Coursework" && isPostgrad && l.includes("research")) continue;
      }

      if (filters.accreditation === "Oman") {
        if (/mbbs|doctor of medicine|bachelor of medicine|dental surgery/.test(l) && !l.includes("phd")) continue;
        if (u.short_name === "APU" && !levelMatch(progName, "PhD")) continue;
        if (u.short_name === "UCSI" && (l === "dba" || l.includes("doctor of business administration"))) continue;
      }
      if (filters.accreditation === "Saudi Arabia") {
        if (/odl|online|on-line|distance/.test(l)) continue;
      }

      let num = getPriceNum(price);
      if (num !== Infinity && u.currency === "USD") num *= 4.5;
      if (num < minPrice) minPrice = num;
      if (num !== Infinity && num > maxPrice) maxPrice = num;

      matched.push([progName, price]);
    }

    if (matched.length === 0) continue;
    out.push({ ...u, matchedProgrammes: matched, minPrice, maxPrice: maxPrice === -Infinity ? Infinity : maxPrice });
  }

  if (filters.sort === "type") {
    out.sort((a, b) => uniType(a).localeCompare(uniType(b)));
  } else if (filters.sort === "priceAsc") {
    out.sort((a, b) => a.minPrice - b.minPrice);
  } else if (filters.sort === "priceDesc") {
    out.sort((a, b) => (b.maxPrice === Infinity ? -1 : b.maxPrice) - (a.maxPrice === Infinity ? -1 : a.maxPrice));
  }
  return out;
}

/** CSV of the current matches (one row per programme). */
export function buildCSV(
  matched: MatchedUniversity[],
  currency: string,
  usdPerMyr: number,
): string {
  const headers = ["University", "Location", "Intakes", "Type", "Programme", "Duration", "IELTS", `Price (${currency})`];
  const rows = [headers];
  for (const u of matched) {
    for (const [name, fee] of u.matchedProgrammes) {
      const specs = getProgramSpecs(name);
      rows.push([
        u.name,
        u.location ?? "",
        u.intakes ?? "",
        uniType(u),
        name,
        specs.duration,
        specs.ielts,
        formatPrice(fee, u.currency, currency, usdPerMyr),
      ]);
    }
  }
  return rows
    .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
    .join("\n");
}
