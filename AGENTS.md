<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Conventions du projet Routin

- **Le jour est local, jamais UTC.** Une journée est une chaîne `YYYY-MM-DD`
  calculée dans le fuseau de l'utilisateur (`user.timeZone`). Utiliser `new Date()`
  côté serveur pour déterminer « aujourd'hui » est un bug.
- **Aucune écriture par Server Action.** L'application est local-first : toute
  mutation passe par le store IndexedDB puis la file de synchronisation
  (`/api/sync`). Une écriture directe casserait le mode hors-ligne.
- **Sync = last-write-wins par ligne.** Toute table métier porte `updated_at`
  (epoch ms) et `deleted_at` (suppression logique). Ne jamais supprimer
  physiquement une ligne synchronisée.
- **Placement d'une tâche dans la journée**, par ordre de priorité : `atMinute`
  (heure précise, le moment est *dérivé* des bornes) → `momentId` seul → ni l'un
  ni l'autre, la tâche est « dans la journée ».
- **`daysMask`** est un bitmask 0–127, bit 0 = lundi. `NULL` sur une tâche
  signifie « hérite de la routine ».
- **Backup avant toute migration.** `pnpm db:migrate` l'impose ; ne pas
  contourner en appelant `drizzle-kit` directement sur une base de production.
- **Isolation par utilisateur.** Toute requête sur une table métier filtre sur
  `user_id`. Il n'y a pas de middleware d'auth : la garde est `requireUser()`
  dans les Server Components et les routes API.
- **Port de développement figé à 3002**, pour correspondre à l'URI de
  redirection OAuth déclarée chez Google.
