/**
 * Applique les migrations Drizzle. Toujours précédé d'un backup
 * (voir le script `db:migrate` dans package.json).
 */
import { migrate } from "drizzle-orm/libsql/migrator";
import { createDb } from "./client";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL manquant.");

  const { db, client } = createDb();
  console.log(`Migration de ${url}`);
  await migrate(db, { migrationsFolder: "./drizzle" });
  client.close();
  console.log("Migrations appliquées.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
