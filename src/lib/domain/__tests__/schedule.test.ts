import { describe, expect, it } from "vitest";
import { ALL_DAYS, WEEKDAYS, maskFromWeekdays } from "../days";
import {
  ANYTIME_KEY,
  DIRECTIVES_KEY,
  buildDaySchedule,
  effectiveDaysMask,
  endTask,
  isTaskActiveOn,
  locateNowMarker,
} from "../schedule";
import type { Completion, Routine, Task } from "../types";

const LUNDI = "2026-08-17";
const MARDI = "2026-08-18";
const DIMANCHE = "2026-08-23";

const routine = (
  id: string,
  name: string,
  position: number,
  daysMask = ALL_DAYS,
): Routine => ({ id, name, daysMask, position });

const matin = routine("r-matin", "Matin", 1, WEEKDAYS);
const soir = routine("r-soir", "Soir", 2);

const task = (overrides: Partial<Task> & Pick<Task, "id" | "name">): Task => ({
  routineId: null,
  kind: "task",
  daysMask: null,
  atMinute: null,
  position: 0,
  activeFrom: null,
  activeUntil: null,
  ...overrides,
});

describe("effectiveDaysMask", () => {
  it("hérite des jours de la routine quand la tâche n'en fixe pas", () => {
    expect(effectiveDaysMask(task({ id: "t", name: "Journal", routineId: "r-matin" }), matin)).toBe(
      WEEKDAYS,
    );
  });

  it("laisse la tâche surcharger les jours de sa routine", () => {
    const t = task({
      id: "t",
      name: "Sport",
      routineId: "r-matin",
      daysMask: maskFromWeekdays([0, 2, 4]),
    });
    expect(effectiveDaysMask(t, matin)).toBe(maskFromWeekdays([0, 2, 4]));
  });

  it("rend une tâche sans routine ni masque quotidienne", () => {
    expect(effectiveDaysMask(task({ id: "t", name: "Libre" }), null)).toBe(ALL_DAYS);
  });

  it("respecte une surcharge à zéro sans retomber sur la routine", () => {
    const t = task({ id: "t", name: "Suspendue", routineId: "r-matin", daysMask: 0 });
    expect(effectiveDaysMask(t, matin)).toBe(0);
    expect(isTaskActiveOn(t, matin, LUNDI)).toBe(false);
  });
});

describe("buildDaySchedule", () => {
  const routines = [soir, matin]; // volontairement désordonnées
  const tasks: Task[] = [
    task({ id: "etirements", name: "Étirements", routineId: "r-matin", atMinute: 420 }),
    task({ id: "journal", name: "Journal", routineId: "r-matin", position: 1 }),
    task({ id: "eau", name: "Boire de l’eau", routineId: "r-matin", atMinute: 400 }),
    task({ id: "lecture", name: "Lecture", routineId: "r-soir", atMinute: 1260 }),
    task({ id: "courses", name: "Courses", daysMask: ALL_DAYS }),
    task({ id: "cafe", name: "Pas de caféine après 11 h 30", kind: "directive", daysMask: ALL_DAYS }),
  ];
  const completions: Completion[] = [
    { taskId: "journal", day: LUNDI, done: true },
    { taskId: "etirements", day: MARDI, done: true },
  ];

  it("ouvre par les directives, puis « dans la journée », puis les routines dans l'ordre", () => {
    const schedule = buildDaySchedule({ day: LUNDI, routines, tasks, completions });
    expect(schedule.sections.map((section) => section.key)).toEqual([
      DIRECTIVES_KEY,
      ANYTIME_KEY,
      "r-matin",
      "r-soir",
    ]);
  });

  it("trie les tâches horodatées à l'heure, les autres à la suite", () => {
    const schedule = buildDaySchedule({ day: LUNDI, routines, tasks, completions });
    const bloc = schedule.sections.find((section) => section.key === "r-matin");
    expect(bloc?.entries.map((entry) => entry.task.id)).toEqual([
      "eau", // 6 h 40
      "etirements", // 7 h
      "journal", // sans heure
    ]);
  });

  it("sort une directive de sa routine même si on lui en assigne une", () => {
    const schedule = buildDaySchedule({
      day: LUNDI,
      routines,
      tasks: [task({ id: "d", name: "Pas d’écran le soir", kind: "directive", routineId: "r-soir", daysMask: ALL_DAYS })],
      completions: [],
    });
    expect(schedule.sections.map((section) => section.key)).toEqual([DIRECTIVES_KEY]);
  });

  it("retire les routines inactives ce jour-là sans toucher aux tâches libres", () => {
    const schedule = buildDaySchedule({ day: DIMANCHE, routines, tasks, completions });
    const ids = schedule.sections.flatMap((section) =>
      section.entries.map((entry) => entry.task.id),
    );
    // « Matin » est en semaine : dimanche il disparaît avec ses tâches.
    expect(ids.sort()).toEqual(["cafe", "courses", "lecture"]);
  });

  it("ne compte les coches que pour le jour demandé", () => {
    const lundi = buildDaySchedule({ day: LUNDI, routines, tasks, completions });
    expect(lundi.doneCount).toBe(1);
    expect(lundi.totalCount).toBe(6);

    const mardi = buildDaySchedule({ day: MARDI, routines, tasks, completions });
    expect(mardi.doneCount).toBe(1);
  });

  it("n'émet aucune section vide", () => {
    const schedule = buildDaySchedule({
      day: LUNDI,
      routines,
      tasks: [task({ id: "courses", name: "Courses", daysMask: ALL_DAYS })],
      completions: [],
    });
    expect(schedule.sections).toHaveLength(1);
    expect(schedule.sections[0].key).toBe(ANYTIME_KEY);
  });
});

