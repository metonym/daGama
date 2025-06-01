import { cx } from "@/utils/cx";
import { useEffect, useMemo, useState } from "react";
import { useVisualizationGeneration } from "../hooks/useVisualizationGeneration";

interface DataPoint {
  [key: string]: unknown;
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

interface DynamicUIOverlayProps {
  question: string;
  data: DataPoint[];
  onClose: () => void;
  semanticFields?: SemanticField[];
  visualizationRecommendations?: VisualizationRecommendation[];
}

interface AggregatedData {
  label: string;
  value: number;
  count?: number;
  percentage?: number;
}

// Smart data processing using LLM insights
const processDataWithInsights = (
  question: string,
  data: DataPoint[],
  semanticFields?: SemanticField[],
  visualizationRecommendations?: VisualizationRecommendation[],
): AggregatedData[] => {
  const questionLower = question.toLowerCase();

  // First, try to match with LLM visualization recommendations
  if (visualizationRecommendations?.length) {
    const matchingRec = visualizationRecommendations.find((rec) =>
      rec.fieldCombination.some(
        (field) =>
          questionLower.includes(field.toLowerCase()) ||
          field.toLowerCase().includes(questionLower.split(" ")[0]),
      ),
    );

    if (matchingRec && matchingRec.fieldCombination.length >= 1) {
      const groupField = matchingRec.fieldCombination[0];
      const valueField = matchingRec.fieldCombination[1];

      if (valueField && data[0]?.[valueField] !== undefined) {
        return aggregateByField(data, groupField, valueField);
      }
      return aggregateByFrequency(data, groupField);
    }
  }

  // Use semantic field analysis to find relevant fields
  if (semanticFields?.length) {
    // Find fields that match the question intent
    const relevantFields = semanticFields.filter(
      (field) =>
        questionLower.includes(field.field.toLowerCase()) ||
        questionLower.includes(field.semanticMeaning.toLowerCase()) ||
        field.category.toLowerCase().includes(questionLower.split(" ")[0]),
    );

    if (relevantFields.length > 0) {
      // Prioritize by importance
      const sortedFields = relevantFields.sort((a, b) => {
        const importanceOrder = { high: 3, medium: 2, low: 1 };
        return importanceOrder[b.importance] - importanceOrder[a.importance];
      });

      const primaryField = sortedFields[0];

      // Find a numeric field to aggregate by if available
      const numericFields = semanticFields.filter(
        (f) => f.dataType === "number" && f.importance !== "low",
      );

      if (
        numericFields.length > 0 &&
        numericFields[0].field !== primaryField.field
      ) {
        return aggregateByField(
          data,
          primaryField.field,
          numericFields[0].field,
        );
      }
      return aggregateByFrequency(data, primaryField.field);
    }
  }

  // Fallback to intelligent field detection
  return intelligentFieldDetection(question, data);
};

const intelligentFieldDetection = (
  question: string,
  data: DataPoint[],
): AggregatedData[] => {
  const questionLower = question.toLowerCase();
  const fields = Object.keys(data[0] || {});

  // Try to find fields mentioned in the question
  const mentionedField = fields.find((field) =>
    questionLower.includes(field.toLowerCase()),
  );

  if (mentionedField) {
    const numericFields = fields.filter(
      (f) => typeof data[0]?.[f] === "number",
    );
    if (numericFields.length > 0 && numericFields[0] !== mentionedField) {
      return aggregateByField(data, mentionedField, numericFields[0]);
    }
    return aggregateByFrequency(data, mentionedField);
  }

  // Default: use the first string field
  const stringField =
    fields.find((f) => typeof data[0]?.[f] === "string") || fields[0];
  return aggregateByFrequency(data, stringField);
};

// Data processing utilities

const aggregateByField = (
  data: DataPoint[],
  groupField: string,
  sumField: string,
): AggregatedData[] => {
  const groups: { [key: string]: number } = {};

  for (const item of data) {
    const key = String(item[groupField] || "Unknown");
    const value = Number(item[sumField]) || 0;
    groups[key] = (groups[key] || 0) + value;
  }

  return Object.entries(groups)
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10); // Top 10
};

