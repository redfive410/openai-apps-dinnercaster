import React, { useState, useEffect } from "react";
import { UtensilsCrossed } from "lucide-react";
import { useOpenAiGlobal } from "../use-openai-global";
import { EmptyMessage } from "@openai/apps-sdk-ui/components/EmptyMessage";
import { Button } from "@openai/apps-sdk-ui/components/Button";
import "./dinnercaster.css";

/* ============================= Meal row ============================= */
function MealItem({ meal, isHighlighted }) {
  return (
    <div className={`meal-item ${isHighlighted ? "highlighted" : ""}`}>
      <div className="meal-content">
        <UtensilsCrossed className="meal-icon" />
        <div className="meal-name">{meal.meal}</div>
      </div>
    </div>
  );
}

/* ================================ App =================================== */
export function App() {
  const initialToolOutput = useOpenAiGlobal("toolOutput");
  const widgetState = useOpenAiGlobal("widgetState");

  // Use local state to manage the current tool output
  const [toolOutput, setToolOutput] = useState(initialToolOutput);
  const [highlightedMealId, setHighlightedMealId] = useState(null);

  // Update local state when initial values change
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
    <div className="dinnercaster-container">
      <h1 className="dinnercaster-title">
        <UtensilsCrossed className="title-icon" />
        Dinnercaster
      </h1>

      {!toolOutput ? (
        <EmptyMessage>
        </EmptyMessage>
      ) : (
        <>
          <div className="meals-list">
            <div className="meals-container">
              {meals.map((meal) => (
                <MealItem
                  key={meal.id}
                  meal={meal}
                  isHighlighted={meal.id === highlightedMealId}
                />
              ))}
            </div>
          </div>
          <Button onClick={handlePredict} color="primary" size="md" variant="solid">
            Predict
          </Button>
        </>
      )}
    </div>
  );
}

export default App;