describe("locateNowMarker", () => {
  const bloc = (id: string, position: number): Routine => ({
    id,
    name: id,
    daysMask: ALL_DAYS,
    position,
  });

  const timed = (id: string, routineId: string, atMinute: number): Task =>
    task({ id, name: id, routineId, atMinute, daysMask: ALL_DAYS });

  const routines = [bloc("matin", 0), bloc("soir", 1)];
  const tasks = [
    timed("eau", "matin", 400),
    timed("sport", "matin", 420),
    timed("lecture", "soir", 1260),
  ];

  const at = (minute: number | null) =>
    locateNowMarker(buildDaySchedule({ day: LUNDI, routines, tasks, completions: [] }), minute);

  it("se pose avant la prochaine tâche horodatée", () => {
    expect(at(410)).toEqual({ sectionKey: "matin", index: 1 });
    expect(at(900)).toEqual({ sectionKey: "soir", index: 0 });
  });

  it("ferme la dernière section quand toutes les heures sont passées", () => {
    expect(at(1400)).toEqual({ sectionKey: "soir", index: 1 });
  });

  it("s'efface quand on ne regarde pas aujourd'hui", () => {
    expect(at(null)).toBeNull();
  });

  it("ne traverse ni les directives ni « dans la journée »", () => {
    const schedule = buildDaySchedule({
      day: LUNDI,
      routines: [],
      tasks: [
        task({ id: "libre", name: "Courses", daysMask: ALL_DAYS }),
        task({ id: "regle", name: "Pas de caféine", kind: "directive", daysMask: ALL_DAYS }),
      ],
      completions: [],
    });
    expect(locateNowMarker(schedule, 600)).toBeNull();
  });
});

