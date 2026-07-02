"use client";

import { useEffect, useRef } from "react";

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: Record<string, unknown>) => string;
      reset: (id?: string) => void;
    };
  }
}

const SCRIPT_ID = "cf-turnstile-script";
const SCRIPT_SRC =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

/**
 * Cloudflare Turnstile widget. Renders only when NEXT_PUBLIC_TURNSTILE_SITE_KEY
 * is set; otherwise it no-ops (local dev), and the server skips verification
 * when the secret is likewise unset.
 */
export function Turnstile({ onToken }: { onToken: (token: string) => void }) {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const ref = useRef<HTMLDivElement>(null);
  const cb = useRef(onToken);
  cb.current = onToken;
  const rendered = useRef(false);

  useEffect(() => {
    if (!siteKey || rendered.current) return;

    const render = () => {
      if (!ref.current || !window.turnstile || rendered.current) return;
      rendered.current = true;
      window.turnstile.render(ref.current, {
        sitekey: siteKey,
        callback: (token: string) => cb.current(token),
        "expired-callback": () => cb.current(""),
        "error-callback": () => cb.current(""),
      });
    };

    if (window.turnstile) {
      render();
    } else if (!document.getElementById(SCRIPT_ID)) {
      const s = document.createElement("script");
      s.id = SCRIPT_ID;
      s.src = SCRIPT_SRC;
      s.async = true;
      s.onload = render;
      document.head.appendChild(s);
    } else {
      document.getElementById(SCRIPT_ID)?.addEventListener("load", render);
    }
  }, [siteKey]);

  if (!siteKey) return null;
  return <div ref={ref} className="mt-2" />;
}
