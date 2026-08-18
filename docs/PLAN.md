# Routin — Plan de développement

PWA de gestion de routines quotidiennes, granularité par jour de la semaine.
Next.js (App Router) · Turso/libSQL + Drizzle · Auth.js v5 (Google) · Vercel.

---

## 1. Décisions actées

| Aspect | Décision |
|---|---|
| Modèle | Routines (groupes) contenant des tâches ; jours actifs surchargeables par tâche |
| Horaire | Une tâche a **soit** une heure précise, **soit** un moment de la journée ; une heure précise est rangée dans le moment correspondant |
| Moments | Personnalisables (nom + bornes horaires) dans les réglages |
| Tracking | Coche journalière · streaks & stats · heatmap calendrier |
| Navigation | Vue « Aujourd'hui », swipe horizontal entre les jours |
| Offline | Complet (lecture + écriture) : IndexedDB + file de mutations, LWW |
| Design | 3 directions visuelles proposées, validées avant implémentation |
| Data | Drizzle ORM + libSQL |
| Auth | Auth.js v5, provider Google, adapter Drizzle |
| DB dev | SQLite local `file:./local.db` ; Turso en production uniquement |
| Notifs | Web Push (VAPID) + cron Vercel |
| Ops | Git + GitHub · CI sécurité (hook anti-secrets, SAST/SCA) · Vitest unitaires, pas de E2E |
| Skill | `bootstrap-nextjs-turso`, global, mode guidé (questionne puis exécute) |

---

## 2. Modèle de données

Toutes les tables métier portent `id` (uuid généré côté client), `user_id`,
`updated_at` (epoch ms) et `deleted_at` (soft delete) — indispensables au moteur de sync LWW.

### Auth (schéma Auth.js / Drizzle adapter)
`users` · `accounts` · `sessions` · `verification_tokens`

### Métier

**`day_moments`** — les moments de la journée, personnalisables
```
id · user_id · name · start_minute · end_minute · position · updated_at · deleted_at
```
Ex. `Réveil 300→480`, `Focus AM 480→720`. Bornes en minutes depuis minuit,
contiguës et validées côté serveur (pas de trou, pas de chevauchement).

**`routines`** — groupes de tâches
```
id · user_id · name · emoji · color · days_mask · position · updated_at · deleted_at
```
`days_mask` : entier 0–127, bitmask des jours actifs (bit 0 = lundi … bit 6 = dimanche).

**`tasks`**
```
id · user_id · routine_id (nullable) · name · notes
days_mask (nullable → hérite de la routine)
moment_id (nullable) · at_minute (nullable)
position · updated_at · deleted_at
```
Trois placements possibles dans la journée, par ordre de priorité :
1. `at_minute` renseigné → l'heure prime, le moment est **dérivé** des bornes de `day_moments` ;
2. `moment_id` seul → la tâche vit dans ce moment, sans horaire, triée après les tâches horodatées ;
3. ni l'un ni l'autre → tâche **« dans la journée »**, sans moment : à faire ce jour-là,
   affichée dans une section dédiée en tête de la vue jour.

`routine_id` est nullable : une tâche peut exister seule, sans routine.
Une routine sans moment fonctionne de la même façon — elle est simplement à faire ce jour-là.

**`completions`**
```
id · user_id · task_id · day (YYYY-MM-DD) · done (bool) · updated_at
UNIQUE(task_id, day)
```
`done=false` sert de tombstone : décocher hors-ligne doit pouvoir écraser un coche distant.

**`push_subscriptions`**
```
id · user_id · endpoint · p256dh · auth · user_agent · created_at
```

---

## 3. Architecture applicative

```
Interaction UI
      ↓ (optimiste, < 16 ms)
  État local IndexedDB  ←─ source de vérité pour le rendu
      ↓
  File de mutations (append-only)
      ↓  online / retour de connexion / visibilitychange
  POST /api/sync { mutations[], cursor }
      ↓
  Turso (LWW par updated_at)
      ↓
  Réponse : changements depuis `cursor` → merge dans IndexedDB
```

- **Conflits** : last-write-wins sur `updated_at`, par ligne. Suffisant pour un usage
  personnel mono/bi-appareil ; documenté comme limite assumée.
