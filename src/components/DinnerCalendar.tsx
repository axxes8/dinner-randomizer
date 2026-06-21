"use client";

import { useState, useCallback, useEffect } from "react";
import moment, { Moment } from "moment-timezone";
import {
  dinnerLists,
  DAY_TO_LIST,
  DAY_COLORS,
  pickRandom,
} from "@/lib/dinnerData";

const TIMEZONE = "America/Denver";
const WEEK_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

type DayAssignments = Record<string, string>; // "YYYY-MM-DD" -> meal name
type WeeklySpecial = { dessert: string; newThing: string };

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
  month: Moment
): { days: DayAssignments; specials: WeeklySpecial[] } {
  const weeks = buildCalendarWeeks(month);
  const days: DayAssignments = {};
  const specials: WeeklySpecial[] = [];

  for (const week of weeks) {
    // Assign a meal to each day in this week that belongs to the current month
    let satMeal: string | undefined;
    for (const day of week) {
      if (!day.isSame(month, "month")) continue;
      const dayIdx = day.day();
      const listKey = DAY_TO_LIST[dayIdx];
      const list = dinnerLists[listKey] as readonly string[];

      let meal: string;
      if (dayIdx === 0 && satMeal) {
        // Sunday — avoid same as Saturday
        meal = pickRandom(list, satMeal);
      } else {
        meal = pickRandom(list);
      }

      if (dayIdx === 6) satMeal = meal;
      days[day.format("YYYY-MM-DD")] = meal;
    }

    // One dessert + one new thing per calendar week
    specials.push({
      dessert: pickRandom(dinnerLists.Dessert as readonly string[]),
      newThing: pickRandom(dinnerLists.NewThings as readonly string[]),
    });
  }

  return { days, specials };
}

export default function DinnerCalendar() {
  const [month, setMonth] = useState<Moment>(() =>
    moment().tz(TIMEZONE).startOf("month")
  );
  // Start with empty state to avoid SSR/client hydration mismatch from Math.random()
  const [assignments, setAssignments] = useState<{
    days: DayAssignments;
    specials: WeeklySpecial[];
  }>({ days: {}, specials: [] });

  // Populate on first client render
  useEffect(() => {
    setAssignments(randomizeMonth(month));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { days, specials } = assignments;

  const weeks = buildCalendarWeeks(month);
  const today = moment().tz(TIMEZONE).format("YYYY-MM-DD");

  const handleRandomize = useCallback(() => {
    setAssignments(randomizeMonth(month));
  }, [month]);

  const handleRandomizeDay = useCallback(
    (dateKey: string, dayIdx: number) => {
      const listKey = DAY_TO_LIST[dayIdx];
      const list = dinnerLists[listKey] as readonly string[];
      const newMeal = pickRandom(list, days[dateKey]);
      setAssignments((prev) => ({
        ...prev,
        days: { ...prev.days, [dateKey]: newMeal },
      }));
    },
    [days]
  );
  const handleRandomizeSpecial = useCallback(
    (weekIdx: number, type: "dessert" | "newThing") => {
      setAssignments((prev) => {
        const updated = [...prev.specials];
        const src =
          type === "dessert"
            ? (dinnerLists.Dessert as readonly string[])
            : (dinnerLists.NewThings as readonly string[]);
        updated[weekIdx] = {
          ...updated[weekIdx],
          [type]: pickRandom(src, updated[weekIdx][type]),
        };
        return { ...prev, specials: updated };
      });
    },
    []
  );

  const prevMonth = () => {
    const m = month.clone().subtract(1, "month");
    setMonth(m);
    setAssignments(randomizeMonth(m));
  };

  const nextMonth = () => {
    const m = month.clone().add(1, "month");
    setMonth(m);
    setAssignments(randomizeMonth(m));
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
          {[
            { label: "Weekend", color: "bg-orange-200" },
            { label: "Pasta Mon", color: "bg-blue-200" },
            { label: "Mexican Tue", color: "bg-yellow-200" },
            { label: "Rice/Asian Wed", color: "bg-purple-200" },
            { label: "Breakfast Thu", color: "bg-amber-200" },
            { label: "Budget Fri", color: "bg-rose-200" },
          ].map(({ label, color }) => (
            <span
              key={label}
              className={`${color} px-2 py-1 rounded-full text-gray-700`}
            >
              {label}
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
                  const meal = days[dateKey];

                  return (
                    <div
                      key={dateKey}
                      onClick={() =>
                        inMonth && handleRandomizeDay(dateKey, dayIdx)
                      }
                      title={inMonth ? "Click to re-roll this day" : undefined}
                      className={[
                        "border-r border-gray-100 last:border-r-0 min-h-24 p-1.5 flex flex-col",
                        inMonth ? colors.bg : "bg-gray-50",
                        inMonth
                          ? "cursor-pointer hover:brightness-95 transition-all"
                          : "opacity-40",
                      ].join(" ")}
                    >
                      {/* Day number */}
                      <div
                        className={[
                          "text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full mb-1",
                          isToday
                            ? "bg-indigo-600 text-white"
                            : inMonth
                            ? "text-gray-700"
                            : "text-gray-400",
                        ].join(" ")}
                      >
                        {day.date()}
                      </div>

                      {/* Meal name */}
                      {inMonth && meal && (
                        <span className="text-xs leading-tight text-gray-800 font-medium line-clamp-3">
                          {meal}
                        </span>
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
          Click any day or special to re-roll just that item.
        </p>
      </div>
    </div>
  );
}
