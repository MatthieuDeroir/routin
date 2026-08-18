"use client";

import { useMemo } from "react";
import {
  addDays,
  buildHeatmap,
  computeTaskStats,
  today as todayIn,
  weekdayOf,
} from "@/lib/domain";
import { useStore } from "@/lib/store/store";
import { Heatmap } from "./heatmap";

const WEEKS = 12;

export function StatsView({ timeZone }: { timeZone: string }) {
  const { data, ready } = useStore();

  const stats = useMemo(() => {
    const today = todayIn(timeZone);
    // La grille commence un lundi, sinon les lignes ne correspondent pas aux
    // jours de la semaine affichés à gauche.
    const lastMonday = addDays(today, -weekdayOf(today));
    const from = addDays(lastMonday, -7 * (WEEKS - 1));
    const to = addDays(lastMonday, 6);

    const cells = buildHeatmap({
      from,
      to,
      routines: data.routines,
      tasks: data.tasks,
      completions: data.completions,
    });

    const routineById = new Map(data.routines.map((r) => [r.id, r]));
    const perTask = data.tasks
      .map((task) => ({
        task,
        routine: task.routineId ? (routineById.get(task.routineId) ?? null) : null,
        stats: computeTaskStats({
          task,
          routine: task.routineId ? (routineById.get(task.routineId) ?? null) : null,
          completions: data.completions,
          from,
          to: today,
        }),
      }))
      .sort((a, b) => b.stats.current - a.stats.current || b.stats.rate - a.stats.rate);

    const observed = cells.filter((cell) => cell.total > 0 && cell.day <= today);
    const perfectDays = observed.filter((cell) => cell.ratio === 1).length;
    const average =
      observed.length === 0
        ? 0
        : observed.reduce((sum, cell) => sum + cell.ratio, 0) / observed.length;

    return { cells, perTask, perfectDays, average, observed: observed.length };
  }, [data, timeZone]);

  if (!ready) return null;

  if (data.tasks.length === 0) {
    return (
      <p className="text-muted-foreground px-5 py-10 text-center text-sm">
        Les statistiques apparaîtront dès que vous aurez des tâches à suivre.
      </p>
    );
  }

  return (
    <div className="space-y-8 px-5 pb-[max(2rem,env(safe-area-inset-bottom))]">
      <section className="grid grid-cols-2 gap-3">
        <Tile
          value={`${Math.round(stats.average * 100)} %`}
          label="de complétion moyenne"
        />
        <Tile
          value={`${stats.perfectDays}`}
          label={`journée${stats.perfectDays > 1 ? "s" : ""} complète${stats.perfectDays > 1 ? "s" : ""} sur ${stats.observed}`}
        />
      </section>

      <section>
        <h2 className="text-muted-foreground mb-3 text-xs tracking-wide uppercase">
          Douze dernières semaines
        </h2>
        <Heatmap cells={stats.cells} />
      </section>

      <section>
        <h2 className="text-muted-foreground mb-3 text-xs tracking-wide uppercase">
          Par tâche
        </h2>
        <ul className="space-y-3">
          {stats.perTask.map(({ task, routine, stats: taskStats }) => (
            <li key={task.id} className="space-y-1.5">
              <div className="flex items-baseline gap-2">
                <span className="min-w-0 flex-1 truncate text-sm">
                  {task.name}
                  {routine ? (
                    <span className="text-muted-foreground text-xs">
                      {" "}
                      · {routine.name}
                    </span>
                  ) : null}
                </span>
                <span className="rt-num text-muted-foreground shrink-0 text-xs">
                  {taskStats.current > 0 ? `série ${taskStats.current}` : "—"}
                  {taskStats.best > taskStats.current
                    ? ` · record ${taskStats.best}`
                    : ""}
                </span>
              </div>

              <div className="bg-[var(--rt-rail)] h-1.5 overflow-hidden rounded-full">
                <div
                  className="bg-primary h-full rounded-full transition-[width]"
                  style={{ width: `${Math.round(taskStats.rate * 100)}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function Tile({ value, label }: { value: string; label: string }) {
  return (
    <div className="border-[var(--rt-surface-border)] bg-[var(--rt-surface)] rounded-[var(--radius)] border p-4">
      <p className="rt-display text-2xl leading-none">{value}</p>
      <p className="text-muted-foreground mt-1.5 text-xs leading-snug">{label}</p>
    </div>
  );
}
