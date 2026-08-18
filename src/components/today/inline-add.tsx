"use client";

import { useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Ajout au fil de la liste.
 *
 * Une ligne « + Ajouter » qui devient un champ, là où on regarde. C'est le
 * geste le plus fréquent de l'application : il ne doit ni changer d'écran, ni
 * occuper l'écran en permanence quand on ne s'en sert pas.
 */
export function InlineAdd({
  label = "Ajouter",
  placeholder,
  onAdd,
  className,
}: {
  label?: string;
  placeholder: string;
  onAdd: (name: string) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const input = useRef<HTMLInputElement>(null);

  function submit() {
    const trimmed = name.trim();
    if (!trimmed) {
      setOpen(false);
      return;
    }
    onAdd(trimmed);
    setName("");
    // On reste ouvert : ajouter trois lignes d'affilée est le cas courant.
    input.current?.focus();
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          requestAnimationFrame(() => input.current?.focus());
        }}
        className={cn(
          "text-muted-foreground hover:text-foreground w-full px-3 py-2 text-left text-sm",
          className,
        )}
      >
        + {label}
      </button>
    );
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
      className={cn("flex gap-2 px-1 py-1", className)}
    >
      <input
        ref={input}
        value={name}
        onChange={(event) => setName(event.target.value)}
        onBlur={() => {
          if (!name.trim()) setOpen(false);
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            setName("");
            setOpen(false);
          }
        }}
        placeholder={placeholder}
        aria-label={placeholder}
        className="border-input bg-[var(--rt-surface)] focus-visible:ring-ring min-w-0 flex-1 rounded-[var(--radius)] border px-3 py-2 text-[0.9375rem] focus-visible:ring-2 focus-visible:outline-none"
      />
      <button
        type="submit"
        aria-label="Ajouter"
        className="bg-primary text-primary-foreground grid size-10 shrink-0 place-items-center rounded-[var(--radius)]"
      >
        <svg viewBox="0 0 24 24" className="size-5" fill="none" aria-hidden>
          <path d="M12 5 V19 M5 12 H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>
    </form>
  );
}
