"use client";

import { useState, useEffect, KeyboardEvent } from "react";
import { useMeals } from "@/lib/MealsContext";
import type { MealLists } from "@/lib/MealsContext";
import { DAY_COLORS } from "@/lib/dinnerData";

type TabType = keyof MealLists;

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const DINNER_CATEGORY_LABELS: Record<string, string> = {
  Monday: "Monday — Pasta / Italian",
  Tuesday: "Tuesday — Mexican",
  Wednesday: "Wednesday — Rice / Asian",
  Thursday: "Thursday — Breakfast for Dinner",
  Friday: "Friday — Budget / Casual",
  Weekend: "Weekend",
  Dessert: "Desserts",
  NewThings: "New Things to Try",
};

export default function ManagePage() {
  const { lists, schedule, addMeal, removeMeal, addCategory, removeCategory, resetToDefaults, setDaySchedule, renameCategory } =
    useMeals();

  const [activeTab, setActiveTab] = useState<TabType>("dinner");
  const [newItems, setNewItems] = useState<Record<string, string>>({});
  const [newCategoryName, setNewCategoryName] = useState("");
  const [confirmReset, setConfirmReset] = useState(false);
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  // Auto-cancel pending delete after 4 seconds
  useEffect(() => {
    if (!pendingDelete) return;
    const timer = setTimeout(() => setPendingDelete(null), 4000);
    return () => clearTimeout(timer);
  }, [pendingDelete]);

  // Cancel pending delete when switching tabs
  useEffect(() => { setPendingDelete(null); }, [activeTab]);

  const confirmDelete = (key: string, action: () => void) => {
    if (pendingDelete === key) {
      action();
      setPendingDelete(null);
    } else {
      setPendingDelete(key);
    }
  };

  const categories = Object.keys(lists[activeTab]);

  const handleAddMeal = (category: string) => {
    const item = (newItems[category] ?? "").trim();
    if (!item) return;
    addMeal(activeTab, category, item);
    setNewItems((prev) => ({ ...prev, [category]: "" }));
  };

  const handleItemKeyDown = (e: KeyboardEvent<HTMLInputElement>, category: string) => {
    if (e.key === "Enter") handleAddMeal(category);
  };

  const handleAddCategory = () => {
    const name = newCategoryName.trim();
    if (!name) return;
    addCategory(activeTab, name);
    setNewCategoryName("");
  };

  const handleRenameCategory = (oldName: string) => {
    renameCategory(activeTab, oldName, editValue);
    setEditingCategory(null);
  };

  const handleReset = () => {
    if (confirmReset) {
      resetToDefaults();
      setConfirmReset(false);
    } else {
      setConfirmReset(true);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto p-4 md:p-8">
        {/* Page header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Manage Meals</h1>
          <button
            onClick={handleReset}
            onBlur={() => setConfirmReset(false)}
            className={`text-sm px-4 py-2 rounded-lg transition-colors ${
              confirmReset
                ? "bg-red-600 text-white hover:bg-red-700"
                : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 shadow-sm"
            }`}
          >
            {confirmReset ? "Confirm Clear?" : "Clear Lists"}
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-white border border-gray-200 rounded-xl p-1 w-fit shadow-sm">
          {(["dinner", "lunch", "breakfast"] as TabType[]).map((tab) => (
            <button
              key={tab}
              onClick={() => { setActiveTab(tab); setEditingCategory(null); }}
              className={`px-5 py-2 rounded-lg text-sm font-semibold transition-colors ${
                activeTab === tab
                  ? "bg-indigo-600 text-white shadow"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              {tab === "dinner" ? "🍽️ Dinners" : tab === "lunch" ? "🥪 Lunches" : "🍳 Breakfast"}
            </button>
          ))}
        </div>

        {/* Category cards */}
        <div className="space-y-4">
          {/* Day Schedule — dinner tab only */}
          {activeTab === "dinner" && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
                <h2 className="font-semibold text-gray-800 text-sm">Day Schedule</h2>
                <p className="text-xs text-gray-400 mt-0.5">Choose which dinner category gets picked for each day</p>
              </div>
              <div className="p-4 grid grid-cols-1 gap-3">
                {([1, 2, 3, 4, 5, 6, 0] as const).map((dayIdx) => {
                  const selected = schedule[dayIdx] ?? [];
                  const available = Object.keys(lists.dinner).filter(
                    (c) => !selected.includes(c)
                  );
                  return (
                    <div key={dayIdx} className="flex items-start gap-2">
                      <span
                        className={`text-xs font-bold px-2 py-1 rounded-full ${
                          DAY_COLORS[dayIdx].header
                        } text-gray-700 shrink-0 w-10 text-center mt-0.5`}
                      >
                        {DAY_NAMES[dayIdx]}
                      </span>
                      <div className="flex flex-wrap gap-1.5 flex-1">
                        {selected.map((cat) => (
                          <span
                            key={cat}
                            className={`inline-flex items-center gap-1 text-xs ${
                              DAY_COLORS[dayIdx].header
                            } text-gray-700 rounded-full px-2.5 py-1`}
                          >
                            {cat}
                            <button
                              onClick={() =>
                                setDaySchedule(
                                  dayIdx,
                                  selected.filter((c) => c !== cat)
                                )
                              }
                              className="text-gray-500 hover:text-red-500 font-bold leading-none ml-0.5"
                              title={`Remove ${cat} from ${DAY_NAMES[dayIdx]}`}
                            >
                              ×
                            </button>
                          </span>
                        ))}
                        {available.length > 0 && (
                          <select
                            value=""
                            onChange={(e) => {
                              if (e.target.value)
                                setDaySchedule(dayIdx, [
                                  ...selected,
                                  e.target.value,
                                ]);
                            }}
                            className="text-xs border border-dashed border-gray-300 rounded-full px-2.5 py-1 bg-white text-gray-500 focus:outline-none focus:ring-1 focus:ring-indigo-300 cursor-pointer"
                          >
                            <option value="" disabled>
                              + Add
                            </option>
                            {available.map((cat) => (
                              <option key={cat} value={cat}>
                                {cat}
                              </option>
                            ))}
                          </select>
                        )}
                        {selected.length === 0 && (
                          <span className="text-xs text-gray-400 italic">
                            No categories — day will be skipped
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {categories.map((category) => {
            const items = lists[activeTab][category];
            const label =
              activeTab === "dinner"
                ? (DINNER_CATEGORY_LABELS[category] ?? category)
                : category;

            return (
              <div
                key={category}
                className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden"
              >
                {/* Card header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50 gap-2">
                  {editingCategory === category ? (
                    <>
                      <input
                        autoFocus
                        type="text"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleRenameCategory(category);
                          if (e.key === "Escape") setEditingCategory(null);
                        }}
                        className="flex-1 text-black text-sm font-semibold border border-indigo-300 rounded-lg px-2 py-0.5 focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
                      />
                      <button
                        onClick={() => handleRenameCategory(category)}
                        className="text-green-600 hover:text-green-700 text-sm font-semibold shrink-0 px-1"
                        title="Save (Enter)"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingCategory(null)}
                        className="text-gray-400 hover:text-gray-600 text-sm shrink-0 px-1"
                        title="Cancel (Esc)"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-1.5 min-w-0">
                        <h2 className="font-semibold text-gray-800 text-sm truncate">{label}</h2>
                        <button
                          onClick={() => { setEditingCategory(category); setEditValue(category); }}
                          className="text-gray-300 hover:text-gray-500 transition-colors shrink-0 text-xs leading-none cursor-pointer"
                          title="Rename category"
                        >
                          ✏️
                        </button>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-xs text-gray-400">{items.length} items</span>
                        <button
                          onClick={() => confirmDelete(`${category}::__CAT__`, () => removeCategory(activeTab, category))}
                          className={`text-xs px-2 py-1 rounded transition-colors ${
                            pendingDelete === `${category}::__CAT__`
                              ? 'bg-red-600 text-white hover:bg-red-700'
                              : 'text-red-400 hover:text-red-600 hover:bg-red-50'
                          }`}
                          title={pendingDelete === `${category}::__CAT__` ? 'Click again to confirm' : 'Delete category'}
                        >
                          {pendingDelete === `${category}::__CAT__` ? 'Confirm delete?' : 'Delete category'}
                        </button>
                      </div>
                    </>
                  )}
                </div>

                {/* Items */}
                <div className="p-4">
                  {items.length === 0 ? (
                    <p className="text-sm text-gray-400 italic mb-3">No items yet.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {items.map((item) => {
                        const mealKey = `${category}::${item}`;
                        const isMealPending = pendingDelete === mealKey;
                        return (
                          <span
                            key={item}
                            className={`inline-flex items-center gap-1.5 text-sm rounded-full px-3 py-1 transition-colors ${
                              isMealPending ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'
                            }`}
                          >
                            {item}
                            <button
                              onClick={() => confirmDelete(mealKey, () => removeMeal(activeTab, category, item))}
                              className={`font-bold leading-none text-base transition-colors ${
                                isMealPending ? 'text-red-600 hover:text-red-800' : 'text-gray-400 hover:text-red-500'
                              }`}
                              title={isMealPending ? 'Click again to confirm removal' : `Remove "${item}"`}
                            >
                              ×
                            </button>
                          </span>
                        );
                      })}
                    </div>
                  )}

                  {/* Add item row */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newItems[category] ?? ""}
                      onChange={(e) =>
                        setNewItems((prev) => ({ ...prev, [category]: e.target.value }))
                      }
                      onKeyDown={(e) => handleItemKeyDown(e, category)}
                      placeholder="Add a meal…"
                      className="flex-1 text-sm text-black border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
                    />
                    <button
                      onClick={() => handleAddMeal(category)}
                      className="text-sm px-4 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 active:bg-indigo-800 transition-colors font-medium"
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Add new category card */}
          <div className="bg-white rounded-xl border border-dashed border-gray-300 p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-500 mb-3">
              + New {activeTab === "dinner" ? "Dinner" : activeTab === "lunch" ? "Lunch" : "Breakfast"} Category
            </h3>
            <div className="flex gap-2">
              <input
                type="text"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddCategory()}
                placeholder="Category name…"
                className="flex-1 text-black text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
              />
              <button
                onClick={handleAddCategory}
                className="text-sm px-4 py-1.5 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium shadow-sm"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
