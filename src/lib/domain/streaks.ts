import { dayRange } from "./days";
import { isTaskActiveOn } from "./schedule";
import type { Completion, DayString, Routine, Task } from "./types";

export interface TaskStats {
  /** Série en cours, en nombre de jours *actifs* consécutifs validés. */
  current: number;
  /** Meilleure série jamais atteinte sur la période observée. */
  best: number;
  doneCount: number;
  activeCount: number;
  /** Taux de complétion sur la période, entre 0 et 1 (0 si aucun jour actif). */
  rate: number;
}

interface TaskStatsInput {
  task: Task;
  routine: Routine | null;
  completions: readonly Completion[];
  from: DayString;
  /** Dernier jour observé, généralement « aujourd'hui ». */
  to: DayString;
}

/**
 * Statistiques d'une tâche sur une période.
 *
 * Deux règles importantes :
 * - les jours où la tâche n'est pas programmée sont **ignorés**, ils ne cassent
 *   pas une série (une routine du lundi ne perd rien le mardi) ;
 * - le jour courant non encore validé ne casse pas non plus la série : la
 *   journée n'est pas finie. On repart du dernier jour actif antérieur.
 */
export function computeTaskStats({
  task,
  routine,
  completions,
  from,
  to,
}: TaskStatsInput): TaskStats {
  const done = new Set(
    completions
      .filter((completion) => completion.taskId === task.id && completion.done)
      .map((completion) => completion.day),
  );

  // La période de validité compte autant que les jours actifs : une tâche
  // créée mardi n'a pas « manqué » les lundis précédents.
  const activeDays = dayRange(from, to).filter((day) =>
    isTaskActiveOn(task, routine, day),
  );

  let best = 0;
  let run = 0;
  for (const day of activeDays) {
    if (done.has(day)) {
      run += 1;
      if (run > best) best = run;
    } else {
      run = 0;
    }
  }

  let current = 0;
  for (let i = activeDays.length - 1; i >= 0; i -= 1) {
    const day = activeDays[i];
    if (done.has(day)) {
      current += 1;
      continue;
    }
    // Le jour courant encore ouvert ne rompt rien ; tout autre trou, si.
    if (i === activeDays.length - 1 && day === to) continue;
    break;
  }

  const doneCount = activeDays.filter((day) => done.has(day)).length;

  return {
    current,
    best,
    doneCount,
    activeCount: activeDays.length,
    rate: activeDays.length === 0 ? 0 : doneCount / activeDays.length,
  };
}

export interface HeatmapCell {
  day: DayString;
  done: number;
  total: number;
  /** Part des tâches validées ce jour-là, entre 0 et 1. */
  ratio: number;
}

interface HeatmapInput {
  from: DayString;
  to: DayString;
  routines: readonly Routine[];
  tasks: readonly Task[];
  completions: readonly Completion[];
}

/** Historique jour par jour, pour la heatmap de l'écran statistiques. */
export function buildHeatmap({
  from,
  to,
  routines,
  tasks,
  completions,
}: HeatmapInput): HeatmapCell[] {
  const routineById = new Map(routines.map((routine) => [routine.id, routine]));

  const doneByDay = new Map<DayString, Set<string>>();
  for (const completion of completions) {
    if (!completion.done) continue;
    const set = doneByDay.get(completion.day);
    if (set) set.add(completion.taskId);
    else doneByDay.set(completion.day, new Set([completion.taskId]));
  }

  return dayRange(from, to).map((day) => {
    const activeTasks = tasks.filter((task) =>
      isTaskActiveOn(
        task,
        task.routineId ? (routineById.get(task.routineId) ?? null) : null,
        day,
      ),
    );
    const doneSet = doneByDay.get(day);
    const done = doneSet
      ? activeTasks.filter((task) => doneSet.has(task.id)).length
      : 0;

    return {
      day,
      done,
      total: activeTasks.length,
      ratio: activeTasks.length === 0 ? 0 : done / activeTasks.length,
    };
  });
}
