import { cx } from "@/utils/cx";
import { useMemo } from "react";

interface DataPoint {
  [key: string]: unknown;
}

interface ProactiveDataAnalysisProps {
  data: DataPoint[];
  fileName?: string;
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
): AggregationResult[] => {
  const results: AggregationResult[] = [];

  // Basic fallback: show distributions for categorical fields
  const categoricalFields = fieldAnalyses.filter(
    (f) =>
      f.type === "string" &&
      f.uniqueCount < data.length * 0.8 &&
      f.uniqueCount > 1,
  );

  for (const field of categoricalFields.slice(0, 4)) {
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

  for (const categoricalField of categoricalFields.slice(0, 2)) {
    for (const numericField of numericFields.slice(0, 2)) {
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

  return results.slice(0, 6);
};

const formatValue = (
  value: number,
  type: "count" | "sum" | "duration",
): string => {
  if (type === "duration") {
    // Convert ms to readable format
    const seconds = Math.floor(value / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  }

  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return value.toString();
};

const MiniBarChart = ({ aggregation }: { aggregation: AggregationResult }) => {
  const maxValue = Math.max(...aggregation.data.map((d) => d.value));

  return (
    <div className="bg-white p-4 rounded-lg border border-gray-200">
      <h3 className="font-medium text-gray-900 mb-3 text-sm">
        {aggregation.title}
      </h3>
      <div className="space-y-2">
        {aggregation.data.slice(0, 5).map((item, index) => (
          <div
            key={`${item.label}-${index}`}
            className="flex items-center gap-2"
          >
            <div
              className="w-20 text-xs text-gray-600 truncate"
              title={item.label}
            >
              {item.label}
            </div>
            <div className="flex-1 bg-gray-100 rounded-full h-3 relative">
              <div
                className="bg-gradient-to-r from-indigo-500 to-purple-600 h-3 rounded-full"
                style={{ width: `${(item.value / maxValue) * 100}%` }}
              />
            </div>
            <div className="w-12 text-xs text-gray-700 text-right">
              {item.percentage
                ? `${item.percentage}%`
                : formatValue(item.value, aggregation.valueType)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const StatsCard = ({
  title,
  value,
  subtitle,
  color,
}: {
  title: string;
  value: string | number;
  subtitle: string;
  color: string;
}) => (
  <div className={cx("p-4 rounded-lg border", color)}>
    <div className="text-2xl font-bold text-gray-900">{value}</div>
    <div className="text-sm font-medium text-gray-700">{title}</div>
    <div className="text-xs text-gray-500">{subtitle}</div>
  </div>
);

export const ProactiveDataAnalysis = ({
  data,
  fileName,
}: ProactiveDataAnalysisProps) => {
  const analysis = useMemo(() => {
    if (!data.length) return null;

    const fields = Object.keys(data[0]);
    const fieldAnalyses = fields.map((field) => analyzeField(data, field));
    const aggregations = generateAggregations(data, fieldAnalyses);

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
  }, [data]);

  if (!analysis || !data.length) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Quick Stats */}
      <div className="grid grid-cols-4 gap-4">
        <StatsCard
          title="Total Records"
          value={analysis.stats.totalRecords.toLocaleString()}
          subtitle={fileName || "dataset"}
          color="bg-blue-50 border-blue-200"
        />
        <StatsCard
          title="Fields"
          value={analysis.stats.totalFields}
          subtitle={`${analysis.stats.numericFields} numeric, ${analysis.stats.stringFields} text`}
          color="bg-green-50 border-green-200"
        />
        <StatsCard
          title="Categories"
          value={analysis.fieldAnalyses.reduce(
            (sum, f) => sum + f.uniqueCount,
            0,
          )}
          subtitle="unique values total"
          color="bg-purple-50 border-purple-200"
        />
        <StatsCard
          title="Data Quality"
          value={`${Math.round((1 - analysis.fieldAnalyses.reduce((sum, f) => sum + f.nullCount, 0) / (data.length * analysis.stats.totalFields)) * 100)}%`}
          subtitle="complete fields"
          color="bg-orange-50 border-orange-200"
        />
      </div>

      {/* Aggregation Charts */}
      {analysis.aggregations.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Key Insights
          </h3>
          <div className="grid grid-cols-2 gap-4">
            {analysis.aggregations.map((agg, index) => (
              <MiniBarChart
                key={`${agg.title}-${index}`}
                aggregation={agg}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
