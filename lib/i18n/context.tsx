"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  dictionaries,
  DEFAULT_LOCALE,
  RTL_LOCALES,
  type Locale,
} from "./config";

type Params = Record<string, string | number>;

interface Ctx {
  locale: Locale;
  setLocale: (l: Locale) => void;
  dir: "ltr" | "rtl";
  /** Translate a dot-path key, e.g. t("landing.title"). */
  t: (path: string, params?: Params) => string;
}

const LanguageContext = createContext<Ctx | null>(null);
const STORAGE_KEY = "pecsb-locale";

function resolve(dict: unknown, path: string): string {
  const value = path
    .split(".")
    .reduce<unknown>(
      (acc, key) =>
        acc && typeof acc === "object"
          ? (acc as Record<string, unknown>)[key]
          : undefined,
      dict,
    );
  return typeof value === "string" ? value : path;
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);

  // Restore the saved preference, else auto-detect from the browser language.
  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY) as Locale | null;
    if (saved && saved in dictionaries) {
      setLocaleState(saved);
      return;
    }
    const nav = window.navigator.language?.slice(0, 2).toLowerCase();
    if (nav && nav in dictionaries) setLocaleState(nav as Locale);
  }, []);

  // Reflect the locale onto <html> (lang + dir) and persist it.
  useEffect(() => {
    const dir = RTL_LOCALES.includes(locale) ? "rtl" : "ltr";
    document.documentElement.lang = locale;
    document.documentElement.dir = dir;
    window.localStorage.setItem(STORAGE_KEY, locale);
  }, [locale]);

  const setLocale = useCallback((l: Locale) => setLocaleState(l), []);

  const t = useCallback(
    (path: string, params?: Params) => {
      let str = resolve(dictionaries[locale], path);
      if (params) {
        for (const [k, v] of Object.entries(params)) {
          str = str.replace(`{${k}}`, String(v));
        }
      }
      return str;
    },
    [locale],
  );

  const value = useMemo<Ctx>(
    () => ({
      locale,
      setLocale,
      dir: RTL_LOCALES.includes(locale) ? "rtl" : "ltr",
      t,
    }),
    [locale, setLocale, t],
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useI18n must be used within LanguageProvider");
  return ctx;
}
