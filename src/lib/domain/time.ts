export const MINUTES_PER_DAY = 1440;

/** Formate des minutes depuis minuit en « 7 h 05 ». */
export function formatMinute(minute: number): string {
  const hours = Math.floor(minute / 60);
  const minutes = minute % 60;
  return minutes === 0
    ? `${hours} h`
    : `${hours} h ${String(minutes).padStart(2, "0")}`;
}

export function minutesToTimeInput(minute: number): string {
  const clamped = Math.min(Math.max(minute, 0), MINUTES_PER_DAY - 1);
  return `${String(Math.floor(clamped / 60)).padStart(2, "0")}:${String(clamped % 60).padStart(2, "0")}`;
}

export function timeInputToMinutes(value: string): number {
  const [hours, minutes] = value.split(":").map(Number);
  return (hours || 0) * 60 + (minutes || 0);
}
