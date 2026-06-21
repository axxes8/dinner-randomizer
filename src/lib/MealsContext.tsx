"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
  ReactNode,
} from "react";
import { getDefaultMealLists, DEFAULT_DAY_SCHEDULE } from "./dinnerData";
import type { MealLists, DaySchedule } from "./dinnerData";

export type { MealLists, DaySchedule };

type MealsContextValue = {
  lists: MealLists;
  schedule: DaySchedule;
  loaded: boolean;
  addMeal: (type: keyof MealLists, category: string, meal: string) => void;
  removeMeal: (type: keyof MealLists, category: string, meal: string) => void;
  addCategory: (type: keyof MealLists, category: string) => void;
  removeCategory: (type: keyof MealLists, category: string) => void;
  resetToDefaults: () => void;
  setDaySchedule: (day: number, categories: string[]) => void;
  renameCategory: (type: keyof MealLists, oldName: string, newName: string) => void;
};

const MealsContext = createContext<MealsContextValue | null>(null);

export function MealsProvider({ children }: { children: ReactNode }) {
  const [lists, setLists] = useState<MealLists>(getDefaultMealLists);
  const [schedule, setSchedule] = useState<DaySchedule>(DEFAULT_DAY_SCHEDULE);
  const [loaded, setLoaded] = useState(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load from server on mount
  useEffect(() => {
    fetch("/api/meals")
      .then((r) => r.json())
      .then((data: MealLists & { schedule?: Record<string, unknown> }) => {
        const { schedule: rawSchedule, ...rawLists } = data;
        setLists(rawLists as MealLists);
        if (rawSchedule && typeof rawSchedule === "object") {
          const parsed: DaySchedule = { ...DEFAULT_DAY_SCHEDULE };
          for (let i = 0; i <= 6; i++) {
            const val = rawSchedule[i] ?? rawSchedule[String(i)];
            if (val !== undefined) {
              // Upgrade old single-string format to string[]
              parsed[i] = Array.isArray(val) ? (val as string[]) : [String(val)];
            }
          }
          setSchedule(parsed);
        }
        setLoaded(true);
      })
      .catch(() => {
        // Server unreachable — fall back to built-in defaults
        setLoaded(true);
      });
  }, []);

  // Debounced save to server whenever lists change (after initial load)
  useEffect(() => {
    if (!loaded) return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      fetch("/api/meals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...lists, schedule }),
      }).catch((err) => console.error("Failed to save meals:", err));
    }, 500);
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [lists, schedule, loaded]);

  const addMeal = useCallback(
    (type: keyof MealLists, category: string, meal: string) => {
      const trimmed = meal.trim();
      if (!trimmed) return;
      setLists((prev) => ({
        ...prev,
        [type]: {
          ...prev[type],
          [category]: [...(prev[type][category] ?? []), trimmed],
        },
      }));
    },
    []
  );

  const removeMeal = useCallback(
    (type: keyof MealLists, category: string, meal: string) => {
      setLists((prev) => ({
        ...prev,
        [type]: {
          ...prev[type],
          [category]: prev[type][category].filter((m) => m !== meal),
        },
      }));
    },
    []
  );

  const addCategory = useCallback(
    (type: keyof MealLists, category: string) => {
      const trimmed = category.trim();
      if (!trimmed) return;
      setLists((prev) => {
        if (prev[type][trimmed] !== undefined) return prev;
        return { ...prev, [type]: { ...prev[type], [trimmed]: [] } };
      });
    },
    []
  );

  const removeCategory = useCallback(
    (type: keyof MealLists, category: string) => {
      setLists((prev) => {
        const updated = { ...prev[type] };
        delete updated[category];
        return { ...prev, [type]: updated };
      });
    },
    []
  );

  const resetToDefaults = useCallback(() => {
    setLists(getDefaultMealLists());
    setSchedule(DEFAULT_DAY_SCHEDULE);
  }, []);

  const setDaySchedule = useCallback((day: number, categories: string[]) => {
    setSchedule((prev) => ({ ...prev, [day]: categories }));
  }, []);

  const renameCategory = useCallback(
    (type: keyof MealLists, oldName: string, newName: string) => {
      const trimmed = newName.trim();
      if (!trimmed || trimmed === oldName) return;
      setLists((prev) => {
        if (prev[type][trimmed] !== undefined) return prev; // name already taken
        const updated = Object.fromEntries(
          Object.entries(prev[type]).map(([k, v]) => [k === oldName ? trimmed : k, v])
        );
        return { ...prev, [type]: updated };
      });
      // Keep schedule in sync when a dinner category is renamed
      if (type === "dinner") {
        setSchedule((prev) => {
          const updated: DaySchedule = {};
          for (const [day, cats] of Object.entries(prev)) {
            updated[Number(day)] = (cats as string[]).map((c) =>
              c === oldName ? trimmed : c
            );
          }
          return updated;
        });
      }
    },
    []
  );

  return (
    <MealsContext.Provider
      value={{
        lists,
        schedule,
        loaded,
        addMeal,
        removeMeal,
        addCategory,
        removeCategory,
        resetToDefaults,
        setDaySchedule,
        renameCategory,
      }}
    >
      {children}
    </MealsContext.Provider>
  );
}

export function useMeals() {
  const ctx = useContext(MealsContext);
  if (!ctx) throw new Error("useMeals must be used within MealsProvider");
  return ctx;
}
