"use client";

import { useEffect } from "react";

/**
 * Enregistre le service worker qui met en cache le shell applicatif.
 * En développement il est volontairement désenregistré : un SW qui sert un
 * shell mis en cache masque les modifications de code et fait perdre un temps
 * fou en débogage.
 */
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    if (process.env.NODE_ENV !== "production") {
      navigator.serviceWorker
        .getRegistrations()
        .then((registrations) =>
          registrations.forEach((registration) => registration.unregister()),
        )
        .catch(() => undefined);
      return;
    }

    navigator.serviceWorker.register("/sw.js").catch((error) => {
      console.error("[routin] enregistrement du service worker impossible", error);
    });
  }, []);

  return null;
}
