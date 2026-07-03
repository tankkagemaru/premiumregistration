export interface Attribution {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  referrer?: string;
  agent_code?: string;
}

const KEY = "pecsb-attribution";

/**
 * First-touch marketing attribution. Reads UTM params + `?agent=` + external
 * referrer from the current URL, merges with anything already captured this
 * session (first value wins), persists to sessionStorage, and returns it.
 * Captured silently and sent with the registration on submit.
 */
export function captureAttribution(): Attribution {
  if (typeof window === "undefined") return {};
  const sp = new URLSearchParams(window.location.search);
  const stored: Attribution = JSON.parse(
    window.sessionStorage.getItem(KEY) || "{}",
  );

  const ref = document.referrer || "";
  const external = ref && !ref.includes(window.location.host) ? ref : undefined;

  const fresh: Attribution = {
    utm_source: sp.get("utm_source") || undefined,
    utm_medium: sp.get("utm_medium") || undefined,
    utm_campaign: sp.get("utm_campaign") || undefined,
    agent_code: sp.get("agent") || sp.get("agent_code") || undefined,
    referrer: external,
  };

  const merged: Attribution = { ...stored };
  for (const [k, v] of Object.entries(fresh)) {
    if (v && !merged[k as keyof Attribution]) {
      merged[k as keyof Attribution] = v;
    }
  }
  window.sessionStorage.setItem(KEY, JSON.stringify(merged));
  return merged;
}
