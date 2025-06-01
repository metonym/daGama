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

const getChartTitle = (question: string): string => {
  const questionLower = question.toLowerCase();

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
            Breakdown
          </h4>
          <BarChart data={processedData} />
        </div>

        {/* Summary */}
        <div className="text-xs text-gray-600 space-y-1">
          <div>
            Top:{" "}
            <span className="font-medium text-gray-900">
              {processedData[0]?.label}
            </span>
          </div>
          <div>
            Items:{" "}
            <span className="font-medium text-gray-900">
              {data.length.toLocaleString()}
            </span>
          </div>
          <div>
            Categories:{" "}
            <span className="font-medium text-gray-900">
              {processedData.length}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
