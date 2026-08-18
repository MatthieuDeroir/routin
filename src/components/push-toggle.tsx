"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

type Status = "unsupported" | "denied" | "off" | "on" | "working";

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padded = (base64 + "=".repeat((4 - (base64.length % 4)) % 4))
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const raw = atob(padded);
  return Uint8Array.from([...raw].map((char) => char.charCodeAt(0)));
}

/**
 * Activation des rappels.
 *
 * La permission n'est demandée qu'au moment où l'utilisateur appuie : un
 * navigateur qui voit une demande à l'ouverture de page la bloque désormais
 * d'office, et un refus est définitif — c'est le pire moment pour la poser.
 */
export function PushToggle({ publicKey }: { publicKey: string | null }) {
  const [status, setStatus] = useState<Status>("working");

  useEffect(() => {
    let cancelled = false;

    // Tout passe par une promesse : appeler setState de façon synchrone dans un
    // effet déclenche des rendus en cascade.
    async function detect(): Promise<Status> {
      if (
        !publicKey ||
        !("serviceWorker" in navigator) ||
        !("PushManager" in window) ||
        !("Notification" in window)
      ) {
        return "unsupported";
      }
      if (Notification.permission === "denied") return "denied";

      try {
        // En développement le service worker est volontairement désenregistré :
        // `ready` n'aboutirait jamais et le bouton resterait bloqué sur « … ».
        const registration = await Promise.race([
          navigator.serviceWorker.ready,
          new Promise<null>((resolve) => setTimeout(() => resolve(null), 3000)),
        ]);
        if (!registration) return "off";
        const subscription = await registration.pushManager.getSubscription();
        return subscription ? "on" : "off";
      } catch {
        return "off";
      }
    }

    void detect().then((next) => {
      if (!cancelled) setStatus(next);
    });

    return () => {
      cancelled = true;
    };
  }, [publicKey]);

  async function enable() {
    if (!publicKey) return;
    setStatus("working");

    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus(permission === "denied" ? "denied" : "off");
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
      });

      const response = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription.toJSON()),
      });
      if (!response.ok) throw new Error("enregistrement refusé");

      setStatus("on");
    } catch (error) {
      console.error("[routin] abonnement aux rappels impossible", error);
      setStatus("off");
    }
  }

  async function disable() {
    setStatus("working");
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await fetch(
          `/api/push/subscribe?endpoint=${encodeURIComponent(subscription.endpoint)}`,
          { method: "DELETE" },
        );
        await subscription.unsubscribe();
      }
    } catch (error) {
      console.error("[routin] désabonnement impossible", error);
    }
    setStatus("off");
  }

  return (
    <section className="border-[var(--rt-surface-border)] mx-5 mt-8 space-y-3 rounded-[var(--radius)] border p-4">
      <div>
        <h2 className="rt-display text-base">Rappels</h2>
        <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
          Une notification à l’heure des tâches qui en ont une, seulement si
          elles ne sont pas déjà cochées.
        </p>
      </div>

      {status === "unsupported" ? (
        <p className="text-muted-foreground text-xs">
          Ce navigateur ne gère pas les notifications. Sur iPhone, il faut
          d’abord ajouter Routin à l’écran d’accueil.
        </p>
      ) : status === "denied" ? (
        <p className="text-muted-foreground text-xs">
          Les notifications sont bloquées pour ce site. Réautorisez-les dans les
          réglages du navigateur, puis revenez ici.
        </p>
      ) : (
        <Button
          type="button"
          variant={status === "on" ? "ghost" : "default"}
          disabled={status === "working"}
          onClick={status === "on" ? disable : enable}
        >
          {status === "on"
            ? "Désactiver les rappels"
            : status === "working"
              ? "…"
              : "Activer les rappels"}
        </Button>
      )}
    </section>
  );
}
