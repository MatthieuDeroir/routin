import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

/**
 * Client libSQL brut, utilisable aussi bien par l'application que par les
 * scripts Node (migrations, seed, backup). Le point d'entrée applicatif est
 * `@/db`, qui ajoute la garde `server-only` ; les scripts importent ce module
 * directement, puisque `server-only` lève une erreur hors du runtime React.
 *
 * En développement, DATABASE_URL pointe vers un fichier SQLite local
 * (`file:./local.db`) : même moteur que Turso, aucune latence, aucun risque
 * pour les données de production.
 */
export function createDb(
  url = process.env.DATABASE_URL ?? "file:./local.db",
  authToken = process.env.DATABASE_AUTH_TOKEN || undefined,
) {
  const client = createClient({ url, authToken });
  return { client, db: drizzle(client, { schema }) };
}

const globalForDb = globalThis as unknown as {
  routinDb?: ReturnType<typeof createDb>;
};

const instance = globalForDb.routinDb ?? createDb();
if (process.env.NODE_ENV !== "production") globalForDb.routinDb = instance;

export const db = instance.db;
export const libsql = instance.client;
export { schema };
