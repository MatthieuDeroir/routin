import { describe, expect, it } from "vitest";
import { ALL_DAYS, WEEKDAYS, maskFromWeekdays } from "../days";
import {
  ANYTIME_SECTION_KEY,
  buildDaySchedule,
  effectiveDaysMask,
  isTaskActiveOn,
} from "../schedule";
import type { Completion, DayMoment, Routine, Task } from "../types";

const LUNDI = "2026-08-17";
const MARDI = "2026-08-18";
const DIMANCHE = "2026-08-23";

const moments: DayMoment[] = [
  { id: "reveil", name: "Réveil", startMinute: 0, endMinute: 480, position: 0 },
  { id: "matin", name: "Matin", startMinute: 480, endMinute: 720, position: 1 },
  { id: "soir", name: "Soir", startMinute: 720, endMinute: 1440, position: 2 },
];

const routineMatin: Routine = {
  id: "r-matin",
  name: "Matin",
  daysMask: WEEKDAYS,
  position: 0,
};

const task = (overrides: Partial<Task> & Pick<Task, "id" | "name">): Task => ({
  routineId: null,
  momentId: null,
  daysMask: null,
  atMinute: null,
  position: 0,
  ...overrides,
});

describe("effectiveDaysMask", () => {
  it("hérite des jours de la routine quand la tâche n'en fixe pas", () => {
    const t = task({ id: "t", name: "Journal", routineId: "r-matin" });
    expect(effectiveDaysMask(t, routineMatin)).toBe(WEEKDAYS);
  });

  it("laisse la tâche surcharger les jours de sa routine", () => {
    const t = task({
      id: "t",
      name: "Sport",
      routineId: "r-matin",
      daysMask: maskFromWeekdays([0, 2, 4]),
    });
    expect(effectiveDaysMask(t, routineMatin)).toBe(maskFromWeekdays([0, 2, 4]));
  });

  it("rend une tâche sans routine ni masque quotidienne", () => {
    expect(effectiveDaysMask(task({ id: "t", name: "Libre" }), null)).toBe(ALL_DAYS);
  });

  it("respecte une surcharge à zéro sans retomber sur la routine", () => {
    const t = task({ id: "t", name: "Suspendue", routineId: "r-matin", daysMask: 0 });
    expect(effectiveDaysMask(t, routineMatin)).toBe(0);
    expect(isTaskActiveOn(t, routineMatin, LUNDI)).toBe(false);
  });
});

describe("buildDaySchedule", () => {
  const tasks: Task[] = [
    task({
      id: "sport",
      name: "Sport",
      routineId: "r-matin",
      daysMask: maskFromWeekdays([0, 2, 4]),
      atMinute: 420, // 7 h → tombe dans « Réveil »
    }),
    task({
      id: "journal",
      name: "Journal",
      routineId: "r-matin",
      atMinute: 540, // 9 h → « Matin »
      position: 1,
    }),
    task({
      id: "vitamines",
      name: "Vitamines",
      routineId: "r-matin",
      momentId: "reveil", // moment sans heure
      position: 2,
    }),
    task({ id: "courses", name: "Courses", daysMask: ALL_DAYS }), // dans la journée
    task({
      id: "lecture",
      name: "Lecture",
      daysMask: ALL_DAYS,
      atMinute: 1260, // 21 h → « Soir »
    }),
  ];

  const completions: Completion[] = [
    { taskId: "journal", day: LUNDI, done: true },
    { taskId: "sport", day: MARDI, done: true },
  ];

  it("place la section « dans la journée » en tête, puis les moments dans l'ordre", () => {
    const schedule = buildDaySchedule({ day: LUNDI, moments, routines: [routineMatin], tasks, completions });
    expect(schedule.sections.map((s) => s.key)).toEqual([
      ANYTIME_SECTION_KEY,
      "reveil",
      "matin",
      "soir",
    ]);
  });

  it("dérive le moment depuis l'heure et ignore momentId", () => {
    const schedule = buildDaySchedule({ day: LUNDI, moments, routines: [routineMatin], tasks, completions });
    const reveil = schedule.sections.find((s) => s.key === "reveil");
    // Sport (7 h) est dérivé dans Réveil alors qu'aucun momentId ne lui est assigné.
    expect(reveil?.entries.map((e) => e.task.id)).toEqual(["sport", "vitamines"]);
  });

  it("ordonne les tâches horodatées avant celles sans heure", () => {
    const schedule = buildDaySchedule({ day: LUNDI, moments, routines: [routineMatin], tasks, completions });
    const reveil = schedule.sections.find((s) => s.key === "reveil");
    expect(reveil?.entries[0].task.atMinute).toBe(420);
    expect(reveil?.entries[1].task.atMinute).toBeNull();
  });

  it("applique la surcharge de jours de la tâche", () => {
    // Sport est mardi hors de son masque [lun, mer, ven] : il disparaît,
    // alors que Journal, qui hérite de la routine en semaine, reste.
    const schedule = buildDaySchedule({ day: MARDI, moments, routines: [routineMatin], tasks, completions });
    const ids = schedule.sections.flatMap((s) => s.entries.map((e) => e.task.id));
    expect(ids).not.toContain("sport");
    expect(ids).toContain("journal");
  });

  it("retire les tâches de la routine le week-end mais garde les tâches libres", () => {
    const schedule = buildDaySchedule({ day: DIMANCHE, moments, routines: [routineMatin], tasks, completions });
    const ids = schedule.sections.flatMap((s) => s.entries.map((e) => e.task.id));
    expect(ids.sort()).toEqual(["courses", "lecture"]);
  });

  it("ne compte les coches que pour le jour demandé", () => {
    const lundi = buildDaySchedule({ day: LUNDI, moments, routines: [routineMatin], tasks, completions });
    expect(lundi.doneCount).toBe(1);
    expect(lundi.totalCount).toBe(5);

    const mardi = buildDaySchedule({ day: MARDI, moments, routines: [routineMatin], tasks, completions });
    // Sport est coché mardi mais n'est plus programmé ce jour-là : il ne compte pas.
    expect(mardi.doneCount).toBe(0);
  });

  it("n'émet pas de section vide", () => {
    const schedule = buildDaySchedule({
      day: LUNDI,
      moments,
      routines: [routineMatin],
      tasks: [task({ id: "courses", name: "Courses", daysMask: ALL_DAYS })],
      completions: [],
    });
    expect(schedule.sections).toHaveLength(1);
    expect(schedule.sections[0].key).toBe(ANYTIME_SECTION_KEY);
  });

  it("retombe sur « dans la journée » si l'heure ne tombe dans aucun moment", () => {
    const schedule = buildDaySchedule({
      day: LUNDI,
      moments: [{ id: "matin", name: "Matin", startMinute: 480, endMinute: 720, position: 0 }],
      routines: [],
      tasks: [task({ id: "nuit", name: "Coucher", daysMask: ALL_DAYS, atMinute: 1380 })],
      completions: [],
    });
    expect(schedule.sections[0].key).toBe(ANYTIME_SECTION_KEY);
  });
});
