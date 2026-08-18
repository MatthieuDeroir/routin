import { describe, expect, it } from "vitest";
import { mergeRows, visible } from "../merge";
import type { Snapshot } from "../types";

const row = (id: string, updatedAt: number, name = id) => ({ id, updatedAt, name });

describe("mergeRows", () => {
  it("garde la version la plus récente", () => {
    const merged = mergeRows(
      [row("a", 100, "local"), row("b", 500, "local")],
      [row("a", 200, "serveur"), row("b", 300, "serveur")],
    );
    expect(merged.find((r) => r.id === "a")?.name).toBe("serveur");
    expect(merged.find((r) => r.id === "b")?.name).toBe("local");
  });

  it("conserve le local à égalité d'horodatage", () => {
    const merged = mergeRows([row("a", 100, "local")], [row("a", 100, "serveur")]);
    expect(merged[0].name).toBe("local");
  });

  it("ajoute les entités inconnues du local", () => {
    const merged = mergeRows([row("a", 100)], [row("b", 50)]);
    expect(merged.map((r) => r.id).sort()).toEqual(["a", "b"]);
  });

  it("n'écrase pas une création locale absente du serveur", () => {
    const merged = mergeRows([row("nouveau", 900)], []);
    expect(merged).toHaveLength(1);
  });
});

describe("visible", () => {
  it("retire les entités supprimées logiquement", () => {
    const snapshot = {
      moments: [
        { id: "m1", updatedAt: 1, deletedAt: null },
        { id: "m2", updatedAt: 1, deletedAt: 1700 },
      ],
      routines: [],
      tasks: [{ id: "t1", updatedAt: 1, deletedAt: 1700 }],
      completions: [{ id: "c1", updatedAt: 1 }],
    } as unknown as Snapshot;

    const result = visible(snapshot);
    expect(result.moments.map((m) => m.id)).toEqual(["m1"]);
    expect(result.tasks).toEqual([]);
    // Les coches n'ont pas de suppression logique : décocher, c'est `done: false`.
    expect(result.completions).toHaveLength(1);
  });
});
