"use client";

import { Fragment, useState } from "react";
import {
  ANYTIME_KEY,
  DIRECTIVES_KEY,
  formatMinute,
  locateNowMarker,
  type DaySchedule,
  type NowMarker,
  type Routine,
  type ScheduleSection,
  type TaskKind,
} from "@/lib/domain";
import { cn } from "@/lib/utils";
import { InlineAdd } from "./inline-add";
import { TaskRow } from "./task-row";

export interface AddTarget {
  routineId: string | null;
  kind: TaskKind;
}

interface DayPanelProps {
  schedule: DaySchedule;
  routines: Routine[];
  /** Vrai tant que le cache local n'est pas lu : on n'annonce pas « rien de prévu ». */
  empty?: boolean;
  /** Minute courante, ou `null` si le jour affiché n'est pas aujourd'hui. */
  nowMinute: number | null;
  onToggle: (taskId: string, done: boolean) => void;
  onRemove: (taskId: string) => void;
  onAdd: (name: string, target: AddTarget) => void;
  disabled?: boolean;
}

function targetOf(section: ScheduleSection): AddTarget {
  if (section.kind === "directive") return { routineId: null, kind: "directive" };
  if (section.kind === "anytime") return { routineId: null, kind: "task" };
  return { routineId: section.routine?.id ?? null, kind: "task" };
}

export function DayPanel({
  schedule,
  routines,
  empty,
  nowMinute,
  onToggle,
  onRemove,
  onAdd,
  disabled,
}: DayPanelProps) {
  if (empty) return null;

  // Le repère est calculé une fois pour la journée entière : il n'appartient
  // pas à un bloc, il se glisse avant la prochaine tâche horodatée où qu'elle
  // soit, et descend donc à mesure que l'heure avance.
  const marker = locateNowMarker(schedule, nowMinute);
  const shown = new Set(schedule.sections.map((section) => section.key));

  return (
    <div>
      <div className="space-y-[var(--rt-section-gap)]">
        {schedule.sections.map((section) => (
          <Section
            key={section.key}
            section={section}
            nowMinute={nowMinute}
            marker={marker?.sectionKey === section.key ? marker : null}
            onToggle={onToggle}
            onRemove={onRemove}
            onAdd={(name) => onAdd(name, targetOf(section))}
            disabled={disabled}
          />
        ))}
      </div>

      <Elsewhere
        routines={routines}
        shown={shown}
        onAdd={onAdd}
        empty={schedule.sections.length === 0}
      />
    </div>
  );
}

function Section({
  section,
  nowMinute,
  marker,
  onToggle,
  onRemove,
  onAdd,
  disabled,
}: {
  section: ScheduleSection;
  nowMinute: number | null;
  marker: NowMarker | null;
  onToggle: (taskId: string, done: boolean) => void;
  onRemove: (taskId: string) => void;
  onAdd: (name: string) => void;
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
            <TaskRow
              entry={entry}
              onToggle={onToggle}
              onRemove={onRemove}
              disabled={disabled}
            />
          </Fragment>
        ))}
        {marker && marker.index >= section.entries.length ? (
          <NowMarker minute={nowMinute as number} />
        ) : null}
      </ul>

      <InlineAdd
        placeholder={
          section.kind === "directive"
            ? "Ce qu’il faut éviter…"
            : `Ajouter dans « ${section.label} »`
        }
        onAdd={onAdd}
      />
    </section>
  );
}

/**
 * Ajouter dans un bloc qui n'a rien aujourd'hui.
 *
 * Les blocs vides ne s'affichent pas — sinon l'écran serait une liste de titres
 * sans contenu — mais il faut pouvoir y ajouter quelque chose. Ce repli reste
 * replié tant qu'on ne s'en sert pas.
 */
function Elsewhere({
  routines,
  shown,
  onAdd,
  empty,
}: {
  routines: Routine[];
  shown: Set<string>;
  onAdd: (name: string, target: AddTarget) => void;
  empty: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [targetKey, setTargetKey] = useState<string | null>(null);

  const options: { key: string; label: string; target: AddTarget }[] = [
    ...(!shown.has(ANYTIME_KEY)
      ? [
          {
            key: ANYTIME_KEY,
            label: "Dans la journée",
            target: { routineId: null, kind: "task" as const },
          },
        ]
      : []),
    ...[...routines]
      .sort((a, b) => a.position - b.position)
      .filter((routine) => !shown.has(routine.id))
      .map((routine) => ({
        key: routine.id,
        label: `${routine.emoji ? `${routine.emoji} ` : ""}${routine.name}`,
        target: { routineId: routine.id, kind: "task" as const },
      })),
    ...(!shown.has(DIRECTIVES_KEY)
      ? [
          {
            key: DIRECTIVES_KEY,
            label: "À éviter",
            target: { routineId: null, kind: "directive" as const },
          },
        ]
      : []),
  ];

  if (options.length === 0) return null;

  const selected = options.find((option) => option.key === targetKey) ?? null;

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-muted-foreground hover:text-foreground mt-[var(--rt-section-gap)] w-full px-3 py-2 text-left text-sm"
      >
        {empty ? "+ Ajouter une première tâche" : "+ Ajouter dans un autre bloc"}
      </button>
    );
  }

  return (
    <section className="mt-[var(--rt-section-gap)]">
      <div className="mb-2 flex flex-wrap gap-1.5">
        {options.map((option) => (
          <button
            key={option.key}
            type="button"
            aria-pressed={option.key === targetKey}
            onClick={() => setTargetKey(option.key)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs whitespace-nowrap transition-colors",
              option.key === targetKey
                ? "border-primary bg-primary text-primary-foreground"
                : "border-input text-muted-foreground",
            )}
          >
            {option.label}
          </button>
        ))}
      </div>

      {selected ? (
        <InlineAdd
          placeholder={`Ajouter dans « ${selected.label} »`}
          onAdd={(name) => onAdd(name, selected.target)}
        />
      ) : (
        <p className="text-muted-foreground px-3 py-2 text-xs">
          Choisissez d’abord un bloc.
        </p>
      )}
    </section>
  );
}

function NowMarker({ minute }: { minute: number }) {
  return (
    <li
      className="flex items-center gap-2 py-1.5"
      aria-label={`Il est ${formatMinute(minute)}`}
    >
      <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-[var(--rt-signal)]" />
      <span className="h-px flex-1 bg-[var(--rt-signal)] opacity-45" aria-hidden />
      <span className="rt-num text-[0.625rem] tracking-wide text-[var(--rt-signal)]">
        {formatMinute(minute)}
      </span>
    </li>
  );
}