describe("locateNowMarker avec créneaux horaires", () => {
  const windowed = (
    id: string,
    position: number,
    startMinute: number,
    endMinute: number,
  ): Routine => ({ id, name: id, daysMask: ALL_DAYS, position, startMinute, endMinute });

  const matin = windowed("matin", 0, 8 * 60, 12 * 60);
  const apresMidi = windowed("apres-midi", 1, 14 * 60, 19 * 60);
  const soir = windowed("soir", 2, 19 * 60, 24 * 60);

  it("se pose dans le bloc dont le créneau contient l'heure actuelle, même sans tâche horodatée dedans", () => {
    // Seule tâche horodatée de la journée : à 19 h, dans « Soir ». Il est 9 h.
    const tasks = [
      task({ id: "medicament", name: "Médicament", routineId: "soir", atMinute: 19 * 60 }),
      task({ id: "etirements", name: "Étirements", routineId: "matin" }),
    ];
    const schedule = buildDaySchedule({
      day: LUNDI,
      routines: [matin, apresMidi, soir],
      tasks,
      completions: [],
    });
    // Avant, la barre se serait posée devant « Médicament » dans Soir dès le matin.
    expect(locateNowMarker(schedule, 9 * 60)).toEqual({ sectionKey: "matin", index: 0 });
  });

  it("s'arrête toujours avant la prochaine tâche horodatée de son propre bloc", () => {
    const tasks = [
      task({ id: "eau", name: "Eau", routineId: "matin", atMinute: 9 * 60 }),
      task({ id: "sport", name: "Sport", routineId: "matin", atMinute: 10 * 60 }),
    ];
    const schedule = buildDaySchedule({
      day: LUNDI,
      routines: [matin, apresMidi, soir],
      tasks,
      completions: [],
    });
    expect(locateNowMarker(schedule, 9 * 60 + 30)).toEqual({ sectionKey: "matin", index: 1 });
  });

  it("s'accroche au dernier créneau entamé quand le bloc actif n'a rien aujourd'hui", () => {
    // « Après-midi » (14 h-19 h) est actif à 15 h mais n'a aucune tâche : pas de section.
    const tasks = [task({ id: "medicament", name: "Médicament", routineId: "soir" })];
    const schedule = buildDaySchedule({
      day: LUNDI,
      routines: [matin, apresMidi, soir],
      tasks,
      completions: [],
    });
    expect(locateNowMarker(schedule, 15 * 60)).toEqual({ sectionKey: "soir", index: 0 });
  });

  it("annonce le prochain créneau quand aucun n'est encore entamé", () => {
    const tasks = [task({ id: "medicament", name: "Médicament", routineId: "soir" })];
    const schedule = buildDaySchedule({
      day: LUNDI,
      routines: [apresMidi, soir],
      tasks,
      completions: [],
    });
    expect(locateNowMarker(schedule, 6 * 60)).toEqual({ sectionKey: "soir", index: 0 });
  });

  it("retombe sur l'ancrage par tâche horodatée si aucune routine affichée n'a de créneau", () => {
    const sansCreneau = routine("libre", "Libre", 0);
    const tasks = [task({ id: "lecture", name: "Lecture", routineId: "libre", atMinute: 20 * 60 })];
    const schedule = buildDaySchedule({
      day: LUNDI,
      routines: [sansCreneau],
      tasks,
      completions: [],
    });
    expect(locateNowMarker(schedule, 9 * 60)).toEqual({ sectionKey: "libre", index: 0 });
  });
});

describe("période de validité", () => {
  const bloc: Routine = { id: "r", name: "Matin", daysMask: ALL_DAYS, position: 0 };

  const day = (target: string, tasks: Task[]) =>
    buildDaySchedule({ day: target, routines: [bloc], tasks, completions: [] })
      .sections.flatMap((section) => section.entries.map((entry) => entry.task.id));

  it("n'apparaît pas avant le jour de sa création", () => {
    const nouvelle = task({
      id: "nouvelle",
      name: "Nouvelle",
      daysMask: ALL_DAYS,
      activeFrom: MARDI,
    });
    expect(day(LUNDI, [nouvelle])).toEqual([]);
    expect(day(MARDI, [nouvelle])).toEqual(["nouvelle"]);
  });

  it("reste dans les journées passées après avoir été retirée", () => {
    const retiree = task({
      id: "retiree",
      name: "Retirée",
      daysMask: ALL_DAYS,
      activeUntil: LUNDI,
    });
    expect(day(LUNDI, [retiree])).toEqual(["retiree"]);
    expect(day(MARDI, [retiree])).toEqual([]);
  });

  it("endTask borne au jour précédent, ou supprime si la tâche n'a aucun passé", () => {
    expect(endTask({ activeFrom: LUNDI }, LUNDI)).toEqual({ activeUntil: LUNDI });
    // Créée aujourd'hui puis retirée aujourd'hui : elle n'a jamais eu de journée.
    expect(endTask({ activeFrom: MARDI }, LUNDI)).toEqual({ deleted: true });
    expect(endTask({ activeFrom: null }, LUNDI)).toEqual({ activeUntil: LUNDI });
  });
});
