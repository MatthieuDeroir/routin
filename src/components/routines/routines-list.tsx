"use client";

import Link from "next/link";
import { describeMask, formatMinute } from "@/lib/domain";
import { useStore } from "@/lib/store/store";
import type { StoredTask } from "@/lib/store/types";
import { cn } from "@/lib/utils";

export function RoutinesList() {
  const { data, ready, reorderRoutines } = useStore();

  if (!ready) return null;

  const routines = [...data.routines].sort((a, b) => a.position - b.position);
  const anytime = data.tasks
    .filter((task) => !task.routineId && task.kind === "task")
    .sort((a, b) => a.position - b.position);
  const directives = data.tasks
    .filter((task) => task.kind === "directive")
    .sort((a, b) => a.position - b.position);

  function move(index: number, delta: number) {
    const next = [...routines];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    reorderRoutines(next.map((routine) => routine.id));
  }

  return (
    <div className="space-y-8 px-5">
      <Group
        title="Dans la journée"
        hint="À faire ce jour-là, sans heure ni bloc."
        addHref="/taches/nouvelle"
        tasks={anytime}
      />

      {routines.map((routine, index) => (
        <section key={routine.id}>
          <div className="mb-2 flex items-center gap-2">
            <Link
              href={`/routines/${routine.id}`}
              className="flex min-w-0 flex-1 items-baseline gap-2"
            >
              <h2 className="rt-display truncate text-base">
                {routine.emoji ? (
                  <span className="mr-1.5">{routine.emoji}</span>
                ) : null}
                {routine.name}
              </h2>
              <span className="text-muted-foreground shrink-0 text-xs">
                {describeMask(routine.daysMask)}
              </span>
            </Link>

            <MoveButton
              direction="up"
              disabled={index === 0}
              onClick={() => move(index, -1)}
              label={`Monter ${routine.name}`}
            />
            <MoveButton
              direction="down"
              disabled={index === routines.length - 1}
              onClick={() => move(index, 1)}
              label={`Descendre ${routine.name}`}
            />
          </div>

          <TaskLines
            tasks={data.tasks
              .filter((task) => task.routineId === routine.id && task.kind === "task")
              .sort((a, b) => a.position - b.position)}
            inherited={routine.daysMask}
          />
          <AddLink href={`/taches/nouvelle?routine=${routine.id}`} />
        </section>
      ))}

      <Group
        title="À éviter"
        hint="Ce qu’il ne faut pas faire de la journée : une ligne à tenir, qu’on valide le soir."
        addHref="/taches/nouvelle?type=directive"
        tasks={directives}
      />

      <Link
        href="/routines/nouvelle"
        className="border-input block rounded-[var(--radius)] border border-dashed px-4 py-3 text-center text-sm"
      >
        + Nouvelle routine
      </Link>
    </div>
  );
}

function Group({
  title,
  hint,
  addHref,
  tasks,
}: {
  title: string;
  hint: string;
  addHref: string;
  tasks: StoredTask[];
}) {
  return (
    <section>
      <h2 className="rt-display text-base">{title}</h2>
      <p className="text-muted-foreground mt-0.5 mb-2 text-xs">{hint}</p>
      <TaskLines tasks={tasks} inherited={null} />
      <AddLink href={addHref} />
    </section>
  );
}

function TaskLines({
  tasks,
  inherited,
}: {
  tasks: StoredTask[];
  inherited: number | null;
}) {
  if (tasks.length === 0) return null;

  return (
    <ul className="space-y-1.5">
      {tasks.map((task) => (
        <li key={task.id}>
          <Link
            href={`/taches/${task.id}`}
            className="border-[var(--rt-surface-border)] bg-[var(--rt-surface)] flex items-center gap-3 rounded-[var(--radius)] border px-3 py-2.5"
          >
            <span className="min-w-0 flex-1 truncate text-[0.9375rem]">
              {task.name}
            </span>
            <span className="text-muted-foreground shrink-0 text-xs">
              {task.daysMask !== null
                ? describeMask(task.daysMask)
                : inherited === null
                  ? "tous les jours"
                  : null}
              {task.atMinute !== null ? ` · ${formatMinute(task.atMinute)}` : ""}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function AddLink({ href }: { href: string }) {
  return (
    <Link
      href={href}
      className="text-muted-foreground hover:text-foreground mt-1.5 block px-3 py-2 text-sm"
    >
      + Ajouter
    </Link>
  );
}

function MoveButton({
  direction,
  disabled,
  onClick,
  label,
}: {
  direction: "up" | "down";
  disabled: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={cn(
        "text-muted-foreground hover:text-foreground grid size-8 shrink-0 place-items-center rounded-full",
        "focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none disabled:opacity-25",
      )}
    >
      <svg viewBox="0 0 24 24" className="size-4" fill="none" aria-hidden>
        <path
          d={direction === "up" ? "M6 14 L12 8 L18 14" : "M6 10 L12 16 L18 10"}
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}
