"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, FormActions, Select, TextArea, TextInput } from "@/components/ui/field";
import {
  ALL_DAYS,
  addDays,
  minutesToTimeInput,
  timeInputToMinutes,
  type DayString,
  type TaskKind,
} from "@/lib/domain";
import { useStore } from "@/lib/store/store";
import { cn } from "@/lib/utils";
import { DaysPicker, DaysShortcuts } from "./days-picker";

export function TaskEditor({ id, today }: { id: string; today: DayString }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data, ready, upsertTask, endTask } = useStore();

  const creating = id === "nouvelle";
  const existing = creating ? null : data.tasks.find((task) => task.id === id);

  const [kind, setKind] = useState<TaskKind>(
    searchParams.get("type") === "directive" ? "directive" : "task",
  );
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [routineId, setRoutineId] = useState(searchParams.get("routine") ?? "");
  const [overrideDays, setOverrideDays] = useState(false);
  const [daysMask, setDaysMask] = useState(ALL_DAYS);
  const [timed, setTimed] = useState(false);
  const [time, setTime] = useState("07:00");
  const [punctual, setPunctual] = useState(false);
  const [hydrated, setHydrated] = useState(creating);

  // Recopie unique de la tâche dans le formulaire dès que le magasin est prêt :
  // refaire cette copie à chaque fusion écraserait la saisie en cours.
  if (!hydrated && existing) {
    setKind(existing.kind);
    setName(existing.name);
    setNotes(existing.notes ?? "");
    setRoutineId(existing.routineId ?? "");
    setOverrideDays(existing.daysMask !== null);
    setDaysMask(existing.daysMask ?? ALL_DAYS);
    setTimed(existing.atMinute !== null);
    if (existing.atMinute !== null) setTime(minutesToTimeInput(existing.atMinute));
    setPunctual(
      existing.activeFrom !== null && existing.activeFrom === existing.activeUntil,
    );
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

  const isDirective = kind === "directive";
  const routine = data.routines.find((item) => item.id === routineId) ?? null;
  const followsRoutine = Boolean(routine) && !overrideDays && !isDirective;
  const from = existing?.activeFrom ?? today;
  const fromLabel = new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date(`${from}T12:00:00Z`));

  function save() {
    const trimmed = name.trim();
    if (!trimmed) return;

    upsertTask({
      id: creating ? crypto.randomUUID() : id,
      kind,
      // Une directive vaut pour la journée entière : ni routine ni heure.
      routineId: isDirective ? null : routineId || null,
      atMinute: isDirective || !timed ? null : timeInputToMinutes(time),
      name: trimmed,
      notes: notes.trim() || null,
      // Ponctuelle : bornée au seul jour de création, donc ses jours actifs
      // n'ont plus de sens — tous suffisent, seule la borne compte.
      // Sans routine (et sans être ponctuelle), la tâche doit porter ses
      // propres jours : il n'y a rien dont hériter.
      daysMask: punctual ? ALL_DAYS : followsRoutine ? null : daysMask,
      position: existing?.position ?? data.tasks.length,
      // Une tâche créée aujourd'hui n'a pas existé hier : sans cette borne,
      // elle apparaîtrait rétroactivement dans tout l'historique. Ponctuelle,
      // elle se referme le jour même plutôt que de rester ouverte.
      activeFrom: from,
      activeUntil: punctual ? from : (existing?.activeUntil ?? null),
      deletedAt: null,
    });
    router.push("/routines");
  }

  return (
    <>
      <div className="space-y-6 px-5">
        <Field
          label="Dans la journée, c’est quelque chose…"
          hint={
            isDirective
              ? "Une ligne à tenir toute la journée. Elle s’affiche en tête de l’écran et se valide le soir."
              : "Une action à mener, dans un bloc de la journée et éventuellement à une heure donnée."
          }
        >
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                ["task", "à faire"],
                ["directive", "à éviter"],
              ] as [TaskKind, string][]
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                aria-pressed={kind === value}
                onClick={() => setKind(value)}
                className={cn(
                  "rounded-[var(--radius)] border px-3 py-2 text-sm transition-colors",
                  kind === value
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-input bg-[var(--rt-surface)] text-muted-foreground",
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </Field>

        <Field label={isDirective ? "Ce qu’il faut éviter" : "Nom"}>
          <TextInput
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={
              isDirective
                ? "Pas de caféine après 11 h 30"
                : "Étirements, Lecture, Appeler…"
            }
            autoFocus={creating}
          />
        </Field>

        {!isDirective ? (
          <>
            <Field
              label="Routine"
              hint="Sans routine, la tâche apparaît dans « Dans la journée »."
            >
              <Select
                value={routineId}
                onChange={(event) => setRoutineId(event.target.value)}
              >
                <option value="">Aucune — dans la journée</option>
                {[...data.routines]
                  .sort((a, b) => a.position - b.position)
                  .map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
              </Select>
            </Field>

            <Field
              label="Heure"
              hint="Une heure ne fait que trier la tâche en tête de son bloc."
            >
              <label className="text-muted-foreground flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={timed}
                  onChange={(event) => setTimed(event.target.checked)}
                  className="accent-[var(--primary)]"
                />
                À une heure précise
              </label>
              {timed ? (
                <TextInput
                  type="time"
                  value={time}
                  onChange={(event) => setTime(event.target.value)}
                  className="mt-3"
                />
              ) : null}
            </Field>
          </>
        ) : null}

        <Field
          label="Récurrence"
          hint={
            punctual
              ? `N'existera que le ${fromLabel}, sans repasser les jours suivants.`
              : "Ponctuelle : un évènement isolé, pas une habitude à répéter."
          }
        >
          <label className="text-muted-foreground flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={punctual}
              onChange={(event) => setPunctual(event.target.checked)}
              className="accent-[var(--primary)]"
            />
            Ponctuelle — seulement le {fromLabel}
          </label>
        </Field>

        {!punctual ? (
          <Field label="Jours">
            {routine && !isDirective ? (
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
              value={followsRoutine && routine ? routine.daysMask : daysMask}
              onChange={setDaysMask}
              disabled={followsRoutine}
            />
            <DaysShortcuts onChange={setDaysMask} disabled={followsRoutine} />
          </Field>
        ) : null}

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
          {creating ? "Créer" : "Enregistrer"}
        </Button>
        {!creating ? (
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              endTask(id, addDays(today, -1));
              router.push("/routines");
            }}
          >
            Supprimer
          </Button>
        ) : null}
      </FormActions>
    </>
  );
}
