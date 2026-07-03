/**
 * Normalize a phone number to the digits-only international form wa.me expects
 * (no "+", no spaces). Fixes the bug where a Malaysian local number like
 * "012-345 6789" would otherwise produce an invalid wa.me/0123456789 link.
 *
 * Heuristic: strip formatting; a leading "+" or "00" is already international;
 * a leading "0" is a local trunk prefix → replace with the country's dial code
 * (defaults to Malaysia 60).
 */
export function toWhatsAppNumber(raw?: string | null, dialCode = "60"): string {
  if (!raw) return "";
  const trimmed = raw.trim();
  if (trimmed.startsWith("+")) return trimmed.replace(/\D/g, "");
  let digits = trimmed.replace(/\D/g, "");
  if (digits.startsWith("00")) return digits.slice(2);
  if (digits.startsWith("0")) digits = dialCode + digits.slice(1);
  return digits;
}
