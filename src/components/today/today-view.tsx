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
  type Completion,
  type DayMoment,
  type DayString,
  type Routine,
  type Task,
} from "@/lib/domain";
import type { ThemeId } from "@/lib/theme";
import { cn } from "@/lib/utils";
import { AmbientLight } from "./ambient-light";
import { DayPanel } from "./day-panel";
import { WeekStrip } from "./week-strip";

interface TodayViewProps {
  theme: ThemeId;
  today: DayString;
  timeZone: string;
  moments: DayMoment[];
  routines: Routine[];
  tasks: Task[];
  completions: Completion[];
}

const completionKey = (taskId: string, day: DayString) => `${taskId}|${day}`;

export function TodayView({
  theme,
  today,
  timeZone,
  moments,
  routines,
  tasks,
  completions,
}: TodayViewProps) {
  const [day, setDay] = useState<DayString>(today);
  // Les coches restent locales tant que le moteur de synchronisation n'est pas
  // en place : même forme d'état que le futur cache, aucun aller-retour serveur.
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});
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

  const mergedCompletions = useMemo(() => {
    const merged = completions.map((completion) => {
      const override = overrides[completionKey(completion.taskId, completion.day)];
      return override === undefined ? completion : { ...completion, done: override };
    });
    const seen = new Set(merged.map((c) => completionKey(c.taskId, c.day)));
    for (const [key, done] of Object.entries(overrides)) {
      if (seen.has(key)) continue;
      const [taskId, dayValue] = key.split("|");
      merged.push({ taskId, day: dayValue, done });
    }
    return merged;
  }, [completions, overrides]);

  const scheduleFor = useCallback(
    (target: DayString) =>
      buildDaySchedule({
        day: target,
        moments,
        routines,
        tasks,
        completions: mergedCompletions,
      }),
    [moments, routines, tasks, mergedCompletions],
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
      setOverrides((previous) => ({
        ...previous,
        [completionKey(taskId, target)]: done,
      }));
      if (done && "vibrate" in navigator) navigator.vibrate?.(8);
    },
    [],
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
            {relative ? (
              <p className="text-muted-foreground text-xs">{relative}</p>
            ) : null}
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
          <DayProgress done={schedule.doneCount} total={schedule.totalCount} />
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

      <div
        ref={scroller}
        className="mt-6 flex flex-1 snap-x snap-mandatory overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {days.map((current) => (
          <div
            key={current}
            className="w-full shrink-0 snap-center px-4 pb-[max(2rem,env(safe-area-inset-bottom))]"
          >
            <DayPanel
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
