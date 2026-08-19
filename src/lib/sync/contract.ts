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

export const routineSchema = z.object({
  id: z.string().min(1).max(64),
  name: z.string().min(1).max(80),
  emoji: z.string().max(8).nullable().optional(),
  color: z.string().max(32).nullable().optional(),
  daysMask: z.number().int().min(0).max(127),
  position: z.number().int().min(0).max(1000),
  // Tolérant à l'absence : une routine encore en cache dans un navigateur
  // d'avant l'introduction du créneau doit pouvoir remonter, pas être rejetée.
  startMinute: z.number().int().min(0).max(1439).nullable().optional(),
  endMinute: z.number().int().min(0).max(1440).nullable().optional(),
  ...syncFields,
});

export const taskSchema = z.object({
  id: z.string().min(1).max(64),
  routineId: z.string().min(1).max(64).nullable(),
  kind: z.enum(["task", "directive"]),
  name: z.string().min(1).max(120),
  notes: z.string().max(2000).nullable().optional(),
  daysMask: z.number().int().min(0).max(127).nullable(),
  atMinute: z.number().int().min(0).max(1439).nullable(),
  position: z.number().int().min(0).max(10000),
  // Tolérant à l'absence : une tâche encore en cache dans un navigateur d'avant
  // l'introduction des bornes doit pouvoir remonter, pas être rejetée.
  activeFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  activeUntil: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  ...syncFields,
});

export const completionSchema = z.object({
  id: z.string().min(1).max(64),
  taskId: z.string().min(1).max(64),
  day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  done: z.boolean(),
  updatedAt: z.number().int().positive(),
});

/**
 * Une ligne par utilisateur : `id` vaut l'identifiant utilisateur. Les valeurs
 * énumérées (thème, accent…) ne sont pas contraintes à la liste connue côté
 * serveur : un thème ajouté par une version cliente plus récente doit pouvoir
 * remonter sans être rejeté, la tolérance vit côté lecture (`sanitizeAppearance`).
 */
export const preferenceSchema = z.object({
  id: z.string().min(1).max(64),
  theme: z.string().min(1).max(32),
  scheme: z.string().min(1).max(16),
  accent: z.string().max(32).nullable(),
  radius: z.string().max(32).nullable(),
  density: z.string().min(1).max(16),
  textScale: z.number().min(0.5).max(2),
  ...syncFields,
});

export const mutationSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("routines"), payload: routineSchema }),
  z.object({ kind: z.literal("tasks"), payload: taskSchema }),
  z.object({ kind: z.literal("completions"), payload: completionSchema }),
  z.object({ kind: z.literal("preferences"), payload: preferenceSchema }),
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
    routines: z.infer<typeof routineSchema>[];
    tasks: z.infer<typeof taskSchema>[];
    completions: z.infer<typeof completionSchema>[];
    preferences: z.infer<typeof preferenceSchema>[];
  };
  /** Mutations refusées, avec leur motif : le client peut les purger. */
  rejected: { id: string; kind: string; reason: string }[];
}

/**
 * Les entités doivent être écrites dans cet ordre : une tâche peut référencer
 * une routine créée dans le même envoi, une coche une tâche. Les préférences
 * n'ont aucune dépendance, leur place dans l'ordre est indifférente.
 */
export const KIND_ORDER = ["routines", "tasks", "completions", "preferences"] as const;
