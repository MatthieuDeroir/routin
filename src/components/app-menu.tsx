"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/", label: "Aujourd’hui" },
  { href: "/routines", label: "Mes routines" },
  { href: "/stats", label: "Statistiques" },
  { href: "/reglages", label: "Moments de la journée" },
  { href: "/directions", label: "Direction visuelle" },
];

/**
 * Menu discret : l'écran du jour ne porte qu'un bouton, tout le reste est à un
 * geste. La navigation entre les jours appartient au balayage, pas à une barre
 * d'onglets qui mangerait le bas de l'écran en permanence.
 */
export function AppMenu({ signOut }: { signOut: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const container = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  // Fermeture à la navigation, ajustée pendant le rendu plutôt que dans un
  // effet : c'est de l'état dérivé d'une prop, pas une synchronisation externe.
  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!container.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div className="relative" ref={container}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Menu"
        className="text-muted-foreground hover:text-foreground focus-visible:ring-ring grid size-9 place-items-center rounded-full focus-visible:ring-2 focus-visible:outline-none"
      >
        <svg viewBox="0 0 24 24" className="size-5" aria-hidden>
          <g fill="currentColor">
            <circle cx="12" cy="5" r="1.8" />
            <circle cx="12" cy="12" r="1.8" />
            <circle cx="12" cy="19" r="1.8" />
          </g>
        </svg>
      </button>

      {open ? (
        <div
          role="menu"
          className={cn(
            "bg-popover text-popover-foreground absolute top-11 right-0 z-20 w-56 overflow-hidden",
            "rounded-[var(--radius)] border border-[var(--rt-surface-border)] shadow-lg",
          )}
        >
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              role="menuitem"
              className={cn(
                "hover:bg-accent block px-4 py-2.5 text-sm",
                pathname === link.href && "text-primary font-medium",
              )}
            >
              {link.label}
            </Link>
          ))}
          <div className="border-t border-[var(--rt-surface-border)]">
            {signOut}
          </div>
        </div>
      ) : null}
    </div>
  );
}
