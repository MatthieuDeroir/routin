import type { Appearance } from "@/lib/appearance";
import type { Completion, Routine, Task } from "@/lib/domain";

/**
 * Toute entité synchronisable porte l'heure de sa dernière modification et une
 * date de suppression logique. Ce sont les deux seules informations dont le
 * moteur de fusion a besoin : la plus récente gagne, et une suppression se
 * propage comme n'importe quelle autre modification.
 */
export interface SyncFields {
  updatedAt: number;
  deletedAt: number | null;
}

export type StoredRoutine = Routine & SyncFields;
export type StoredTask = Task & SyncFields;
export type StoredCompletion = Completion & { id: string; updatedAt: number };
/** Une ligne par utilisateur : `id` vaut l'identifiant utilisateur lui-même. */
export type StoredPreference = Appearance & { id: string } & SyncFields;

export interface Snapshot {
  routines: StoredRoutine[];
  tasks: StoredTask[];
  completions: StoredCompletion[];
  preferences: StoredPreference[];
}

export type EntityKind = "routines" | "tasks" | "completions" | "preferences";

/**
 * Une mutation en attente d'envoi au serveur. Elle porte l'entité complète
 * plutôt qu'un diff : rejouer une file de remplacements est idempotent, alors
 * qu'une file d'incréments ne l'est pas.
 */
export interface PendingMutation {
  /** Clé locale, `${kind}:${id}` — une seule mutation en attente par entité. */
  key: string;
  kind: EntityKind;
  id: string;
  payload: unknown;
  queuedAt: number;
}
