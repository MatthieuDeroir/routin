/** Date locale au format « YYYY-MM-DD ». Jamais un instant UTC. */
export type DayString = string;

/** Bitmask des jours actifs : bit 0 = lundi … bit 6 = dimanche. */
export type DaysMask = number;

/** Index de jour de semaine, 0 = lundi … 6 = dimanche. */
export type WeekdayIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/**
 * Une routine est à la fois le groupe et le moment de la journée : « Matin »
 * nomme le bloc et sa place. `position` porte l'ordre de la journée.
 *
 * `startMinute` / `endMinute` bornent ce moment dans la journée (minutes
 * depuis minuit) : c'est ce qui permet au repère « maintenant » de savoir dans
 * quel bloc on se trouve même quand aucune tâche n'y porte d'heure précise.
 * `null` sur l'un des deux signifie « pas de créneau défini » — une routine
 * personnalisée peut très bien n'en avoir aucun.
 */
export interface Routine {
  id: string;
  name: string;
  emoji?: string | null;
  color?: string | null;
  daysMask: DaysMask;
  position: number;
  startMinute?: number | null;
  endMinute?: number | null;
}

/**
 * Deux polarités, pas deux natures d'objet :
 * `task` — ce qu'il FAUT faire, éventuellement à une heure précise ;
 * `directive` — ce qu'il faut ÉVITER de faire sur la journée entière, sans
 * routine ni heure, qu'on valide le soir comme tenu ou non.
 */
export type TaskKind = "task" | "directive";

export interface Task {
  id: string;
  /** `null` = la tâche est « dans la journée », sans routine. */
  routineId: string | null;
  kind: TaskKind;
  name: string;
  notes?: string | null;
  /** `null` = hérite de la routine. */
  daysMask: DaysMask | null;
  /** Minutes depuis minuit ; trie la tâche en tête de son bloc. */
  atMinute: number | null;
  position: number;

  /**
   * Période de validité de la tâche.
   *
   * Créer une tâche aujourd'hui ne doit pas la faire apparaître dans les
   * journées passées, et la retirer ne doit pas l'effacer de celles où elle a
   * réellement existé : l'historique et les séries seraient faux. `null` des
   * deux côtés signifie « a toujours existé » et « existe toujours ».
   */
  activeFrom: DayString | null;
  activeUntil: DayString | null;
}

export interface Completion {
  taskId: string;
  day: DayString;
  done: boolean;
}
