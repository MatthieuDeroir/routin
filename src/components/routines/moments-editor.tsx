"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FormActions, TextInput } from "@/components/ui/field";
import {
  MINUTES_PER_DAY,
  formatMinute,
  normalizeMoments,
  sortMoments,
  validateMoments,
} from "@/lib/domain";
import { useStore } from "@/lib/store/store";
import type { StoredMoment } from "@/lib/store/types";

function minutesToTime(minute: number): string {
  const clamped = Math.min(minute, MINUTES_PER_DAY - 1);
  return `${String(Math.floor(clamped / 60)).padStart(2, "0")}:${String(clamped % 60).padStart(2, "0")}`;
}

function timeToMinutes(value: string): number {
  const [hours, minutes] = value.split(":").map(Number);
  return (hours || 0) * 60 + (minutes || 0);
}

/**
 * Les moments découpent la journée sans trou ni chevauchement : on ne règle
 * donc que la fin de chacun, le suivant démarrant exactement là. Éditer deux
 * bornes indépendantes laisserait fabriquer des configurations invalides,
 * qu'il faudrait ensuite refuser — autant les rendre impossibles.
 */
export function MomentsEditor() {
  const router = useRouter();
  const { data, ready, saveMoments } = useStore();

  const [draft, setDraft] = useState<StoredMoment[] | null>(null);
  const moments = draft ?? sortMoments(data.moments);

  if (!ready) return null;

  function update(next: StoredMoment[]) {
    setDraft(normalizeMoments(next));
  }

  function setEnd(index: number, value: string) {
    const minute = Math.max(1, Math.min(timeToMinutes(value), MINUTES_PER_DAY - 1));
    update(
      moments.map((moment, i) =>
        i === index ? { ...moment, endMinute: minute } : moment,
      ),
    );
  }

  function setField(index: number, field: "name" | "emoji", value: string) {
    update(
      moments.map((moment, i) =>
        i === index ? { ...moment, [field]: value || null } : moment,
      ),
    );
  }

  function addMoment() {
    const last = moments[moments.length - 1];
    const start = last ? Math.max(0, last.endMinute - 60) : 0;
    update([
      ...moments.map((moment, i) =>
        i === moments.length - 1 ? { ...moment, endMinute: start } : moment,
      ),
      {
        id: crypto.randomUUID(),
        name: "Nouveau moment",
        emoji: null,
        startMinute: start,
        endMinute: MINUTES_PER_DAY,
        position: moments.length,
        updatedAt: Date.now(),
        deletedAt: null,
      },
    ]);
  }

  function removeMoment(index: number) {
    if (moments.length <= 1) return;
    update(moments.filter((_, i) => i !== index));
  }

  const issues = validateMoments(moments);

  function save() {
    const now = Date.now();
    saveMoments(moments.map((moment) => ({ ...moment, updatedAt: now })));
    router.push("/");
  }

  return (
    <>
      <p className="text-muted-foreground px-5 pb-5 text-sm leading-relaxed">
        Une tâche avec une heure précise est rangée automatiquement dans le
        moment qui contient cette heure. Déplacer une frontière déplace donc les
        tâches concernées, sans avoir à les modifier.
      </p>

      <ul className="space-y-2 px-5">
        {moments.map((moment, index) => (
          <li
            key={moment.id}
            className="border-[var(--rt-surface-border)] bg-[var(--rt-surface)] space-y-3 rounded-[var(--radius)] border p-3"
          >
            <div className="flex gap-2">
              <TextInput
                value={moment.emoji ?? ""}
                onChange={(event) => setField(index, "emoji", event.target.value)}
                placeholder="🌅"
                maxLength={4}
                aria-label="Emoji du moment"
                className="w-16 text-center"
              />
              <TextInput
                value={moment.name}
                onChange={(event) => setField(index, "name", event.target.value)}
                aria-label="Nom du moment"
                className="flex-1"
              />
            </div>

            <div className="flex items-center gap-3">
              <span className="rt-num text-muted-foreground text-xs">
                de {formatMinute(moment.startMinute)} à
              </span>
              {index === moments.length - 1 ? (
                <span className="rt-num text-muted-foreground text-xs">
                  minuit
                </span>
              ) : (
                <TextInput
                  type="time"
                  value={minutesToTime(moment.endMinute)}
                  onChange={(event) => setEnd(index, event.target.value)}
                  aria-label={`Fin de ${moment.name}`}
                  className="w-32"
                />
              )}
              <span className="flex-1" />
              {moments.length > 1 ? (
                <button
                  type="button"
                  onClick={() => removeMoment(index)}
                  className="text-muted-foreground hover:text-destructive text-xs underline underline-offset-4"
                >
                  Retirer
                </button>
              ) : null}
            </div>
          </li>
        ))}
      </ul>

      <div className="px-5 pt-3">
        <button
          type="button"
          onClick={addMoment}
          className="text-muted-foreground hover:text-foreground text-sm underline underline-offset-4"
        >
          + Ajouter un moment
        </button>
      </div>

      {issues.length > 0 ? (
        <ul className="text-destructive mt-4 space-y-1 px-5 text-xs">
          {issues.map((issue) => (
            <li key={`${issue.code}-${issue.momentId ?? ""}`}>{issue.message}</li>
          ))}
        </ul>
      ) : null}

      <FormActions>
        <Button
          type="button"
          onClick={save}
          disabled={issues.length > 0 || moments.some((m) => !m.name.trim())}
          className="flex-1"
        >
          Enregistrer les moments
        </Button>
      </FormActions>
    </>
  );
}
