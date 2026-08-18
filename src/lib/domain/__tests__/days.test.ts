import { describe, expect, it } from "vitest";
import {
  ALL_DAYS,
  WEEKDAYS,
  WEEKEND,
  addDays,
  dayRange,
  daysBetween,
  describeMask,
  maskFromWeekdays,
  maskHasDay,
  today,
  toDayString,
  toggleDay,
  weekdayOf,
  weekdaysFromMask,
} from "../days";

describe("weekdayOf", () => {
  it("indexe lundi à 0 et dimanche à 6", () => {
    expect(weekdayOf("2026-08-17")).toBe(0); // lundi
    expect(weekdayOf("2026-08-23")).toBe(6); // dimanche
  });

  it("rejette un format autre que YYYY-MM-DD", () => {
    expect(() => weekdayOf("17/08/2026")).toThrow();
  });
});

describe("toDayString", () => {
  it("rend la date locale, pas la date UTC", () => {
    // 22 h 30 UTC un 18 août, c'est déjà le 19 à Paris (UTC+2 en été).
    const instant = new Date("2026-08-18T22:30:00Z");
    expect(toDayString(instant, "Europe/Paris")).toBe("2026-08-19");
    expect(toDayString(instant, "UTC")).toBe("2026-08-18");
  });

  it("gère un fuseau en retard sur UTC", () => {
    // 02 h 00 UTC le 19, c'est encore le 18 à Los Angeles.
    const instant = new Date("2026-08-19T02:00:00Z");
    expect(toDayString(instant, "America/Los_Angeles")).toBe("2026-08-18");
  });

  it("today() délègue au fuseau fourni", () => {
    const instant = new Date("2026-01-01T00:30:00Z");
    expect(today("Europe/Paris", instant)).toBe("2026-01-01");
    expect(today("America/New_York", instant)).toBe("2025-12-31");
  });
});

describe("addDays", () => {
  it("franchit les fins de mois et d'année", () => {
    expect(addDays("2026-08-31", 1)).toBe("2026-09-01");
    expect(addDays("2026-01-01", -1)).toBe("2025-12-31");
    expect(addDays("2024-02-28", 1)).toBe("2024-02-29"); // année bissextile
  });

  it("n'est pas perturbé par un changement d'heure", () => {
    // Passage à l'heure d'été en France dans la nuit du 28 au 29 mars 2026 :
    // un calcul en heures locales décalerait d'un jour, pas un calcul civil.
    expect(addDays("2026-03-28", 1)).toBe("2026-03-29");
    expect(addDays("2026-10-24", 1)).toBe("2026-10-25");
  });
});

describe("daysBetween / dayRange", () => {
  it("compte les jours dans les deux sens", () => {
    expect(daysBetween("2026-08-17", "2026-08-20")).toBe(3);
    expect(daysBetween("2026-08-20", "2026-08-17")).toBe(-3);
  });

  it("produit une plage inclusive", () => {
    expect(dayRange("2026-08-17", "2026-08-19")).toEqual([
      "2026-08-17",
      "2026-08-18",
      "2026-08-19",
    ]);
    expect(dayRange("2026-08-19", "2026-08-17")).toEqual([]);
  });
});

describe("bitmask des jours", () => {
  it("compose et décompose un masque", () => {
    const mask = maskFromWeekdays([0, 2, 4]); // lun, mer, ven
    expect(maskHasDay(mask, 0)).toBe(true);
    expect(maskHasDay(mask, 1)).toBe(false);
    expect(weekdaysFromMask(mask)).toEqual([0, 2, 4]);
  });

  it("bascule un jour sans toucher aux autres", () => {
    expect(weekdaysFromMask(toggleDay(WEEKDAYS, 5))).toEqual([0, 1, 2, 3, 4, 5]);
    expect(weekdaysFromMask(toggleDay(WEEKDAYS, 0))).toEqual([1, 2, 3, 4]);
  });

  it("décrit les masques courants en français", () => {
    expect(describeMask(ALL_DAYS)).toBe("tous les jours");
    expect(describeMask(WEEKDAYS)).toBe("en semaine");
    expect(describeMask(WEEKEND)).toBe("le week-end");
    expect(describeMask(0)).toBe("jamais");
    expect(describeMask(maskFromWeekdays([0, 2]))).toBe("lun. mer.");
  });
});
