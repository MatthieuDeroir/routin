"use client";

import { Fragment } from "react";
import {
  formatMinute,
  locateNowMarker,
  type DaySchedule,
  type NowMarker,
  type ScheduleSection,
} from "@/lib/domain";
import { cn } from "@/lib/utils";
import type { Routine } from "@/lib/domain";
import { QuickAdd } from "./quick-add";
import { TaskRow } from "./task-row";

interface DayPanelProps {
  schedule: DaySchedule;
  routines: Routine[];
  /** Vrai tant que le cache local n'est pas lu : on n'annonce pas « rien de prévu ». */
  empty?: boolean;
  /** Minute courante, ou `null` si le jour affiché n'est pas aujourd'hui. */
  nowMinute: number | null;
  onToggle: (taskId: string, done: boolean) => void;
  disabled?: boolean;
}

export function DayPanel({
  schedule,
  routines,
  empty,
  nowMinute,
  onToggle,
  disabled,
}: DayPanelProps) {
  if (empty) return null;

  // Le repère est calculé une fois pour la journée entière : il n'appartient
  // pas à un bloc, il se glisse avant la prochaine tâche horodatée où qu'elle
  // soit, et descend donc à mesure que l'heure avance.
  const marker = locateNowMarker(schedule, nowMinute);

  return (
    <div>
      {schedule.sections.length === 0 ? (
        <p className="text-muted-foreground border-[var(--rt-surface-border)] mx-1 rounded-[var(--radius)] border border-dashed px-4 py-8 text-center text-sm">
          Rien de prévu ce jour-là.
        </p>
      ) : null}

      <div className="space-y-[var(--rt-section-gap)]">
      {schedule.sections.map((section) => (
        <Section
          key={section.key}
          section={section}
          nowMinute={nowMinute}
          marker={marker?.sectionKey === section.key ? marker : null}
          onToggle={onToggle}
          disabled={disabled}
        />
      ))}
      </div>

      <QuickAdd
        day={schedule.day}
        routines={routines}
        suggestedRoutineId={marker?.sectionKey ?? null}
      />
    </div>
  );
}

function Section({
  section,
  nowMinute,
  marker,
  onToggle,
  disabled,
}: {
  section: ScheduleSection;
  nowMinute: number | null;
  marker: NowMarker | null;
  onToggle: (taskId: string, done: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <section>
      <header className="mb-2.5 flex items-baseline gap-2.5 px-1">
        <h2
          className="rt-display text-foreground/85"
          style={{
            fontSize: "var(--rt-section-size)",
            letterSpacing: "var(--rt-section-tracking)",
            textTransform: "var(--rt-section-transform)" as never,
          }}
        >
          {section.emoji ? (
            <span className="mr-1.5" aria-hidden>
              {section.emoji}
            </span>
          ) : null}
          {section.label}
        </h2>

        <span className="bg-[var(--rt-rail)] h-px flex-1" aria-hidden />

        <span className="rt-num text-muted-foreground shrink-0 text-[0.6875rem]">
          {section.doneCount}/{section.entries.length}
        </span>
      </header>

      <ul className="space-y-[var(--rt-list-gap)]">
        {section.entries.map((entry, index) => (
          <Fragment key={entry.task.id}>
            {marker?.index === index ? <NowMarker minute={nowMinute as number} /> : null}
            <TaskRow entry={entry} onToggle={onToggle} disabled={disabled} />
          </Fragment>
        ))}
        {marker && marker.index >= section.entries.length ? (
          <NowMarker minute={nowMinute as number} />
        ) : null}
      </ul>
    </section>
  );
}

function NowMarker({ minute }: { minute: number }) {
  return (
    <li
      className="flex items-center gap-2 py-1.5"
      aria-label={`Il est ${formatMinute(minute)}`}
    >
      <span
        aria-hidden
        className={cn("size-1.5 shrink-0 rounded-full bg-[var(--rt-signal)]")}
      />
      <span className="h-px flex-1 bg-[var(--rt-signal)] opacity-45" aria-hidden />
      <span className="rt-num text-[0.625rem] tracking-wide text-[var(--rt-signal)]">
        {formatMinute(minute)}
      </span>
    </li>
  );
}
