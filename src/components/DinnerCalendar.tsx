"use client";

import { useState, useCallback, useEffect } from "react";
import moment, { Moment } from "moment-timezone";
import {
  DAY_COLORS,
  pickRandom,
} from "@/lib/dinnerData";
import { useMeals } from "@/lib/MealsContext";

const TIMEZONE = "America/Denver";
const WEEK_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

type DayMeals = { breakfast: string; lunch: string; dinner: string };
type DayAssignments = Record<string, DayMeals>; // "YYYY-MM-DD" -> meals
type WeeklySpecial = { dessert: string; newThing: string };

function pickRandomWithHistory(
  items: string[],
  used: Set<string>,
  exclude?: string
): string {
  if (items.length === 0) return "";

  const filteredExclude =
    exclude !== undefined ? items.filter((item) => item !== exclude) : items;
  const unseen = filteredExclude.filter((item) => !used.has(item));
  const pool = unseen.length > 0 ? unseen : filteredExclude;

  const picked = pickRandom(pool);
  used.add(picked);
  return picked;
}

function buildCalendarWeeks(month: Moment): Moment[][] {
  const start = month.clone().startOf("month").startOf("week");
  const end = month.clone().endOf("month").endOf("week");
  const weeks: Moment[][] = [];
  const cursor = start.clone();
  while (cursor.isSameOrBefore(end, "day")) {
    const week: Moment[] = [];
    for (let d = 0; d < 7; d++) {
      week.push(cursor.clone());
      cursor.add(1, "day");
    }
    weeks.push(week);
  }
  return weeks;
}

function randomizeMonth(
  month: Moment,
  dinnerData: Record<string, string[]>,
  lunchData: Record<string, string[]>,
  breakfastData: Record<string, string[]>,
  schedule: Record<number, string[]>
): { days: DayAssignments; specials: WeeklySpecial[] } {
  const weeks = buildCalendarWeeks(month);
  const days: DayAssignments = {};
  const specials: WeeklySpecial[] = [];

  // Keep weekly rows fresh: avoid repeating the same dinner on the same weekday
  // and avoid repeating breakfast/lunch/specials until a pool is exhausted.
  const usedDinnerByDay = new Map<number, Set<string>>();
  const usedBreakfast = new Set<string>();
  const usedLunch = new Set<string>();
  const usedDessert = new Set<string>();
  const usedNewThing = new Set<string>();

  const allBreakfast = Object.values(breakfastData).flat();
  const allLunch = Object.values(lunchData).flat();

  for (const week of weeks) {
    let satDinner: string | undefined;
    for (const day of week) {
      if (!day.isSame(month, "month")) continue;
      const dayIdx = day.day();
      const dateKey = day.format("YYYY-MM-DD");

      // Dinner — uses per-day schedule
      const dinnerList = (schedule[dayIdx] ?? []).flatMap((key) => dinnerData[key] ?? []);
      const usedDinnerForDay = usedDinnerByDay.get(dayIdx) ?? new Set<string>();
      usedDinnerByDay.set(dayIdx, usedDinnerForDay);
      let dinner = "";
      if (dinnerList.length > 0) {
        dinner =
          dayIdx === 0 && satDinner
            ? pickRandomWithHistory(dinnerList, usedDinnerForDay, satDinner)
            : pickRandomWithHistory(dinnerList, usedDinnerForDay);
      }
      if (dayIdx === 6) satDinner = dinner;

      // Breakfast + Lunch — drawn from full combined pools
      const breakfast =
        allBreakfast.length > 0
          ? pickRandomWithHistory(allBreakfast, usedBreakfast)
          : "";
      const lunch =
        allLunch.length > 0 ? pickRandomWithHistory(allLunch, usedLunch) : "";

      days[dateKey] = { breakfast, lunch, dinner };
    }

    // One dessert + one new thing per calendar week
    const dessertList = dinnerData.Dessert ?? [];
    const newThingList = dinnerData.NewThings ?? [];
    specials.push({
      dessert:
        dessertList.length > 0
          ? pickRandomWithHistory(dessertList, usedDessert)
          : "",
      newThing:
        newThingList.length > 0
          ? pickRandomWithHistory(newThingList, usedNewThing)
          : "",
    });
  }

  return { days, specials };
}

