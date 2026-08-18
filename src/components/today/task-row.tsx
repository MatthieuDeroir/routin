"use client";

import { formatMinute, type ScheduleEntry } from "@/lib/domain";
import { cn } from "@/lib/utils";

interface TaskRowProps {
  entry: ScheduleEntry;
  onToggle: (taskId: string, done: boolean) => void;
  /** Verrouille les coches sur un jour futur : on ne valide pas d'avance. */
  disabled?: boolean;
}

export function TaskRow({ entry, onToggle, disabled }: TaskRowProps) {
  const { task, routine, done } = entry;
  const timed = task.atMinute !== null && task.atMinute !== undefined;

  return (
    <li>
      <button
        type="button"
        disabled={disabled}
        aria-pressed={done}
        onClick={() => onToggle(task.id, !done)}
        className={cn(
          "group flex w-full items-center gap-3 rounded-[var(--radius)] px-3 py-[var(--rt-row-py)] text-left",
          "border border-[var(--rt-surface-border)] bg-[var(--rt-surface)]",
          "shadow-[var(--rt-shadow)] backdrop-blur-[0px] transition-colors",
          "focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
          "disabled:opacity-45",
        )}
        style={{ backdropFilter: "var(--rt-backdrop)" }}
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

        {timed ? (
          <time className="rt-num text-muted-foreground shrink-0 text-xs tabular-nums">
            {formatMinute(task.atMinute as number)}
          </time>
        ) : null}
      </button>
    </li>
  );
}

/**
 * La coche est le geste répété plusieurs fois par jour : elle porte l'essentiel
 * du caractère de chaque direction. Le tracé se dessine plutôt que d'apparaître,
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
