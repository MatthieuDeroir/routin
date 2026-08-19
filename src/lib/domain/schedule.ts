import { ALL_DAYS, maskHasDay, weekdayOf } from "./days";
import type {
  Completion,
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

/** La tâche existait-elle ce jour-là ? Indépendant de ses jours actifs. */
export function existsOn(
  task: Pick<Task, "activeFrom" | "activeUntil">,
  day: DayString,
): boolean {
  if (task.activeFrom && day < task.activeFrom) return false;
  if (task.activeUntil && day > task.activeUntil) return false;
  return true;
}

/**
 * La tâche est-elle à faire ce jour précis ?
 *
 * Deux conditions distinctes : elle doit exister à cette date *et* le jour de
 * la semaine doit faire partie de ses jours actifs.
 */
export function isTaskActiveOn(
  task: Pick<Task, "daysMask" | "routineId" | "activeFrom" | "activeUntil">,
  routine: Pick<Routine, "daysMask"> | null | undefined,
  day: DayString,
): boolean {
  return existsOn(task, day) && isTaskActiveOnWeekday(task, routine, weekdayOf(day));
}

/**
 * Termine une tâche à partir d'aujourd'hui, en préservant son passé.
 *
 * Si elle n'a jamais eu une seule journée derrière elle — créée puis retirée le
 * même jour — il n'y a rien à préserver : c'est une vraie suppression.
 */
export function endTask(
  task: Pick<Task, "activeFrom">,
  yesterday: DayString,
): { activeUntil: DayString } | { deleted: true } {
  if (task.activeFrom && task.activeFrom > yesterday) return { deleted: true };
  return { activeUntil: yesterday };
}

export interface ScheduleEntry {
  task: Task;
  routine: Routine | null;
  done: boolean;
}

export type ScheduleSectionKind = "anytime" | "routine" | "directive";

export interface ScheduleSection {
  kind: ScheduleSectionKind;
  /** `null` pour « dans la journée » et pour les directives. */
  routine: Routine | null;
  key: string;
  label: string;
  emoji: string | null;
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

export const ANYTIME_KEY = "anytime";
export const ANYTIME_LABEL = "Dans la journée";
export const DIRECTIVES_KEY = "directives";
export const DIRECTIVES_LABEL = "À éviter";

interface BuildInput {
  day: DayString;
  routines: readonly Routine[];
  tasks: readonly Task[];
  completions: readonly Completion[];
}

/**
 * Construit la vue d'une journée.
 *
 * Trois natures de sections, dans cet ordre :
 *   1. « À éviter » — ce qu'il ne faut pas faire de la journée ; ces lignes
 *      ouvrent l'écran parce qu'elles cadrent tout le reste ;
 *   2. « Dans la journée » — les tâches régulières sans routine ni heure ;
 *   3. les routines actives ce jour-là, dans l'ordre de la journée.
 *
 * Une routine sans tâche active ne produit aucune section : un bloc vide
 * n'apprend rien et allonge l'écran pour rien.
 */
export function buildDaySchedule({
  day,
  routines,
  tasks,
  completions,
}: BuildInput): DaySchedule {
  const weekday = weekdayOf(day);
  const routineById = new Map(routines.map((routine) => [routine.id, routine]));

  const doneByTask = new Map(
    completions
      .filter((completion) => completion.day === day)
      .map((completion) => [completion.taskId, completion.done]),
  );

  const entries: ScheduleEntry[] = [];
  for (const task of tasks) {
    const routine = task.routineId ? (routineById.get(task.routineId) ?? null) : null;
    if (!existsOn(task, day)) continue;
    if (!isTaskActiveOnWeekday(task, routine, weekday)) continue;
    entries.push({ task, routine, done: doneByTask.get(task.id) ?? false });
  }

  const buckets = new Map<string, ScheduleEntry[]>();
  const push = (key: string, entry: ScheduleEntry) => {
    const bucket = buckets.get(key);
    if (bucket) bucket.push(entry);
    else buckets.set(key, [entry]);
  };

  for (const entry of entries) {
    if (entry.task.kind === "directive") push(DIRECTIVES_KEY, entry);
    else if (entry.routine) push(entry.routine.id, entry);
    else push(ANYTIME_KEY, entry);
  }

  const sections: ScheduleSection[] = [];

  const directives = buckets.get(DIRECTIVES_KEY);
  if (directives?.length) {
    sections.push(
      makeSection("directive", null, DIRECTIVES_KEY, DIRECTIVES_LABEL, null, directives),
    );
  }

  const anytime = buckets.get(ANYTIME_KEY);
  if (anytime?.length) {
    sections.push(makeSection("anytime", null, ANYTIME_KEY, ANYTIME_LABEL, null, anytime));
  }

  for (const routine of [...routines].sort((a, b) => a.position - b.position)) {
    const bucket = buckets.get(routine.id);
    if (!bucket?.length) continue;
    sections.push(
      makeSection("routine", routine, routine.id, routine.name, routine.emoji ?? null, bucket),
    );
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
  routine: Routine | null,
  key: string,
  label: string,
  emoji: string | null,
  entries: ScheduleEntry[],
): ScheduleSection {
  const sorted = [...entries].sort(compareEntries);
  return {
    kind,
    routine,
    key,
    label,
    emoji,
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

export interface NowMarker {
  sectionKey: string;
  /** Index d'insertion dans les entrées de la section. */
  index: number;
}

interface TimeWindow {
  start: number;
  end: number;
}

function windowOf(routine: Pick<Routine, "startMinute" | "endMinute"> | null): TimeWindow | null {
  if (!routine) return null;
  const { startMinute, endMinute } = routine;
  if (startMinute === null || startMinute === undefined) return null;
  if (endMinute === null || endMinute === undefined) return null;
  if (startMinute === endMinute) return null;
  return { start: startMinute, end: endMinute };
}

/** `end <= start` signifie un créneau qui traverse minuit (ex. 22 h–2 h). */
function withinWindow(minute: number, { start, end }: TimeWindow): boolean {
  return start < end ? minute >= start && minute < end : minute >= start || minute < end;
}

/** Position juste avant la prochaine tâche horodatée de la section, sinon sa fin. */
function indexBeforeNextTimed(entries: ScheduleEntry[], nowMinute: number): number {
  let last = 0;
  for (const [index, entry] of entries.entries()) {
    const at = entry.task.atMinute;
    if (at === null || at === undefined) continue;
    if (at > nowMinute) return index;
    last = index + 1;
  }
  return last;
}

/**
 * Où poser le repère « maintenant » dans la journée affichée.
 *
 * Chaque routine porte son propre créneau (`startMinute`/`endMinute`) : le
 * repère se pose dans le bloc dont le créneau contient l'heure actuelle, à
 * l'endroit où il croiserait une tâche horodatée s'il y en avait une. Sans
 * créneau configuré sur aucune routine affichée (compte pas encore migré,
 * routine personnalisée sans horaire), on retombe sur l'ancien repère : juste
 * avant la prochaine tâche horodatée, où qu'elle se trouve.
 *
 * Les directives et « dans la journée » sont ignorées : elles n'ont pas
 * d'heure, les traverser d'une ligne de temps n'aurait aucun sens.
 */
export function locateNowMarker(
  schedule: DaySchedule,
  nowMinute: number | null,
): NowMarker | null {
  if (nowMinute === null) return null;

  const routineSections = schedule.sections.filter((section) => section.kind === "routine");
  if (routineSections.length === 0) return null;

  const windowed = routineSections
    .map((section) => ({ section, window: windowOf(section.routine) }))
    .filter(
      (entry): entry is { section: ScheduleSection; window: TimeWindow } =>
        entry.window !== null,
    );

  if (windowed.length > 0) {
    const inside = windowed.find(({ window }) => withinWindow(nowMinute, window));
    if (inside) {
      return {
        sectionKey: inside.section.key,
        index: indexBeforeNextTimed(inside.section.entries, nowMinute),
      };
    }

    // Le bloc actif à cette heure n'a aucune tâche aujourd'hui, donc aucune
    // section : on s'accroche au dernier créneau déjà entamé, sinon on
    // annonce le prochain.
    const sorted = [...windowed].sort((a, b) => a.window.start - b.window.start);
    const upcoming = sorted.find(({ window }) => window.start > nowMinute);
    if (upcoming) return { sectionKey: upcoming.section.key, index: 0 };
    const last = sorted.at(-1);
    if (last) return { sectionKey: last.section.key, index: last.section.entries.length };
  }

  let last: NowMarker | null = null;
  for (const section of routineSections) {
    for (const [index, entry] of section.entries.entries()) {
      const at = entry.task.atMinute;
      if (at === null || at === undefined) continue;
      if (at > nowMinute) return { sectionKey: section.key, index };
      last = { sectionKey: section.key, index: index + 1 };
    }
  }

  return last;
}
