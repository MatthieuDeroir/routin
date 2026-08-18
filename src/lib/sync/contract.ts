import { z } from "zod";

/**
 * Contrat de synchronisation, partagé par le client et la route serveur.
 *
 * Chaque mutation porte l'entité complète et non un diff : rejouer une file de
 * remplacements est idempotent, ce qui rend inoffensif un envoi dupliqué après
 * une coupure réseau.
 */
const syncFields = {
  updatedAt: z.number().int().positive(),
  deletedAt: z.number().int().positive().nullable(),
};

export const momentSchema = z.object({
  id: z.string().min(1).max(64),
  name: z.string().min(1).max(60),
  emoji: z.string().max(8).nullable().optional(),
  startMinute: z.number().int().min(0).max(1440),
  endMinute: z.number().int().min(1).max(1440),
  position: z.number().int().min(0).max(1000),
  ...syncFields,
});

export const routineSchema = z.object({
  id: z.string().min(1).max(64),
  name: z.string().min(1).max(80),
  emoji: z.string().max(8).nullable().optional(),
  color: z.string().max(32).nullable().optional(),
  daysMask: z.number().int().min(0).max(127),
  position: z.number().int().min(0).max(1000),
  ...syncFields,
});

export const taskSchema = z.object({
  id: z.string().min(1).max(64),
  routineId: z.string().min(1).max(64).nullable(),
  momentId: z.string().min(1).max(64).nullable(),
  name: z.string().min(1).max(120),
  notes: z.string().max(2000).nullable().optional(),
  daysMask: z.number().int().min(0).max(127).nullable(),
  atMinute: z.number().int().min(0).max(1439).nullable(),
  position: z.number().int().min(0).max(10000),
  ...syncFields,
});

export const completionSchema = z.object({
  id: z.string().min(1).max(64),
  taskId: z.string().min(1).max(64),
  day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  done: z.boolean(),
  updatedAt: z.number().int().positive(),
});

export const mutationSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("moments"), payload: momentSchema }),
  z.object({ kind: z.literal("routines"), payload: routineSchema }),
  z.object({ kind: z.literal("tasks"), payload: taskSchema }),
  z.object({ kind: z.literal("completions"), payload: completionSchema }),
]);

export const syncRequestSchema = z.object({
  /** Horodatage de la dernière modification déjà reçue du serveur. */
  since: z.number().int().min(0).default(0),
  mutations: z.array(mutationSchema).max(500).default([]),
});

export type SyncRequest = z.infer<typeof syncRequestSchema>;

export interface SyncResponse {
  cursor: number;
  changes: {
    moments: z.infer<typeof momentSchema>[];
    routines: z.infer<typeof routineSchema>[];
    tasks: z.infer<typeof taskSchema>[];
    completions: z.infer<typeof completionSchema>[];
  };
  /** Mutations refusées, avec leur motif : le client peut les purger. */
  rejected: { id: string; kind: string; reason: string }[];
}

/**
 * Les entités doivent être écrites dans cet ordre : une tâche peut référencer
 * une routine et un moment créés dans le même envoi, une coche une tâche.
 */
export const KIND_ORDER = ["moments", "routines", "tasks", "completions"] as const;
