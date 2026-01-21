import React, { useState, useEffect } from "react";
import { UtensilsCrossed } from "lucide-react";
import { useOpenAiGlobal } from "../use-openai-global";
import { EmptyMessage } from "@openai/apps-sdk-ui/components/EmptyMessage";
import { Button } from "@openai/apps-sdk-ui/components/Button";

function MealItem({ meal, isHighlighted }) {
  return (
    <div
      className={`rounded-lg border p-3 transition-colors ${
        isHighlighted
          ? "border-green-500 bg-green-100"
          : "border-gray-200 bg-gray-50 hover:bg-gray-100"
      }`}
    >
      <div className="flex items-center gap-3">
        <UtensilsCrossed className="h-5 w-5 text-green-700 shrink-0" />
        <div className="font-medium">{meal.meal}</div>
      </div>
    </div>
  );
}

export function App() {
  const initialToolOutput = useOpenAiGlobal("toolOutput");
  const widgetState = useOpenAiGlobal("widgetState");

  const [toolOutput, setToolOutput] = useState(initialToolOutput);
  const [highlightedMealId, setHighlightedMealId] = useState(null);

  useEffect(() => {
    setToolOutput(initialToolOutput);
  }, [initialToolOutput]);

  const meals = toolOutput?.meals || widgetState?.meals || [];

  const handlePredict = () => {
    if (meals.length > 0) {
      const randomIndex = Math.floor(Math.random() * meals.length);
      setHighlightedMealId(meals[randomIndex].id);
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto min-h-screen">
      <h1 className="text-2xl font-semibold text-center mb-6 flex items-center justify-center gap-2">
        <UtensilsCrossed className="h-7 w-7 text-green-700" />
        Dinnercaster
      </h1>

      {!toolOutput ? (
        <EmptyMessage />
      ) : (
        <>
          <div className="border border-gray-200 rounded-xl p-4 mb-4 shadow-sm">
            <div className="flex flex-col gap-2">
              {meals.map((meal) => (
                <MealItem
                  key={meal.id}
                  meal={meal}
                  isHighlighted={meal.id === highlightedMealId}
                />
              ))}
            </div>
          </div>
        </>
      )}
      <Button onClick={handlePredict} color="primary" size="md" variant="solid">
        Predict
      </Button>
    </div>
  );
}

export default App;
