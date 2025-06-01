import { cx } from "@/utils/cx";
import { useMemo, useState } from "react";

interface DataPoint {
  [key: string]: unknown;
}

interface DynamicUIOverlayProps {
  question: string;
  data: DataPoint[];
  onClose: () => void;
}

interface AggregatedData {
  label: string;
  value: number;
  count?: number;
  percentage?: number;
}

// Data processing utilities
const processDataForQuestion = (
  question: string,
  data: DataPoint[],
): AggregatedData[] => {
  const questionLower = question.toLowerCase();

  // Spotify/Music data patterns
  if (
    questionLower.includes("artist") &&
    (questionLower.includes("most") ||
      questionLower.includes("top") ||
      questionLower.includes("highest"))
  ) {
    return aggregateByField(data, "artistName", "msPlayed");
  }

  if (
    questionLower.includes("track") &&
    (questionLower.includes("most") ||
      questionLower.includes("top") ||
      questionLower.includes("highest"))
  ) {
    return aggregateByField(data, "trackName", "msPlayed");
  }

  if (questionLower.includes("time") && questionLower.includes("listening")) {
    return aggregateByTimePattern(data, "endTime", "msPlayed");
  }

  if (questionLower.includes("genre") || questionLower.includes("category")) {
    return aggregateByField(data, "artistName", "msPlayed"); // Fallback to artist for genre-like questions
  }

  // General patterns
  if (
    questionLower.includes("most frequent") ||
    questionLower.includes("most common")
  ) {
    const fields = Object.keys(data[0] || {});
    const stringField = fields.find((f) => typeof data[0]?.[f] === "string");
    if (stringField) {
      return aggregateByFrequency(data, stringField);
    }
  }

  if (questionLower.includes("total") || questionLower.includes("sum")) {
    const fields = Object.keys(data[0] || {});
    const numericField = fields.find((f) => typeof data[0]?.[f] === "number");
    if (numericField) {
      return aggregateByField(
        data,
        fields.find((f) => typeof data[0]?.[f] === "string") || fields[0],
        numericField,
      );
    }
  }

  // Default: return top categories by count
  const fields = Object.keys(data[0] || {});
  const stringField =
    fields.find((f) => typeof data[0]?.[f] === "string") || fields[0];
  return aggregateByFrequency(data, stringField);
};

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
    <div className="space-y-3">
      {data.map((item) => (
        <div
          key={`${item.label}-${item.value}`}
          className="flex items-center gap-3"
        >
          <div
            className="w-32 text-sm text-gray-700 font-medium truncate"
            title={item.label || "Data item"}
          >
            {item.label}
          </div>
          <div className="flex-1 bg-gray-200 rounded-full h-6 relative">
            <div
              className="bg-gradient-to-r from-blue-500 to-purple-600 h-6 rounded-full flex items-center justify-end pr-2"
              style={{ width: `${(item.value / maxValue) * 100}%` }}
            >
              <span className="text-white text-xs font-medium">
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
  const topItems = data.slice(0, 4);

  return (
    <div className="grid grid-cols-2 gap-4 mb-6">
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200">
        <div className="text-2xl font-bold text-blue-700">{data.length}</div>
        <div className="text-sm text-blue-600">Total Categories</div>
      </div>
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-lg border border-green-200">
        <div className="text-2xl font-bold text-green-700">
          {formatValue(totalValue)}
        </div>
        <div className="text-sm text-green-600">Total Value</div>
      </div>
      <div className="bg-gradient-to-r from-purple-50 to-violet-50 p-4 rounded-lg border border-purple-200">
        <div className="text-2xl font-bold text-purple-700">
          {topItems[0]?.label || "N/A"}
        </div>
        <div className="text-sm text-purple-600">Top Item</div>
      </div>
      <div className="bg-gradient-to-r from-orange-50 to-amber-50 p-4 rounded-lg border border-orange-200">
        <div className="text-2xl font-bold text-orange-700">
          {topItems[0] ? formatValue(topItems[0].value) : "N/A"}
        </div>
        <div className="text-sm text-orange-600">Top Value</div>
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

const getChartTitle = (question: string): string => {
  const questionLower = question.toLowerCase();

  if (questionLower.includes("artist")) return "Top Artists";
  if (questionLower.includes("track")) return "Top Tracks";
  if (questionLower.includes("time")) return "Listening Patterns";
  if (questionLower.includes("genre")) return "Genre Distribution";

  return "Data Analysis";
};

export const DynamicUIOverlay = ({
  question,
  data,
  onClose,
}: DynamicUIOverlayProps) => {
  const [isVisible, setIsVisible] = useState(true);

  const processedData = useMemo(() => {
    return processDataForQuestion(question, data);
  }, [question, data]);

  const chartTitle = getChartTitle(question);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 300); // Allow animation to complete
  };

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
          <p className="text-gray-600">No data available for this question.</p>
          <button
            type="button"
            onClick={handleClose}
            className="mt-4 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
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
      <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              {chartTitle}
            </h2>
            <p className="text-sm text-gray-600 leading-relaxed max-w-md">
              {question}
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="text-gray-500 hover:text-gray-700 p-1 rounded-full hover:bg-white/50"
            aria-label="Close overlay"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-6 overflow-y-auto">
        <MetricsGrid data={processedData} />

        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Detailed Breakdown
          </h3>
          <BarChart data={processedData} />
        </div>

        {/* Insights */}
        <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h4 className="font-medium text-blue-900 mb-2">Key Insights</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>
              • Top item: <strong>{processedData[0]?.label}</strong> with{" "}
              {formatValue(processedData[0]?.value || 0)}
            </li>
            <li>
              • Total items analyzed:{" "}
              <strong>{data.length.toLocaleString()}</strong>
            </li>
            <li>
              • Categories found: <strong>{processedData.length}</strong>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};
