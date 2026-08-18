import type { DayString, DaysMask, WeekdayIndex } from "./types";

export const ALL_DAYS: DaysMask = 0b1111111; // 127
export const NO_DAYS: DaysMask = 0;
export const WEEKDAYS: DaysMask = 0b0011111; // lundi → vendredi
export const WEEKEND: DaysMask = 0b1100000; // samedi + dimanche

export const WEEKDAY_LABELS = [
  "lundi",
  "mardi",
  "mercredi",
  "jeudi",
  "vendredi",
  "samedi",
  "dimanche",
] as const;

export const WEEKDAY_INITIALS = ["L", "M", "M", "J", "V", "S", "D"] as const;

const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function assertDay(day: DayString): void {
  if (!DAY_PATTERN.test(day)) {
    throw new Error(`Jour invalide : « ${day} » (format attendu YYYY-MM-DD)`);
  }
}

/**
 * Jour de la semaine d'une date locale, 0 = lundi … 6 = dimanche.
 *
 * La chaîne est interprétée à midi UTC : à minuit, un décalage de fuseau
 * négatif ferait basculer la date au jour précédent.
 */
export function weekdayOf(day: DayString): WeekdayIndex {
  assertDay(day);
  const utcDay = new Date(`${day}T12:00:00Z`).getUTCDay(); // 0 = dimanche
  return ((utcDay + 6) % 7) as WeekdayIndex;
}

/** La date du jour dans le fuseau de l'utilisateur, au format « YYYY-MM-DD ». */
export function today(timeZone: string, now: Date = new Date()): DayString {
  return toDayString(now, timeZone);
}

/** Convertit un instant en date locale du fuseau donné. */
export function toDayString(date: Date, timeZone: string): DayString {
  // « en-CA » produit nativement le format YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/** Décale un jour civil de `amount` jours, sans repasser par un fuseau. */
export function addDays(day: DayString, amount: number): DayString {
  assertDay(day);
  const [year, month, date] = day.split("-").map(Number);
  const shifted = new Date(Date.UTC(year, month - 1, date + amount));
  return shifted.toISOString().slice(0, 10);
}

/** Nombre de jours de `from` à `to` (négatif si `to` précède `from`). */
export function daysBetween(from: DayString, to: DayString): number {
  assertDay(from);
  assertDay(to);
  const ms = Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`);
  return Math.round(ms / 86_400_000);
}

/** Suite de jours de `from` à `to` inclus. */
export function dayRange(from: DayString, to: DayString): DayString[] {
  const length = daysBetween(from, to);
  if (length < 0) return [];
  return Array.from({ length: length + 1 }, (_, i) => addDays(from, i));
}

export function maskHasDay(mask: DaysMask, weekday: WeekdayIndex): boolean {
  return (mask & (1 << weekday)) !== 0;
}

export function maskWithDay(
  mask: DaysMask,
  weekday: WeekdayIndex,
  active: boolean,
): DaysMask {
  return active ? mask | (1 << weekday) : mask & ~(1 << weekday);
}

export function toggleDay(mask: DaysMask, weekday: WeekdayIndex): DaysMask {
  return mask ^ (1 << weekday);
}

export function maskFromWeekdays(weekdays: readonly WeekdayIndex[]): DaysMask {
  return weekdays.reduce<DaysMask>((mask, day) => mask | (1 << day), NO_DAYS);
}

export function weekdaysFromMask(mask: DaysMask): WeekdayIndex[] {
  return ([0, 1, 2, 3, 4, 5, 6] as WeekdayIndex[]).filter((day) =>
    maskHasDay(mask, day),
  );
}

/** Libellé lisible d'un bitmask : « tous les jours », « lun. mer. ven. »… */
export function describeMask(mask: DaysMask): string {
  const normalized = mask & ALL_DAYS;
  if (normalized === ALL_DAYS) return "tous les jours";
  if (normalized === NO_DAYS) return "jamais";
  if (normalized === WEEKDAYS) return "en semaine";
  if (normalized === WEEKEND) return "le week-end";
  return weekdaysFromMask(normalized)
    .map((day) => WEEKDAY_LABELS[day].slice(0, 3) + ".")
    .join(" ");
}
