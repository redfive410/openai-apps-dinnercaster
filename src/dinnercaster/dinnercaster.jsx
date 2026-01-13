import React, { useState, useEffect } from "react";
import { UtensilsCrossed } from "lucide-react";
import { useOpenAiGlobal } from "../use-openai-global";
import { EmptyMessage } from "@openai/apps-sdk-ui/components/EmptyMessage";
import { Button } from "@openai/apps-sdk-ui/components/Button";
import "./dinnercaster.css";

/* ============================= Meal row ============================= */
function MealItem({ meal }) {
  return (
    <div className="meal-item">
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

  // Update local state when initial values change
  useEffect(() => {
    setToolOutput(initialToolOutput);
  }, [initialToolOutput]);

  const meals = toolOutput?.meals || widgetState?.meals || [];

  const handleRefresh = async () => {
    if (window.openai?.callTool) {
      try {
        const result = await window.openai.callTool("get_meals", {});

        // Update local state with the new tool output
        if (result?.structuredContent) {
          setToolOutput(result.structuredContent);
        }
      } catch (error) {
        console.error("Error calling get_meals tool:", error);
      }
    } else {
      console.error("window.openai.callTool is not available");
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
        <div className="meals-list">
          <div className="meals-container">
            {meals.map((meal) => (
              <MealItem key={meal.id} meal={meal} />
            ))}
          </div>
        </div>
      )}
      <Button color="primary" onClick={handleRefresh}>
        Refresh Meals
      </Button>
    </div>
  );
}

export default App;
