"use client";

import { useStore } from "@/lib/store/store";
import { cn } from "@/lib/utils";

/**
 * L'indicateur ne dit rien quand tout va bien : afficher « synchronisé » en
 * permanence n'apprend rien et occupe l'écran. Il n'apparaît que lorsqu'il y a
 * quelque chose à savoir — des modifications encore locales, ou un problème.
 */
export function SyncIndicator() {
  const { sync, pending, ready, flush } = useStore();

  if (!ready) return null;
  if (sync === "idle" && pending === 0) return null;

  const label =
    sync === "offline"
      ? pending > 0
        ? `Hors ligne — ${pending} modification${pending > 1 ? "s" : ""} en attente`
        : "Hors ligne"
      : sync === "error"
        ? "Synchronisation impossible, toucher pour réessayer"
        : sync === "syncing"
          ? "Synchronisation…"
          : `${pending} en attente`;

  const short =
    sync === "offline"
      ? "hors ligne"
      : sync === "error"
        ? "échec"
        : sync === "syncing"
          ? "…"
          : String(pending);

  return (
    <button
      type="button"
      onClick={() => void flush()}
      title={label}
      aria-label={label}
      className={cn(
        "rt-num rounded-full px-2 py-0.5 text-[0.625rem] transition-colors",
        sync === "error"
          ? "text-[var(--rt-signal)] bg-[var(--rt-signal-soft)]"
          : "text-muted-foreground bg-[var(--rt-rail)]",
      )}
    >
      {short}
    </button>
  );
}
