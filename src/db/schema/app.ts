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
 * Moments de la journée, personnalisables par utilisateur.
 * Bornes exprimées en minutes depuis minuit local ; `endMinute` est exclusive.
 * Un moment de fin de journée se termine à 1440 (minuit).
 */
export const dayMoments = sqliteTable(
  "day_moment",
  {
    id: text("id").primaryKey(),
    ...ownerColumn,
    name: text("name").notNull(),
    emoji: text("emoji"),
    startMinute: integer("start_minute").notNull(),
    endMinute: integer("end_minute").notNull(),
    position: integer("position").notNull().default(0),
    ...syncColumns,
  },
  (t) => [index("day_moment_user_idx").on(t.userId)],
);

/**
 * Groupe de tâches. `daysMask` est un bitmask 0–127 : bit 0 = lundi … bit 6 = dimanche.
 * Il sert de valeur par défaut aux tâches de la routine, qui peuvent la surcharger.
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
    ...syncColumns,
  },
  (t) => [index("routine_user_idx").on(t.userId)],
);

/**
 * Tâche. Trois placements possibles dans la journée, par ordre de priorité :
 *   1. `atMinute` renseigné → heure précise ; le moment est *dérivé* des bornes
 *      de `dayMoments` au moment de l'affichage, jamais figé en base.
 *   2. `momentId` seul → dans ce moment, sans horaire.
 *   3. ni l'un ni l'autre → « dans la journée », sans moment.
 *
 * `daysMask` à NULL signifie « hérite de la routine ». Une tâche sans routine
 * (`routineId` NULL) doit donc porter son propre `daysMask`.
 */
export const tasks = sqliteTable(
  "task",
  {
    id: text("id").primaryKey(),
    ...ownerColumn,
    routineId: text("routine_id").references(() => routines.id, {
      onDelete: "cascade",
    }),
    momentId: text("moment_id").references(() => dayMoments.id, {
      onDelete: "set null",
    }),
    name: text("name").notNull(),
    notes: text("notes"),
    daysMask: integer("days_mask"),
    atMinute: integer("at_minute"),
    position: integer("position").notNull().default(0),
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

/** Trace des rappels déjà envoyés, pour ne pas notifier deux fois la même tâche. */
export const pushLog = sqliteTable(
  "push_log",
  {
    id: text("id").primaryKey(),
    ...ownerColumn,
    taskId: text("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    day: text("day").notNull(),
    sentAt: integer("sent_at").notNull(),
  },
  (t) => [uniqueIndex("push_log_task_day_idx").on(t.taskId, t.day)],
);

export const routinesRelations = relations(routines, ({ many }) => ({
  tasks: many(tasks),
}));

export const dayMomentsRelations = relations(dayMoments, ({ many }) => ({
  tasks: many(tasks),
}));

export const tasksRelations = relations(tasks, ({ one, many }) => ({
  routine: one(routines, {
    fields: [tasks.routineId],
    references: [routines.id],
  }),
  moment: one(dayMoments, {
    fields: [tasks.momentId],
    references: [dayMoments.id],
  }),
  completions: many(completions),
}));

export const completionsRelations = relations(completions, ({ one }) => ({
  task: one(tasks, { fields: [completions.taskId], references: [tasks.id] }),
}));
