/** Date locale au format « YYYY-MM-DD ». Jamais un instant UTC. */
export type DayString = string;

/** Bitmask des jours actifs : bit 0 = lundi … bit 6 = dimanche. */
export type DaysMask = number;

/** Index de jour de semaine, 0 = lundi … 6 = dimanche. */
export type WeekdayIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface DayMoment {
  id: string;
  name: string;
  emoji?: string | null;
  /** Minutes depuis minuit, inclusif. */
  startMinute: number;
  /** Minutes depuis minuit, exclusif (1440 = minuit du lendemain). */
  endMinute: number;
  position: number;
}

export interface Routine {
  id: string;
  name: string;
  emoji?: string | null;
  color?: string | null;
  daysMask: DaysMask;
  position: number;
}

export interface Task {
  id: string;
  routineId: string | null;
  momentId: string | null;
  name: string;
  notes?: string | null;
  /** `null` = hérite de la routine. */
  daysMask: DaysMask | null;
  /** Minutes depuis minuit, ou `null` si la tâche n'a pas d'heure précise. */
  atMinute: number | null;
  position: number;
}

export interface Completion {
  taskId: string;
  day: DayString;
  done: boolean;
}
