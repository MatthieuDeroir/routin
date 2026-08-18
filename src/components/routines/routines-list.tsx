"use client";

import Link from "next/link";
import { describeMask, formatMinute, sortMoments } from "@/lib/domain";
import { useStore } from "@/lib/store/store";
import type { StoredMoment, StoredRoutine, StoredTask } from "@/lib/store/types";

export function RoutinesList() {
  const { data, ready } = useStore();

  if (!ready) return null;

  const routines = [...data.routines].sort((a, b) => a.position - b.position);
  const orphans = data.tasks
    .filter((task) => !task.routineId)
    .sort((a, b) => a.position - b.position);

  if (routines.length === 0 && orphans.length === 0) {
    return (
      <p className="text-muted-foreground px-5 py-10 text-center text-sm">
        Aucune routine pour l’instant. Créez-en une, ou ajoutez une tâche seule
        si elle n’appartient à aucun bloc.
      </p>
    );
  }

  return (
    <div className="space-y-8 px-5">
      {routines.map((routine) => (
        <RoutineGroup
          key={routine.id}
          routine={routine}
          tasks={data.tasks
            .filter((task) => task.routineId === routine.id)
            .sort((a, b) => a.position - b.position)}
          momentName={momentNamer(data.moments)}
        />
      ))}

      {orphans.length > 0 ? (
        <section>
          <h2 className="text-muted-foreground mb-2 text-xs tracking-wide uppercase">
            Sans routine
          </h2>
          <ul className="space-y-1.5">
            {orphans.map((task) => (
              <TaskLine
                key={task.id}
                task={task}
                inherited={null}
                momentName={momentNamer(data.moments)}
              />
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function momentNamer(moments: StoredMoment[]) {
  const byId = new Map(sortMoments(moments).map((moment) => [moment.id, moment.name]));
  return (id: string | null) => (id ? (byId.get(id) ?? null) : null);
}

function RoutineGroup({
  routine,
  tasks,
  momentName,
}: {
  routine: StoredRoutine;
  tasks: StoredTask[];
  momentName: (id: string | null) => string | null;
}) {
  return (
    <section>
      <Link
        href={`/routines/${routine.id}`}
        className="mb-2 flex items-baseline gap-2"
      >
        <h2 className="rt-display text-base">
          {routine.emoji ? <span className="mr-1.5">{routine.emoji}</span> : null}
          {routine.name}
        </h2>
        <span className="text-muted-foreground text-xs">
          {describeMask(routine.daysMask)}
        </span>
        <span className="bg-[var(--rt-rail)] h-px flex-1" aria-hidden />
      </Link>

      <ul className="space-y-1.5">
        {tasks.map((task) => (
          <TaskLine
            key={task.id}
            task={task}
            inherited={routine.daysMask}
            momentName={momentName}
          />
        ))}
        <li>
          <Link
            href={`/taches/nouvelle?routine=${routine.id}`}
            className="text-muted-foreground hover:text-foreground block px-3 py-2 text-sm"
          >
            + Ajouter une tâche
          </Link>
        </li>
      </ul>
    </section>
  );
}

function TaskLine({
  task,
  inherited,
  momentName,
}: {
  task: StoredTask;
  inherited: number | null;
  momentName: (id: string | null) => string | null;
}) {
  const placement =
    task.atMinute !== null
      ? formatMinute(task.atMinute)
      : (momentName(task.momentId) ?? "Dans la journée");

  const days =
    task.daysMask === null
      ? inherited === null
        ? "tous les jours"
        : null
      : describeMask(task.daysMask);

  return (
    <li>
      <Link
        href={`/taches/${task.id}`}
        className="border-[var(--rt-surface-border)] bg-[var(--rt-surface)] flex items-center gap-3 rounded-[var(--radius)] border px-3 py-2.5"
      >
        <span className="min-w-0 flex-1 truncate text-[0.9375rem]">{task.name}</span>
        <span className="text-muted-foreground shrink-0 text-xs">
          {days ? `${days} · ` : ""}
          {placement}
        </span>
      </Link>
    </li>
  );
}
