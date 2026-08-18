import { ALL_DAYS, maskHasDay, weekdayOf } from "./days";
import { momentAtMinute, sortMoments } from "./moments";
import type {
  Completion,
  DayMoment,
  DayString,
  DaysMask,
  Routine,
  Task,
  WeekdayIndex,
} from "./types";

/**
 * Jours actifs réellement appliqués à une tâche.
 *
 * `daysMask` à `null` signifie « hérite de la routine ». Une tâche sans routine
 * *et* sans masque propre est considérée quotidienne : c'est le cas d'une tâche
 * créée à la volée, qu'on ne veut pas voir disparaître faute de configuration.
 */
export function effectiveDaysMask(
  task: Pick<Task, "daysMask" | "routineId">,
  routine: Pick<Routine, "daysMask"> | null | undefined,
): DaysMask {
  if (task.daysMask !== null && task.daysMask !== undefined) return task.daysMask;
  if (routine) return routine.daysMask;
  return ALL_DAYS;
}

export function isTaskActiveOnWeekday(
  task: Pick<Task, "daysMask" | "routineId">,
  routine: Pick<Routine, "daysMask"> | null | undefined,
  weekday: WeekdayIndex,
): boolean {
  return maskHasDay(effectiveDaysMask(task, routine), weekday);
}

export function isTaskActiveOn(
  task: Pick<Task, "daysMask" | "routineId">,
  routine: Pick<Routine, "daysMask"> | null | undefined,
  day: DayString,
): boolean {
  return isTaskActiveOnWeekday(task, routine, weekdayOf(day));
}

export interface ScheduleEntry {
  task: Task;
  routine: Routine | null;
  /** Moment effectif : dérivé de l'heure si elle existe, sinon celui assigné. */
  moment: DayMoment | null;
  done: boolean;
}

export type ScheduleSectionKind = "anytime" | "moment";

export interface ScheduleSection {
  kind: ScheduleSectionKind;
  /** `null` pour la section « dans la journée ». */
  moment: DayMoment | null;
  key: string;
  label: string;
  entries: ScheduleEntry[];
  doneCount: number;
}

export interface DaySchedule {
  day: DayString;
  weekday: WeekdayIndex;
  sections: ScheduleSection[];
  totalCount: number;
  doneCount: number;
}

export const ANYTIME_SECTION_KEY = "anytime";
export const ANYTIME_SECTION_LABEL = "Dans la journée";

interface BuildInput {
  day: DayString;
  moments: readonly DayMoment[];
  routines: readonly Routine[];
  tasks: readonly Task[];
  completions: readonly Completion[];
}

/**
 * Construit la vue d'une journée : les tâches actives ce jour-là, réparties en
 * sections. La section « dans la journée » vient en tête — ce sont les tâches
 * sans contrainte horaire, à faire quand on veut ; les sections de moments
 * suivent l'ordre chronologique.
 */
export function buildDaySchedule({
  day,
  moments,
  routines,
  tasks,
  completions,
}: BuildInput): DaySchedule {
  const weekday = weekdayOf(day);
  const sortedMoments = sortMoments(moments);
  const routineById = new Map(routines.map((routine) => [routine.id, routine]));
  const momentById = new Map(sortedMoments.map((moment) => [moment.id, moment]));

  const doneByTask = new Map(
    completions
      .filter((completion) => completion.day === day)
      .map((completion) => [completion.taskId, completion.done]),
  );

  const entries: ScheduleEntry[] = [];
  for (const task of tasks) {
    const routine = task.routineId ? (routineById.get(task.routineId) ?? null) : null;
    if (!isTaskActiveOnWeekday(task, routine, weekday)) continue;

    // L'heure précise prime : le moment est dérivé des bornes, jamais figé.
    const moment =
      task.atMinute !== null && task.atMinute !== undefined
        ? momentAtMinute(sortedMoments, task.atMinute)
        : task.momentId
          ? (momentById.get(task.momentId) ?? null)
          : null;

    entries.push({
      task,
      routine,
      moment,
      done: doneByTask.get(task.id) ?? false,
    });
  }

  const buckets = new Map<string, ScheduleEntry[]>();
  for (const entry of entries) {
    const key = entry.moment?.id ?? ANYTIME_SECTION_KEY;
    const bucket = buckets.get(key);
    if (bucket) bucket.push(entry);
    else buckets.set(key, [entry]);
  }

  const sections: ScheduleSection[] = [];

  const anytime = buckets.get(ANYTIME_SECTION_KEY);
  if (anytime?.length) {
    sections.push(makeSection("anytime", null, ANYTIME_SECTION_KEY, ANYTIME_SECTION_LABEL, anytime));
  }

  for (const moment of sortedMoments) {
    const bucket = buckets.get(moment.id);
    if (!bucket?.length) continue;
    sections.push(makeSection("moment", moment, moment.id, moment.name, bucket));
  }

  return {
    day,
    weekday,
    sections,
    totalCount: entries.length,
    doneCount: entries.filter((entry) => entry.done).length,
  };
}

function makeSection(
  kind: ScheduleSectionKind,
  moment: DayMoment | null,
  key: string,
  label: string,
  entries: ScheduleEntry[],
): ScheduleSection {
  const sorted = [...entries].sort(compareEntries);
  return {
    kind,
    moment,
    key,
    label,
    entries: sorted,
    doneCount: sorted.filter((entry) => entry.done).length,
  };
}

/** Les tâches horodatées d'abord, dans l'ordre de l'horloge ; les autres ensuite. */
function compareEntries(a: ScheduleEntry, b: ScheduleEntry): number {
  const aTimed = a.task.atMinute !== null && a.task.atMinute !== undefined;
  const bTimed = b.task.atMinute !== null && b.task.atMinute !== undefined;

  if (aTimed && bTimed) {
    const delta = (a.task.atMinute ?? 0) - (b.task.atMinute ?? 0);
    if (delta !== 0) return delta;
  } else if (aTimed !== bTimed) {
    return aTimed ? -1 : 1;
  }

  const byPosition = a.task.position - b.task.position;
  if (byPosition !== 0) return byPosition;
  return a.task.name.localeCompare(b.task.name, "fr");
}
