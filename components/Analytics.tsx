"use client";

import { useEffect } from "react";
import { hasCookieConsent } from "./CookieBanner";

declare global {
  interface Window {
    ym?: (...args: unknown[]) => void;
  }
}

/** Яндекс.Метрика: подключается только после согласия на cookie и только если задан NEXT_PUBLIC_METRIKA_ID. */
export function Analytics() {
  useEffect(() => {
    const id = process.env.NEXT_PUBLIC_METRIKA_ID;
    if (!id) return;
    const load = () => {
      if (!hasCookieConsent() || document.getElementById("ym-tag")) return;
      const s = document.createElement("script");
      s.id = "ym-tag";
      s.async = true;
      s.src = "https://mc.yandex.ru/metrika/tag.js";
      s.onload = () => window.ym?.(Number(id), "init", { clickmap: true, trackLinks: true, accurateTrackBounce: true, webvisor: false });
      document.head.appendChild(s);
    };
    load();
    window.addEventListener("sosed-cookie", load);
    return () => window.removeEventListener("sosed-cookie", load);
  }, []);
  return null;
}