- **Rendu** : Server Components pour le shell et le premier paint authentifié,
  hydratation puis bascule sur le store local ; les mutations passent par la file,
  jamais par des Server Actions directes (sinon l'offline casse).
- **Fuseau horaire** : le « jour » est calculé dans le fuseau de l'utilisateur,
  stocké en `YYYY-MM-DD` local — jamais en UTC.

---

## 4. Découpage en lots

| # | Lot | État |
|---|---|---|
| 0 | Fondations dépôt — hook anti-secrets, CI sécurité, Dependabot, SECURITY.md | fait |
| 1 | Socle Next.js 16, Tailwind 4, shadcn, manifest, icônes, service worker | fait |
| 2 | Schéma Drizzle, migrations, backup avant migration, seed de démonstration | fait |
| 3 | Auth.js v5 Google, sessions en base, `requireUser()` | fait |
| 4 | Direction visuelle — six propositions, « Brume » retenue | fait |
| 5 | Vue jour — sections par moment, swipe, bandeau de semaine, repère « maintenant » | fait |
| 6 | Écrans de création — routines, tâches, moments | fait |
| 7 | Local-first — IndexedDB, file de mutations, `/api/sync`, résolution LWW | fait |
| 8 | Statistiques — séries, taux, heatmap douze semaines | fait |
| 9 | Notifications — VAPID, abonnements, rappels programmés | fait |
| 10 | Qualité — Vitest sur la logique métier, CI lint/typecheck/test | fait |
| 11 | Production — Turso, Vercel, domaine, PWA installée | fait |
| 12 | Skill `bootstrap-pwa-nextjs` extrait du projet | fait |

## 4 bis. Écarts assumés par rapport au plan initial

**Le magasin local est arrivé au lot 6, pas au lot 7.** Sans persistance, les écrans de
création n'auraient servi qu'à regarder : impossible d'y saisir de vraies routines. La moitié
cliente du lot 7 a donc été avancée, le lot 7 se réduisant à la file de sortie et à la route
de synchronisation.

**Les rappels ne passent pas par Vercel Cron.** Le plan Hobby limite les tâches planifiées à
une par jour et refuse le déploiement à la création si la cadence est plus fine. Le
déclencheur vit dans `.github/workflows/reminders.yml`, toutes les quinze minutes, avec
`CRON_SECRET` partagé. L'endpoint reste idempotent, ce qui absorbe l'irrégularité du
planificateur GitHub. Passer au plan Pro permettrait de revenir au cron natif — la marche à
suivre est dans `vercel.ts`.

**Le dépôt est public.** Le plan Hobby bloque les déploiements Git d'un dépôt privé quand
l'auteur du commit n'est pas reconnu comme contributeur. `SECURITY.md` ne contient donc aucune
adresse en clair et renvoie au signalement privé GitHub.

**Six directions visuelles plutôt que trois.** Les cinq écartées sont conservées sous
`/directions` ; seuls les caractères de « Brume » sont préchargés.

## 5. Secrets à fournir (checklist)

| Variable | Où l'obtenir | Lot |
|---|---|---|
| `AUTH_SECRET` | `npx auth secret` (généré automatiquement) | 3 |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | Google Cloud Console → Identifiants → OAuth 2.0 (redirect `/api/auth/callback/google`) | 3 |
| `TURSO_DATABASE_URL` / `TURSO_AUTH_TOKEN` | `turso db create routin` + `turso db tokens create` | 11 |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | `npx web-push generate-vapid-keys` | 9 |
| `CRON_SECRET` | généré, protège la route de cron | 9 |

Aucune valeur ne sera jamais écrite en clair dans un fichier versionné : `.env.local`
en dev (git-ignoré), `vercel env` en production.

---

## 6. Le skill `bootstrap-nextjs-turso`

Skill global (`~/.claude/skills/`), mode **guidé** : questionnaire court puis exécution.

**Questionnaire d'entrée** — nom du projet · briques (DB / auth / PWA / déploiement) ·
fournisseurs d'auth · avec ou sans shadcn · notifications push ou non.

**Ce qu'il exécute** — scaffold Next.js + TS strict + Tailwind + shadcn ·
Turso/Drizzle câblé (schéma de base, migrations, seed, script de backup) ·
Auth.js avec la procédure Google Cloud Console détaillée · PWA (manifest, icônes,
service worker) · `vercel link` + variables d'env + premier déploiement ·
checklist des secrets à te fournir · démarrage du dev server et vérification.

**Ce qu'il embarque comme savoir** — les pièges rencontrés ici : jour local vs UTC,
mutations qui doivent passer par la file et non par des Server Actions, migrations
Drizzle identiques sur SQLite local et Turso, backup obligatoire avant migration,
redirect URI OAuth à déclarer pour chaque environnement.

---

## 7. Limites assumées en v1

- Mono-utilisateur par compte : pas de partage ni de routines collaboratives.
- Résolution de conflits LWW : une modification simultanée sur deux appareils
  fait gagner la plus récente, sans fusion.
- Pas de tests end-to-end (choix explicite) — la couverture repose sur les tests
  unitaires de la logique métier (52 tests).
- iOS n'accepte le Web Push que si la PWA est installée sur l'écran d'accueil.
