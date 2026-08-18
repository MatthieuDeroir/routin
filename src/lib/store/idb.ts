"use client";

import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type {
  EntityKind,
  PendingMutation,
  Snapshot,
  StoredCompletion,
  StoredRoutine,
  StoredTask,
} from "./types";

interface RoutinDB extends DBSchema {
  routines: { key: string; value: StoredRoutine };
  tasks: { key: string; value: StoredTask };
  completions: { key: string; value: StoredCompletion };
  outbox: { key: string; value: PendingMutation };
  meta: { key: string; value: unknown };
}

const DB_NAME = "routin";
// La version 2 supprime la réserve « moments » : les routines portent
// désormais elles-mêmes leur place dans la journée.
const DB_VERSION = 2;

let handle: Promise<IDBPDatabase<RoutinDB>> | null = null;

function connect() {
  handle ??= openDB<RoutinDB>(DB_NAME, DB_VERSION, {
    upgrade(db, previousVersion) {
      if (previousVersion > 0) {
        // Rupture de modèle : le cache d'une version antérieure décrit un
        // schéma qui n'existe plus, le reconstruire coûte moins cher que de
        // le convertir.
        for (const name of [...db.objectStoreNames]) db.deleteObjectStore(name);
      }
      db.createObjectStore("routines", { keyPath: "id" });
      db.createObjectStore("tasks", { keyPath: "id" });
      db.createObjectStore("completions", { keyPath: "id" });
      db.createObjectStore("outbox", { keyPath: "key" });
      db.createObjectStore("meta");
    },
  });
  return handle;
}

/**
 * Le cache local est cloisonné par utilisateur : changer de compte sur le même
 * navigateur ne doit pas faire apparaître les routines de quelqu'un d'autre.
 */
export async function ensureOwner(userId: string): Promise<boolean> {
  const db = await connect();
  const known = (await db.get("meta", "userId")) as string | undefined;
  if (known === userId) return false;

  const tx = db.transaction(
    ["routines", "tasks", "completions", "outbox", "meta"],
    "readwrite",
  );
  await Promise.all([
    tx.objectStore("routines").clear(),
    tx.objectStore("tasks").clear(),
    tx.objectStore("completions").clear(),
    tx.objectStore("outbox").clear(),
  ]);
  await tx.objectStore("meta").put(userId, "userId");
  await tx.objectStore("meta").put(0, "cursor");
  await tx.done;
  return true;
}

export async function readSnapshot(): Promise<Snapshot> {
  const db = await connect();
  const [routines, tasks, completions] = await Promise.all([
    db.getAll("routines"),
    db.getAll("tasks"),
    db.getAll("completions"),
  ]);
  return { routines, tasks, completions };
}

export async function writeSnapshot(snapshot: Snapshot): Promise<void> {
  const db = await connect();
  const tx = db.transaction(["routines", "tasks", "completions"], "readwrite");
  const stores = {
    routines: tx.objectStore("routines"),
    tasks: tx.objectStore("tasks"),
    completions: tx.objectStore("completions"),
  };
  await Promise.all([
    ...snapshot.routines.map((row) => stores.routines.put(row)),
    ...snapshot.tasks.map((row) => stores.tasks.put(row)),
    ...snapshot.completions.map((row) => stores.completions.put(row)),
  ]);
  await tx.done;
}

export async function putRow(
  kind: EntityKind,
  row: { id: string },
): Promise<void> {
  const db = await connect();
  await db.put(kind, row as never);
}

/** Empile une mutation ; une seule reste en attente par entité (la dernière). */
export async function enqueue(
  kind: EntityKind,
  id: string,
  payload: unknown,
): Promise<void> {
  const db = await connect();
  await db.put("outbox", {
    key: `${kind}:${id}`,
    kind,
    id,
    payload,
    queuedAt: Date.now(),
  });
}

/** Curseur de synchronisation : dernier `updatedAt` reçu du serveur. */
export async function readCursor(): Promise<number> {
  const db = await connect();
  return ((await db.get("meta", "cursor")) as number | undefined) ?? 0;
}

export async function writeCursor(cursor: number): Promise<void> {
  const db = await connect();
  await db.put("meta", cursor, "cursor");
}

export async function readOutbox(): Promise<PendingMutation[]> {
  const db = await connect();
  return db.getAll("outbox");
}

export async function clearOutbox(keys: string[]): Promise<void> {
  const db = await connect();
  const tx = db.transaction("outbox", "readwrite");
  await Promise.all(keys.map((key) => tx.store.delete(key)));
  await tx.done;
}
