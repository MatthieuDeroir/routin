"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, FormActions, Select, TextArea, TextInput } from "@/components/ui/field";
import {
  ALL_DAYS,
  formatMinute,
  momentAtMinute,
  sortMoments,
} from "@/lib/domain";
import { useStore } from "@/lib/store/store";
import { cn } from "@/lib/utils";
import { DaysPicker, DaysShortcuts } from "./days-picker";

type Placement = "anytime" | "moment" | "time";

function minutesToTime(minute: number): string {
  return `${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`;
}

function timeToMinutes(value: string): number {
  const [hours, minutes] = value.split(":").map(Number);
  return (hours || 0) * 60 + (minutes || 0);
}

export function TaskEditor({ id }: { id: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data, ready, upsertTask, removeTask } = useStore();

  const creating = id === "nouvelle";
  const existing = creating ? null : data.tasks.find((task) => task.id === id);
  const moments = sortMoments(data.moments);

  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [routineId, setRoutineId] = useState<string>(
    searchParams.get("routine") ?? "",
  );
  const [overrideDays, setOverrideDays] = useState(false);
  const [daysMask, setDaysMask] = useState(ALL_DAYS);
  const [placement, setPlacement] = useState<Placement>("anytime");
  const [momentId, setMomentId] = useState<string>("");
  const [time, setTime] = useState("07:00");
  const [hydrated, setHydrated] = useState(creating);

  // Recopie unique de la tâche dans le formulaire dès que le magasin est prêt :
  // refaire cette copie à chaque fusion écraserait la saisie en cours.
  if (!hydrated && existing) {
    setName(existing.name);
    setNotes(existing.notes ?? "");
    setRoutineId(existing.routineId ?? "");
    setOverrideDays(existing.daysMask !== null);
    setDaysMask(existing.daysMask ?? ALL_DAYS);
    setPlacement(
      existing.atMinute !== null ? "time" : existing.momentId ? "moment" : "anytime",
    );
    setMomentId(existing.momentId ?? "");
    if (existing.atMinute !== null) setTime(minutesToTime(existing.atMinute));
    setHydrated(true);
  }

  if (!ready) return null;
  if (!creating && !existing) {
    return (
      <p className="text-muted-foreground px-5 py-10 text-sm">
        Cette tâche n’existe plus.
      </p>
    );
  }

  const routine = data.routines.find((item) => item.id === routineId) ?? null;
  const derivedMoment =
    placement === "time" ? momentAtMinute(moments, timeToMinutes(time)) : null;

  function save() {
    const trimmed = name.trim();
    if (!trimmed) return;

    upsertTask({
      id: creating ? crypto.randomUUID() : id,
      routineId: routineId || null,
      momentId: placement === "moment" ? momentId || null : null,
      atMinute: placement === "time" ? timeToMinutes(time) : null,
      name: trimmed,
      notes: notes.trim() || null,
      // Sans routine, la tâche doit porter ses propres jours : il n'y a rien
      // dont hériter.
      daysMask: overrideDays || !routineId ? daysMask : null,
      position: existing?.position ?? data.tasks.length,
      updatedAt: Date.now(),
      deletedAt: null,
    });
    router.push("/routines");
  }

  function destroy() {
    removeTask(id);
    router.push("/routines");
  }

  return (
    <>
      <div className="space-y-6 px-5">
        <Field label="Nom">
          <TextInput
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Étirements, Lecture, Appeler…"
            autoFocus={creating}
          />
        </Field>

        <Field label="Routine" hint="Une tâche peut exister seule, sans routine.">
          <Select
            value={routineId}
            onChange={(event) => setRoutineId(event.target.value)}
          >
            <option value="">Aucune</option>
            {data.routines.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Quand dans la journée">
          <div className="grid grid-cols-3 gap-2">
            {(
              [
                ["anytime", "Dans la journée"],
                ["moment", "Un moment"],
                ["time", "Une heure"],
              ] as [Placement, string][]
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                aria-pressed={placement === value}
                onClick={() => setPlacement(value)}
                className={cn(
                  "rounded-[var(--radius)] border px-2 py-2 text-xs transition-colors",
                  placement === value
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-input bg-[var(--rt-surface)] text-muted-foreground",
                )}
              >
                {label}
              </button>
            ))}
          </div>

          {placement === "moment" ? (
            <Select
              className="mt-3"
              value={momentId}
              onChange={(event) => setMomentId(event.target.value)}
            >
              <option value="">Choisir un moment…</option>
              {moments.map((moment) => (
                <option key={moment.id} value={moment.id}>
                  {moment.name} ({formatMinute(moment.startMinute)} –{" "}
                  {formatMinute(moment.endMinute % 1440)})
                </option>
              ))}
            </Select>
          ) : null}

          {placement === "time" ? (
            <div className="mt-3 space-y-2">
              <TextInput
                type="time"
                value={time}
                onChange={(event) => setTime(event.target.value)}
              />
              <p className="text-muted-foreground text-xs">
                {derivedMoment
                  ? `Rangée dans « ${derivedMoment.name} », d’après ses bornes horaires.`
                  : "Aucun moment ne couvre cette heure : la tâche apparaîtra dans « Dans la journée »."}
              </p>
            </div>
          ) : null}
        </Field>

        <Field label="Jours">
          {routine ? (
            <label className="text-muted-foreground mb-3 flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={!overrideDays}
                onChange={(event) => setOverrideDays(!event.target.checked)}
                className="accent-[var(--primary)]"
              />
              Suivre les jours de « {routine.name} »
            </label>
          ) : null}

          <DaysPicker
            value={overrideDays || !routine ? daysMask : routine.daysMask}
            onChange={setDaysMask}
            disabled={Boolean(routine) && !overrideDays}
          />
          <DaysShortcuts
            onChange={setDaysMask}
            disabled={Boolean(routine) && !overrideDays}
          />
        </Field>

        <Field label="Notes">
          <TextArea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Détail, consigne, lien…"
          />
        </Field>
      </div>

      <FormActions>
        <Button type="button" onClick={save} disabled={!name.trim()} className="flex-1">
          {creating ? "Créer la tâche" : "Enregistrer"}
        </Button>
        {!creating ? (
          <Button type="button" variant="ghost" onClick={destroy}>
            Supprimer
          </Button>
        ) : null}
      </FormActions>
    </>
  );
}
