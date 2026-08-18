"use client";

import {
  ALL_DAYS,
  WEEKDAY_INITIALS,
  WEEKDAY_LABELS,
  maskHasDay,
  toggleDay,
  type DaysMask,
  type WeekdayIndex,
} from "@/lib/domain";
import { cn } from "@/lib/utils";

const DAYS: WeekdayIndex[] = [0, 1, 2, 3, 4, 5, 6];

export function DaysPicker({
  value,
  onChange,
  disabled,
}: {
  value: DaysMask;
  onChange: (mask: DaysMask) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex gap-1.5">
      {DAYS.map((day) => {
        const active = maskHasDay(value, day);
        return (
          <button
            key={day}
            type="button"
            disabled={disabled}
            aria-pressed={active}
            aria-label={WEEKDAY_LABELS[day]}
            onClick={() => onChange(toggleDay(value, day))}
            className={cn(
              "focus-visible:ring-ring h-10 flex-1 rounded-[var(--radius)] border text-sm transition-colors",
              "focus-visible:ring-2 focus-visible:outline-none disabled:opacity-40",
              active
                ? "border-primary bg-primary text-primary-foreground"
                : "border-input bg-[var(--rt-surface)] text-muted-foreground",
            )}
          >
            {WEEKDAY_INITIALS[day]}
          </button>
        );
      })}
    </div>
  );
}

/** Raccourcis courants : la plupart des routines sont quotidiennes ou en semaine. */
export function DaysShortcuts({
  onChange,
  disabled,
}: {
  onChange: (mask: DaysMask) => void;
  disabled?: boolean;
}) {
  const presets: [string, DaysMask][] = [
    ["Tous les jours", ALL_DAYS],
    ["En semaine", 0b0011111],
    ["Le week-end", 0b1100000],
  ];

  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {presets.map(([label, mask]) => (
        <button
          key={label}
          type="button"
          disabled={disabled}
          onClick={() => onChange(mask)}
          className="text-muted-foreground hover:text-foreground border-input rounded-full border px-3 py-1 text-xs disabled:opacity-40"
        >
          {label}
        </button>
      ))}
    </div>
  );
}
