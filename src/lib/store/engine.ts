"use client";

import { endTask, type DayString } from "@/lib/domain";
import type { SyncResponse } from "@/lib/sync/contract";
import {
  clearOutbox,
  enqueue,
  ensureOwner,
  putRow,
  readCursor,
  readOutbox,
  readSnapshot,
  writeCursor,
  writeSnapshot,
} from "./idb";
import { emptySnapshot, mergeSnapshots, visible } from "./merge";
import type {
  EntityKind,
  Snapshot,
  StoredCompletion,
  StoredPreference,
  StoredRoutine,
  StoredTask,
} from "./types";

export type SyncState = "idle" | "syncing" | "offline" | "error";

export interface StoreState {
  data: Snapshot;
  ready: boolean;
  pending: number;
  sync: SyncState;
}

/**
 * Magasin local-first, volontairement hors de React.
 *
 * C'est un système externe — IndexedDB, le réseau, l'état de connexion — et le
 * traiter comme tel plutôt que comme un état de composant évite les cascades
 * de rendus et rend le vidage de la file indépendant du cycle de vie de l'arbre.
 * React s'y abonne via `useSyncExternalStore`.
 */
export class RoutinStore {
  private snapshot: Snapshot;
  private listeners = new Set<() => void>();
  private state: StoreState;
  private cursor = 0;
  private booted = false;
  private flushing = false;
  private flushAgain = false;

  /**
   * Le magasin démarre sur les données rendues par le serveur, et non sur du
   * vide : sans cela le premier rendu serait une page blanche, remplie une fois
   * IndexedDB lu. Le cache local vient se fusionner juste après, à l'amorçage.
   */
  constructor(initial: Snapshot = emptySnapshot()) {
    this.snapshot = initial;
    this.state = {
      data: visible(initial),
      ready: true,
      pending: 0,
      sync: "idle",
    };
  }

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getState = (): StoreState => this.state;

  private publish(patch: Partial<StoreState> = {}) {
    this.state = { ...this.state, data: visible(this.snapshot), ...patch };
    for (const listener of this.listeners) listener();
  }

  /** Amorçage : cache local, fusion avec les données du serveur, puis envoi. */
  async bootstrap(userId: string, serverData: Snapshot) {
    if (this.booted) return;
    this.booted = true;

    try {
      const reset = await ensureOwner(userId);
      const local = reset ? emptySnapshot() : await readSnapshot();
      this.cursor = reset ? 0 : await readCursor();
      this.snapshot = mergeSnapshots(local, serverData);
      await writeSnapshot(this.snapshot);
    } catch (error) {
      // IndexedDB indisponible (navigation privée, quota) : on reste utilisable
      // sur les seules données du serveur plutôt que de refuser de démarrer,
      // mais sans persistance d'un chargement à l'autre.
      console.error("[routin] cache local indisponible", error);
      this.snapshot = serverData;
    }

    this.publish({ ready: true });
    void this.refreshPending();
    void this.flush();
  }

  /** Chaque navigation rapporte des données serveur fraîches. */
  mergeServer(serverData: Snapshot) {
    this.snapshot = mergeSnapshots(this.snapshot, serverData);
    void writeSnapshot(this.snapshot);
    this.publish();
  }

  private async refreshPending() {
    try {
      const outbox = await readOutbox();
      this.publish({ pending: outbox.length });
    } catch {
      /* le compteur est indicatif : son échec ne doit rien casser */
    }
  }

  /**
   * L'écriture IndexedDB doit être confirmée avant l'envoi : `flush` lit la
   * file avec sa propre transaction, et rien ne garantit qu'elle s'exécute
   * après celle qui vient d'y déposer la mutation. Sans cette attente, un
   * envoi déclenché juste après une saisie peut partir sans elle.
   */
  private write(kind: EntityKind, rows: { id: string }[]) {
    this.publish();
    void this.persistThenSync(kind, rows);
  }

  private async persistThenSync(kind: EntityKind, rows: { id: string }[]) {
    await Promise.all(
      rows.flatMap((row) => [putRow(kind, row), enqueue(kind, row.id, row)]),
    );
    await this.refreshPending();
    await this.flush();
  }

  /**
   * L'horodatage de synchronisation est posé ici, jamais par l'appelant : c'est
   * le magasin qui possède ces métadonnées, et un `updatedAt` oublié ou décalé
   * fausserait silencieusement la résolution de conflit.
   */
  upsertRoutine(input: Omit<StoredRoutine, "updatedAt">) {
    const routine: StoredRoutine = { ...input, updatedAt: Date.now() };
    this.snapshot = {
      ...this.snapshot,
      routines: [
        ...this.snapshot.routines.filter((item) => item.id !== routine.id),
        routine,
      ],
    };
    this.write("routines", [routine]);
  }

  upsertPreference(input: Omit<StoredPreference, "updatedAt">) {
    const preference: StoredPreference = { ...input, updatedAt: Date.now() };
    this.snapshot = {
      ...this.snapshot,
      preferences: [
        ...this.snapshot.preferences.filter((item) => item.id !== preference.id),
        preference,
      ],
    };
    this.write("preferences", [preference]);
  }

  upsertTask(input: Omit<StoredTask, "updatedAt">) {
    const task: StoredTask = { ...input, updatedAt: Date.now() };
    this.snapshot = {
      ...this.snapshot,
      tasks: [...this.snapshot.tasks.filter((item) => item.id !== task.id), task],
    };
    this.write("tasks", [task]);
  }

