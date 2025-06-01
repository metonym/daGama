import { cx } from "@/utils/cx";
import { Badge } from "./Badge";
import { DataTable } from "./DataTable";

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

interface DataInsightsProps {
  insights: DataInsight;
  onFieldSelect?: (field: string) => void;
  onVisualizationSelect?: (
    recommendation: DataInsight["visualizationRecommendations"][0],
  ) => void;
  onQuestionSelect?: (question: string) => void;
  isLoading: boolean;
  error: string | null;
}

const getPriorityColor = (priority: "high" | "medium" | "low") => {
  switch (priority) {
    case "high":
      return "bg-emerald-100 text-emerald-800";
    case "medium":
      return "bg-blue-100 text-blue-800";
    case "low":
      return "bg-slate-100 text-slate-800";
  }
};

export const DataInsights = ({
  insights,
  onVisualizationSelect,
  onQuestionSelect,
  isLoading,
  error,
}: DataInsightsProps) => {
  const visualizationColumns = [
    { id: "chart", header: "Chart Type, Fields & Rationale", span: 12 },
    { id: "priority", header: "Priority", span: 0, align: "right" as const },
  ];

  const renderVisualizationRow = (
    rec: DataInsight["visualizationRecommendations"][0],
    index: number,
  ) => [
    // Chart Type, Fields & Rationale
    <div key="chart-fields-rationale">
      <div className="font-medium text-gray-900 mb-1">{rec.chartType}</div>
      <div className="flex flex-wrap gap-1 mb-2">
        {rec.fieldCombination.map((field) => (
          <span
            key={field}
            className="px-1 py-0.5 text-xs bg-gray-100 text-gray-700 font-mono"
          >
            {field}
          </span>
        ))}
      </div>
      <p className="text-sm text-gray-600 leading-relaxed">{rec.rationale}</p>
    </div>,
    // Priority
    <span
      key="priority"
      className={cx(
        "px-2 py-1 text-xs font-medium",
        getPriorityColor(rec.priority),
      )}
    >
      {rec.priority}
    </span>,
  ];

  const visualizationSortFn = (
    a: DataInsight["visualizationRecommendations"][0],
    b: DataInsight["visualizationRecommendations"][0],
  ) => {
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    return priorityOrder[b.priority] - priorityOrder[a.priority];
  };

  return (
    <div>
      {/* Content */}
      <div>
        {isLoading && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="animate-spin h-6 w-6 border-2 border-blue-600 border-t-transparent mx-auto mb-3" />
              <p className="text-sm text-gray-600">Analyzing data with AI...</p>
            </div>
          </div>
        )}

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 mb-6">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {!isLoading && !error && insights && (
          <div className="space-y-8">
            {/* Key Insights Section */}
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-2 uppercase tracking-wide">
                Key Insights
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                AI-discovered patterns, anomalies, and notable observations from
                your dataset.
              </p>

              <div className="grid grid-cols-6 gap-3">
                {insights.keyInsights.map((insight, index) => (
                  <div
                    key={`insight-${insight.slice(0, 20).replace(/\s+/g, "-")}-${index}`}
                    className="bg-blue-50 border border-blue-200 p-3"
                  >
                    <p className="text-xs text-blue-900 leading-relaxed">
                      {insight}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Data Quality Notes Section */}
            {insights.dataQualityNotes.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-2 uppercase tracking-wide">
                  Data Quality Notes
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Important observations about data completeness, accuracy, and
                  potential issues.
                </p>
                <div className="grid grid-cols-6 gap-4">
                  {insights.dataQualityNotes.map((note, index) => (
                    <div
                      key={`quality-${note.slice(0, 20).replace(/\s+/g, "-")}-${index}`}
                      className="bg-yellow-50 border border-yellow-200 p-3"
                    >
                      <p className="text-xs text-yellow-900 leading-relaxed">
                        {note}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Visualization Recommendations Section */}
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-2 uppercase tracking-wide">
                Visualization Recommendations
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Chart types and field combinations that best reveal patterns in
                your data.
              </p>

              <div className="grid grid-cols-6 gap-4">
                {insights.visualizationRecommendations.map((rec, index) => (
                  <div
                    key={`${rec.chartType}-${rec.fieldCombination.join("-")}-${index}`}
                    className="bg-green-50 border border-green-200 p-3 flex flex-col space-y-4"
                  >
                    <div>
                      <div className="font-medium text-gray-900 text-xs mb-2">
                        {rec.chartType}
                      </div>
                      <p className="text-xs text-gray-600 leading-relaxed mb-2 flex-grow">
                        {rec.rationale}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {rec.fieldCombination.map((field) => (
                        <Badge
                          key={field}
                          variant="gray"
                          size="xs"
                        >
                          {field}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Suggested Questions Section */}
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-2 uppercase tracking-wide">
                Suggested Questions
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Analytical questions that could reveal deeper insights from your
                data.
              </p>

              <div className="space-y-2">
                {insights.suggestedQuestions.map((question, index) => (
                  <button
                    key={`question-${question.slice(0, 20).replace(/\s+/g, "-")}-${index}`}
                    type="button"
                    className="w-full text-left p-3 border border-gray-200 hover:bg-gray-50 transition-colors"
                    onClick={() => onQuestionSelect?.(question)}
                  >
                    <p className="text-sm text-gray-900 leading-relaxed">
                      {question}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
