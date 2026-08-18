"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { THEMES, THEME_COOKIE, type ThemeId } from "@/lib/theme";
import { cn } from "@/lib/utils";

/**
 * Sélecteur de direction visuelle — dispositif temporaire, le temps de trancher.
 * Il disparaîtra une fois la direction retenue ; d'ici là il reste
 * volontairement en bas de page, hors du chemin de lecture.
 */
export function ThemeSwitcher({ current }: { current: ThemeId }) {
  const [selected, setSelected] = useState<ThemeId>(current);
  const [, startTransition] = useTransition();
  const router = useRouter();
  const applied = useRef(current);

  // L'attribut est posé sur <html> avant le retour du serveur : la bascule est
  // instantanée à l'écran, le rafraîchissement ne fait que persister le choix.
  useEffect(() => {
    if (applied.current === selected) return;
    applied.current = selected;
    document.documentElement.dataset.theme = selected;
    document.cookie = `${THEME_COOKIE}=${selected}; path=/; max-age=31536000; samesite=lax`;
    startTransition(() => router.refresh());
  }, [selected, router]);

  const idea = THEMES.find((theme) => theme.id === selected)?.idea;

  return (
    <div className="border-[var(--rt-surface-border)] mt-8 border-t px-5 pt-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <p className="text-muted-foreground mb-2 text-[0.6875rem] tracking-wide uppercase">
        Direction visuelle
      </p>
      <div className="flex gap-2">
        {THEMES.map((theme) => (
          <button
            key={theme.id}
            type="button"
            onClick={() => setSelected(theme.id)}
            aria-pressed={selected === theme.id}
            className={cn(
              "flex-1 rounded-[var(--radius)] border px-3 py-2 text-sm transition-colors",
              "focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none",
              selected === theme.id
                ? "border-primary bg-primary text-primary-foreground"
                : "border-[var(--rt-surface-border)] bg-[var(--rt-surface)]",
            )}
          >
            {theme.name}
          </button>
        ))}
      </div>
      <p className="text-muted-foreground mt-3 text-xs leading-relaxed">{idea}</p>
    </div>
  );
}