const aggregateByFrequency = (
  data: DataPoint[],
  field: string,
): AggregatedData[] => {
  const counts: { [key: string]: number } = {};

  for (const item of data) {
    const key = String(item[field] || "Unknown");
    counts[key] = (counts[key] || 0) + 1;
  }

  const total = data.length;
  return Object.entries(counts)
    .map(([label, count]) => ({
      label,
      value: count,
      count,
      percentage: Math.round((count / total) * 100),
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);
};

const aggregateByAverage = (
  data: DataPoint[],
  groupField: string,
  valueField: string,
): AggregatedData[] => {
  const groups: { [key: string]: { sum: number; count: number } } = {};

  for (const item of data) {
    const key = String(item[groupField] || "Unknown");
    const value = Number(item[valueField]) || 0;
    if (!groups[key]) {
      groups[key] = { sum: 0, count: 0 };
    }
    groups[key].sum += value;
    groups[key].count += 1;
  }

  return Object.entries(groups)
    .map(([label, { sum, count }]) => ({
      label,
      value: Math.round((sum / count) * 100) / 100, // Round to 2 decimal places
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);
};

const aggregateByTimePattern = (
  data: DataPoint[],
  timeField: string,
  valueField: string,
): AggregatedData[] => {
  const timeGroups: { [key: string]: number } = {};

  for (const item of data) {
    const timeStr = String(item[timeField] || "");
    const value = Number(item[valueField]) || 0;

    // Extract hour from timestamp
    const hour = new Date(timeStr).getHours();
    if (!Number.isNaN(hour)) {
      const timeSlot = `${hour}:00`;
      timeGroups[timeSlot] = (timeGroups[timeSlot] || 0) + value;
    }
  }

  return Object.entries(timeGroups)
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => Number.parseInt(a.label) - Number.parseInt(b.label));
};

// Visualization components
const BarChart = ({ data }: { data: AggregatedData[] }) => {
  const maxValue = Math.max(...data.map((d) => d.value));

  return (
    <div className="space-y-2">
      {data.map((item) => (
        <div
          key={`${item.label}-${item.value}`}
          className="flex items-center gap-3"
        >
          <div
            className="w-24 text-xs text-gray-700 font-medium truncate"
            title={item.label || "Data item"}
          >
            {item.label}
          </div>
          <div className="flex-1 bg-gray-200 h-2 relative">
            <div
              className="bg-gray-800 h-2 flex items-center justify-end pr-1"
              style={{ width: `${(item.value / maxValue) * 100}%` }}
            >
              <span className="text-white text-[10px] font-medium">
                {item.percentage
                  ? `${item.percentage}%`
                  : formatValue(item.value)}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

const MetricsGrid = ({ data }: { data: AggregatedData[] }) => {
  const totalValue = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="grid grid-cols-2 gap-3 mb-6">
      <div className="border border-gray-200 p-3">
        <div className="text-lg font-medium text-gray-900">{data.length}</div>
        <div className="text-xs text-gray-600 uppercase tracking-wide">
          Categories
        </div>
      </div>
      <div className="border border-gray-200 p-3">
        <div className="text-lg font-medium text-gray-900">
          {formatValue(totalValue)}
        </div>
        <div className="text-xs text-gray-600 uppercase tracking-wide">
          Total
        </div>
      </div>
    </div>
  );
};

const formatValue = (value: number): string => {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  return value.toString();
};

const formatHumanTime = (value: number, label: string): string => {
  // If label looks like a time (HH:MM format), return as is
  if (label.includes(":")) {
    return label;
  }

  // If value represents milliseconds (common in Spotify data), convert to hours/minutes
  if (value > 1000000) {
    const hours = Math.floor(value / (1000 * 60 * 60));
    const minutes = Math.floor((value % (1000 * 60 * 60)) / (1000 * 60));
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  }

  return formatValue(value);
};

const getChartTitle = (
  question: string,
  semanticFields?: SemanticField[],
  visualizationRecommendations?: VisualizationRecommendation[],
): string => {
  const questionLower = question.toLowerCase();

  // Try to get title from matching visualization recommendation
  if (visualizationRecommendations?.length) {
    const matchingRec = visualizationRecommendations.find((rec) =>
      rec.fieldCombination.some((field) =>
        questionLower.includes(field.toLowerCase()),
      ),
    );

    if (matchingRec) {
      // Use the chart type but make it more specific
      const primaryField = matchingRec.fieldCombination[0];
      return `${matchingRec.chartType} - ${primaryField}`;
    }
  }

  // Use semantic field analysis for better titles
  if (semanticFields?.length) {
    const relevantField = semanticFields.find(
      (field) =>
        questionLower.includes(field.field.toLowerCase()) ||
        questionLower.includes(field.semanticMeaning.toLowerCase()),
    );

    if (relevantField) {
      return relevantField.semanticMeaning || relevantField.field;
    }
  }

  // Fallback to simple patterns
  if (questionLower.includes("artist")) return "Artists";
  if (questionLower.includes("track")) return "Tracks";
  if (questionLower.includes("time")) return "Time Patterns";
  if (questionLower.includes("genre")) return "Categories";

  return "Analysis";
};

export const DynamicUIOverlay = ({
  question,
  data,
  onClose,
  semanticFields,
  visualizationRecommendations,
}: DynamicUIOverlayProps) => {
  const [isVisible, setIsVisible] = useState(true);
  const {
    result: visualizationResult,
    loading: generationLoading,
    error: generationError,
    generateVisualization,
  } = useVisualizationGeneration();

  // Generate visualization when component mounts
  useEffect(() => {
    const dataSample = data.slice(0, 100); // Use first 100 records for analysis
    generateVisualization(question, dataSample, {
      semanticAnalysis: semanticFields,
      visualizationRecommendations,
    });
  }, [
    question,
    data,
    semanticFields,
    visualizationRecommendations,
    generateVisualization,
  ]);

  // Process data based on LLM visualization spec
  const processedData = useMemo(() => {
    if (!visualizationResult) return [];

    const { visualization } = visualizationResult;
    const { primaryField, valueField, aggregationType } = visualization;

    switch (aggregationType) {
      case "sum":
        if (valueField) {
          return aggregateByField(data, primaryField, valueField);
        }
        return aggregateByFrequency(data, primaryField);

      case "count":
      case "frequency":
        return aggregateByFrequency(data, primaryField);

      case "average":
        if (valueField) {
          return aggregateByAverage(data, primaryField, valueField);
        }
        return aggregateByFrequency(data, primaryField);

      default:
        return aggregateByFrequency(data, primaryField);
    }
  }, [visualizationResult, data]);

  const chartTitle = visualizationResult?.visualization.title || "Analysis";

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 300); // Allow animation to complete
  };

  // Show loading state
  if (generationLoading) {
    return (
      <div
        className={cx(
          "fixed top-4 right-4 w-[calc(28%-2rem)] h-[calc(100%-2rem)] bg-white/90 backdrop-blur-sm",
          "flex items-center justify-center p-8 transition-all duration-300",
          isVisible
            ? "opacity-100 translate-x-0"
            : "opacity-0 translate-x-full",
        )}
      >
        <div className="text-center">
          <div className="animate-spin h-6 w-6 border-2 border-gray-800 border-t-transparent mx-auto mb-3" />
          <p className="text-sm text-gray-600">Generating visualization...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (generationError) {
    return (
      <div
        className={cx(
          "fixed top-4 right-4 w-[calc(28%-2rem)] h-[calc(100%-2rem)] bg-white/90 backdrop-blur-sm",
          "flex items-center justify-center p-8 transition-all duration-300",
          isVisible
            ? "opacity-100 translate-x-0"
            : "opacity-0 translate-x-full",
        )}
      >
        <div className="text-center">
          <p className="text-sm text-gray-600 mb-4">
            Failed to generate visualization
          </p>
          <p className="text-xs text-red-600 mb-4">{generationError}</p>
          <button
            type="button"
            onClick={handleClose}
            className="px-3 py-1 text-xs border border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  // Show no data state
  if (!processedData.length) {
    return (
      <div
        className={cx(
          "fixed top-4 right-4 w-[calc(28%-2rem)] h-[calc(100%-2rem)] bg-white/90 backdrop-blur-sm",
          "flex items-center justify-center p-8 transition-all duration-300",
          isVisible
            ? "opacity-100 translate-x-0"
            : "opacity-0 translate-x-full",
        )}
      >
        <div className="text-center">
          <p className="text-sm text-gray-600">
            No data available for this question.
          </p>
          <button
            type="button"
            onClick={handleClose}
            className="mt-4 px-3 py-1 text-xs border border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cx(
        "fixed top-4 right-4 w-[calc(28%-2rem)] h-[calc(100%-2rem)] bg-white/90 backdrop-blur-sm",
        "flex flex-col transition-all duration-300",
        isVisible ? "opacity-100 translate-x-0" : "opacity-0 translate-x-full",
      )}
    >
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-1 uppercase tracking-wide">
              {chartTitle}
            </h3>
            <p className="text-xs text-gray-600 leading-relaxed">{question}</p>
            {visualizationResult?.visualization.rationale && (
              <p className="text-xs text-gray-500 mt-1 italic">
                {visualizationResult.visualization.rationale}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="text-gray-500 hover:text-gray-700 text-xs"
            aria-label="Close overlay"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-4 overflow-y-auto">
        <MetricsGrid data={processedData} />

        <div className="border border-gray-200 p-3 mb-4">
          <h4 className="text-xs font-medium text-gray-900 mb-3 uppercase tracking-wide">
            {visualizationResult?.visualization.chartType || "Breakdown"}
          </h4>
          <BarChart data={processedData} />
        </div>

        {/* LLM-Generated Summary */}
        {visualizationResult?.summary && (
          <div className="mb-4 p-3 border border-gray-200">
            <h4 className="text-xs font-medium text-gray-900 mb-2 uppercase tracking-wide">
              Summary
            </h4>
            <p className="text-xs text-gray-600 leading-relaxed">
              {visualizationResult.summary}
            </p>
          </div>
        )}

        {/* LLM-Generated Key Findings */}
        {visualizationResult?.keyFindings &&
          visualizationResult.keyFindings.length > 0 && (
            <div className="text-xs text-gray-600 space-y-1">
              <h4 className="font-medium text-gray-900 mb-2 uppercase tracking-wide">
                Key Findings
              </h4>
              {visualizationResult.keyFindings.map((finding, index) => (
                <div
                  key={`finding-${finding.slice(0, 20).replace(/\s+/g, "-")}-${index}`}
                  className="flex items-start gap-2"
                >
                  <span className="text-gray-400">•</span>
                  <span>{finding}</span>
                </div>
              ))}
            </div>
          )}
      </div>
    </div>
  );
};
