# Politique de sécurité

Routin est une application personnelle de suivi de routines. Elle manipule des
données de compte Google (identité) et des données d'usage quotidien : toute
faille touchant l'authentification ou l'isolation entre comptes est considérée
comme critique.

## Versions supportées

| Version | Supportée |
| ------- | :-------: |
| `main` (déploiement en cours) | ✅ |
| Déploiements antérieurs | ❌ |

Seule la version déployée depuis `main` reçoit des correctifs ; il n'y a pas de
branche de maintenance.

## Signaler une vulnérabilité

Merci de **ne pas** ouvrir d'issue publique pour une vulnérabilité de sécurité.

Deux canaux, par ordre de préférence :

1. **GitHub Private Vulnerability Reporting** — onglet *Security* du dépôt,
   bouton *Report a vulnerability*. C'est le canal privilégié : le fil reste
   privé et l'historique est attaché au dépôt.
2. **Courriel** — matthieu.deroir@gmail.com

Merci d'inclure :
- une description de la vulnérabilité et de son impact potentiel,
- les étapes pour la reproduire,
- la version ou le commit concerné.

Délai de réponse visé : 72 h pour un premier accusé de réception. Correctif
visé selon la sévérité : Critical sous 7 jours, High sous 30 jours, Medium/Low
au fil de l'eau.
