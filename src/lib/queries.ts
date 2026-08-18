import "server-only";
import { and, between, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { completions, dayMoments, routines, tasks } from "@/db/schema";
import type { DayString } from "@/lib/domain";
import type {
  StoredCompletion,
  StoredMoment,
  StoredRoutine,
  StoredTask,
} from "@/lib/store/types";

export interface RoutineData {
  moments: StoredMoment[];
  routines: StoredRoutine[];
  tasks: StoredTask[];
  completions: StoredCompletion[];
}

/**
 * Charge la configuration complète d'un utilisateur plus les coches d'une
 * fenêtre de jours. La configuration est petite (quelques dizaines de lignes) :
 * on la transmet entière au client, qui recalcule chaque journée localement.
 * C'est la même forme de données que celle du futur cache hors-ligne.
 */
export async function getRoutineData(
  userId: string,
  fromDay: DayString,
  toDay: DayString,
): Promise<RoutineData> {
  const [momentRows, routineRows, taskRows, completionRows] = await Promise.all([
    db
      .select()
      .from(dayMoments)
      .where(and(eq(dayMoments.userId, userId), isNull(dayMoments.deletedAt))),
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
    moments: momentRows.map((row) => ({
      id: row.id,
      name: row.name,
      emoji: row.emoji,
      startMinute: row.startMinute,
      endMinute: row.endMinute,
      position: row.position,
      updatedAt: row.updatedAt,
      deletedAt: row.deletedAt,
    })),
    routines: routineRows.map((row) => ({
      id: row.id,
      name: row.name,
      emoji: row.emoji,
      color: row.color,
      daysMask: row.daysMask,
      position: row.position,
      updatedAt: row.updatedAt,
      deletedAt: row.deletedAt,
    })),
    tasks: taskRows.map((row) => ({
      id: row.id,
      routineId: row.routineId,
      momentId: row.momentId,
      name: row.name,
      notes: row.notes,
      daysMask: row.daysMask,
      atMinute: row.atMinute,
      position: row.position,
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
