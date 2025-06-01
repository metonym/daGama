import { cx } from "@/utils/cx";
import { useMemo } from "react";

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

interface ProactiveDataAnalysisProps {
  data: DataPoint[];
  fileName?: string;
  semanticFields?: SemanticField[];
}

interface FieldAnalysis {
  field: string;
  type: "string" | "number" | "date" | "boolean" | "other";
  uniqueCount: number;
  nullCount: number;
  topValues?: Array<{ value: string; count: number; percentage: number }>;
  numericStats?: {
    min: number;
    max: number;
    avg: number;
    sum: number;
  };
}

interface AggregationResult {
  title: string;
  data: Array<{ label: string; value: number; percentage?: number }>;
  valueType: "count" | "sum" | "duration";
}

// Utility functions
const inferFieldType = (
  values: unknown[],
): "string" | "number" | "date" | "boolean" | "other" => {
  const sampleValues = values.filter((v) => v != null).slice(0, 10);

  if (sampleValues.every((v) => typeof v === "boolean")) return "boolean";
  if (sampleValues.every((v) => typeof v === "number")) return "number";
  if (
    sampleValues.every(
      (v) => typeof v === "string" && !Number.isNaN(Date.parse(v as string)),
    )
  )
    return "date";
  if (sampleValues.every((v) => typeof v === "string")) return "string";

  return "other";
};

