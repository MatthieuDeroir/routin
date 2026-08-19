"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, FormActions, TextInput } from "@/components/ui/field";
import { ALL_DAYS, minutesToTimeInput, timeInputToMinutes } from "@/lib/domain";
import { useStore } from "@/lib/store/store";
import { cn } from "@/lib/utils";
import { DaysPicker, DaysShortcuts } from "./days-picker";

const COLORS = [
  "#8a7a4e",
  "#46605a",
  "#3f6b8f",
  "#7a5b8c",
  "#a8564a",
  "#5f7a45",
];

export function RoutineEditor({ id }: { id: string }) {
  const router = useRouter();
  const { data, ready, upsertRoutine, removeRoutine } = useStore();

  const creating = id === "nouvelle";
  const existing = creating ? null : data.routines.find((r) => r.id === id);

  const [name, setName] = useState(existing?.name ?? "");
  const [emoji, setEmoji] = useState(existing?.emoji ?? "");
  const [color, setColor] = useState(existing?.color ?? COLORS[0]);
  const [daysMask, setDaysMask] = useState(existing?.daysMask ?? ALL_DAYS);
  const [hasWindow, setHasWindow] = useState(
    existing?.startMinute != null && existing?.endMinute != null,
  );
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("12:00");
  const [hydrated, setHydrated] = useState(creating);

  // Le magasin se remplit après le premier rendu : on recopie la routine dans
  // le formulaire dès qu'elle apparaît, une seule fois, pour ne pas écraser la
  // saisie en cours à chaque nouvelle fusion de données serveur.
  if (!hydrated && existing) {
    setName(existing.name);
    setEmoji(existing.emoji ?? "");
    setColor(existing.color ?? COLORS[0]);
    setDaysMask(existing.daysMask);
    if (existing.startMinute != null) setStartTime(minutesToTimeInput(existing.startMinute));
    if (existing.endMinute != null) {
      setEndTime(minutesToTimeInput(existing.endMinute === 1440 ? 0 : existing.endMinute));
    }
    setHydrated(true);
  }

  if (!ready) return null;
  if (!creating && !existing) {
    return (
      <p className="text-muted-foreground px-5 py-10 text-sm">
        Cette routine n’existe plus.
      </p>
    );
  }

  function save() {
    const trimmed = name.trim();
    if (!trimmed) return;

    upsertRoutine({
      id: creating ? crypto.randomUUID() : id,
      name: trimmed,
      emoji: emoji.trim() || null,
      color,
      daysMask,
      position: existing?.position ?? data.routines.length,
      // « 00 h 00 » en fin de créneau ne peut désigner que minuit à la clôture
      // de la journée : un créneau de durée nulle ou négative n'a pas de sens.
      startMinute: hasWindow ? timeInputToMinutes(startTime) : null,
      endMinute: hasWindow
        ? (endTime === "00:00" ? 1440 : timeInputToMinutes(endTime))
        : null,
      deletedAt: null,
    });
    router.push("/routines");
  }

  function destroy() {
    removeRoutine(id);
    router.push("/routines");
  }

  return (
    <>
      <div className="space-y-6 px-5">
        <div className="flex gap-3">
          <Field label="Emoji" className="w-24 shrink-0">
            <TextInput
              value={emoji}
              onChange={(event) => setEmoji(event.target.value)}
              placeholder="🌅"
              maxLength={4}
              className="text-center text-xl"
            />
          </Field>
          <Field label="Nom" className="flex-1">
            <TextInput
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Réveil, Sport, Travail…"
              autoFocus={creating}
            />
          </Field>
        </div>

        <Field
          label="Jours"
          hint="Ces jours servent de valeur par défaut aux tâches de la routine ; chacune peut les surcharger."
        >
          <DaysPicker value={daysMask} onChange={setDaysMask} />
          <DaysShortcuts onChange={setDaysMask} />
        </Field>

        <Field
          label="Créneau"
          hint="Situe ce bloc dans la journée : c’est ce qui permet au repère « maintenant » de s’y arrêter, même sans tâche à heure fixe dedans."
        >
          <label className="text-muted-foreground mb-3 flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={hasWindow}
              onChange={(event) => setHasWindow(event.target.checked)}
              className="accent-[var(--primary)]"
            />
            Ce bloc correspond à un moment précis de la journée
          </label>
          {hasWindow ? (
            <div className="flex items-center gap-2">
              <TextInput
                type="time"
                value={startTime}
                onChange={(event) => setStartTime(event.target.value)}
              />
              <span className="text-muted-foreground text-sm" aria-hidden>
                à
              </span>
              <TextInput
                type="time"
                value={endTime}
                onChange={(event) => setEndTime(event.target.value)}
              />
            </div>
          ) : null}
        </Field>

        <Field label="Couleur">
          <div className="flex gap-2">
            {COLORS.map((swatch) => (
              <button
                key={swatch}
                type="button"
                aria-label={`Couleur ${swatch}`}
                aria-pressed={color === swatch}
                onClick={() => setColor(swatch)}
                style={{ backgroundColor: swatch }}
                className={cn(
                  "size-9 rounded-full transition-transform",
                  color === swatch
                    ? "ring-foreground scale-110 ring-2 ring-offset-2"
                    : "opacity-70",
                )}
              />
            ))}
          </div>
        </Field>
      </div>

      <FormActions>
        <Button type="button" onClick={save} disabled={!name.trim()} className="flex-1">
          {creating ? "Créer la routine" : "Enregistrer"}
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
