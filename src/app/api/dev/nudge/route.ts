import { and, eq, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { completions, routines, tasks } from "@/db/schema";
import {
  buildDaySchedule,
  today,
  type Routine,
  type Task,
} from "@/lib/domain";
import { composeNudge, fallbackMessage } from "@/lib/push/compose";
import { chooseNudge, type NudgeReason } from "@/lib/push/nudge";
import { requireUser } from "@/lib/session";

/**
 * Aperçu d'une relance, sans l'envoyer.
 *
 * Régler la formulation d'une notification en attendant qu'un cron la déclenche
 * est intenable : cette route rejoue la décision et la rédaction à la demande,
 * pour n'importe quelle heure et n'importe quelle intention. Réservée au
 * développement, comme /api/dev/login.
 */
export async function GET(request: Request) {
  const isLocalDatabase = (process.env.DATABASE_URL ?? "").startsWith("file:");
  if (process.env.NODE_ENV === "production" || !isLocalDatabase) {
    return new NextResponse("Not found", { status: 404 });
  }

  const user = await requireUser();
  const params = new URL(request.url).searchParams;
  const nowMinute = Number(params.get("minute") ?? 10 * 60);
  const forced = params.get("reason") as NudgeReason | null;

  const day = today(user.timeZone);
  const [routineRows, taskRows, completionRows] = await Promise.all([
    db.select().from(routines).where(and(eq(routines.userId, user.id), isNull(routines.deletedAt))),
    db.select().from(tasks).where(and(eq(tasks.userId, user.id), isNull(tasks.deletedAt))),
    db.select().from(completions).where(eq(completions.userId, user.id)),
  ]);

  const schedule = buildDaySchedule({
    day,
    routines: routineRows as Routine[],
    tasks: taskRows as Task[],
    completions: completionRows,
  });

  const decision =
    chooseNudge({
      schedule,
      nowMinute,
      alreadySent: new Set(),
      minutesSinceLast: null,
    }) ??
    (forced
      ? {
          reason: forced,
          remaining: schedule.sections
            .flatMap((section) => section.entries)
            .filter((entry) => !entry.done && entry.task.kind === "task"),
          pendingDirectives: schedule.sections
            .flatMap((section) => section.entries)
            .filter((entry) => !entry.done && entry.task.kind === "directive"),
        }
      : null);

  if (!decision) {
    return NextResponse.json({
      decision: null,
      raison: "Aucune relance ne se justifie à cette heure avec cet état de journée.",
      journee: { fait: schedule.doneCount, total: schedule.totalCount },
    });
  }

  const context = {
    decision,
    firstName: user.name?.split(" ")[0] ?? null,
    localTime: `${Math.floor(nowMinute / 60)} h ${String(nowMinute % 60).padStart(2, "0")}`,
    weekday: new Intl.DateTimeFormat("fr-FR", { weekday: "long" }).format(new Date()),
    doneCount: schedule.doneCount,
    totalCount: schedule.totalCount,
    streak: null,
  };

  return NextResponse.json({
    intention: decision.reason,
    journee: { fait: schedule.doneCount, total: schedule.totalCount },
    reste: decision.remaining.map((entry) => entry.task.name),
    directives: decision.pendingDirectives.map((entry) => entry.task.name),
    repli: fallbackMessage(context),
    redige: await composeNudge(context),
  });
}
