"use client";

import Link from "next/link";
import { useState } from "react";
import { formatMinute, type ScheduleEntry } from "@/lib/domain";
import { cn } from "@/lib/utils";

interface TaskRowProps {
  entry: ScheduleEntry;
  onToggle: (taskId: string, done: boolean) => void;
  onRemove: (taskId: string) => void;
  /** Verrouille les coches sur un jour futur : on ne valide pas d'avance. */
  disabled?: boolean;
  /**
   * Faux sur un jour déjà passé : le retrait rapide borne la validité en
   * cascade jusqu'à aujourd'hui, ce qui effacerait aussi des jours déjà
   * écoulés. Seul l'éditeur complet (toujours ancré sur le vrai aujourd'hui)
   * reste disponible dans ce cas.
   */
  canRemove?: boolean;
}

export function TaskRow({
  entry,
  onToggle,
  onRemove,
  disabled,
  canRemove = true,
}: TaskRowProps) {
  const { task, routine, done } = entry;
  const [confirming, setConfirming] = useState(false);
  const timed = task.atMinute !== null && task.atMinute !== undefined;

  return (
    <li
      className={cn(
        "group flex items-center gap-3 rounded-[var(--radius)] px-3 py-[var(--rt-row-py)]",
        "border border-[var(--rt-surface-border)] bg-[var(--rt-surface)]",
        "shadow-[var(--rt-shadow)] transition-colors",
      )}
      style={{ backdropFilter: "var(--rt-backdrop)" }}
    >
      <button
        type="button"
        disabled={disabled}
        aria-pressed={done}
        onClick={() => onToggle(task.id, !done)}
        className={cn(
          "flex min-w-0 flex-1 items-center gap-3 text-left",
          "focus-visible:ring-ring rounded-[var(--radius)] focus-visible:ring-2 focus-visible:outline-none",
          "disabled:opacity-45",
        )}
      >
        <Checkbox done={done} />
        <span className="min-w-0 flex-1">
          <span
            className={cn(
              "block truncate text-[0.9375rem] leading-tight transition-all",
              done && "text-muted-foreground line-through decoration-1",
            )}
          >
            {task.name}
          </span>
          {routine ? (
            <span className="text-muted-foreground mt-1 flex items-center gap-1.5 text-xs">
              {routine.emoji ? <span aria-hidden>{routine.emoji}</span> : null}
              {routine.name}
            </span>
          ) : null}
        </span>
      </button>

      {timed ? (
        <time className="rt-num text-muted-foreground shrink-0 text-xs tabular-nums">
          {formatMinute(task.atMinute as number)}
        </time>
      ) : null}

      {/*
        Les actions n'apparaissent qu'au survol : elles sont rares comparées à
        la coche, et les afficher en permanence encombrerait chaque ligne. Sur
        écran tactile, où il n'y a pas de survol, elles restent visibles en
        retrait.
      */}
      <div
        className={cn(
          "flex shrink-0 items-center gap-0.5 transition-opacity duration-150",
          "opacity-0 group-hover:opacity-100 focus-within:opacity-100",
          "[@media(pointer:coarse)]:opacity-45",
        )}
      >
        {confirming ? (
          <>
            <button
              type="button"
              onClick={() => {
                onRemove(task.id);
                setConfirming(false);
              }}
              className="text-destructive px-2 py-1 text-xs whitespace-nowrap"
            >
              Retirer
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="text-muted-foreground px-1 py-1 text-xs"
            >
              Annuler
            </button>
          </>
        ) : (
          <>
            <Link
              href={`/taches/${task.id}`}
              aria-label={`Modifier « ${task.name} »`}
              className="text-muted-foreground hover:text-foreground grid size-8 place-items-center rounded-full"
            >
              <svg viewBox="0 0 24 24" className="size-4" fill="none" aria-hidden>
                <path
                  d="M4 20h4L19 9l-4-4L4 16v4Z"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinejoin="round"
                />
              </svg>
            </Link>
            {canRemove ? (
              <button
                type="button"
                onClick={() => setConfirming(true)}
                aria-label={`Retirer « ${task.name} »`}
                className="text-muted-foreground hover:text-destructive grid size-8 place-items-center rounded-full"
              >
                <svg viewBox="0 0 24 24" className="size-4" fill="none" aria-hidden>
                  <path
                    d="M5 7h14M10 7V5h4v2M7 7l1 12h8l1-12"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            ) : null}
          </>
        )}
      </div>
    </li>
  );
}

/**
 * La coche est le geste répété plusieurs fois par jour : elle porte l'essentiel
 * du caractère de chaque thème. Le tracé se dessine plutôt que d'apparaître,
 * ce qui donne au geste un poids proportionnel à ce qu'il représente.
 */
function Checkbox({ done }: { done: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        "relative grid size-[22px] shrink-0 place-items-center border transition-colors duration-200",
        done
          ? "border-primary bg-primary"
          : "border-[color-mix(in_srgb,var(--foreground)_28%,transparent)] bg-transparent",
      )}
      style={{ borderRadius: "var(--rt-check-radius)" }}
    >
      <svg viewBox="0 0 24 24" className="size-[14px]" fill="none">
        <path
          d="M4.5 12.5 L9.5 17.5 L19.5 6.5"
          stroke="var(--primary-foreground)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          pathLength={1}
          style={{
            strokeDasharray: 1,
            strokeDashoffset: done ? 0 : 1,
            transition: "stroke-dashoffset 260ms cubic-bezier(0.65, 0, 0.35, 1)",
          }}
        />
      </svg>
    </span>
  );
}
