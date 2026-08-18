"use client";

import { WEEKDAY_INITIALS, type HeatmapCell } from "@/lib/domain";

/**
 * Douze semaines en colonnes, les jours de la semaine en lignes. L'intensité
 * suit la part de tâches validées ; un jour sans rien de programmé reste vide
 * plutôt que d'apparaître comme un échec.
 */
export function Heatmap({ cells }: { cells: HeatmapCell[] }) {
  const weeks: HeatmapCell[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  return (
    <div className="flex gap-2">
      <div className="grid grid-rows-7 gap-1 pt-0.5">
        {WEEKDAY_INITIALS.map((initial, index) => (
          <span
            key={index}
            className="rt-num text-muted-foreground/70 h-3 text-[0.5rem] leading-3"
          >
            {index % 2 === 0 ? initial : ""}
          </span>
        ))}
      </div>

      <div className="flex flex-1 gap-1 overflow-x-auto">
        {weeks.map((week, weekIndex) => (
          <div key={weekIndex} className="grid grid-rows-7 gap-1">
            {week.map((cell) => (
              <span
                key={cell.day}
                title={`${cell.day} — ${cell.done}/${cell.total}`}
                className="size-3 rounded-[2px]"
                style={{
                  backgroundColor:
                    cell.total === 0
                      ? "var(--rt-rail)"
                      : `color-mix(in srgb, var(--primary) ${Math.round(18 + cell.ratio * 82)}%, var(--rt-rail))`,
                }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
