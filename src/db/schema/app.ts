import { relations } from "drizzle-orm";
import {
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import { users } from "./auth";

/**
 * Colonnes communes au moteur de synchronisation local-first.
 *
 * `id`        — uuid généré par le client, pour qu'une entité créée hors-ligne
 *               garde la même identité une fois remontée au serveur.
 * `updatedAt` — epoch ms, arbitre les conflits (last-write-wins par ligne).
 * `deletedAt` — suppression logique : une suppression doit pouvoir se propager,
 *               donc la ligne survit comme pierre tombale.
 */
const syncColumns = {
  updatedAt: integer("updated_at").notNull(),
  deletedAt: integer("deleted_at"),
};

const ownerColumn = {
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
};

/**
 * Une routine est **à la fois** le groupe et le moment de la journée : « Matin »
 * nomme le bloc et sa place dans la journée. Séparer les deux notions obligeait
 * à créer un groupe puis à le rattacher à une tranche horaire, pour un résultat
 * qui se recouvrait — une routine « Réveil » et un moment « Réveil ».
 *
 * `position` porte l'ordre de la journée ; `daysMask` est un bitmask 0–127
 * (bit 0 = lundi) qui sert de valeur par défaut aux tâches de la routine.
 *
 * `startMinute` / `endMinute` (minutes depuis minuit, `NULL` = pas de créneau)
 * bornent ce moment de la journée : c'est ce qui permet au repère « maintenant »
 * de situer l'heure actuelle dans le bon bloc même sans tâche horodatée dedans.
 */
export const routines = sqliteTable(
  "routine",
  {
    id: text("id").primaryKey(),
    ...ownerColumn,
    name: text("name").notNull(),
    emoji: text("emoji"),
    color: text("color"),
    daysMask: integer("days_mask").notNull().default(127),
    position: integer("position").notNull().default(0),
    startMinute: integer("start_minute"),
    endMinute: integer("end_minute"),
    ...syncColumns,
  },
  (t) => [index("routine_user_idx").on(t.userId)],
);

/**
 * Une tâche appartient à une routine, ou à aucune — auquel cas elle est
 * simplement « dans la journée ». Une heure précise ne fait que la trier en
 * tête de son bloc ; elle ne change pas son appartenance.
 *
 * `kind` distingue deux natures :
 *   - `task` — quelque chose à faire ;
 *   - `directive` — une règle à tenir sur la journée entière (« pas de caféine
 *     après 11 h 30 »). Une directive n'a ni routine ni heure : elle vaut pour
 *     la journée, et se coche le soir comme tenue ou non.
 *
 * `daysMask` à NULL signifie « hérite de la routine ». Une tâche sans routine
 * doit donc porter son propre masque.
 */
export const tasks = sqliteTable(
  "task",
  {
    id: text("id").primaryKey(),
    ...ownerColumn,
    routineId: text("routine_id").references(() => routines.id, {
      onDelete: "cascade",
    }),
    kind: text("kind", { enum: ["task", "directive"] })
      .notNull()
      .default("task"),
    name: text("name").notNull(),
    notes: text("notes"),
    daysMask: integer("days_mask"),
    atMinute: integer("at_minute"),
    position: integer("position").notNull().default(0),
    /**
     * Période de validité, en jours locaux. Créer une tâche aujourd'hui ne doit
     * pas la faire apparaître dans les journées passées, et la retirer ne doit
     * pas l'effacer de celles où elle a existé : sans ces bornes, l'historique
     * et les séries se réécrivent à chaque modification.
     */
    activeFrom: text("active_from"),
    activeUntil: text("active_until"),
    ...syncColumns,
  },
  (t) => [
    index("task_user_idx").on(t.userId),
    index("task_routine_idx").on(t.routineId),
  ],
);

/**
 * Coche d'une tâche pour un jour donné.
 * `day` est une date locale « YYYY-MM-DD » — jamais un instant UTC, sinon les
 * coches de fin de soirée basculeraient au lendemain.
 * `done = false` est une pierre tombale : décocher hors-ligne doit pouvoir
 * écraser une coche distante plus ancienne.
 */
export const completions = sqliteTable(
  "completion",
  {
    id: text("id").primaryKey(),
    ...ownerColumn,
    taskId: text("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    day: text("day").notNull(),
    done: integer("done", { mode: "boolean" }).notNull().default(true),
    updatedAt: integer("updated_at").notNull(),
  },
  (t) => [
    uniqueIndex("completion_task_day_idx").on(t.taskId, t.day),
    index("completion_user_day_idx").on(t.userId, t.day),
  ],
);

/** Abonnements Web Push, un par navigateur/appareil. */
export const pushSubscriptions = sqliteTable(
  "push_subscription",
  {
    id: text("id").primaryKey(),
    ...ownerColumn,
    endpoint: text("endpoint").notNull().unique(),
    p256dh: text("p256dh").notNull(),
    auth: text("auth").notNull(),
    userAgent: text("user_agent"),
    createdAt: integer("created_at").notNull(),
  },
  (t) => [index("push_subscription_user_idx").on(t.userId)],
);

/**
 * Journal des relances envoyées.
 *
 * Les rappels ne sont plus attachés à une tâche et à son heure : ils sont
 * déclenchés par l'état de la journée. Le journal sert donc à limiter la
 * fréquence — au plus une relance par intention et par jour — plutôt qu'à
 * dédoublonner par tâche.
 */
export const nudgeLog = sqliteTable(
  "nudge_log",
  {
    id: text("id").primaryKey(),
    ...ownerColumn,
    day: text("day").notNull(),
    /** Intention de la relance : démarrage, relance de milieu, clôture. */
    reason: text("reason").notNull(),
    sentAt: integer("sent_at").notNull(),
  },
  (t) => [
    uniqueIndex("nudge_log_user_day_reason_idx").on(t.userId, t.day, t.reason),
    index("nudge_log_user_idx").on(t.userId),
  ],
);

export const routinesRelations = relations(routines, ({ many }) => ({
  tasks: many(tasks),
}));

export const tasksRelations = relations(tasks, ({ one, many }) => ({
  routine: one(routines, {
    fields: [tasks.routineId],
    references: [routines.id],
  }),
  completions: many(completions),
}));

export const completionsRelations = relations(completions, ({ one }) => ({
  task: one(tasks, { fields: [completions.taskId], references: [tasks.id] }),
}));
