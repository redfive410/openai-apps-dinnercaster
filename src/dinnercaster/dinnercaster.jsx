import React, { useRef, useState, useEffect } from "react";
import {
  AnimatePresence,
  motion,
} from "framer-motion";
import { UtensilsCrossed, Plus, Calendar, Trash2 } from "lucide-react";
import { useOpenAiGlobal } from "../use-openai-global";
import { useWidgetState } from "../use-widget-state";

/* Framer-motion wrappers */
const MotionCard = motion.div;
const MotionTrash = motion.create(Trash2);

const MAX_CARD_WIDTH_REM = 28;
const MAX_CARD_HEIGHT_REM = 31;

/* --------------------------------- Utils -------------------------------- */

function uid() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return (
    (Date.now().toString(36) + Math.random().toString(36).slice(2, 10)).toUpperCase()
  );
}

function formatDate(dateStr) {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  if (parts.length !== 3) return "";
  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  const day = parseInt(parts[2], 10);
  const dt = new Date(y, (m || 1) - 1, day || 1);
  const now = new Date();
  const sameYear = dt.getFullYear() === now.getFullYear();
  const opts = sameYear
    ? { month: "short", day: "numeric", weekday: "short" }
    : { month: "short", day: "numeric", year: "numeric", weekday: "short" };
  return dt.toLocaleDateString(undefined, opts);
}

function buildInitialData(toolOutput) {
  const addMealDefaults = (m) => ({
    id: m.id ?? uid(),
    date: typeof m.date === "string" ? m.date : null,
    meal: m.meal ?? "",
    notes: m.notes ?? "",
  });

  return {
    meals: (toolOutput?.meals || []).map(addMealDefaults),
  };
}

/* --------------------------------- BaseCard -------------------------------- */
function BaseCard({ children }) {
  return (
    <MotionCard className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-orange-50 to-amber-50 rounded-3xl border border-orange-200/50 shadow-[0px_8px_14px_rgba(251,146,60,0.15)] overflow-hidden">
      {children}
    </MotionCard>
  );
}

/* ============================= Meal row ============================= */
function MealItem({ meal, index, updateMealById, deleteMealById }) {
  const [isHovered, setIsHovered] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const dateLabel = formatDate(meal.date);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 18, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, filter: "blur(4px)", scale: 0.98 }}
      transition={{ type: "spring", bounce: 0.18, duration: 0.42 }}
      className="border-b border-orange-200/30 bg-white/70 backdrop-blur-sm rounded-lg mb-2 overflow-hidden"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Top row */}
      <div
        className="flex gap-3 p-4 items-center cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <UtensilsCrossed className="w-5 h-5 text-orange-500" />

        {/* Meal name */}
        <input
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => updateMealById(meal.id, { meal: e.target.value })}
          placeholder="What's for dinner?"
          className="leading-tight flex-auto border-transparent border-0 bg-transparent !text-base p-0 outline-none focus-visible:ring-0 text-gray-800 font-medium"
          value={meal.meal}
        />

        {/* Date display */}
        {dateLabel && (
          <div className="text-sm text-orange-600/70 flex items-center gap-1">
            <Calendar className="w-4 h-4" />
            {dateLabel}
          </div>
        )}

        {/* Delete button */}
        <MotionTrash
          animate={{ opacity: isHovered ? 1 : 0 }}
          className="w-4 h-4 text-orange-400 hover:text-orange-600 cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            deleteMealById(meal.id);
          }}
        />
      </div>

      {/* Expanded notes section */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            key="notes"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: "spring", bounce: 0.24, duration: 0.35 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-0">
              <textarea
                value={meal.notes ?? ""}
                onChange={(e) => updateMealById(meal.id, { notes: e.target.value })}
                placeholder="Add recipe notes, ingredients, or cooking tips..."
                className="w-full bg-white/50 border border-orange-200/50 rounded-md p-2 outline-none focus:ring-2 focus:ring-orange-300 text-sm text-gray-700 resize-none"
                rows={3}
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ================================ App =================================== */
export function App() {
  const toolOutput = useOpenAiGlobal("toolOutput");
  const widgetState = useOpenAiGlobal("widgetState");

  // Initialize state: widgetState (cached) > toolOutput (fresh) > empty
  const [data, setData] = useWidgetState(() => {
    // Check widgetState first (persisted user changes)
    if (widgetState?.meals) {
      return widgetState;
    }
    // Then check toolOutput (fresh data from tool call)
    if (toolOutput?.meals) {
      return buildInitialData(toolOutput);
    }
    // Default to empty
    return { meals: [] };
  });

  const meals = data?.meals || [];

  // Sync new toolOutput data when it arrives
  useEffect(() => {
    if (toolOutput?.meals) {
      setData(buildInitialData(toolOutput));
    }
  }, [toolOutput]);

  const addMeal = () => {
    const newId = uid();
    const today = new Date();
    const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    setData((prev) => ({
      meals: [
        { id: newId, meal: "", notes: "", date: dateStr },
        ...prev.meals,
      ],
    }));
  };

  const deleteMealById = (id) => {
    setData((prev) => ({
      meals: prev.meals.filter((m) => m.id !== id),
    }));
  };

  const updateMealById = (id, val) => {
    setData((prev) => ({
      meals: prev.meals.map((m) => (m.id === id ? { ...m, ...val } : m)),
    }));
  };

  return (
    <div className="my-5 antialiased">
      <div
        className="relative max-w/full max-h/full"
        style={{ width: `${MAX_CARD_WIDTH_REM}rem`, height: `${MAX_CARD_HEIGHT_REM}rem` }}
      >
        <BaseCard>
          <div className="w-full h-full overflow-hidden">
            {/* Header */}
            <div className="w-full flex top-0 left-0 absolute p-5 z-20 bg-gradient-to-b from-orange-50 to-transparent">
              <h1 className="font-semibold text-2xl tracking-tight text-orange-800 flex items-center gap-2">
                <UtensilsCrossed className="w-6 h-6" />
                DinnerCaster2
              </h1>
              <div className="flex-auto" />
              <Plus
                size={24}
                onClick={addMeal}
                className="cursor-pointer text-orange-600 hover:text-orange-800 transition-colors"
              />
            </div>

            {/* Meals list */}
            <div className="pt-20 px-5 pb-5 h-full overflow-auto">
              {meals.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <UtensilsCrossed className="w-16 h-16 text-orange-300 mb-4" />
                  <p className="text-orange-600/70 text-lg">...</p>
                </div>
              ) : (
                <AnimatePresence initial={false}>
                  {meals.map((meal, i) => (
                    <MealItem
                      key={meal.id}
                      index={i}
                      meal={meal}
                      updateMealById={updateMealById}
                      deleteMealById={deleteMealById}
                    />
                  ))}
                </AnimatePresence>
              )}
            </div>
          </div>
        </BaseCard>
      </div>
    </div>
  );
}

export default App;
