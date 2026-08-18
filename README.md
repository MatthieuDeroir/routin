# Routin

PWA de gestion de routines quotidiennes, avec granularité par jour de la semaine.

Next.js 16 (App Router) · Turso / libSQL + Drizzle · Auth.js v5 (Google) · Tailwind 4 + shadcn/ui · Vercel.

**Production :** https://routin-seven.vercel.app

Le plan de développement et les écarts assumés sont dans [`docs/PLAN.md`](docs/PLAN.md).

## Ce que fait l'application

Une **routine** est à la fois un bloc de tâches et un moment de la journée : « Matin » nomme
les deux. Six blocs existent par défaut — Réveil, Matin, Midi, Après-midi, Soir, Nuit — et se
renomment, se réordonnent et se suppriment. Chaque routine porte ses jours actifs, dont ses
tâches héritent sauf surcharge.

Trois natures de contenu :

- une **tâche** dans une routine, avec ou sans heure précise (l'heure ne fait que la trier en
  tête de son bloc) ;
- une **tâche sans routine**, à faire ce jour-là — elle ouvre l'écran, dans « Dans la journée » ;
- une **directive** : une règle à tenir sur la journée entière (« pas de caféine après
  11 h 30 »), en pied d'écran, qu'on valide le soir. Comme tout le reste, elle porte une série.

L'application est **local-first** : elle se lit et s'écrit hors ligne, et se réconcilie au
retour du réseau (dernière écriture gagnante, ligne par ligne).

## Démarrage

```bash
pnpm install
cp .env.example .env.local     # puis compléter (voir « Configuration » ci-dessous)
pnpm db:migrate                # crée local.db à partir des migrations
pnpm dev                       # http://localhost:3002
```

Le port 3002 est figé : l'URI de redirection OAuth de Google doit correspondre
exactement, et les ports 3000/3001 servent à d'autres projets.

## Configuration

| Variable | Obtention |
| --- | --- |
| `DATABASE_URL` | `file:./local.db` en développement ; URL `libsql://` de Turso en production |
| `DATABASE_AUTH_TOKEN` | `turso db tokens create <db>` (production uniquement) |
| `AUTH_SECRET` | `npx auth secret` |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | Google Cloud Console → Identifiants → ID client OAuth 2.0 (type « Application Web ») |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | `npx web-push generate-vapid-keys` |
| `MISTRAL_API_KEY` | console.mistral.ai → API Keys. Facultatif : sans elle, les rappels gardent leur formulation fixe |
| `CRON_SECRET` | valeur aléatoire, protège la route de cron |

URI de redirection à déclarer côté Google, une par environnement :

- `http://localhost:3002/api/auth/callback/google`
- `https://<domaine-de-production>/api/auth/callback/google`

Aucune valeur réelle ne doit être committée : `.env.local` est ignoré par git,
un hook `gitleaks` bloque le commit en cas d'oubli, et la production passe par
`vercel env`.

## Écrans

| Route | Rôle |
| --- | --- |
| `/` | La journée : sections par moment, balayage entre les jours |
| `/routines` | Routines et tâches |
| `/stats` | Séries, taux de complétion, heatmap |
| `/reglages` | Apparence, rappels, compte |

## Base de données

```bash
pnpm db:generate   # génère une migration SQL depuis le schéma Drizzle
pnpm db:migrate    # backup automatique, puis application des migrations
pnpm db:backup     # backup seul (copie du fichier local, ou dump Turso)
pnpm db:studio     # explorateur Drizzle Studio
node scripts/query.mjs "select * from routine"   # requête SQL ponctuelle
```

`db:migrate` déclenche toujours un backup avant d'appliquer quoi que ce soit :
les sauvegardes atterrissent dans `backups/` (ignoré par git).

## Qualité

```bash
pnpm typecheck
pnpm lint
pnpm test
```

Deux pipelines à chaque push et PR :

- `.github/workflows/ci.yml` — lint, vérification de types, tests ;
- `.github/workflows/security.yml` — secrets (gitleaks), SAST (Semgrep),
  dépendances et configuration (Trivy), SBOM CycloneDX.

## Rappels

Les relances ne sont pas déclenchées par l'heure d'une tâche mais par **l'état de la
journée** : rien de coché en fin de matinée, journée à peine entamée l'après-midi,
choses en suspens le soir. Une journée bouclée ne produit aucune notification.

Le texte est rédigé par **Mistral Small**, la décision d'interrompre ne l'est pas :
elle repose sur des règles testées (`src/lib/push/nudge.ts`). Sans clé API, ou si
le modèle échoue, un texte de repli part quand même.

Pour régler la formulation sans attendre un cron, en développement :

```
GET /api/dev/nudge?minute=900&reason=relance
```

`.github/workflows/reminders.yml` appelle `/api/cron/reminders` toutes les quinze
minutes avec `CRON_SECRET`. Le plan Hobby de Vercel limitant les crons à une
exécution par jour, le déclencheur ne peut pas vivre dans `vercel.ts` — la marche
à suivre pour y revenir en plan Pro y est documentée.

L'endpoint est idempotent : une intention de relance par jour et par personne,
garantie par la clé unique de `nudge_log`.
