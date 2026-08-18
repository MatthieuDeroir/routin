/**
 * Données de démonstration : un utilisateur, ses moments, quatre routines,
 * quelques tâches libres et huit semaines d'historique.
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
  dayMoments,
  pushLog,
  pushSubscriptions,
  routines,
  tasks,
  users,
} from "./schema";
import { ALL_DAYS, addDays, maskFromWeekdays, weekdayOf } from "@/lib/domain/days";
import { isTaskActiveOnWeekday } from "@/lib/domain/schedule";

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

const moments = [
  { id: "m-reveil", name: "Réveil", emoji: "🌅", startMinute: 0, endMinute: 480 },
  { id: "m-matin", name: "Matin", emoji: "☕", startMinute: 480, endMinute: 720 },
  { id: "m-midi", name: "Midi", emoji: "🍽️", startMinute: 720, endMinute: 840 },
  { id: "m-aprem", name: "Après-midi", emoji: "🌤️", startMinute: 840, endMinute: 1140 },
  { id: "m-soir", name: "Soir", emoji: "🌙", startMinute: 1140, endMinute: 1440 },
];

const WEEKDAYS = maskFromWeekdays([0, 1, 2, 3, 4]);
const LUN_MER_VEN = maskFromWeekdays([0, 2, 4]);
const SAMEDI = maskFromWeekdays([5]);
const DIMANCHE = maskFromWeekdays([6]);

const demoRoutines = [
  { id: "r-reveil", name: "Réveil", emoji: "🌅", color: "#f59e0b", daysMask: ALL_DAYS },
  { id: "r-travail", name: "Travail", emoji: "💻", color: "#3b82f6", daysMask: WEEKDAYS },
  { id: "r-sport", name: "Sport", emoji: "🏋️", color: "#ef4444", daysMask: LUN_MER_VEN },
  { id: "r-soir", name: "Soir", emoji: "🌙", color: "#8b5cf6", daysMask: ALL_DAYS },
];

interface SeedTask {
  id: string;
  routineId: string | null;
  momentId: string | null;
  name: string;
  daysMask: number | null;
  atMinute: number | null;
  /** Probabilité de complétion, pour un historique crédible. */
  reliability: number;
}

const demoTasks: SeedTask[] = [
  { id: "t-eau", routineId: "r-reveil", momentId: "m-reveil", name: "Grand verre d'eau", daysMask: null, atMinute: null, reliability: 0.92 },
  { id: "t-etirements", routineId: "r-reveil", momentId: null, name: "Étirements", daysMask: null, atMinute: 420, reliability: 0.74 },
  { id: "t-journal", routineId: "r-reveil", momentId: null, name: "Journal", daysMask: null, atMinute: 440, reliability: 0.66 },

  { id: "t-priorites", routineId: "r-travail", momentId: null, name: "Revue des priorités", daysMask: null, atMinute: 540, reliability: 0.88 },
  { id: "t-inbox", routineId: "r-travail", momentId: null, name: "Inbox à zéro", daysMask: null, atMinute: 1050, reliability: 0.71 },
  { id: "t-marche", routineId: "r-travail", momentId: "m-midi", name: "Marche de 20 min", daysMask: null, atMinute: null, reliability: 0.58 },

  { id: "t-seance", routineId: "r-sport", momentId: null, name: "Séance", daysMask: null, atMinute: 1110, reliability: 0.79 },
  { id: "t-mobilite", routineId: "r-sport", momentId: null, name: "Mobilité", daysMask: maskFromWeekdays([1, 3]), atMinute: null, reliability: 0.45 },

  { id: "t-lecture", routineId: "r-soir", momentId: null, name: "Lecture, 20 minutes", daysMask: null, atMinute: 1260, reliability: 0.83 },
  { id: "t-sac", routineId: "r-soir", momentId: "m-soir", name: "Préparer le sac", daysMask: WEEKDAYS, atMinute: null, reliability: 0.69 },
  { id: "t-coucher", routineId: "r-soir", momentId: null, name: "Au lit", daysMask: null, atMinute: 1380, reliability: 0.61 },

  // Tâches sans routine : à faire ce jour-là, sans moment particulier.
  { id: "t-parents", routineId: null, momentId: null, name: "Appeler mes parents", daysMask: DIMANCHE, atMinute: null, reliability: 0.86 },
  { id: "t-courses", routineId: null, momentId: null, name: "Courses de la semaine", daysMask: SAMEDI, atMinute: null, reliability: 0.9 },
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

  // Remise à zéro du jeu de démonstration uniquement (les cascades font le reste).
  await db.delete(pushLog).where(eq(pushLog.userId, DEMO_USER_ID));
  await db.delete(pushSubscriptions).where(eq(pushSubscriptions.userId, DEMO_USER_ID));
  await db.delete(completions).where(eq(completions.userId, DEMO_USER_ID));
  await db.delete(tasks).where(eq(tasks.userId, DEMO_USER_ID));
  await db.delete(routines).where(eq(routines.userId, DEMO_USER_ID));
  await db.delete(dayMoments).where(eq(dayMoments.userId, DEMO_USER_ID));
  await db.delete(users).where(eq(users.id, DEMO_USER_ID));

  await db.insert(users).values({
    id: DEMO_USER_ID,
    name: "Matthieu",
    email: DEMO_USER_EMAIL,
    timeZone: "Europe/Paris",
  });

  await db.insert(dayMoments).values(
    moments.map((moment, index) => ({
      ...moment,
      userId: DEMO_USER_ID,
      position: index,
      updatedAt: now,
    })),
  );

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
      momentId: task.momentId,
      name: task.name,
      daysMask: task.daysMask,
      atMinute: task.atMinute,
      position: index,
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
    `Seed terminé : ${moments.length} moments, ${demoRoutines.length} routines, ` +
      `${demoTasks.length} tâches, ${rows.length} coches.`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
