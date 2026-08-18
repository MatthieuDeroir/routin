"use client";

import { Fragment } from "react";
import {
  formatMinute,
  type DaySchedule,
  type ScheduleSection,
} from "@/lib/domain";
import { cn } from "@/lib/utils";
import { TaskRow } from "./task-row";

interface DayPanelProps {
  schedule: DaySchedule;
  /** Minute courante, ou `null` si le jour affiché n'est pas aujourd'hui. */
  nowMinute: number | null;
  onToggle: (taskId: string, done: boolean) => void;
  disabled?: boolean;
}

export function DayPanel({
  schedule,
  nowMinute,
  onToggle,
  disabled,
}: DayPanelProps) {
  if (schedule.sections.length === 0) {
    return (
      <p className="text-muted-foreground border-[var(--rt-surface-border)] mx-1 rounded-[var(--radius)] border border-dashed px-4 py-10 text-center text-sm">
        Rien de prévu ce jour-là.
      </p>
    );
  }

  return (
    <div className="space-y-7">
      {schedule.sections.map((section) => (
        <Section
          key={section.key}
          section={section}
          nowMinute={nowMinute}
          onToggle={onToggle}
          disabled={disabled}
        />
      ))}
    </div>
  );
}

function Section({
  section,
  nowMinute,
  onToggle,
  disabled,
}: {
  section: ScheduleSection;
  nowMinute: number | null;
  onToggle: (taskId: string, done: boolean) => void;
  disabled?: boolean;
}) {
  const moment = section.moment;
  const isCurrent =
    nowMinute !== null &&
    moment !== null &&
    nowMinute >= moment.startMinute &&
    nowMinute < moment.endMinute;

  // Le repère « maintenant » se glisse entre les tâches, juste après celles
  // dont l'heure est passée : on voit d'un coup d'œil ce qui est en retard.
  const markerIndex = isCurrent
    ? section.entries.findIndex(
        (entry) =>
          entry.task.atMinute === null ||
          entry.task.atMinute === undefined ||
          entry.task.atMinute > (nowMinute as number),
      )
    : -1;

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
          {moment?.emoji ? (
            <span className="mr-1.5" aria-hidden>
              {moment.emoji}
            </span>
          ) : null}
          {section.label}
        </h2>

        {moment ? (
          <span className="rt-num text-muted-foreground/70 text-[0.6875rem]">
            {formatMinute(moment.startMinute)} – {formatMinute(moment.endMinute % 1440)}
          </span>
        ) : null}

        <span className="bg-[var(--rt-rail)] h-px flex-1" aria-hidden />

        <span className="rt-num text-muted-foreground shrink-0 text-[0.6875rem]">
          {section.doneCount}/{section.entries.length}
        </span>
      </header>

      <ul className="space-y-1.5">
        {section.entries.map((entry, index) => (
          <Fragment key={entry.task.id}>
            {index === markerIndex ? <NowMarker minute={nowMinute as number} /> : null}
            <TaskRow entry={entry} onToggle={onToggle} disabled={disabled} />
          </Fragment>
        ))}
        {markerIndex === -1 && isCurrent ? (
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
