import { trpcClient } from "@/api-client";
import { useCallback, useState } from "react";

interface VisualizationSpec {
  title: string;
  chartType: string;
  primaryField: string;
  valueField?: string | null;
  aggregationType: "sum" | "count" | "average" | "frequency";
  filterInstructions?: string;
  rationale: string;
}

interface VisualizationResult {
  visualization: VisualizationSpec;
  summary: string;
  keyFindings: string[];
}

interface SemanticField {
  field: string;
  semanticMeaning: string;
  dataType: string;
  importance: "high" | "medium" | "low";
  category: string;
}

interface VisualizationRecommendation {
  fieldCombination: string[];
  chartType: string;
  rationale: string;
  priority: "high" | "medium" | "low";
}

export const useVisualizationGeneration = () => {
  const [result, setResult] = useState<VisualizationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateVisualization = useCallback(
    async (
      question: string,
      dataSample: Array<Record<string, unknown>>,
      existingInsights?: {
        semanticAnalysis?: SemanticField[];
        visualizationRecommendations?: VisualizationRecommendation[];
      },
    ) => {
      setLoading(true);
      setError(null);
      setResult(null);

      try {
        const result = await trpcClient.generateVisualization.mutate({
          question,
          dataSample,
          existingInsights,
        });

        setResult(result);
      } catch (err) {
        console.error("Error generating visualization:", err);
        setError(
          err instanceof Error
            ? err.message
            : "Failed to generate visualization",
        );
      } finally {
        setLoading(false);
      }
    },
    [],
  ); // Empty dependency array since trpcClient is stable

  const clearResult = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  return {
    result,
    loading,
    error,
    generateVisualization,
    clearResult,
  };
};
