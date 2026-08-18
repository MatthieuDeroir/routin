import { describe, expect, it } from "vitest";
import { buildDaySchedule } from "../schedule";
import type { Completion, Routine, Task } from "../types";
import { chooseNudge, type NudgeReason } from "@/lib/push/nudge";

const JOUR = "2026-08-18";

const routine: Routine = { id: "r", name: "Matin", daysMask: 127, position: 0 };

const task = (id: string, kind: Task["kind"] = "task"): Task => ({
  id,
  routineId: kind === "directive" ? null : "r",
  kind,
  name: id,
  daysMask: 127,
  atMinute: null,
  position: 0,
  activeFrom: null,
  activeUntil: null,
});

function schedule(tasks: Task[], done: string[] = []) {
  const completions: Completion[] = done.map((taskId) => ({
    taskId,
    day: JOUR,
    done: true,
  }));
  return buildDaySchedule({ day: JOUR, routines: [routine], tasks, completions });
}

const context = (over: Partial<Parameters<typeof chooseNudge>[0]> = {}) => ({
  schedule: schedule([task("a"), task("b")]),
  nowMinute: 10 * 60,
  alreadySent: new Set<NudgeReason>(),
  minutesSinceLast: null,
  ...over,
});

describe("chooseNudge", () => {
  it("relance au démarrage quand la matinée avance sans rien de coché", () => {
    expect(chooseNudge(context())?.reason).toBe("demarrage");
  });

  it("se tait avant l'heure de démarrage", () => {
    expect(chooseNudge(context({ nowMinute: 8 * 60 }))).toBeNull();
  });

  it("se tait pendant les heures de silence", () => {
    expect(chooseNudge(context({ nowMinute: 6 * 60 }))).toBeNull();
    expect(chooseNudge(context({ nowMinute: 23 * 60 }))).toBeNull();
  });

  it("se tait quand la journée est bouclée", () => {
    const done = schedule([task("a"), task("b")], ["a", "b"]);
    expect(chooseNudge(context({ schedule: done, nowMinute: 21 * 60 }))).toBeNull();
  });

  it("se tait s'il n'y a rien de prévu", () => {
    expect(chooseNudge(context({ schedule: schedule([]) }))).toBeNull();
  });

  it("respecte l'écart minimal entre deux relances", () => {
    expect(chooseNudge(context({ minutesSinceLast: 30 }))).toBeNull();
    expect(chooseNudge(context({ minutesSinceLast: 200 }))?.reason).toBe("demarrage");
  });

  it("n'utilise jamais deux fois la même intention", () => {
    const sent = new Set<NudgeReason>(["demarrage"]);
    // Rien n'est coché, mais le démarrage a déjà servi : on attend l'après-midi.
    expect(chooseNudge(context({ alreadySent: sent }))).toBeNull();
    expect(
      chooseNudge(context({ alreadySent: sent, nowMinute: 15 * 60 }))?.reason,
    ).toBe("relance");
  });

  it("ne relance pas l'après-midi si la journée est à plus de la moitié", () => {
    const avance = schedule([task("a"), task("b"), task("c")], ["a", "b"]);
    expect(
      chooseNudge(context({ schedule: avance, nowMinute: 15 * 60 })),
    ).toBeNull();
  });

  it("clôture le soir sur les directives encore en suspens", () => {
    const soir = schedule([task("a"), task("d", "directive")], ["a"]);
    const decision = chooseNudge(context({ schedule: soir, nowMinute: 21 * 60 }));
    expect(decision?.reason).toBe("cloture");
    expect(decision?.pendingDirectives.map((entry) => entry.task.id)).toEqual(["d"]);
    expect(decision?.remaining).toEqual([]);
  });
});
