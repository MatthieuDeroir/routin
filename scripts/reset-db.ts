/**
 * Remise à zéro complète du schéma.
 *
 * Réservé aux ruptures de modèle assumées : le script supprime *toutes* les
 * tables, y compris celles de l'authentification — les sessions ouvertes sont
 * donc perdues et il faudra se reconnecter. Un backup est exigé au préalable,
 * pas suggéré : `pnpm db:backup` avant, sans exception.
 */
import { createDb } from "../src/db/client";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL manquant.");
  if (process.env.ROUTIN_CONFIRM_RESET !== "oui") {
    throw new Error(
      "Garde-fou : relancez avec ROUTIN_CONFIRM_RESET=oui pour confirmer la remise à zéro.",
    );
  }

  const { client } = createDb();
  const tables = await client.execute(
    "select name from sqlite_master where type = 'table' and name not like 'sqlite_%' and name not like 'libsql_%'",
  );

  console.log(`Remise à zéro de ${url} — ${tables.rows.length} tables`);
  await client.execute("PRAGMA foreign_keys = OFF");
  for (const row of tables.rows) {
    await client.execute(`DROP TABLE IF EXISTS "${row.name as string}"`);
  }
  await client.execute("PRAGMA foreign_keys = ON");
  client.close();
  console.log("Toutes les tables supprimées.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
