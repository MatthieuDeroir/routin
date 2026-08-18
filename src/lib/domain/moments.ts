import type { DayMoment } from "./types";

export const MINUTES_PER_DAY = 1440;

/** Formate des minutes depuis minuit en « 7 h 05 ». */
export function formatMinute(minute: number): string {
  const hours = Math.floor(minute / 60);
  const minutes = minute % 60;
  return minutes === 0
    ? `${hours} h`
    : `${hours} h ${String(minutes).padStart(2, "0")}`;
}

/** Trie les moments par heure de début (l'ordre affiché suit la journée). */
export function sortMoments(moments: readonly DayMoment[]): DayMoment[] {
  return [...moments].sort(
    (a, b) => a.startMinute - b.startMinute || a.position - b.position,
  );
}

/**
 * Moment auquel appartient une heure précise.
 *
 * C'est la règle centrale du modèle : une tâche horodatée n'appartient pas au
 * moment qu'on lui a assigné mais à celui dont les bornes contiennent son heure.
 * Le rangement suit donc automatiquement une modification des bornes.
 */
export function momentAtMinute(
  moments: readonly DayMoment[],
  minute: number,
): DayMoment | null {
  return (
    moments.find(
      (moment) => minute >= moment.startMinute && minute < moment.endMinute,
    ) ?? null
  );
}

export interface MomentValidationIssue {
  code: "invalid-range" | "gap" | "overlap" | "incomplete-coverage" | "empty";
  message: string;
  momentId?: string;
}

/**
 * Les moments doivent couvrir la journée entière sans trou ni chevauchement :
 * sinon une tâche horodatée pourrait ne tomber dans aucun moment, ou dans deux.
 * Cette validation garde `momentAtMinute` total plutôt que partiel.
 */
export function validateMoments(
  moments: readonly DayMoment[],
): MomentValidationIssue[] {
  const issues: MomentValidationIssue[] = [];

  if (moments.length === 0) {
    return [{ code: "empty", message: "Au moins un moment est nécessaire." }];
  }

  const sorted = sortMoments(moments);

  for (const moment of sorted) {
    if (
      moment.startMinute < 0 ||
      moment.endMinute > MINUTES_PER_DAY ||
      moment.startMinute >= moment.endMinute
    ) {
      issues.push({
        code: "invalid-range",
        momentId: moment.id,
        message: `« ${moment.name} » a des bornes invalides.`,
      });
    }
  }

  if (sorted[0].startMinute !== 0) {
    issues.push({
      code: "incomplete-coverage",
      momentId: sorted[0].id,
      message: `La journée doit commencer à 0 h : « ${sorted[0].name} » démarre à ${formatMinute(sorted[0].startMinute)}.`,
    });
  }

  const last = sorted[sorted.length - 1];
  if (last.endMinute !== MINUTES_PER_DAY) {
    issues.push({
      code: "incomplete-coverage",
      momentId: last.id,
      message: `La journée doit se terminer à minuit : « ${last.name} » s'arrête à ${formatMinute(last.endMinute)}.`,
    });
  }

  for (let i = 1; i < sorted.length; i += 1) {
    const previous = sorted[i - 1];
    const current = sorted[i];
    if (current.startMinute > previous.endMinute) {
      issues.push({
        code: "gap",
        momentId: current.id,
        message: `Trou entre « ${previous.name} » et « ${current.name} ».`,
      });
    } else if (current.startMinute < previous.endMinute) {
      issues.push({
        code: "overlap",
        momentId: current.id,
        message: `« ${previous.name} » et « ${current.name} » se chevauchent.`,
      });
    }
  }

  return issues;
}

/**
 * Réajuste les bornes pour qu'elles restent contiguës quand on déplace une
 * frontière : chaque moment démarre là où le précédent s'arrête.
 */
export function normalizeMoments(moments: readonly DayMoment[]): DayMoment[] {
  const sorted = sortMoments(moments);
  return sorted.map((moment, index) => ({
    ...moment,
    position: index,
    startMinute: index === 0 ? 0 : sorted[index - 1].endMinute,
    endMinute:
      index === sorted.length - 1 ? MINUTES_PER_DAY : moment.endMinute,
  }));
}
