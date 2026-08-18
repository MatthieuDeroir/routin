import "server-only";
import type { NudgeDecision } from "./nudge";

const ENDPOINT = "https://api.mistral.ai/v1/chat/completions";
const MODEL = "mistral-small-latest";
const TIMEOUT_MS = 6000;

export interface ComposeContext {
  decision: NudgeDecision;
  firstName: string | null;
  /** Heure locale de l'utilisateur, « 14 h 30 ». */
  localTime: string;
  weekday: string;
  doneCount: number;
  totalCount: number;
  /** Meilleure série en cours parmi ce qui reste à faire, s'il y en a une. */
  streak: { name: string; days: number } | null;
}

export interface NudgeMessage {
  title: string;
  body: string;
}

const PERSONA = `Tu rédiges une notification pour une application de routines quotidiennes.

Ton rôle : celui d'un proche qui a sincèrement envie de voir la personne
réussir. Chaleureux et direct, jamais mièvre, jamais culpabilisant. Tu ne fais
pas la morale, tu ne félicites pas pour rien, tu ne dramatises pas un oubli.

Contraintes de forme, à respecter à la lettre :
- français, tutoiement ;
- « title » : DEUX À QUATRE MOTS, 30 caractères maximum. Ce n'est pas une
  phrase, c'est une accroche. Compte les caractères avant de répondre ;
- « body » : une seule phrase, 100 caractères maximum ;
- nomme une tâche précise dès que c'est possible, avec son intitulé exact ;
- n'emploie QUE les chiffres fournis dans les faits ; ne compte rien
  toi-même, n'additionne rien, n'estime rien ;
- n'invente aucune tâche ni aucune série ;
- le mot « série » ne désigne QUE le champ serie_en_cours, c'est-à-dire un
  nombre de jours consécutifs ; s'il est absent, ne parle pas de série ;
- ne parle jamais de l'application, de notification, d'écran ni de « cocher
  dans l'appli » : parle de ce qu'il y a à faire, pas de l'outil ;
- au plus un emoji, seulement s'il apporte quelque chose ;
- pas de point d'exclamation en rafale, pas de majuscules d'insistance ;
- si une série est en cours, c'est le meilleur levier : nomme-la.

Exemples de forme attendue :
{"title": "Encore la lecture", "body": "Vingt minutes et ta série de 12 jours tient une nuit de plus."}
{"title": "On s'y met ?", "body": "Rien de commencé pour l'instant — les étirements suffiraient à lancer la journée."}

Réponds uniquement par un objet JSON : {"title": "...", "body": "..."}`;

function describeReason(reason: NudgeDecision["reason"]): string {
  switch (reason) {
    case "demarrage":
      return "La journée a commencé et rien n'est encore coché. Donne l'impulsion, sans reproche.";
    case "relance":
      return "Milieu d'après-midi, plus de la moitié de la journée reste à faire. Propose de reprendre par une chose précise.";
    case "cloture":
      return "La soirée approche, il reste des choses en suspens. C'est le moment de finir, ou de tenir les directives.";
  }
}

/** Repli déterministe : la notification part même si le modèle est indisponible. */
export function fallbackMessage(context: ComposeContext): NudgeMessage {
  const { decision, doneCount, totalCount } = context;
  const first = decision.remaining[0]?.task.name;
  const directive = decision.pendingDirectives[0]?.task.name;

  if (decision.reason === "demarrage") {
    return {
      title: "On démarre ?",
      body: first ? `Rien de coché pour l’instant. Commence par « ${first} ».` : "Ta journée t’attend.",
    };
  }

  if (decision.reason === "relance") {
    return {
      title: "Il reste du temps",
      body: `${doneCount} sur ${totalCount} de fait${first ? `. La suite : « ${first} »` : ""}.`,
    };
  }

  return {
    title: "Avant de refermer",
    body: directive
      ? `Une directive à valider : « ${directive} ».`
      : first
        ? `Il reste « ${first} » — encore le temps.`
        : `${doneCount} sur ${totalCount} aujourd’hui.`,
  };
}

/**
 * Ramène une chaîne sous sa limite.
 *
 * On ne tronque jamais en plein mot : un titre coupé par des points de
 * suspension a l'air cassé, et une notification qui a l'air cassée décrédibilise
 * tout le reste. On retire des mots entiers, et si la phrase n'y survit pas, on
 * reprend le texte de repli — mieux vaut une formulation banale qu'un moignon.
 */
function clamp(value: unknown, max: number, fallback: string): string {
  if (typeof value !== "string") return fallback;

  const trimmed = value.trim().replace(/\s+/g, " ");
  if (!trimmed) return fallback;
  if (trimmed.length <= max) return trimmed;

  const words = trimmed.split(" ");
  while (words.length > 1 && words.join(" ").length > max) words.pop();

  const shortened = words.join(" ").replace(/[,;:]$/, "");
  return shortened.length <= max && words.length > 1 ? shortened : fallback;
}

/**
 * Rédige la relance avec Mistral Small, en repliant sur un texte fixe au
 * moindre problème.
 *
 * Le modèle ne décide jamais **s'il faut** notifier — cette décision est prise
 * en amont, sur des règles vérifiables. Il ne choisit que la formulation, et
 * son échec ne peut donc coûter qu'un message moins bien tourné.
 */
export async function composeNudge(context: ComposeContext): Promise<NudgeMessage> {
  const fallback = fallbackMessage(context);
  const apiKey = process.env.MISTRAL_API_KEY;
  if (!apiKey) return fallback;

  // Tous les chiffres sont fournis calculés : laisser le modèle les déduire
  // d'une liste, c'est l'inviter à se tromper — et un rappel qui annonce quatre
  // tâches quand il en reste trois perd toute autorité.
  const facts = {
    prenom: context.firstName,
    jour: context.weekday,
    heure_locale: context.localTime,
    situation: describeReason(context.decision.reason),
    deja_cochees_aujourdhui: context.doneCount,
    total_prevu_aujourdhui: context.totalCount,
    nombre_restant:
      context.decision.remaining.length + context.decision.pendingDirectives.length,
    reste_a_faire: context.decision.remaining.slice(0, 6).map((e) => e.task.name),
    directives_en_suspens: context.decision.pendingDirectives
      .slice(0, 4)
      .map((e) => e.task.name),
    serie_en_cours: context.streak,
  };

  try {
    const response = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.7,
        max_tokens: 200,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: PERSONA },
          { role: "user", content: JSON.stringify(facts, null, 1) },
        ],
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    if (!response.ok) throw new Error(`mistral ${response.status}`);

    const payload = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const raw = payload.choices?.[0]?.message?.content;
    if (!raw) throw new Error("réponse vide");

    const parsed = JSON.parse(raw) as { title?: unknown; body?: unknown };
    return {
      title: clamp(parsed.title, 30, fallback.title),
      body: clamp(parsed.body, 100, fallback.body),
    };
  } catch (error) {
    console.error("[routin] rédaction du rappel indisponible", error);
    return fallback;
  }
}
