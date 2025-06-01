import { cx } from "@/utils/cx";
import { useState } from "react";

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
}

const getImportanceColor = (importance: "high" | "medium" | "low") => {
  switch (importance) {
    case "high":
      return "bg-red-100 text-red-800 border-red-200";
    case "medium":
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
    case "low":
      return "bg-gray-100 text-gray-800 border-gray-200";
  }
};

const getPriorityColor = (priority: "high" | "medium" | "low") => {
  switch (priority) {
    case "high":
      return "bg-emerald-100 text-emerald-800 border-emerald-200";
    case "medium":
      return "bg-blue-100 text-blue-800 border-blue-200";
    case "low":
      return "bg-slate-100 text-slate-800 border-slate-200";
  }
};

export const DataInsights = ({
  insights,
  onFieldSelect,
  onVisualizationSelect,
  onQuestionSelect,
}: DataInsightsProps) => {
  const [activeTab, setActiveTab] = useState<
    "semantic" | "viz" | "insights" | "questions"
  >("semantic");

  const tabs = [
    {
      id: "semantic" as const,
      label: "Field Analysis",
      count: insights.semanticAnalysis.length,
    },
    {
      id: "viz" as const,
      label: "Visualizations",
      count: insights.visualizationRecommendations.length,
    },
    {
      id: "insights" as const,
      label: "Key Insights",
      count: insights.keyInsights.length,
    },
    {
      id: "questions" as const,
      label: "Questions",
      count: insights.suggestedQuestions.length,
    },
  ];

  return (
    <div className="bg-white border border-gray-200 overflow-hidden h-96">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200 p-4">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">
          🤖 AI Data Analysis
        </h2>
        <div
          className="flex space-x-1"
          role="tablist"
        >
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              aria-controls={`${tab.id}-panel`}
              onClick={() => setActiveTab(tab.id)}
              className={cx(
                "px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
                activeTab === tab.id
                  ? "bg-white text-blue-700 shadow-sm border border-blue-200"
                  : "text-gray-600 hover:text-gray-900 hover:bg-white/50",
              )}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-xs bg-gray-200 text-gray-700 rounded-full">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-4 h-80 overflow-y-auto">
        {activeTab === "semantic" && (
          <div
            className="space-y-3"
            role="tabpanel"
            id="semantic-panel"
          >
            {insights.semanticAnalysis.map((analysis) => (
              <button
                key={analysis.field}
                type="button"
                className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                onClick={() => onFieldSelect?.(analysis.field)}
                aria-label={`Select field ${analysis.field}`}
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-mono text-sm font-medium text-gray-900">
                    {analysis.field}
                  </h3>
                  <div className="flex items-center space-x-2">
                    <span
                      className={cx(
                        "px-2 py-1 text-xs font-medium border rounded-full",
                        getImportanceColor(analysis.importance),
                      )}
                    >
                      {analysis.importance}
                    </span>
                    <span className="px-2 py-1 text-xs bg-blue-50 text-blue-700 border border-blue-200 rounded-full">
                      {analysis.category}
                    </span>
                  </div>
                </div>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {analysis.semanticMeaning}
                </p>
                <div className="mt-2 text-xs text-gray-500">
                  Type: <span className="font-mono">{analysis.dataType}</span>
                </div>
              </button>
            ))}
          </div>
        )}

        {activeTab === "viz" && (
          <div
            className="space-y-3"
            role="tabpanel"
            id="viz-panel"
          >
            {insights.visualizationRecommendations.map((rec, index) => (
              <button
                key={`${rec.chartType}-${rec.fieldCombination.join("-")}-${index}`}
                type="button"
                className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                onClick={() => onVisualizationSelect?.(rec)}
                aria-label={`Select ${rec.chartType} visualization`}
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-medium text-gray-900">{rec.chartType}</h3>
                  <span
                    className={cx(
                      "px-2 py-1 text-xs font-medium border rounded-full",
                      getPriorityColor(rec.priority),
                    )}
                  >
                    {rec.priority} priority
                  </span>
                </div>
                <div className="mb-2">
                  <span className="text-xs text-gray-500 uppercase tracking-wide">
                    Fields:
                  </span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {rec.fieldCombination.map((field) => (
                      <span
                        key={field}
                        className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded font-mono"
                      >
                        {field}
                      </span>
                    ))}
                  </div>
                </div>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {rec.rationale}
                </p>
              </button>
            ))}
          </div>
        )}

        {activeTab === "insights" && (
          <div
            className="space-y-2"
            role="tabpanel"
            id="insights-panel"
          >
            {insights.keyInsights.map((insight, index) => (
              <div
                key={`insight-${insight.slice(0, 20).replace(/\s+/g, "-")}-${index}`}
                className="p-3 bg-blue-50 border border-blue-200 rounded-lg"
              >
                <div className="flex items-start">
                  <span
                    className="text-blue-600 mr-2 mt-0.5"
                    aria-hidden="true"
                  >
                    💡
                  </span>
                  <p className="text-sm text-blue-900 leading-relaxed">
                    {insight}
                  </p>
                </div>
              </div>
            ))}

            {insights.dataQualityNotes.length > 0 && (
              <div className="mt-4">
                <h4 className="text-sm font-medium text-gray-900 mb-2">
                  Data Quality Notes
                </h4>
                {insights.dataQualityNotes.map((note, index) => (
                  <div
                    key={`quality-${note.slice(0, 20).replace(/\s+/g, "-")}-${index}`}
                    className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg mb-2"
                  >
                    <div className="flex items-start">
                      <span
                        className="text-yellow-600 mr-2 mt-0.5"
                        aria-hidden="true"
                      >
                        ⚠️
                      </span>
                      <p className="text-sm text-yellow-900 leading-relaxed">
                        {note}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "questions" && (
          <div
            className="space-y-2"
            role="tabpanel"
            id="questions-panel"
          >
            {insights.suggestedQuestions.map((question, index) => (
              <button
                key={`question-${question.slice(0, 20).replace(/\s+/g, "-")}-${index}`}
                type="button"
                className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                onClick={() => onQuestionSelect?.(question)}
              >
                <div className="flex items-start">
                  <span
                    className="text-green-600 mr-2 mt-0.5"
                    aria-hidden="true"
                  >
                    ❓
                  </span>
                  <p className="text-sm text-gray-900 leading-relaxed">
                    {question}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
