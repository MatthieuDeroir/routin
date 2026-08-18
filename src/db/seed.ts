/**
 * Données de démonstration : un utilisateur, ses routines, quelques tâches
 * libres, deux directives et huit semaines d'historique.
 *
 * Le générateur est déterministe (PRNG à graine fixe) : deux exécutions
 * produisent le même historique, sinon impossible de comparer deux rendus de
 * l'écran statistiques.
 *
 * Refuse de s'exécuter sur une base distante : ce script écrase des données.
 */
import { eq } from "drizzle-orm";
import { createDb } from "./client";
import {
  completions,
  nudgeLog,
  pushSubscriptions,
  routines,
  tasks,
  users,
} from "./schema";
import { ALL_DAYS, addDays, maskFromWeekdays, weekdayOf } from "@/lib/domain/days";
import { isTaskActiveOnWeekday } from "@/lib/domain/schedule";
import type { TaskKind } from "@/lib/domain/types";

export const DEMO_USER_ID = "demo-user";
export const DEMO_USER_EMAIL = "demo@routin.local";

const HISTORY_DAYS = 56;

/** PRNG mulberry32 : reproductible, suffisant pour des données de démo. */
function makeRandom(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const now = Date.now();
const WEEKDAYS = maskFromWeekdays([0, 1, 2, 3, 4]);
const LUN_MER_VEN = maskFromWeekdays([0, 2, 4]);
const SAMEDI = maskFromWeekdays([5]);
const DIMANCHE = maskFromWeekdays([6]);

const demoRoutines = [
  { id: "r-reveil", name: "Réveil", emoji: "🌅", color: "#8a7a4e", daysMask: ALL_DAYS },
  { id: "r-matin", name: "Matin", emoji: "☕", color: "#46605a", daysMask: WEEKDAYS },
  { id: "r-midi", name: "Midi", emoji: "🍽️", color: "#3f6b8f", daysMask: ALL_DAYS },
  { id: "r-aprem", name: "Après-midi", emoji: "🌤️", color: "#7a5b8c", daysMask: LUN_MER_VEN },
  { id: "r-soir", name: "Soir", emoji: "🌙", color: "#a8564a", daysMask: ALL_DAYS },
  { id: "r-nuit", name: "Nuit", emoji: "🌌", color: "#5f7a45", daysMask: ALL_DAYS },
];

interface SeedTask {
  id: string;
  routineId: string | null;
  kind: TaskKind;
  name: string;
  daysMask: number | null;
  atMinute: number | null;
  /** Probabilité de complétion, pour un historique crédible. */
  reliability: number;
}

const t = (
  id: string,
  routineId: string | null,
  name: string,
  atMinute: number | null,
  reliability: number,
  daysMask: number | null = null,
  kind: TaskKind = "task",
): SeedTask => ({ id, routineId, kind, name, daysMask, atMinute, reliability });

const demoTasks: SeedTask[] = [
  t("t-eau", "r-reveil", "Grand verre d'eau", null, 0.92),
  t("t-etirements", "r-reveil", "Étirements", 420, 0.74),
  t("t-journal", "r-reveil", "Journal", 440, 0.66),

  t("t-priorites", "r-matin", "Revue des priorités", 540, 0.88),
  t("t-focus", "r-matin", "Bloc de concentration", 600, 0.72),

  t("t-marche", "r-midi", "Marche de 20 min", null, 0.58),

  t("t-seance", "r-aprem", "Séance de sport", 1110, 0.79),
  t("t-inbox", "r-aprem", "Inbox à zéro", 1050, 0.71),

  t("t-sac", "r-soir", "Préparer le sac", null, 0.69, WEEKDAYS),
  t("t-lecture", "r-soir", "Lecture, 20 minutes", 1260, 0.83),

  t("t-coucher", "r-nuit", "Au lit", 1380, 0.61),

  // Sans routine : à faire ce jour-là, sans heure ni bloc.
  t("t-parents", null, "Appeler mes parents", null, 0.86, DIMANCHE),
  t("t-courses", null, "Courses de la semaine", null, 0.9, SAMEDI),

  // Directives : des règles à tenir, pas des tâches à exécuter.
  t("d-cafeine", null, "Pas de caféine après 11 h 30", null, 0.68, ALL_DAYS, "directive"),
  t("d-ecran", null, "Pas d'écran 30 min avant de dormir", null, 0.47, ALL_DAYS, "directive"),
];

async function main() {
  const url = process.env.DATABASE_URL ?? "";
  if (!url.startsWith("file:")) {
    throw new Error(
      `Le seed écrase des données et ne s'exécute que sur une base locale.\n` +
        `DATABASE_URL vaut « ${url} ».`,
    );
  }

  const { db, client } = createDb();
  const today = new Date().toISOString().slice(0, 10);
  const start = addDays(today, -(HISTORY_DAYS - 1));

  console.log(`Seed de ${url} — historique du ${start} au ${today}`);

  await db.delete(nudgeLog).where(eq(nudgeLog.userId, DEMO_USER_ID));
  await db.delete(pushSubscriptions).where(eq(pushSubscriptions.userId, DEMO_USER_ID));
  await db.delete(completions).where(eq(completions.userId, DEMO_USER_ID));
  await db.delete(tasks).where(eq(tasks.userId, DEMO_USER_ID));
  await db.delete(routines).where(eq(routines.userId, DEMO_USER_ID));
  await db.delete(users).where(eq(users.id, DEMO_USER_ID));

  await db.insert(users).values({
    id: DEMO_USER_ID,
    name: "Matthieu",
    email: DEMO_USER_EMAIL,
    timeZone: "Europe/Paris",
  });

  await db.insert(routines).values(
    demoRoutines.map((routine, index) => ({
      ...routine,
      userId: DEMO_USER_ID,
      position: index,
      updatedAt: now,
    })),
  );

  await db.insert(tasks).values(
    demoTasks.map((task, index) => ({
      id: task.id,
      userId: DEMO_USER_ID,
      routineId: task.routineId,
      kind: task.kind,
      name: task.name,
      daysMask: task.daysMask,
      atMinute: task.atMinute,
      position: index,
      // Les données de démonstration existent depuis le début de l'historique.
      activeFrom: start,
      activeUntil: null,
      updatedAt: now,
    })),
  );

  const routineById = new Map(demoRoutines.map((routine) => [routine.id, routine]));
  const random = makeRandom(20260818);
  const rows: (typeof completions.$inferInsert)[] = [];

  for (let offset = 0; offset < HISTORY_DAYS; offset += 1) {
    const day = addDays(start, offset);
    const weekday = weekdayOf(day);
    // La régularité s'améliore avec le temps : un historique plat n'a aucun relief.
    const progress = 0.75 + 0.35 * (offset / HISTORY_DAYS);

    for (const task of demoTasks) {
      const routine = task.routineId ? routineById.get(task.routineId) : null;
      if (!isTaskActiveOnWeekday(task, routine ?? null, weekday)) continue;
      if (random() > task.reliability * progress) continue;

      rows.push({
        id: `c-${task.id}-${day}`,
        userId: DEMO_USER_ID,
        taskId: task.id,
        day,
        done: true,
        updatedAt: now,
      });
    }
  }

  for (let i = 0; i < rows.length; i += 200) {
    await db.insert(completions).values(rows.slice(i, i + 200));
  }

  client.close();
  console.log(
    `Seed terminé : ${demoRoutines.length} routines, ${demoTasks.length} tâches ` +
      `dont 2 directives, ${rows.length} coches.`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
