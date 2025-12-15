import React, { useState, useEffect } from "react";
import {
  AnimatePresence,
  motion,
} from "framer-motion";
import { UtensilsCrossed, Plus } from "lucide-react";
import { useOpenAiGlobal } from "../use-openai-global";
import { useWidgetState } from "../use-widget-state";

/* Framer-motion wrappers */
const MotionCard = motion.div;

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

function buildInitialData(toolOutput, widgetState) {
  const addMealDefaults = (m) => ({
    id: m.id ?? uid(),
    meal: m.meal ?? "",
  });

  return {
    meals: (widgetState?.meals || toolOutput?.meals || []).map(addMealDefaults),
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
function MealItem({ meal, updateMealById }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 18, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, filter: "blur(4px)", scale: 0.98 }}
      transition={{ type: "spring", bounce: 0.18, duration: 0.42 }}
      className="border-b border-orange-200/30 bg-white/70 backdrop-blur-sm rounded-lg mb-2 overflow-hidden"
    >
      <div className="flex gap-3 p-4 items-center">
        <UtensilsCrossed className="w-5 h-5 text-orange-500" />

        {/* Meal name */}
        <input
          onChange={(e) => updateMealById(meal.id, { meal: e.target.value })}
          placeholder="What's for dinner?"
          className="leading-tight flex-auto border-transparent border-0 bg-transparent !text-base p-0 outline-none focus-visible:ring-0 text-gray-800 font-medium"
          value={meal.meal}
        />
      </div>
    </motion.div>
  );
}

/* ================================ App =================================== */
export function App() {
  const toolOutput = useOpenAiGlobal("toolOutput");
  const widgetState = useOpenAiGlobal("widgetState");

  // Initialize state: widgetState (cached) > toolOutput (fresh) > empty
  const [data, setData] = useWidgetState(() => {
    return buildInitialData(toolOutput, widgetState);
  });

  const meals = data?.meals || [];

  // Sync new toolOutput data when it arrives (overrides widget state)
  useEffect(() => {
    if (toolOutput?.meals) {
      setData(buildInitialData(toolOutput, undefined));
    }
  }, [toolOutput]);

  const addMeal = () => {
    setData((prev) => ({
      meals: [
        { id: uid(), meal: "" },
        ...prev.meals,
      ],
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
                Dinnercaster2 v0.0
              </h1>
              <div className="flex-auto" />
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
                  {meals.map((meal) => (
                    <MealItem
                      key={meal.id}
                      meal={meal}
                      updateMealById={updateMealById}
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
