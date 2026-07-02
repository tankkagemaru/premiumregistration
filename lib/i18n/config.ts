import { en } from "./en";
import { zh } from "./zh";
import { ar } from "./ar";
import { ja } from "./ja";

export type Locale = "en" | "zh" | "ar" | "ja";

export const DEFAULT_LOCALE: Locale = "en";

/** Right-to-left locales (Arabic). */
export const RTL_LOCALES: Locale[] = ["ar"];

/** Switcher menu — each locale shown in its own language. */
export const LOCALES: { code: Locale; name: string }[] = [
  { code: "en", name: "English" },
  { code: "zh", name: "中文" },
  { code: "ar", name: "العربية" },
  { code: "ja", name: "日本語" },
];

export const dictionaries = { en, zh, ar, ja } as const;
