import { and, eq, inArray, isNull, lt } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import {
  completions,
  nudgeLog,
  pushSubscriptions,
  routines,
  tasks,
  users,
} from "@/db/schema";
import {
  addDays,
  buildDaySchedule,
  computeTaskStats,
  today,
  type Routine,
  type Task,
} from "@/lib/domain";
import { composeNudge } from "@/lib/push/compose";
import { chooseNudge, type NudgeReason } from "@/lib/push/nudge";
import { sendToUser } from "@/lib/push/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Fenêtre d'observation des séries en cours. */
const STREAK_WINDOW_DAYS = 90;

/**
 * Relances.
 *
 * Elles ne sont plus déclenchées par l'heure d'une tâche mais par l'état de la
 * journée : rien de coché en fin de matinée, journée à peine entamée l'après-
 * midi, choses en suspens le soir. Une journée bouclée ne produit aucune
 * notification.
 *
 * Le texte est rédigé par un modèle, la décision d'interrompre ne l'est pas :
 * elle repose sur des règles vérifiables et testées (`chooseNudge`). Le pire
 * qu'une panne du modèle puisse coûter, c'est une formulation moins juste.
 *
 * L'endpoint est idempotent : une intention de relance par jour et par
 * utilisateur, garantie par la clé unique de `nudge_log`. Il peut donc être
 * appelé plus souvent que prévu sans conséquence.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const authorization = request.headers.get("authorization");

  // Vercel Cron signe ses appels ; on accepte aussi un déclencheur externe
  // porteur du même secret, pour ne pas dépendre d'une seule cadence.
  if (secret && authorization !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const subscribers = await db
    .selectDistinct({ userId: pushSubscriptions.userId })
    .from(pushSubscriptions);

  if (subscribers.length === 0) return NextResponse.json({ users: 0, sent: 0 });

  const owners = await db
    .select()
    .from(users)
    .where(inArray(users.id, subscribers.map((row) => row.userId)));

  const now = new Date();
  let sent = 0;
  const reasons: Record<string, NudgeReason> = {};

  for (const owner of owners) {
    const timeZone = owner.timeZone || "Europe/Paris";
    const day = today(timeZone, now);
    const nowMinute = minuteOfDay(now, timeZone);

    const [routineRows, taskRows, completionRows, journal] = await Promise.all([
      db
        .select()
        .from(routines)
        .where(and(eq(routines.userId, owner.id), isNull(routines.deletedAt))),
      db
        .select()
        .from(tasks)
        .where(and(eq(tasks.userId, owner.id), isNull(tasks.deletedAt))),
      db
        .select()
        .from(completions)
        .where(eq(completions.userId, owner.id)),
      db.select().from(nudgeLog).where(and(eq(nudgeLog.userId, owner.id), eq(nudgeLog.day, day))),
    ]);

    const schedule = buildDaySchedule({
      day,
      routines: routineRows as Routine[],
      tasks: taskRows as Task[],
      completions: completionRows,
    });

    const lastSentAt = journal.reduce((max, row) => Math.max(max, row.sentAt), 0);
    const decision = chooseNudge({
      schedule,
      nowMinute,
      alreadySent: new Set(journal.map((row) => row.reason as NudgeReason)),
      minutesSinceLast:
        lastSentAt === 0 ? null : Math.round((now.getTime() - lastSentAt) / 60_000),
    });

    if (!decision) continue;

    const message = await composeNudge({
      decision,
      firstName: owner.name?.split(" ")[0] ?? null,
      localTime: new Intl.DateTimeFormat("fr-FR", {
        timeZone,
        hour: "2-digit",
        minute: "2-digit",
      }).format(now),
      weekday: new Intl.DateTimeFormat("fr-FR", { timeZone, weekday: "long" }).format(now),
      doneCount: schedule.doneCount,
      totalCount: schedule.totalCount,
      streak: bestStreak(
        decision.remaining.map((entry) => entry.task),
        routineRows as Routine[],
        completionRows,
        day,
      ),
    });

    const result = await sendToUser(owner.id, {
      title: message.title,
      body: message.body,
      url: "/",
      tag: `${day}-${decision.reason}`,
    });

    if (result.sent > 0) {
      sent += result.sent;
      reasons[owner.id] = decision.reason;
      await db.insert(nudgeLog).values({
        id: crypto.randomUUID(),
        userId: owner.id,
        day,
        reason: decision.reason,
        sentAt: Date.now(),
      });
    }
  }

  // Purge du journal de plus de trente jours : il ne sert qu'à la journée en cours.
  await db.delete(nudgeLog).where(lt(nudgeLog.day, addDays(today("UTC", now), -30)));

  return NextResponse.json({ users: owners.length, sent, reasons });
}

function minuteOfDay(instant: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("fr-FR", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(instant);
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? 0);
  const minute = Number(parts.find((part) => part.type === "minute")?.value ?? 0);
  return hour * 60 + minute;
}

/**
 * La plus longue série en cours parmi ce qui reste à faire.
 * C'est le levier le plus honnête dont dispose la relance : rappeler ce qu'on
 * risque de casser, plutôt qu'inventer une urgence.
 */
function bestStreak(
  remaining: Task[],
  routineRows: Routine[],
  completionRows: { taskId: string; day: string; done: boolean }[],
  day: string,
): { name: string; days: number } | null {
  const routineById = new Map(routineRows.map((routine) => [routine.id, routine]));
  let best: { name: string; days: number } | null = null;

  for (const task of remaining) {
    const stats = computeTaskStats({
      task,
      routine: task.routineId ? (routineById.get(task.routineId) ?? null) : null,
      completions: completionRows,
      from: addDays(day, -STREAK_WINDOW_DAYS),
      to: addDays(day, -1),
    });
    if (stats.current >= 3 && (!best || stats.current > best.days)) {
      best = { name: task.name, days: stats.current };
    }
  }

  return best;
}
