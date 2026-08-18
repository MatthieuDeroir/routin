import { describe, expect, it } from "vitest";
import {
  formatMinute,
  momentAtMinute,
  normalizeMoments,
  sortMoments,
  validateMoments,
} from "../moments";
import type { DayMoment } from "../types";

const moment = (
  id: string,
  name: string,
  startMinute: number,
  endMinute: number,
  position = 0,
): DayMoment => ({ id, name, startMinute, endMinute, position });

const journeeComplete: DayMoment[] = [
  moment("m1", "Réveil", 0, 480, 0),
  moment("m2", "Matin", 480, 720, 1),
  moment("m3", "Midi", 720, 840, 2),
  moment("m4", "Après-midi", 840, 1140, 3),
  moment("m5", "Soir", 1140, 1440, 4),
];

describe("formatMinute", () => {
  it("formate à la française", () => {
    expect(formatMinute(420)).toBe("7 h");
    expect(formatMinute(425)).toBe("7 h 05");
    expect(formatMinute(0)).toBe("0 h");
  });
});

describe("momentAtMinute", () => {
  it("range une heure dans le moment qui la contient", () => {
    expect(momentAtMinute(journeeComplete, 420)?.name).toBe("Réveil");
    expect(momentAtMinute(journeeComplete, 540)?.name).toBe("Matin");
    expect(momentAtMinute(journeeComplete, 1260)?.name).toBe("Soir");
  });

  it("traite la borne de début comme incluse et celle de fin comme exclue", () => {
    expect(momentAtMinute(journeeComplete, 480)?.id).toBe("m2");
    expect(momentAtMinute(journeeComplete, 479)?.id).toBe("m1");
  });

  it("suit un déplacement de frontière sans toucher aux tâches", () => {
    // 7 h appartient au Réveil ; on avance la frontière à 6 h et la même
    // tâche bascule dans le Matin, sans qu'aucune donnée de tâche ne change.
    const deplace = [
      moment("m1", "Réveil", 0, 360, 0),
      moment("m2", "Matin", 360, 720, 1),
      ...journeeComplete.slice(2),
    ];
    expect(momentAtMinute(deplace, 420)?.name).toBe("Matin");
  });

  it("rend null si aucun moment ne contient l'heure", () => {
    expect(momentAtMinute([moment("m1", "Matin", 480, 720)], 60)).toBeNull();
  });
});

describe("sortMoments", () => {
  it("ordonne par heure de début", () => {
    const desordre = [journeeComplete[3], journeeComplete[0], journeeComplete[2]];
    expect(sortMoments(desordre).map((m) => m.id)).toEqual(["m1", "m3", "m4"]);
  });
});

describe("validateMoments", () => {
  it("accepte une journée entièrement couverte", () => {
    expect(validateMoments(journeeComplete)).toEqual([]);
  });

  it("signale une liste vide", () => {
    expect(validateMoments([])[0].code).toBe("empty");
  });

  it("détecte un trou", () => {
    const avecTrou = [moment("a", "Matin", 0, 600), moment("b", "Soir", 700, 1440)];
    expect(validateMoments(avecTrou).map((i) => i.code)).toContain("gap");
  });

  it("détecte un chevauchement", () => {
    const chevauchant = [
      moment("a", "Matin", 0, 700),
      moment("b", "Soir", 600, 1440),
    ];
    expect(validateMoments(chevauchant).map((i) => i.code)).toContain("overlap");
  });

  it("exige une couverture de 0 h à minuit", () => {
    const partiel = [moment("a", "Matin", 480, 1440)];
    expect(validateMoments(partiel).map((i) => i.code)).toContain(
      "incomplete-coverage",
    );
  });

  it("détecte des bornes inversées", () => {
    const inverse = [moment("a", "Bizarre", 800, 400), moment("b", "Reste", 0, 1440)];
    expect(validateMoments(inverse).map((i) => i.code)).toContain("invalid-range");
  });
});

describe("normalizeMoments", () => {
  it("recolle les bornes et couvre la journée entière", () => {
    const bancal = [
      moment("a", "Matin", 30, 600, 5),
      moment("b", "Soir", 700, 1400, 2),
    ];
    const normalise = normalizeMoments(bancal);
    expect(normalise.map((m) => [m.startMinute, m.endMinute])).toEqual([
      [0, 600],
      [600, 1440],
    ]);
    expect(normalise.map((m) => m.position)).toEqual([0, 1]);
    expect(validateMoments(normalise)).toEqual([]);
  });
});
