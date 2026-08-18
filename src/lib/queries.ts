import "server-only";
import { and, between, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { completions, dayMoments, routines, tasks } from "@/db/schema";
import type {
  Completion,
  DayMoment,
  DayString,
  Routine,
  Task,
} from "@/lib/domain";

export interface RoutineData {
  moments: DayMoment[];
  routines: Routine[];
  tasks: Task[];
  completions: Completion[];
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
    })),
    routines: routineRows.map((row) => ({
      id: row.id,
      name: row.name,
      emoji: row.emoji,
      color: row.color,
      daysMask: row.daysMask,
      position: row.position,
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
    })),
    completions: completionRows.map((row) => ({
      taskId: row.taskId,
      day: row.day,
      done: row.done,
    })),
  };
}
