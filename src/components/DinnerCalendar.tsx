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
  const [mobileWeekIndex, setMobileWeekIndex] = useState(0);

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
  const mobileWeeks = weeks.filter((week) => week.some((day) => day.isSame(month, "month")));
  const activeMobileWeek = mobileWeeks[mobileWeekIndex] ?? weeks[0];
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
    setMobileWeekIndex(0);
    setAssignments(randomizeMonth(m, dinnerData, lunchData, breakfastData, schedule));
  };

  const nextMonth = () => {
    const m = month.clone().add(1, "month");
    setMonth(m);
    setMobileWeekIndex(0);
    setAssignments(randomizeMonth(m, dinnerData, lunchData, breakfastData, schedule));
  };

  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
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
          <div className="flex flex-wrap items-center gap-2 print-hidden">
            <button
              onClick={handlePrint}
              className="px-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-700 font-semibold shadow-sm hover:bg-gray-100 active:bg-gray-200 transition-colors"
            >
              🖨️ Print
            </button>
            <button
              onClick={handleRandomize}
              className="px-6 py-3 rounded-xl bg-indigo-600 text-white font-semibold shadow hover:bg-indigo-700 active:bg-indigo-800 transition-colors"
            >
              🎲 Randomize Month
            </button>
          </div>
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

        {/* Calendar list view for mobile */}
        <div className="bg-white rounded-2xl shadow-md overflow-hidden border border-gray-200 print-card">
          <div className="sm:hidden border-b border-gray-100 bg-gray-50 px-3 py-2 flex items-center justify-between print-hidden">
            <button
              onClick={() => setMobileWeekIndex((prev) => Math.max(0, prev - 1))}
              disabled={mobileWeekIndex === 0}
              className="px-2 py-1 text-sm font-semibold text-gray-700 disabled:text-gray-300"
              aria-label="Previous week"
            >
              ←
            </button>
            <div className="text-sm font-semibold text-gray-700">
              {activeMobileWeek?.[0]?.format("MMM D")} - {activeMobileWeek?.[6]?.format("MMM D")}
            </div>
            <button
              onClick={() => setMobileWeekIndex((prev) => Math.min(mobileWeeks.length - 1, prev + 1))}
              disabled={mobileWeekIndex >= mobileWeeks.length - 1}
              className="px-2 py-1 text-sm font-semibold text-gray-700 disabled:text-gray-300"
              aria-label="Next week"
            >
              →
            </button>
          </div>

          <div className="hidden sm:block">
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
          </div>

          <div className="sm:hidden">
            {activeMobileWeek?.map((day) => {
              const dateKey = day.format("YYYY-MM-DD");
              const dayIdx = day.day();
              const isToday = dateKey === today;
              const colors = DAY_COLORS[dayIdx];
              const dayMeals = days[dateKey];
              const isInMonth = day.isSame(month, "month");

              return (
                <div
                  key={dateKey}
                  className={`border-b border-gray-100 px-3 py-3 ${isInMonth ? colors.bg : "bg-gray-50"}`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div
                      className={`text-sm font-bold w-6 h-6 flex items-center justify-center rounded-full ${
                        isToday ? "bg-indigo-600 text-white" : "text-gray-700"
                      }`}
                    >
                      {day.date()}
                    </div>
                    <div className="text-sm font-semibold text-gray-700">
                      {WEEK_DAYS[dayIdx]}
                    </div>
                  </div>

                  {dayMeals && (
                    <div className="space-y-1 text-sm">
                      {dayMeals.breakfast && (
                        <button
                          onClick={() => handleRandomizeMeal(dateKey, "breakfast", dayIdx)}
                          className="block w-full text-left text-amber-700 hover:text-amber-900 font-medium"
                          title="Click to re-roll breakfast"
                        >
                          🍳 {dayMeals.breakfast}
                        </button>
                      )}
                      {dayMeals.lunch && (
                        <button
                          onClick={() => handleRandomizeMeal(dateKey, "lunch", dayIdx)}
                          className="block w-full text-left text-green-700 hover:text-green-900 font-medium"
                          title="Click to re-roll lunch"
                        >
                          🥪 {dayMeals.lunch}
                        </button>
                      )}
                      {dayMeals.dinner && (
                        <button
                          onClick={() => handleRandomizeMeal(dateKey, "dinner", dayIdx)}
                          className="block w-full text-left text-gray-800 hover:text-gray-600 font-medium"
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

          {weeks.map((week, weekIdx) => {
            const visibleDays = week.filter((day) => day.isSame(month, "month"));
            if (visibleDays.length === 0) return null;

            return (
              <div key={weekIdx} className="hidden sm:block border-b border-gray-100 last:border-b-0">
                <div className="hidden sm:block">
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

                          {inMonth && dayMeals && (
                            <div className="flex flex-col gap-0.5 flex-1">
                              {dayMeals.breakfast && (
                                <button
                                  onClick={() => handleRandomizeMeal(dateKey, "breakfast", dayIdx)}
                                  className="text-xs leading-snug text-left text-amber-700 hover:text-amber-900 font-medium line-clamp-1 transition-colors"
                                  title="Click to re-roll breakfast"
                                >
                                  🍳 {dayMeals.breakfast}
                                </button>
                              )}
                              {dayMeals.lunch && (
                                <button
                                  onClick={() => handleRandomizeMeal(dateKey, "lunch", dayIdx)}
                                  className="text-xs leading-snug text-left text-green-700 hover:text-green-900 font-medium line-clamp-1 transition-colors"
                                  title="Click to re-roll lunch"
                                >
                                  🥪 {dayMeals.lunch}
                                </button>
                              )}
                              {dayMeals.dinner && (
                                <button
                                  onClick={() => handleRandomizeMeal(dateKey, "dinner", dayIdx)}
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
                </div>
              </div>
            );
          })}

          {weeks.some((week) => week.some((day) => day.isSame(month, "month"))) && (
            <div className="border-t border-gray-100 bg-gray-50">
              {(() => {
                const activeWeekIdx = mobileWeeks.findIndex((week) => week[0]?.isSame(activeMobileWeek?.[0], "day"));
                const weekSpecials = specials[activeWeekIdx >= 0 ? activeWeekIdx : 0];
                if (!weekSpecials) return null;

                return (
                  <div className="border-b border-gray-100 last:border-b-0">
                    <div className="sm:hidden space-y-1 p-3">
                      <button
                        onClick={() => handleRandomizeSpecial(activeWeekIdx >= 0 ? activeWeekIdx : 0, "dessert")}
                        className="block w-full text-left text-sm text-pink-600 font-semibold"
                        title="Click to re-roll dessert"
                      >
                        🍰 {weekSpecials.dessert}
                      </button>
                      <button
                        onClick={() => handleRandomizeSpecial(activeWeekIdx >= 0 ? activeWeekIdx : 0, "newThing")}
                        className="block w-full text-left text-sm text-emerald-600 font-semibold"
                        title="Click to re-roll new thing"
                      >
                        ✨ {weekSpecials.newThing}
                      </button>
                    </div>

                    <div className="hidden sm:grid sm:grid-cols-2">
                      <button
                        onClick={() => handleRandomizeSpecial(activeWeekIdx >= 0 ? activeWeekIdx : 0, "dessert")}
                        className="text-xs p-2 text-left hover:bg-gray-100 transition-colors border-r border-gray-100"
                        title="Click to re-roll dessert"
                      >
                        <span className="font-semibold text-pink-600">🍰 Dessert: </span>
                        <span className="text-gray-700">{weekSpecials.dessert}</span>
                      </button>
                      <button
                        onClick={() => handleRandomizeSpecial(activeWeekIdx >= 0 ? activeWeekIdx : 0, "newThing")}
                        className="text-xs p-2 text-left hover:bg-gray-100 transition-colors"
                        title="Click to re-roll new thing"
                      >
                        <span className="font-semibold text-emerald-600">✨ New Thing: </span>
                        <span className="text-gray-700">{weekSpecials.newThing}</span>
                      </button>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>

        <p className="text-center text-xs text-gray-400 mt-4 print-hidden">
          Click any meal or special to re-roll just that item.
        </p>
      </div>
    </div>
  );
}
