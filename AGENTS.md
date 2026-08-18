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
- **Une routine est aussi un moment de la journée.** Il n'existe pas de table de
  moments : « Matin » nomme le bloc et sa place, portée par `position`. Ne pas
  réintroduire de découpage horaire séparé, c'est exactement ce qui a été retiré.
- **Placement d'une tâche** : elle appartient à une routine ou à aucune (« dans la
  journée »). `atMinute` ne fait que la trier en tête de son bloc, il ne change
  jamais son appartenance.
- **Une directive** (`kind: "directive"`) n'a ni routine ni heure : elle vaut pour
  la journée entière et s'affiche en pied d'écran.
- **`daysMask`** est un bitmask 0–127, bit 0 = lundi. `NULL` sur une tâche
  signifie « hérite de la routine ».
- **Backup avant toute migration.** `pnpm db:migrate` l'impose ; ne pas
  contourner en appelant `drizzle-kit` directement sur une base de production.
- **Isolation par utilisateur.** Toute requête sur une table métier filtre sur
  `user_id`. Il n'y a pas de middleware d'auth : la garde est `requireUser()`
  dans les Server Components et les routes API.
- **Port de développement figé à 3002**, pour correspondre à l'URI de
  redirection OAuth déclarée chez Google.

## Contraintes de l'outillage

- **`pnpm typecheck` génère d'abord les types de routes.** `LayoutProps` et `PageProps`
  viennent de `.next/types` : sans `next typegen`, la vérification échoue sur un dépôt
  fraîchement cloné.
- **Règles React 19 traitées en erreurs.** `setState` synchrone dans un effet et appel de
  fonction impure pendant le rendu font échouer le lint. État dérivé d'une prop : ajuster
  pendant le rendu. Système externe : `useSyncExternalStore`.
- **La validation d'environnement est paresseuse.** Ne pas la remettre au niveau de l'import :
  le `next build` échouerait dès la collecte des pages quand un secret d'exécution manque.
- **Port de développement figé à 3002**, pour correspondre à l'URI de redirection OAuth.
- **Plan Vercel Hobby** : un cron par jour maximum, et le déploiement est refusé *à la
  création* si la cadence est plus fine. Le déclencheur des rappels vit dans GitHub Actions.
- **Le magasin local démarre sur les données du serveur** puis fusionne IndexedDB : ne pas le
  faire partir d'un instantané vide, le premier rendu serait blanc.

## Notifications

- **La décision d'interrompre n'appartient pas au modèle.** `chooseNudge` est pure
  et testée ; Mistral ne choisit que la formulation. Une panne du modèle ne doit
  jamais pouvoir coûter plus qu'un message moins bien tourné.
- **Tous les chiffres sont fournis calculés au modèle.** Le laisser compter à
  partir d'une liste produit des rappels faux, ce qui décrédibilise l'ensemble.
- **Une intention de relance par jour**, garantie par la clé unique de `nudge_log` :
  l'endpoint reste sûr à appeler plus souvent que prévu.
