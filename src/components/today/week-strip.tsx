"use client";

import { WEEKDAY_INITIALS, WEEKDAY_LABELS, addDays, weekdayOf } from "@/lib/domain";
import type { DayString } from "@/lib/domain";
import { cn } from "@/lib/utils";

interface WeekStripProps {
  /** Jour affiché. */
  day: DayString;
  today: DayString;
  /** Part de tâches validées pour chaque jour de la semaine, entre 0 et 1. */
  ratios: Record<DayString, { done: number; total: number }>;
  onSelect: (day: DayString) => void;
}

/**
 * Semaine du jour affiché. L'anneau se remplit à la part de tâches validées :
 * l'information utile n'est pas « quel jour on est » mais « où j'en suis ».
 */
export function WeekStrip({ day, today, ratios, onSelect }: WeekStripProps) {
  const monday = addDays(day, -weekdayOf(day));
  const week = Array.from({ length: 7 }, (_, i) => addDays(monday, i));

  return (
    <div className="grid grid-cols-7 gap-1">
      {week.map((current, index) => {
        const stats = ratios[current] ?? { done: 0, total: 0 };
        const ratio = stats.total === 0 ? 0 : stats.done / stats.total;
        const isSelected = current === day;
        const isToday = current === today;
        const isFuture = current > today;

        return (
          <button
            key={current}
            type="button"
            onClick={() => onSelect(current)}
            aria-current={isSelected ? "date" : undefined}
            aria-label={`${WEEKDAY_LABELS[index]} — ${stats.done} sur ${stats.total}`}
            className={cn(
              "flex flex-col items-center gap-1.5 rounded-[var(--radius)] py-2 transition-colors",
              "focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none",
              isSelected && "bg-[color-mix(in_srgb,var(--foreground)_7%,transparent)]",
            )}
          >
            <span
              className={cn(
                "rt-num text-[0.625rem] uppercase",
                isToday ? "text-[var(--rt-signal)]" : "text-muted-foreground",
              )}
            >
              {WEEKDAY_INITIALS[index]}
            </span>
            <Ring ratio={ratio} empty={stats.total === 0} dimmed={isFuture} />
          </button>
        );
      })}
    </div>
  );
}

function Ring({
  ratio,
  empty,
  dimmed,
}: {
  ratio: number;
  empty: boolean;
  dimmed: boolean;
}) {
  const circumference = 2 * Math.PI * 9;

  return (
    <svg
      viewBox="0 0 24 24"
      className={cn("size-6", dimmed && "opacity-40")}
      aria-hidden
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        fill="none"
        stroke="var(--rt-rail)"
        strokeWidth="2.5"
      />
      {!empty ? (
        <circle
          cx="12"
          cy="12"
          r="9"
          fill="none"
          stroke="var(--primary)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - ratio)}
          transform="rotate(-90 12 12)"
          style={{ transition: "stroke-dashoffset 320ms ease" }}
        />
      ) : null}
    </svg>
  );
}
