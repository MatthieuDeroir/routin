import type { Snapshot } from "./types";

interface Versioned {
  id: string;
  updatedAt: number;
}

/**
 * Fusion « dernière écriture gagnante », ligne par ligne.
 *
 * À égalité d'horodatage, la version locale est conservée : l'utilisateur vient
 * d'agir sur cet appareil, et lui reprendre sa modification pour une collision
 * de milliseconde serait le pire comportement possible.
 */
export function mergeRows<T extends Versioned>(
  local: readonly T[],
  incoming: readonly T[],
): T[] {
  const byId = new Map<string, T>(local.map((row) => [row.id, row]));

  for (const row of incoming) {
    const current = byId.get(row.id);
    if (!current || row.updatedAt > current.updatedAt) byId.set(row.id, row);
  }

  return [...byId.values()];
}

export function mergeSnapshots(local: Snapshot, incoming: Snapshot): Snapshot {
  return {
    moments: mergeRows(local.moments, incoming.moments),
    routines: mergeRows(local.routines, incoming.routines),
    tasks: mergeRows(local.tasks, incoming.tasks),
    completions: mergeRows(local.completions, incoming.completions),
  };
}

/** Écarte les entités supprimées : le reste de l'application les ignore. */
export function visible(snapshot: Snapshot): Snapshot {
  const alive = <T extends { deletedAt?: number | null }>(rows: T[]) =>
    rows.filter((row) => !row.deletedAt);

  return {
    moments: alive(snapshot.moments),
    routines: alive(snapshot.routines),
    tasks: alive(snapshot.tasks),
    completions: snapshot.completions,
  };
}

export const emptySnapshot = (): Snapshot => ({
  moments: [],
  routines: [],
  tasks: [],
  completions: [],
});
