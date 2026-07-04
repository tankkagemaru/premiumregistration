/** Public site links. Point PRIVACY_URL at the real PDPA privacy notice. */
export const PRIVACY_URL =
  process.env.NEXT_PUBLIC_PRIVACY_URL ?? "https://premium.edu.my/privacy";

/**
 * "Talk to our team" CTA target. Left blank for now — set this (or the
 * NEXT_PUBLIC_TALK_URL env var) to the marketing portal / WhatsApp / chat link
 * when it's ready. While empty the button is shown but disabled.
 */
export const TALK_TO_TEAM_URL = process.env.NEXT_PUBLIC_TALK_URL ?? "";

/**
 * Company identity shown in the public footer. Values that vary or are still
 * being confirmed are env-overridable; anything left blank is simply hidden in
 * the footer (no placeholder text leaks onto the live site). Fill the blanks
 * here or via NEXT_PUBLIC_* env vars once the details are confirmed.
 */
export const COMPANY = {
  legalName: "Premium Entrepreneur Consultant Sdn Bhd",
  // Address, phone, and email confirmed from premium.edu.my (Jul 2026).
  address:
    process.env.NEXT_PUBLIC_COMPANY_ADDRESS ??
    "10-1-2, Level 10, Fahrenheit 88 Office Tower, 179 Jln Gading, Bukit Bintang, 55100 Kuala Lumpur, Malaysia",
  phone: process.env.NEXT_PUBLIC_COMPANY_PHONE ?? "+60 16-900 0098",
  // Second published line (WhatsApp / alternate) — blank hides it.
  phoneAlt: process.env.NEXT_PUBLIC_COMPANY_PHONE_ALT ?? "+60 13-707 7714",
  email: process.env.NEXT_PUBLIC_COMPANY_EMAIL ?? "inquiry@premium.edu.my",
  website: "premium.edu.my",
  websiteUrl: "https://premium.edu.my",
  // SSM company registration number (from the PECSB logo).
  regNo: process.env.NEXT_PUBLIC_COMPANY_REG_NO ?? "1137129-X",
};
