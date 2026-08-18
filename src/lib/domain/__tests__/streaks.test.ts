import { describe, expect, it } from "vitest";
import { ALL_DAYS, maskFromWeekdays } from "../days";
import { buildHeatmap, computeTaskStats } from "../streaks";
import type { Completion, Routine, Task } from "../types";

const LUNDI_MASK = maskFromWeekdays([0]);

const quotidienne: Task = {
  id: "quot",
  routineId: null,
  kind: "task",
  name: "Lecture",
  daysMask: ALL_DAYS,
  atMinute: null,
  position: 0,
  activeFrom: null,
  activeUntil: null,
};

const hebdo: Task = {
  id: "hebdo",
  routineId: null,
  kind: "task",
  name: "Grand ménage",
  daysMask: LUNDI_MASK,
  atMinute: null,
  position: 0,
  activeFrom: null,
  activeUntil: null,
};

const done = (taskId: string, days: string[]): Completion[] =>
  days.map((day) => ({ taskId, day, done: true }));

describe("computeTaskStats", () => {
  it("compte une série quotidienne ininterrompue", () => {
    const stats = computeTaskStats({
      task: quotidienne,
      routine: null,
      completions: done("quot", ["2026-08-15", "2026-08-16", "2026-08-17"]),
      from: "2026-08-15",
      to: "2026-08-17",
    });
    expect(stats.current).toBe(3);
    expect(stats.best).toBe(3);
    expect(stats.rate).toBe(1);
  });

  it("casse la série sur un jour actif manqué", () => {
    const stats = computeTaskStats({
      task: quotidienne,
      routine: null,
      completions: done("quot", ["2026-08-15", "2026-08-17"]),
      from: "2026-08-15",
      to: "2026-08-17",
    });
    expect(stats.current).toBe(1);
    expect(stats.best).toBe(1);
  });

  it("ne casse pas la série sur un jour où la tâche n'est pas programmée", () => {
    // Tâche du lundi uniquement : les six autres jours ne doivent rien casser.
    const stats = computeTaskStats({
      task: hebdo,
      routine: null,
      completions: done("hebdo", ["2026-08-03", "2026-08-10", "2026-08-17"]),
      from: "2026-08-03",
      to: "2026-08-17",
    });
    expect(stats.current).toBe(3);
    expect(stats.activeCount).toBe(3);
  });

  it("ne casse pas la série tant que la journée en cours n'est pas finie", () => {
    const stats = computeTaskStats({
      task: quotidienne,
      routine: null,
      completions: done("quot", ["2026-08-15", "2026-08-16"]),
      from: "2026-08-15",
      to: "2026-08-17", // aujourd'hui, pas encore coché
    });
    expect(stats.current).toBe(2);
  });

  it("conserve la meilleure série même une fois rompue", () => {
    const stats = computeTaskStats({
      task: quotidienne,
      routine: null,
      completions: done("quot", [
        "2026-08-10",
        "2026-08-11",
        "2026-08-12",
        "2026-08-13",
        "2026-08-16",
      ]),
      from: "2026-08-10",
      to: "2026-08-16",
    });
    expect(stats.best).toBe(4);
    expect(stats.current).toBe(1);
  });

  it("ignore les coches d'une autre tâche", () => {
    const stats = computeTaskStats({
      task: quotidienne,
      routine: null,
      completions: done("autre", ["2026-08-15", "2026-08-16"]),
      from: "2026-08-15",
      to: "2026-08-16",
    });
    expect(stats.doneCount).toBe(0);
    expect(stats.rate).toBe(0);
  });

  it("rend un taux nul plutôt qu'une division par zéro sans jour actif", () => {
    const stats = computeTaskStats({
      task: { ...quotidienne, daysMask: 0 },
      routine: null,
      completions: [],
      from: "2026-08-15",
      to: "2026-08-17",
    });
    expect(stats.activeCount).toBe(0);
    expect(stats.rate).toBe(0);
  });

  it("suit les jours de la routine quand la tâche hérite", () => {
    const routine: Routine = {
      id: "r",
      name: "Semaine",
      daysMask: maskFromWeekdays([0, 1, 2, 3, 4]),
      position: 0,
    };
    const heritee: Task = { ...quotidienne, id: "h", daysMask: null, routineId: "r" };
    const stats = computeTaskStats({
      task: heritee,
      routine,
      completions: done("h", ["2026-08-17", "2026-08-18"]),
      from: "2026-08-15", // samedi
      to: "2026-08-18", // mardi
    });
    // Samedi et dimanche ne sont pas des jours actifs : 2 jours actifs, 2 validés.
    expect(stats.activeCount).toBe(2);
    expect(stats.current).toBe(2);
  });
});

describe("buildHeatmap", () => {
  it("rend un ratio par jour sur la plage demandée", () => {
    const cells = buildHeatmap({
      from: "2026-08-17",
      to: "2026-08-19",
      routines: [],
      tasks: [quotidienne, hebdo],
      completions: done("quot", ["2026-08-17", "2026-08-18"]),
    });

    expect(cells.map((c) => c.day)).toEqual([
      "2026-08-17",
      "2026-08-18",
      "2026-08-19",
    ]);
    // Lundi : 2 tâches actives, 1 validée.
    expect(cells[0]).toMatchObject({ done: 1, total: 2, ratio: 0.5 });
    // Mardi : seule la quotidienne est active, et elle est validée.
    expect(cells[1]).toMatchObject({ done: 1, total: 1, ratio: 1 });
    // Mercredi : active mais non validée.
    expect(cells[2]).toMatchObject({ done: 0, total: 1, ratio: 0 });
  });

  it("ne compte pas une coche portant sur un jour inactif", () => {
    const cells = buildHeatmap({
      from: "2026-08-18",
      to: "2026-08-18",
      routines: [],
      tasks: [hebdo],
      completions: done("hebdo", ["2026-08-18"]), // un mardi
    });
    expect(cells[0]).toMatchObject({ done: 0, total: 0, ratio: 0 });
  });
});
