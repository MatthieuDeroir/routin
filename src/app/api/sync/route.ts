import { and, eq, gt, lt } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { completions, preferences, routines, tasks } from "@/db/schema";
import { getUser } from "@/lib/session";
import {
  KIND_ORDER,
  syncRequestSchema,
  type SyncResponse,
} from "@/lib/sync/contract";

/**
 * Point de rendez-vous du mode local-first.
 *
 * Le client envoie ses mutations en attente et l'horodatage de la dernière
 * modification déjà connue ; le serveur applique ce qui est plus récent que ce
 * qu'il détient, puis renvoie tout ce que le client ignore encore.
 *
 * Arbitrage : dernière écriture gagnante, ligne par ligne, sur `updated_at`.
 * Une écriture plus ancienne que celle en base est ignorée silencieusement —
 * ce n'est pas une erreur, c'est le résultat normal d'une course.
 */
export async function POST(request: Request) {
  const user = await getUser();
  if (!user?.id) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const parsed = syncRequestSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Requête invalide", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const { since, mutations } = parsed.data;
  const rejected: SyncResponse["rejected"] = [];

  if (mutations.length > 0) {
    console.log(`[routin] sync ${user.id} : ${mutations.length} mutation(s) reçue(s)`);
  }

  // L'ordre compte : une tâche peut référencer une routine créée dans le même
  // envoi, une coche une tâche.
  const ordered = [...mutations].sort(
    (a, b) => KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind),
  );

  for (const mutation of ordered) {
    // L'appartenance vient de la session, jamais du corps de la requête :
    // sans cela, n'importe qui écrirait dans les données d'un autre compte.
    const row = { ...mutation.payload, userId: user.id };

    try {
      switch (mutation.kind) {
        case "routines":
          await upsert(routines, row, row.updatedAt);
          break;
        case "tasks":
          await upsert(tasks, row, row.updatedAt);
          break;
        case "completions":
          await upsert(completions, row, row.updatedAt);
          break;
        case "preferences":
          await upsert(preferences, row, row.updatedAt);
          break;
      }
    } catch (error) {
      // Journalisé côté serveur : un rejet est retiré de la file cliente sans
      // repasser, donc la seule trace qui en reste vit ici.
      console.error("[routin] mutation refusée", mutation.kind, mutation.payload.id, error);
      rejected.push({
        id: mutation.payload.id,
        kind: mutation.kind,
        reason: error instanceof Error ? error.message : "écriture refusée",
      });
    }
  }

  const [routineRows, taskRows, completionRows, preferenceRows] = await Promise.all([
    db
      .select()
      .from(routines)
      .where(and(eq(routines.userId, user.id), gt(routines.updatedAt, since))),
    db
      .select()
      .from(tasks)
      .where(and(eq(tasks.userId, user.id), gt(tasks.updatedAt, since))),
    db
      .select()
      .from(completions)
      .where(and(eq(completions.userId, user.id), gt(completions.updatedAt, since))),
    db
      .select()
      .from(preferences)
      .where(and(eq(preferences.userId, user.id), gt(preferences.updatedAt, since))),
  ]);

  // Le curseur suit les horodatages réellement stockés, pas l'heure du serveur :
  // les `updatedAt` viennent des clients, et comparer les deux échelles ferait
  // sauter des modifications au moindre décalage d'horloge.
  const cursor = [
    since,
    ...routineRows.map((r) => r.updatedAt),
    ...taskRows.map((r) => r.updatedAt),
    ...completionRows.map((r) => r.updatedAt),
    ...preferenceRows.map((r) => r.updatedAt),
  ].reduce((max, value) => (value > max ? value : max), since);

  const response: SyncResponse = {
    cursor,
    rejected,
    changes: {
      routines: routineRows.map(strip),
      tasks: taskRows.map(strip),
      completions: completionRows.map(strip),
      preferences: preferenceRows.map(strip),
    },
  };

  return NextResponse.json(response);
}

/** Retire `user_id` des lignes renvoyées : le client n'en a aucun usage. */
function strip<T extends { userId?: string }>(row: T) {
  const rest = { ...row };
  delete rest.userId;
  return rest as Omit<T, "userId">;
}

type AnyTable = typeof routines | typeof tasks | typeof completions | typeof preferences;

async function upsert(
  table: AnyTable,
  row: Record<string, unknown>,
  incomingUpdatedAt: number,
) {
  await db
    .insert(table)
    .values(row as never)
    .onConflictDoUpdate({
      target: table.id,
      set: row as never,
      // Garde-fou de la résolution de conflit. Dans un ON CONFLICT DO UPDATE,
      // une colonne non qualifiée désigne la ligne *déjà en base* : on n'écrase
      // donc que si celle-ci est plus ancienne que ce qui arrive.
      setWhere: lt(table.updatedAt, incomingUpdatedAt),
    });
}