export default function DinnerCalendar() {
  const { lists, schedule, loaded } = useMeals();
  const dinnerData = lists.dinner;
  const lunchData = lists.lunch;
  const breakfastData = lists.breakfast;

  const [month, setMonth] = useState<Moment>(() =>
    moment().tz(TIMEZONE).startOf("month")
  );
  // Start with empty state to avoid SSR/client hydration mismatch from Math.random()
  const [assignments, setAssignments] = useState<{
    days: DayAssignments;
    specials: WeeklySpecial[];
  }>({ days: {}, specials: [] });

  // Populate once meal lists are loaded from server
  useEffect(() => {
    if (!loaded) return;
    // This seeds the randomized calendar once lists/schedule are loaded.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAssignments(randomizeMonth(month, dinnerData, lunchData, breakfastData, schedule));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded]);

  const { days, specials } = assignments;

  const weeks = buildCalendarWeeks(month);
  const today = moment().tz(TIMEZONE).format("YYYY-MM-DD");

  const handleRandomize = useCallback(() => {
    setAssignments(randomizeMonth(month, dinnerData, lunchData, breakfastData, schedule));
  }, [month, dinnerData, lunchData, breakfastData, schedule]);

  const handleRandomizeMeal = useCallback(
    (dateKey: string, mealType: "breakfast" | "lunch" | "dinner", dayIdx: number) => {
      setAssignments((prev) => {
        const current = prev.days[dateKey] ?? { breakfast: "", lunch: "", dinner: "" };
        let pool: string[];
        if (mealType === "dinner") {
          pool = (schedule[dayIdx] ?? []).flatMap((key) => dinnerData[key] ?? []);
        } else if (mealType === "breakfast") {
          pool = Object.values(breakfastData).flat();
        } else {
          pool = Object.values(lunchData).flat();
        }
        if (pool.length === 0) return prev;
        const newValue = pickRandom(pool, current[mealType]);
        return {
          ...prev,
          days: { ...prev.days, [dateKey]: { ...current, [mealType]: newValue } },
        };
      });
    },
    [dinnerData, lunchData, breakfastData, schedule]
  );
  const handleRandomizeSpecial = useCallback(
    (weekIdx: number, type: "dessert" | "newThing") => {
      setAssignments((prev) => {
        const src =
          type === "dessert"
            ? (dinnerData.Dessert ?? [])
            : (dinnerData.NewThings ?? []);
        if (src.length === 0) return prev;
        const updated = [...prev.specials];
        updated[weekIdx] = {
          ...updated[weekIdx],
          [type]: pickRandom(src, updated[weekIdx][type]),
        };
        return { ...prev, specials: updated };
      });
    },
    [dinnerData]
  );

  const prevMonth = () => {
    const m = month.clone().subtract(1, "month");
    setMonth(m);
    setAssignments(randomizeMonth(m, dinnerData, lunchData, breakfastData, schedule));
  };

  const nextMonth = () => {
    const m = month.clone().add(1, "month");
    setMonth(m);
    setAssignments(randomizeMonth(m, dinnerData, lunchData, breakfastData, schedule));
  };
  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      {/* Header */}
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={prevMonth}
              className="px-3 py-2 rounded-lg bg-white border border-gray-200 shadow-sm hover:bg-gray-100 transition-colors text-lg font-bold"
              aria-label="Previous month"
            >
              ‹
            </button>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-800 min-w-48 text-center">
              {month.format("MMMM YYYY")}
            </h1>
            <button
              onClick={nextMonth}
              className="px-3 py-2 rounded-lg bg-white border border-gray-200 shadow-sm hover:bg-gray-100 transition-colors text-lg font-bold"
              aria-label="Next month"
            >
              ›
            </button>
          </div>
          <button
            onClick={handleRandomize}
            className="px-6 py-3 rounded-xl bg-indigo-600 text-white font-semibold shadow hover:bg-indigo-700 active:bg-indigo-800 transition-colors"
          >
            🎲 Randomize Month
          </button>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-2 mb-4 text-xs font-medium">
          {[1, 2, 3, 4, 5, 6, 0].map((dayIdx) => (
            <span
              key={dayIdx}
              className={`${DAY_COLORS[dayIdx].header} px-2 py-1 rounded-full text-gray-700`}
            >
              {WEEK_DAYS[dayIdx]}: {(schedule[dayIdx] ?? []).join(", ")}
            </span>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="bg-white rounded-2xl shadow-md overflow-hidden border border-gray-200">
          {/* Day-of-week headers */}
          <div className="grid grid-cols-7 border-b border-gray-200">
            {WEEK_DAYS.map((d) => (
              <div
                key={d}
                className="py-2 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider"
              >
                {d}
              </div>
            ))}
          </div>

          {/* Weeks */}
          {weeks.map((week, weekIdx) => (
            <div key={weekIdx}>
              {/* Day cells */}
              <div className="grid grid-cols-7 border-b border-gray-100 last:border-b-0">
                {week.map((day) => {
                  const dateKey = day.format("YYYY-MM-DD");
                  const inMonth = day.isSame(month, "month");
                  const isToday = dateKey === today;
                  const dayIdx = day.day();
                  const colors = DAY_COLORS[dayIdx];
                  const dayMeals = days[dateKey];

                  return (
                    <div
                      key={dateKey}
                      className={[
                        "border-r border-gray-100 last:border-r-0 min-h-32 p-1.5 flex flex-col",
                        inMonth ? colors.bg : "bg-gray-50",
                        inMonth ? "" : "opacity-40",
                      ].join(" ")}
                    >
                      {/* Day number */}
                      <div
                        className={[
                          "text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full mb-1 shrink-0",
                          isToday
                            ? "bg-indigo-600 text-white"
                            : inMonth
                            ? "text-gray-700"
                            : "text-gray-400",
                        ].join(" ")}
                      >
                        {day.date()}
                      </div>

                      {/* Meals */}
                      {inMonth && dayMeals && (
                        <div className="flex flex-col gap-0.5 flex-1">
                          {dayMeals.breakfast && (
                            <button
                              onClick={() =>
                                handleRandomizeMeal(dateKey, "breakfast", dayIdx)
                              }
                              className="text-xs leading-snug text-left text-amber-700 hover:text-amber-900 font-medium line-clamp-1 transition-colors"
                              title="Click to re-roll breakfast"
                            >
                              🍳 {dayMeals.breakfast}
                            </button>
                          )}
                          {dayMeals.lunch && (
                            <button
                              onClick={() =>
                                handleRandomizeMeal(dateKey, "lunch", dayIdx)
                              }
                              className="text-xs leading-snug text-left text-green-700 hover:text-green-900 font-medium line-clamp-1 transition-colors"
                              title="Click to re-roll lunch"
                            >
                              🥪 {dayMeals.lunch}
                            </button>
                          )}
                          {dayMeals.dinner && (
                            <button
                              onClick={() =>
                                handleRandomizeMeal(dateKey, "dinner", dayIdx)
                              }
                              className="text-xs leading-snug text-left text-gray-800 hover:text-gray-600 font-medium line-clamp-2 transition-colors"
                              title="Click to re-roll dinner"
                            >
                              🍽️ {dayMeals.dinner}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Weekly specials row */}
              {specials[weekIdx] && week.some((d) => d.isSame(month, "month")) && (
                <div className="grid grid-cols-2 border-b border-gray-100 last:border-b-0 bg-gray-50">
                  <button
                    onClick={() => handleRandomizeSpecial(weekIdx, "dessert")}
                    className="text-xs p-2 text-left hover:bg-gray-100 transition-colors border-r border-gray-100"
                    title="Click to re-roll dessert"
                  >
                    <span className="font-semibold text-pink-600">🍰 Dessert: </span>
                    <span className="text-gray-700">{specials[weekIdx].dessert}</span>
                  </button>
                  <button
                    onClick={() => handleRandomizeSpecial(weekIdx, "newThing")}
                    className="text-xs p-2 text-left hover:bg-gray-100 transition-colors"
                    title="Click to re-roll new thing"
                  >
                    <span className="font-semibold text-emerald-600">✨ New Thing: </span>
                    <span className="text-gray-700">{specials[weekIdx].newThing}</span>
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          Click any meal or special to re-roll just that item.
        </p>
      </div>
    </div>
  );
}
