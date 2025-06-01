import { trpcClient } from "@/api-client";
import { useCallback, useState } from "react";

interface SchemaProperty {
  type: string;
  properties?: Record<string, SchemaProperty>;
  items?: SchemaProperty;
  nullable?: boolean;
  example?: unknown;
}

interface DataInsight {
  semanticAnalysis: Array<{
    field: string;
    semanticMeaning: string;
    dataType: string;
    importance: "high" | "medium" | "low";
    category: string;
  }>;
  visualizationRecommendations: Array<{
    fieldCombination: string[];
    chartType: string;
    rationale: string;
    priority: "high" | "medium" | "low";
  }>;
  keyInsights: string[];
  dataQualityNotes: string[];
  suggestedQuestions: string[];
}

interface UseDataAnalysisResult {
  insights: DataInsight | null;
  loading: boolean;
  error: string | null;
  analyzeSchema: (
    schema: SchemaProperty,
    sampleData?: Array<Record<string, unknown>>,
    fileName?: string,
  ) => Promise<void>;
  clearInsights: () => void;
}

export const useDataAnalysis = (): UseDataAnalysisResult => {
  const [insights, setInsights] = useState<DataInsight | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyzeSchema = useCallback(
    async (
      schema: SchemaProperty,
      sampleData?: Array<Record<string, unknown>>,
      fileName?: string,
    ) => {
      setLoading(true);
      setError(null);

      try {
        const result = await trpcClient.analyzeSchema.mutate({
          schema,
          sampleData,
          fileName,
        });

        setInsights(result);
      } catch (err) {
        console.error("Error analyzing schema:", err);
        setError(err instanceof Error ? err.message : "Failed to analyze data");
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const clearInsights = useCallback(() => {
    setInsights(null);
    setError(null);
  }, []);

  return {
    insights,
    loading,
    error,
    analyzeSchema,
    clearInsights,
  };
};
