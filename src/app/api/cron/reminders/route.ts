import { and, between, eq, inArray, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import {
  completions,
  pushLog,
  pushSubscriptions,
  routines,
  tasks,
  users,
} from "@/db/schema";
import { formatMinute, isTaskActiveOnWeekday, today, weekdayOf } from "@/lib/domain";
import { sendToUser } from "@/lib/push/server";

/** Fenêtre de rattrapage, à caler sur la cadence du cron. */
const WINDOW_MINUTES = 15;

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Rappels programmés.
 *
 * Chaque utilisateur a son propre fuseau : « maintenant » se calcule pour lui,
 * pas pour le serveur. Une tâche n'est rappelée qu'une fois par jour, garanti
 * par la clé unique (tâche, jour) de `push_log` — un cron rejoué ne renotifie
 * donc pas, ce qui rend l'endpoint sûr à appeler plus souvent que prévu.
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

  if (subscribers.length === 0) {
    return NextResponse.json({ users: 0, sent: 0 });
  }

  const ids = subscribers.map((row) => row.userId);
  const owners = await db.select().from(users).where(inArray(users.id, ids));

  let sent = 0;
  const now = new Date();

  for (const owner of owners) {
    const timeZone = owner.timeZone || "Europe/Paris";
    const day = today(timeZone, now);
    const weekday = weekdayOf(day);

    const parts = new Intl.DateTimeFormat("fr-FR", {
      timeZone,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(now);
    const nowMinute =
      Number(parts.find((p) => p.type === "hour")?.value ?? 0) * 60 +
      Number(parts.find((p) => p.type === "minute")?.value ?? 0);

    const [taskRows, routineRows, doneRows, alreadySent] = await Promise.all([
      db
        .select()
        .from(tasks)
        .where(and(eq(tasks.userId, owner.id), isNull(tasks.deletedAt))),
      db
        .select()
        .from(routines)
        .where(and(eq(routines.userId, owner.id), isNull(routines.deletedAt))),
      db
        .select()
        .from(completions)
        .where(and(eq(completions.userId, owner.id), eq(completions.day, day))),
      db
        .select()
        .from(pushLog)
        .where(and(eq(pushLog.userId, owner.id), eq(pushLog.day, day))),
    ]);

    const routineById = new Map(routineRows.map((row) => [row.id, row]));
    const doneTasks = new Set(
      doneRows.filter((row) => row.done).map((row) => row.taskId),
    );
    const notified = new Set(alreadySent.map((row) => row.taskId));

    const due = taskRows.filter((task) => {
      if (task.atMinute === null) return false;
      if (doneTasks.has(task.id) || notified.has(task.id)) return false;
      if (task.atMinute > nowMinute) return false;
      if (nowMinute - task.atMinute > WINDOW_MINUTES) return false;
      const routine = task.routineId
        ? (routineById.get(task.routineId) ?? null)
        : null;
      return isTaskActiveOnWeekday(task, routine, weekday);
    });

    for (const task of due) {
      const result = await sendToUser(owner.id, {
        title: task.name,
        body: `C’est l’heure — ${formatMinute(task.atMinute as number)}`,
        url: "/",
        tag: `${task.id}-${day}`,
      });

      if (result.sent > 0) {
        sent += result.sent;
        await db.insert(pushLog).values({
          id: crypto.randomUUID(),
          userId: owner.id,
          taskId: task.id,
          day,
          sentAt: Date.now(),
        });
      }
    }
  }

  // Purge des traces d'envoi de plus d'une semaine : elles n'ont plus d'usage
  // et la table grossirait indéfiniment.
  const cutoff = today("UTC", new Date(Date.now() - 7 * 86_400_000));
  await db.delete(pushLog).where(between(pushLog.day, "0000-00-00", cutoff));

  return NextResponse.json({ users: owners.length, sent });
}
