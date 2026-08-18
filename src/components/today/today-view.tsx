"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  addDays,
  buildDaySchedule,
  dayRange,
  weekdayOf,
  type DayString,
} from "@/lib/domain";
import Link from "next/link";
import { SyncIndicator } from "@/components/sync-indicator";
import { useStore } from "@/lib/store/store";
import type { ThemeId } from "@/lib/theme";
import { cn } from "@/lib/utils";
import { AmbientLight } from "./ambient-light";
import { DayPanel } from "./day-panel";
import { WeekStrip } from "./week-strip";

interface TodayViewProps {
  theme: ThemeId;
  today: DayString;
  timeZone: string;
  menu: React.ReactNode;
}

export function TodayView({ theme, today, timeZone, menu }: TodayViewProps) {
  const { data, ready, setCompletion } = useStore();
  const { moments, routines, tasks, completions } = data;

  const [day, setDay] = useState<DayString>(today);
  const [nowMinute, setNowMinute] = useState<number | null>(null);

  useEffect(() => {
    const read = () => {
      const parts = new Intl.DateTimeFormat("fr-FR", {
        timeZone,
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).formatToParts(new Date());
      const hour = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
      const minute = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
      setNowMinute(hour * 60 + minute);
    };
    read();
    const timer = window.setInterval(read, 30_000);
    return () => window.clearInterval(timer);
  }, [timeZone]);

  const scheduleFor = useCallback(
    (target: DayString) =>
      buildDaySchedule({
        day: target,
        moments,
        routines,
        tasks,
        completions,
      }),
    [moments, routines, tasks, completions],
  );

  const days = useMemo(
    () => [addDays(day, -1), day, addDays(day, 1)] as const,
    [day],
  );

  const weekRatios = useMemo(() => {
    const monday = addDays(day, -weekdayOf(day));
    const entries: Record<DayString, { done: number; total: number }> = {};
    for (const current of dayRange(monday, addDays(monday, 6))) {
      const schedule = scheduleFor(current);
      entries[current] = {
        done: schedule.doneCount,
        total: schedule.totalCount,
      };
    }
    return entries;
  }, [day, scheduleFor]);

  const toggle = useCallback(
    (taskId: string, done: boolean, target: DayString) => {
      setCompletion(taskId, target, done);
      if (done && "vibrate" in navigator) navigator.vibrate?.(8);
    },
    [setCompletion],
  );

  const scroller = useRef<HTMLDivElement>(null);

  // Le pont central est toujours ramené au milieu après un changement de jour,
  // sans animation : la transition visuelle a déjà eu lieu pendant le geste.
  useLayoutEffect(() => {
    const element = scroller.current;
    if (!element) return;
    element.scrollTo({ left: element.clientWidth, behavior: "instant" });
  }, [day]);

  useEffect(() => {
    const element = scroller.current;
    if (!element) return;

    let timer: number | undefined;
    const settle = () => {
      const index = Math.round(element.scrollLeft / element.clientWidth);
      if (index === 1) return;
      setDay((current) => addDays(current, index - 1));
    };
    const onScroll = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(settle, 90);
    };

    element.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.clearTimeout(timer);
      element.removeEventListener("scroll", onScroll);
    };
  }, []);

  const schedule = scheduleFor(day);
  const label = new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone,
  }).format(new Date(`${day}T12:00:00Z`));

  const relative =
    day === today
      ? "aujourd’hui"
      : day === addDays(today, -1)
        ? "hier"
        : day === addDays(today, 1)
          ? "demain"
          : null;

  return (
    <>
      {theme === "lumiere" ? <AmbientLight minute={nowMinute ?? 720} /> : null}

      <header className="px-5 pt-[max(1.25rem,env(safe-area-inset-top))]">
        <div className="flex items-end justify-between gap-4">
          <div className="min-w-0">
            {/* Ligne toujours rendue, même vide : la date ne doit pas se
                déplacer selon qu'on est sur hier, aujourd'hui ou un autre jour. */}
            <p className="text-muted-foreground text-xs" aria-hidden={!relative}>
              {relative ?? "\u00A0"}
            </p>
            <h1
              className="rt-display truncate leading-tight first-letter:uppercase"
              style={{
                fontSize: "var(--rt-title-size, 1.75rem)",
                textTransform: "var(--rt-title-transform, none)" as never,
              }}
            >
              {label}
            </h1>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <SyncIndicator />
            <DayProgress done={schedule.doneCount} total={schedule.totalCount} />
            {menu}
          </div>
        </div>

        <nav className="mt-5" aria-label="Semaine">
          <WeekStrip
            day={day}
            today={today}
            ratios={weekRatios}
            onSelect={setDay}
          />
        </nav>
      </header>

      {tasks.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8 text-center">
          <p className="text-muted-foreground text-sm leading-relaxed">
            Rien à suivre pour l’instant. Une routine regroupe des tâches et
            leurs jours ; une tâche peut aussi exister seule.
          </p>
          <Link
            href="/routines/nouvelle"
            className="border-input rounded-[var(--radius)] border px-4 py-2 text-sm"
          >
            Créer ma première routine
          </Link>
        </div>
      ) : null}

      <div
        ref={scroller}
        hidden={tasks.length === 0}
        className="mt-6 flex flex-1 snap-x snap-mandatory overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {days.map((current) => (
          <div
            key={current}
            className="w-full shrink-0 snap-center px-4 pb-[max(2rem,env(safe-area-inset-bottom))]"
          >
            <DayPanel
              empty={!ready}
              schedule={scheduleFor(current)}
              nowMinute={current === today ? nowMinute : null}
              disabled={current > today}
              onToggle={(taskId, done) => toggle(taskId, done, current)}
            />
          </div>
        ))}
      </div>
    </>
  );
}

function DayProgress({ done, total }: { done: number; total: number }) {
  const complete = total > 0 && done === total;

  return (
    <p
      className={cn(
        "rt-num shrink-0 text-right text-sm",
        complete ? "text-[var(--rt-signal)]" : "text-muted-foreground",
      )}
    >
      <span className="text-foreground text-xl">{done}</span>
      <span className="opacity-60"> / {total}</span>
    </p>
  );
}
