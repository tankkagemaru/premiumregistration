/**
 * Provider-agnostic conversion tracking. Fires an event into whatever tag
 * managers are present (GA4 gtag, GTM dataLayer, Meta Pixel). No-ops when none
 * are installed, so it's safe to call unconditionally. Add the actual tags in
 * the layout once you have GA4 / Meta / TikTok pixel IDs.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
export function trackEvent(name: string, params: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;
  const w = window as any;
  try {
    if (typeof w.gtag === "function") w.gtag("event", name, params);
    if (Array.isArray(w.dataLayer)) w.dataLayer.push({ event: name, ...params });
    if (typeof w.fbq === "function") {
      w.fbq("trackCustom", name, params);
    }
  } catch {
    /* analytics must never break the app */
  }
}
