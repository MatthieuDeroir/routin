/**
 * Backup de la base AVANT toute migration ou script destructeur.
 *
 * - base locale (`file:...`) : copie binaire du fichier SQLite ;
 * - base Turso (`libsql://...`) : dump SQL via la CLI Turso.
 *
 * Le script échoue bruyamment plutôt que de laisser croire à un backup réussi :
 * une migration ne doit jamais partir sur une sauvegarde silencieusement absente.
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const BACKUP_DIR = path.resolve("backups");

function stamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL manquant : impossible de sauvegarder.");

  fs.mkdirSync(BACKUP_DIR, { recursive: true });

  if (url.startsWith("file:")) {
    const source = path.resolve(url.slice("file:".length));
    if (!fs.existsSync(source)) {
      console.log(`Aucune base à sauvegarder (${source} n'existe pas encore).`);
      return;
    }
    const target = path.join(BACKUP_DIR, `local-${stamp()}.db`);
    fs.copyFileSync(source, target);
    console.log(`Backup local : ${target}`);
    return;
  }

  if (url.startsWith("libsql://") || url.startsWith("https://")) {
    const name = url.replace(/^.*:\/\//, "").split(".")[0];
    const target = path.join(BACKUP_DIR, `${name}-${stamp()}.sql`);
    try {
      const dump = execFileSync("turso", ["db", "shell", name, ".dump"], {
        encoding: "utf8",
        maxBuffer: 512 * 1024 * 1024,
      });
      fs.writeFileSync(target, dump);
      console.log(`Backup distant : ${target}`);
    } catch (error) {
      throw new Error(
        `Backup Turso impossible pour « ${name} ».\n` +
          "Vérifiez que la CLI Turso est installée et authentifiée " +
          "(`turso auth login`), puis relancez. Aucune migration ne doit " +
          "être appliquée sans backup.\n" +
          String(error),
      );
    }
    return;
  }

  throw new Error(`Schéma d'URL non géré pour le backup : ${url}`);
}

main();
