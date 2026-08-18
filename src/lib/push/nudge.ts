import type { DaySchedule, ScheduleEntry } from "@/lib/domain";

/**
 * Intentions de relance. Une seule de chaque par jour : trois interruptions
 * maximum, et jamais deux fois le même angle.
 */
export type NudgeReason = "demarrage" | "relance" | "cloture";

/** Heures de silence : on ne réveille personne et on ne relance pas la nuit. */
export const QUIET_START_MINUTE = 7 * 60;
export const QUIET_END_MINUTE = 22 * 60 + 30;

/** Écart minimal entre deux relances, quelles que soient leurs intentions. */
export const MIN_GAP_MINUTES = 150;

export interface NudgeContext {
  schedule: DaySchedule;
  nowMinute: number;
  /** Intentions déjà utilisées aujourd'hui. */
  alreadySent: ReadonlySet<NudgeReason>;
  /** Minutes écoulées depuis la dernière relance, ou `null` s'il n'y en a pas eu. */
  minutesSinceLast: number | null;
}

export interface NudgeDecision {
  reason: NudgeReason;
  remaining: ScheduleEntry[];
  pendingDirectives: ScheduleEntry[];
}

/**
 * Décide s'il y a lieu de relancer, et pourquoi.
 *
 * La règle de fond : une notification ne se déclenche pas à une heure mais à un
 * état. On ne dérange que si la journée avance sans que rien ne bouge, si elle
 * est à moitié faite au milieu de l'après-midi, ou si elle se termine avec des
 * choses en suspens. Une journée bouclée ne produit aucune notification — la
 * récompense d'avoir tout fait, c'est le silence.
 */
export function chooseNudge(context: NudgeContext): NudgeDecision | null {
  const { schedule, nowMinute, alreadySent, minutesSinceLast } = context;

  if (nowMinute < QUIET_START_MINUTE || nowMinute > QUIET_END_MINUTE) return null;
  if (minutesSinceLast !== null && minutesSinceLast < MIN_GAP_MINUTES) return null;
  if (schedule.totalCount === 0) return null;

  const entries = schedule.sections.flatMap((section) => section.entries);
  const remaining = entries.filter((entry) => !entry.done);
  if (remaining.length === 0) return null;

  const pendingDirectives = remaining.filter(
    (entry) => entry.task.kind === "directive",
  );
  const pendingTasks = remaining.filter((entry) => entry.task.kind === "task");

  const make = (reason: NudgeReason): NudgeDecision => ({
    reason,
    remaining: pendingTasks,
    pendingDirectives,
  });

  // La journée a commencé et rien n'a bougé.
  if (
    !alreadySent.has("demarrage") &&
    nowMinute >= 9 * 60 &&
    schedule.doneCount === 0
  ) {
    return make("demarrage");
  }

  // Milieu d'après-midi, plus de la moitié reste à faire.
  if (
    !alreadySent.has("relance") &&
    nowMinute >= 14 * 60 &&
    pendingTasks.length > 0 &&
    schedule.doneCount * 2 < schedule.totalCount
  ) {
    return make("relance");
  }

  // La soirée : c'est le moment d'évaluer les directives et de finir le reste.
  if (!alreadySent.has("cloture") && nowMinute >= 20 * 60) {
    return make("cloture");
  }

  return null;
}
