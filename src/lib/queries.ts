import "server-only";
import { and, between, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { completions, routines, tasks } from "@/db/schema";
import type { DayString } from "@/lib/domain";
import type { Snapshot } from "@/lib/store/types";

/**
 * Charge la configuration complète d'un utilisateur plus les coches d'une
 * fenêtre de jours. La configuration est petite (quelques dizaines de lignes) :
 * on la transmet entière au client, qui recalcule chaque journée localement.
 * C'est la même forme de données que celle du cache hors-ligne.
 */
export async function getRoutineData(
  userId: string,
  fromDay: DayString,
  toDay: DayString,
): Promise<Snapshot> {
  const [routineRows, taskRows, completionRows] = await Promise.all([
    db
      .select()
      .from(routines)
      .where(and(eq(routines.userId, userId), isNull(routines.deletedAt))),
    db
      .select()
      .from(tasks)
      .where(and(eq(tasks.userId, userId), isNull(tasks.deletedAt))),
    db
      .select()
      .from(completions)
      .where(
        and(
          eq(completions.userId, userId),
          between(completions.day, fromDay, toDay),
        ),
      ),
  ]);

  return {
    routines: routineRows.map((row) => ({
      id: row.id,
      name: row.name,
      emoji: row.emoji,
      color: row.color,
      daysMask: row.daysMask,
      position: row.position,
      startMinute: row.startMinute,
      endMinute: row.endMinute,
      updatedAt: row.updatedAt,
      deletedAt: row.deletedAt,
    })),
    tasks: taskRows.map((row) => ({
      id: row.id,
      routineId: row.routineId,
      kind: row.kind,
      name: row.name,
      notes: row.notes,
      daysMask: row.daysMask,
      atMinute: row.atMinute,
      position: row.position,
      activeFrom: row.activeFrom,
      activeUntil: row.activeUntil,
      updatedAt: row.updatedAt,
      deletedAt: row.deletedAt,
    })),
    completions: completionRows.map((row) => ({
      id: row.id,
      taskId: row.taskId,
      day: row.day,
      done: row.done,
      updatedAt: row.updatedAt,
    })),
  };
}