  /** Réordonne les routines : leur position est l'ordre de la journée. */
  reorderRoutines(ids: string[]) {
    const now = Date.now();
    const rank = new Map(ids.map((id, index) => [id, index]));
    const routines = this.snapshot.routines.map((routine) => {
      const position = rank.get(routine.id);
      return position === undefined || position === routine.position
        ? routine
        : { ...routine, position, updatedAt: now };
    });
    const changed = routines.filter(
      (routine, index) => routine !== this.snapshot.routines[index],
    );
    this.snapshot = { ...this.snapshot, routines };
    this.write("routines", changed);
  }

  /**
   * Réordonne un sous-ensemble de tâches (celles d'un bloc, sans heure) :
   * `position` ne sert qu'au tri au sein d'un même groupe, donc renuméroter
   * ce seul sous-ensemble n'affecte jamais les tâches des autres blocs, même
   * si les valeurs se recoupent avec les leurs.
   */
  reorderTasks(ids: string[]) {
    const now = Date.now();
    const rank = new Map(ids.map((id, index) => [id, index]));
    const tasks = this.snapshot.tasks.map((task) => {
      const position = rank.get(task.id);
      return position === undefined || position === task.position
        ? task
        : { ...task, position, updatedAt: now };
    });
    const changed = tasks.filter((task, index) => task !== this.snapshot.tasks[index]);
    this.snapshot = { ...this.snapshot, tasks };
    this.write("tasks", changed);
  }

  removeRoutine(id: string) {
    const now = Date.now();
    const routines = this.snapshot.routines.map((routine) =>
      routine.id === id ? { ...routine, deletedAt: now, updatedAt: now } : routine,
    );
    // Une routine supprimée emporte ses tâches : les laisser derrière ferait
    // réapparaître des orphelines dans « dans la journée ».
    const tasks = this.snapshot.tasks.map((task) =>
      task.routineId === id ? { ...task, deletedAt: now, updatedAt: now } : task,
    );

    this.snapshot = { ...this.snapshot, routines, tasks };
    this.write("routines", routines.filter((routine) => routine.id === id));
    this.write("tasks", tasks.filter((task) => task.routineId === id));
  }

  /**
   * Retire une tâche à partir d'aujourd'hui, sans toucher aux journées passées.
   *
   * Une suppression franche réécrirait l'historique : une tâche tenue trente
   * jours disparaîtrait des trente journées où elle a réellement été faite, et
   * les statistiques avec elle. On borne donc sa validité — sauf si elle n'a
   * jamais eu une seule journée derrière elle.
   */
  endTask(id: string, yesterday: string) {
    const now = Date.now();
    const tasks = this.snapshot.tasks.map((task) => {
      if (task.id !== id) return task;
      const outcome = endTask(task, yesterday);
      return "deleted" in outcome
        ? { ...task, deletedAt: now, updatedAt: now }
        : { ...task, activeUntil: outcome.activeUntil, updatedAt: now };
    });
    this.snapshot = { ...this.snapshot, tasks };
    this.write("tasks", tasks.filter((task) => task.id === id));
  }

  setCompletion(taskId: string, day: DayString, done: boolean) {
    const now = Date.now();
    const existing = this.snapshot.completions.find(
      (completion) => completion.taskId === taskId && completion.day === day,
    );
    const row: StoredCompletion = existing
      ? { ...existing, done, updatedAt: now }
      : { id: crypto.randomUUID(), taskId, day, done, updatedAt: now };

    this.snapshot = {
      ...this.snapshot,
      completions: [
        ...this.snapshot.completions.filter((item) => item.id !== row.id),
        row,
      ],
    };
    this.write("completions", [row]);
  }

  /**
   * Vide la file vers le serveur, puis intègre ce qu'il renvoie.
   *
   * Un seul envoi à la fois : les appels concurrents sont repliés sur un
   * rappel unique en fin de course, sinon une rafale de coches déclencherait
   * autant de requêtes que de gestes.
   */
  async flush(): Promise<void> {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      this.publish({ sync: "offline" });
      return;
    }
    if (this.flushing) {
      this.flushAgain = true;
      return;
    }

    this.flushing = true;
    this.publish({ sync: "syncing" });

    try {
      const outbox = await readOutbox();
      const response = await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          since: this.cursor,
          mutations: outbox.map((entry) => ({
            kind: entry.kind,
            payload: entry.payload,
          })),
        }),
      });

      if (!response.ok) throw new Error(`sync ${response.status}`);

      const result = (await response.json()) as SyncResponse;

      // Les mutations refusées sont retirées elles aussi : les rejouer
      // indéfiniment bloquerait toutes les suivantes derrière elles.
      await clearOutbox(outbox.map((entry) => entry.key));
      if (result.rejected.length > 0) {
        console.warn("[routin] mutations refusées", result.rejected);
      }

      this.cursor = result.cursor;
      await writeCursor(result.cursor);

      this.snapshot = mergeSnapshots(this.snapshot, {
        routines: result.changes.routines as StoredRoutine[],
        tasks: result.changes.tasks as StoredTask[],
        completions: result.changes.completions as StoredCompletion[],
        preferences: result.changes.preferences as StoredPreference[],
      });
      await writeSnapshot(this.snapshot);

      this.publish({ sync: "idle" });
      await this.refreshPending();
    } catch (error) {
      console.error("[routin] synchronisation impossible", error);
      this.publish({
        sync:
          typeof navigator !== "undefined" && !navigator.onLine ? "offline" : "error",
      });
    } finally {
      this.flushing = false;
      if (this.flushAgain) {
        this.flushAgain = false;
        void this.flush();
      }
    }
  }
}