const analyzeField = (data: DataPoint[], field: string): FieldAnalysis => {
  const values = data.map((item) => item[field]);
  const nonNullValues = values.filter((v) => v != null);
  const type = inferFieldType(nonNullValues);

  const analysis: FieldAnalysis = {
    field,
    type,
    uniqueCount: new Set(nonNullValues.map((v) => String(v))).size,
    nullCount: values.length - nonNullValues.length,
  };

  if (type === "string") {
    const counts: { [key: string]: number } = {};
    for (const value of nonNullValues) {
      const str = String(value);
      counts[str] = (counts[str] || 0) + 1;
    }

    const total = nonNullValues.length;
    analysis.topValues = Object.entries(counts)
      .map(([value, count]) => ({
        value,
        count,
        percentage: Math.round((count / total) * 100),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }

  if (type === "number") {
    const numbers = nonNullValues
      .map((v) => Number(v))
      .filter((n) => !Number.isNaN(n));
    if (numbers.length > 0) {
      analysis.numericStats = {
        min: Math.min(...numbers),
        max: Math.max(...numbers),
        avg: numbers.reduce((sum, n) => sum + n, 0) / numbers.length,
        sum: numbers.reduce((sum, n) => sum + n, 0),
      };
    }
  }

  return analysis;
};

const generateAggregations = (
  data: DataPoint[],
  fieldAnalyses: FieldAnalysis[],
  semanticFields?: SemanticField[],
): AggregationResult[] => {
  const results: AggregationResult[] = [];

  // Create a map for quick importance lookup
  const importanceMap = new Map<string, "high" | "medium" | "low">();
  if (semanticFields) {
    for (const field of semanticFields) {
      importanceMap.set(field.field, field.importance);
    }
  }

  // Helper function to get importance score for sorting
  const getImportanceScore = (fieldName: string): number => {
    const importance = importanceMap.get(fieldName);
    switch (importance) {
      case "high":
        return 3;
      case "medium":
        return 2;
      case "low":
        return 1;
      default:
        return 0; // No semantic info available
    }
  };

  // Basic fallback: show distributions for categorical fields
  const categoricalFields = fieldAnalyses.filter(
    (f) =>
      f.type === "string" &&
      f.uniqueCount < data.length * 0.8 &&
      f.uniqueCount > 1,
  );

  // Sort categorical fields by importance
  const sortedCategoricalFields = categoricalFields.sort((a, b) => {
    const scoreA = getImportanceScore(a.field);
    const scoreB = getImportanceScore(b.field);
    return scoreB - scoreA; // Higher importance first
  });

  for (const field of sortedCategoricalFields.slice(0, 4)) {
    if (field.topValues && field.topValues.length > 1) {
      results.push({
        title: `Distribution by ${field.field}`,
        data: field.topValues.slice(0, 8).map((item) => ({
          label: item.value,
          value: item.count,
          percentage: item.percentage,
        })),
        valueType: "count",
      });
    }
  }

  // Add cross-field analysis: numeric aggregations by categorical fields
  const numericFields = fieldAnalyses.filter((f) => f.type === "number");

  // Sort numeric fields by importance
  const sortedNumericFields = numericFields.sort((a, b) => {
    const scoreA = getImportanceScore(a.field);
    const scoreB = getImportanceScore(b.field);
    return scoreB - scoreA; // Higher importance first
  });

  for (const categoricalField of sortedCategoricalFields.slice(0, 2)) {
    for (const numericField of sortedNumericFields.slice(0, 2)) {
      const grouped: { [key: string]: number } = {};

      for (const item of data) {
        const key = String(item[categoricalField.field] || "Unknown");
        const value = Number(item[numericField.field]) || 0;
        grouped[key] = (grouped[key] || 0) + value;
      }

      const sortedData = Object.entries(grouped)
        .map(([label, value]) => ({ label, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 8);

      if (sortedData.length > 1) {
        const isDuration =
          numericField.field.toLowerCase().includes("ms") ||
          numericField.field.toLowerCase().includes("duration") ||
          numericField.field.toLowerCase().includes("time") ||
          numericField.field.toLowerCase().includes("played");

        results.push({
          title: `${numericField.field} by ${categoricalField.field}`,
          data: sortedData,
          valueType: isDuration ? "duration" : "sum",
        });
      }
    }
  }

  // Sort final results by the maximum importance of fields involved in each aggregation
  return results
    .sort((a, b) => {
      // Extract field names from titles to determine importance
      const getAggregationImportance = (agg: AggregationResult): number => {
        let maxImportance = 0;

        // Check for "Distribution by field" pattern
        if (agg.title.startsWith("Distribution by ")) {
          const field = agg.title.replace("Distribution by ", "");
          maxImportance = Math.max(maxImportance, getImportanceScore(field));
        }
        // Check for "field1 by field2" pattern
        else if (agg.title.includes(" by ")) {
          const parts = agg.title.split(" by ");
          if (parts.length === 2) {
            maxImportance = Math.max(
              maxImportance,
              getImportanceScore(parts[0]),
            );
            maxImportance = Math.max(
              maxImportance,
              getImportanceScore(parts[1]),
            );
          }
        }

        return maxImportance;
      };

      const importanceA = getAggregationImportance(a);
      const importanceB = getAggregationImportance(b);
      return importanceB - importanceA; // Higher importance first
    })
    .slice(0, 6);
};

const formatValue = (
  value: number,
  type: "count" | "sum" | "duration",
): string => {
  if (type === "duration") {
    // Convert ms to readable format with intelligent unit selection
    const totalSeconds = Math.floor(value / 1000);
    const totalMinutes = Math.floor(totalSeconds / 60);
    const totalHours = Math.floor(totalMinutes / 60);
    const totalDays = Math.floor(totalHours / 24);

    // For very long durations, show days
    if (totalDays > 0) {
      const remainingHours = totalHours % 24;
      if (totalDays > 30) {
        // For very long periods, just show days
        return `${totalDays.toLocaleString()}d`;
      }
      if (remainingHours > 0) {
        return `${totalDays.toLocaleString()}d ${remainingHours}h`;
      }
      return `${totalDays.toLocaleString()}d`;
    }

    // For medium durations, show hours and minutes
    if (totalHours > 0) {
      const remainingMinutes = totalMinutes % 60;
      if (totalHours > 24) {
        // For more than a day worth of hours, omit minutes
        return `${totalHours.toLocaleString()}h`;
      }
      if (remainingMinutes > 0) {
        return `${totalHours.toLocaleString()}h ${remainingMinutes}m`;
      }
      return `${totalHours.toLocaleString()}h`;
    }

    // For short durations, show minutes and seconds
    if (totalMinutes > 0) {
      const remainingSeconds = totalSeconds % 60;
      if (remainingSeconds > 0) {
        return `${totalMinutes.toLocaleString()}m ${remainingSeconds}s`;
      }
      return `${totalMinutes.toLocaleString()}m`;
    }

    return `${totalSeconds.toLocaleString()}s`;
  }

  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return value.toLocaleString();
};

const MiniBarChart = ({ aggregation }: { aggregation: AggregationResult }) => {
  // Calculate total for percentage calculation if percentages aren't provided
  const totalValue = aggregation.data.reduce((sum, d) => sum + d.value, 0);

  // Parse title to identify field names that should be styled as tags
  const renderTitle = (title: string) => {
    // Handle patterns like "Distribution by field" or "field1 by field2"
    const parts = title.split(/\s+(by)\s+/);

    if (parts.length === 3) {
      // Pattern: "something by field"
      const [prefix, byWord, field] = parts;
      return (
        <span className="text-[10px] font-medium text-gray-700">
          {prefix} {byWord}{" "}
          <span className="inline-block px-1 py-0.5 bg-gray-200 text-gray-700 font-mono font-semibold">
            {field}
          </span>
        </span>
      );
    }

    // Check if it starts with "Distribution by"
    if (title.startsWith("Distribution by ")) {
      const field = title.replace("Distribution by ", "");
      return (
        <span className="text-[10px] font-medium text-gray-700">
          Distribution by{" "}
          <span className="inline-block px-2 py-0.5 bg-gray-200 text-gray-700 font-mono">
            {field}
          </span>
        </span>
      );
    }

    // Check for pattern "field by field"
    const byIndex = title.indexOf(" by ");
    if (byIndex !== -1) {
      const firstField = title.substring(0, byIndex);
      const secondField = title.substring(byIndex + 4);
      return (
        <span className="text-[10px] font-medium text-gray-700">
          <span className="inline-block px-2 py-0.5 bg-gray-200 text-gray-700 font-mono mr-1">
            {firstField}
          </span>
          by{" "}
          <span className="inline-block px-2 py-0.5 bg-gray-200 text-gray-700 font-mono">
            {secondField}
          </span>
        </span>
      );
    }

    // Fallback: return as-is
    return (
      <span className="text-[10px] font-medium text-gray-700">{title}</span>
    );
  };

  const renderValue = (item: { value: number; percentage?: number }) => {
    if (aggregation.valueType === "duration") {
      // For duration, only show the formatted time
      return formatValue(item.value, aggregation.valueType);
    }

    if (item.percentage) {
      // For count/sum with percentage, show both percentage and sum
      return `${item.percentage}% (${formatValue(item.value, aggregation.valueType)})`;
    }

    // Fallback to just the formatted value
    return formatValue(item.value, aggregation.valueType);
  };

  // Calculate percentage for bar width
  const getBarWidth = (item: { value: number; percentage?: number }) => {
    if (item.percentage !== undefined) {
      return item.percentage;
    }
    // Calculate percentage based on total if not provided
    return totalValue > 0 ? (item.value / totalValue) * 100 : 0;
  };

  return (
    <div className="bg-white border border-gray-200">
      <div className="flex items-center px-3 py-1 border-b border-gray-100 bg-gray-50">
        {renderTitle(aggregation.title)}
      </div>
      <div className="p-3">
        <div className="space-y-3">
          {aggregation.data.slice(0, 6).map((item, index) => (
            <div
              key={`${item.label}-${index}`}
              className="space-y-1"
            >
              <div className="flex items-center justify-between">
                <div className="text-[10px] text-gray-600 font-mono flex-1 min-w-0">
                  {item.label}
                </div>
                <div className="text-[10px] text-gray-900 font-mono ml-2 flex-shrink-0">
                  {renderValue(item)}
                </div>
              </div>
              <div className="bg-gray-100 h-0.5 relative w-full">
                <div
                  className="bg-blue-600 h-0.5"
                  style={{ width: `${getBarWidth(item)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const StatsCard = ({
  title,
  value,
  subtitle,
}: {
  title: string;
  value: string | number;
  subtitle: string;
}) => (
  <div>
    <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">
      {title}
    </div>
    <div className="text-xl text-gray-900 mb-1 font-mono">{value}</div>
    <div className="text-xs text-gray-500">{subtitle}</div>
  </div>
);

interface DataStatsProps {
  data: DataPoint[];
}

export const DataStats = ({ data }: DataStatsProps) => {
  const analysis = useMemo(() => {
    if (!data.length) return null;

    const fields = Object.keys(data[0]);
    const fieldAnalyses = fields.map((field) => analyzeField(data, field));

    // Calculate overall stats
    const totalRecords = data.length;
    const totalFields = fields.length;
    const numericFields = fieldAnalyses.filter((f) => f.type === "number");
    const stringFields = fieldAnalyses.filter((f) => f.type === "string");

    return {
      fieldAnalyses,
      stats: {
        totalRecords,
        totalFields,
        numericFields: numericFields.length,
        stringFields: stringFields.length,
        mostPopularField: stringFields.sort(
          (a, b) =>
            (b.topValues?.[0]?.count || 0) - (a.topValues?.[0]?.count || 0),
        )[0],
      },
    };
  }, [data]);

  if (!analysis || !data.length) {
    return null;
  }

  return (
    <div className="grid grid-cols-4 gap-4">
      <StatsCard
        title="Records"
        value={analysis.stats.totalRecords.toLocaleString()}
        subtitle={"dataset"}
      />
      <StatsCard
        title="Fields"
        value={analysis.stats.totalFields}
        subtitle={`${analysis.stats.numericFields} numeric, ${analysis.stats.stringFields} text`}
      />
      <StatsCard
        title="Categories"
        value={analysis.fieldAnalyses
          .reduce((sum, f) => sum + f.uniqueCount, 0)
          .toLocaleString()}
        subtitle="unique values total"
      />
      <StatsCard
        title="Completeness"
        value={`${Math.round((1 - analysis.fieldAnalyses.reduce((sum, f) => sum + f.nullCount, 0) / (data.length * analysis.stats.totalFields)) * 100)}%`}
        subtitle="complete fields"
      />
    </div>
  );
};

export const ProactiveDataAnalysis = ({
  data,
  fileName,
  semanticFields,
}: ProactiveDataAnalysisProps) => {
  const analysis = useMemo(() => {
    if (!data.length) return null;

    const fields = Object.keys(data[0]);
    const fieldAnalyses = fields.map((field) => analyzeField(data, field));
    const aggregations = generateAggregations(
      data,
      fieldAnalyses,
      semanticFields,
    );

    // Calculate overall stats
    const totalRecords = data.length;
    const totalFields = fields.length;
    const numericFields = fieldAnalyses.filter((f) => f.type === "number");
    const stringFields = fieldAnalyses.filter((f) => f.type === "string");

    return {
      fieldAnalyses,
      aggregations,
      stats: {
        totalRecords,
        totalFields,
        numericFields: numericFields.length,
        stringFields: stringFields.length,
        mostPopularField: stringFields.sort(
          (a, b) =>
            (b.topValues?.[0]?.count || 0) - (a.topValues?.[0]?.count || 0),
        )[0],
      },
    };
  }, [data, semanticFields]);

  if (!analysis || !data.length) {
    return null;
  }

  return (
    <div className="space-y-12">
      {/* Data Analysis Explanation */}
      {analysis.aggregations.length > 0 && (
        <div className="max-w-2xl">
          <p className="text-gray-700 font-serif text-2xl">
            Your data is analyzed to identify important fields by content type
            and relevance. These rankings inform the visualizations below,
            highlighting the most meaningful patterns and relationships in your
            dataset.
          </p>
        </div>
      )}

      {/* Field Suggestions - Show always when we have data */}
      <div className="max-w-3/4">
        <div className="text-sm text-gray-600 font-medium mb-3">
          Suggested properties for analysis:
        </div>
        {semanticFields && semanticFields.length > 0 ? (
          <div className="bg-white border border-gray-200">
            {/* Table Header */}
            <div className="bg-gray-50 border-b border-gray-200 px-3 py-2">
              <div className="grid grid-cols-12 gap-4 text-xs font-medium text-gray-700 uppercase tracking-wide">
                <div className="col-span-8">Field & Description</div>
                <div className="col-span-2">Content Type</div>
                <div className="col-span-2 text-right">Importance</div>
              </div>
            </div>
            {/* Table Body */}
            <div className="divide-y divide-gray-100">
              {semanticFields
                .sort((a, b) => {
                  // Sort by importance: high > medium > low
                  const importanceOrder = { high: 3, medium: 2, low: 1 };
                  return (
                    importanceOrder[b.importance] -
                    importanceOrder[a.importance]
                  );
                })
                .map((field) => (
                  <div
                    key={field.field}
                    className="px-3 py-2"
                  >
                    <div className="grid grid-cols-12 gap-4 items-center">
                      {/* Field & Description */}
                      <div className="col-span-8">
                        <div className="font-mono font-medium text-gray-900 text-xs">
                          {field.field}
                        </div>
                        <p className="text-xs text-gray-500 leading-relaxed">
                          {field.semanticMeaning}
                        </p>
                      </div>

                      {/* Content Type */}
                      <div className="col-span-2">
                        <span className="inline-block px-2 py-1 bg-gray-100 text-gray-700 text-xs font-medium">
                          {field.category}
                        </span>
                      </div>

                      {/* Importance */}
                      <div className="col-span-2 flex justify-end">
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-block w-2 h-2 rounded-full ${
                              field.importance === "high"
                                ? "bg-blue-500"
                                : field.importance === "medium"
                                  ? "bg-gray-400"
                                  : "bg-yellow-500"
                            }`}
                          />
                          <span className="text-xs text-gray-700 capitalize font-medium">
                            {field.importance}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        ) : analysis.aggregations.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {(() => {
              const extractedFields = new Set<string>();

              for (const agg of analysis.aggregations) {
                // Extract fields from "Distribution by field" pattern
                if (agg.title.startsWith("Distribution by ")) {
                  const field = agg.title.replace("Distribution by ", "");
                  extractedFields.add(field);
                }
                // Extract fields from "field1 by field2" pattern
                else if (agg.title.includes(" by ")) {
                  const parts = agg.title.split(" by ");
                  if (parts.length === 2) {
                    extractedFields.add(parts[0]);
                    extractedFields.add(parts[1]);
                  }
                }
              }

              return Array.from(extractedFields)
                .sort()
                .map((field) => (
                  <span
                    key={field}
                    className="inline-block px-2 py-0.5 bg-blue-50 text-blue-700 text-xs font-mono border border-blue-200 rounded"
                  >
                    {field}
                  </span>
                ));
            })()}
          </div>
        ) : (
          <div className="text-xs text-gray-500 italic">
            No semantic analysis available. Click "Analyze with AI" to get field
            insights.
          </div>
        )}
      </div>

      {/* Aggregation Charts */}
      {analysis.aggregations.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {analysis.aggregations.map((agg, index) => (
            <MiniBarChart
              key={`${agg.title}-${index}`}
              aggregation={agg}
            />
          ))}
        </div>
      )}
    </div>
  );
};
