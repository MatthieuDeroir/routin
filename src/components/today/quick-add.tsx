"use client";

import { useRef, useState } from "react";
import { ALL_DAYS, type DayString, type Routine } from "@/lib/domain";
import { useStore } from "@/lib/store/store";
import { cn } from "@/lib/utils";

type Target = { key: string; label: string; routineId: string | null; kind: "task" | "directive" };

/**
 * Ajout depuis la journée elle-même.
 *
 * Passer par le menu puis l'écran des routines pour ajouter une ligne était le
 * geste le plus fréquent de l'application et le plus coûteux : trois écrans
 * pour un mot. Ici, on tape le nom, on choisit la destination d'un doigt, et
 * c'est fait — l'éditeur complet reste accessible pour le reste.
 */
export function QuickAdd({
  day,
  routines,
  /** Routine où l'on retombe si l'on n'en choisit pas : celle où on en est. */
  suggestedRoutineId,
}: {
  day: DayString;
  routines: Routine[];
  suggestedRoutineId: string | null;
}) {
  const { upsertTask, data } = useStore();
  const input = useRef<HTMLInputElement>(null);

  const targets: Target[] = [
    { key: "anytime", label: "Dans la journée", routineId: null, kind: "task" },
    ...[...routines]
      .sort((a, b) => a.position - b.position)
      .map((routine) => ({
        key: routine.id,
        label: `${routine.emoji ? `${routine.emoji} ` : ""}${routine.name}`,
        routineId: routine.id,
        kind: "task" as const,
      })),
    { key: "directive", label: "À éviter", routineId: null, kind: "directive" },
  ];

  const [name, setName] = useState("");
  const [targetKey, setTargetKey] = useState(suggestedRoutineId ?? "anytime");
  const target = targets.find((item) => item.key === targetKey) ?? targets[0];

  function add() {
    const trimmed = name.trim();
    if (!trimmed) return;

    upsertTask({
      id: crypto.randomUUID(),
      routineId: target.routineId,
      kind: target.kind,
      name: trimmed,
      notes: null,
      // Dans une routine, la tâche suit ses jours ; hors routine, elle est
      // quotidienne par défaut — on affine dans l'éditeur si besoin.
      daysMask: target.routineId ? null : ALL_DAYS,
      atMinute: null,
      position: data.tasks.length,
      // Elle commence le jour où on l'ajoute, pas au début des temps.
      activeFrom: day,
      activeUntil: null,
      deletedAt: null,
    });

    setName("");
    input.current?.focus();
  }

  return (
    <section className="mt-[var(--rt-section-gap)]">
      <div
        className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        role="radiogroup"
        aria-label="Où ajouter"
      >
        {targets.map((item) => (
          <button
            key={item.key}
            type="button"
            role="radio"
            aria-checked={item.key === targetKey}
            onClick={() => setTargetKey(item.key)}
            className={cn(
              "shrink-0 rounded-full border px-3 py-1 text-xs whitespace-nowrap transition-colors",
              item.key === targetKey
                ? "border-primary bg-primary text-primary-foreground"
                : "border-input text-muted-foreground",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          add();
        }}
        className="flex gap-2"
      >
        <input
          ref={input}
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder={
            target.kind === "directive"
              ? "Pas de caféine après 11 h 30"
              : `Ajouter dans « ${target.label.replace(/^\S+\s/, "")} »`
          }
          aria-label="Nom de la nouvelle tâche"
          className="border-input bg-[var(--rt-surface)] focus-visible:ring-ring w-full flex-1 rounded-[var(--radius)] border px-3 py-2.5 text-[0.9375rem] focus-visible:ring-2 focus-visible:outline-none"
        />
        <button
          type="submit"
          disabled={!name.trim()}
          aria-label="Ajouter"
          className="bg-primary text-primary-foreground grid size-11 shrink-0 place-items-center rounded-[var(--radius)] disabled:opacity-30"
        >
          <svg viewBox="0 0 24 24" className="size-5" fill="none" aria-hidden>
            <path
              d="M12 5 V19 M5 12 H19"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </form>
    </section>
  );
}
