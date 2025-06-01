import { useDataAnalysis } from "@/hooks/useDataAnalysis";
import { cx } from "@/utils/cx";
import { type JsonSchema, inferJsonSchema } from "@/utils/schema-inference";
import { useCallback, useEffect, useRef, useState } from "react";
import { DataInsights } from "./DataInsights";
import { JsonViewer } from "./JsonViewer";
import { DataStats, ProactiveDataAnalysis } from "./ProactiveDataAnalysis";
import { SchemaInspector } from "./SchemaInspector";
import { Subtitle2 } from "./typography";

interface FileDropProps {
  onFileProcessed?: (data: unknown, schema: JsonSchema) => void;
  onQuestionSelect?: (
    question: string,
    data: Array<Record<string, unknown>>,
    insights?: {
      semanticAnalysis?: Array<{
        field: string;
        semanticMeaning: string;
        dataType: string;
        importance: "high" | "medium" | "low";
        category: string;
      }>;
      visualizationRecommendations?: Array<{
        fieldCombination: string[];
        chartType: string;
        rationale: string;
        priority: "high" | "medium" | "low";
      }>;
    },
  ) => void;
  className?: string;
}

interface ProcessedFile {
  name: string;
  data: unknown;
  schema: JsonSchema;
  size: number;
  objectCount: number;
}

interface ParseProgress {
  progress: number;
  processed: number;
  total: number;
  isStreaming?: boolean;
  currentCount?: number;
}

export const FileDrop = ({
  onFileProcessed,
  onQuestionSelect,
  className,
}: FileDropProps) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [parseProgress, setParseProgress] = useState<ParseProgress | null>(
    null,
  );
  const [processedFile, setProcessedFile] = useState<ProcessedFile | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const workerRef = useRef<Worker | null>(null);

  // Add AI analysis hook
  const {
    insights,
    loading: analyzeLoading,
    error: analyzeError,
    analyzeSchema,
    clearInsights,
  } = useDataAnalysis();

  // Initialize worker
  useEffect(() => {
    if (typeof Worker !== "undefined") {
      workerRef.current = new Worker(
        new URL("../workers/jsonParser.worker.ts", import.meta.url),
        { type: "module" },
      );

      workerRef.current.onmessage = (event) => {
        const {
          type,
          progress,
          processed,
          total,
          data,
          count,
          error: workerError,
        } = event.data;

        switch (type) {
          case "progress":
            setParseProgress({
              progress,
              processed,
              total,
              isStreaming: false,
            });
            break;

          case "partial":
            setParseProgress((prev) => ({
              ...(prev || { progress: 0, processed: 0, total: 0 }),
              isStreaming: true,
              currentCount: count,
            }));

            // For streaming arrays, we can start showing partial results
            if (Array.isArray(data) && data.length > 0) {
              // You could update UI here to show partial data
              console.log(`Parsed ${count} items so far...`);
            }
            break;

          case "complete":
            setParseProgress(null);
            setIsProcessing(false);

            if (workerError) {
              setError(workerError);
            } else if (data) {
              try {
                const schema = inferJsonSchema(data);
                const objectCount = Array.isArray(data) ? data.length : 1;

                const processed: ProcessedFile = {
                  name: currentFileRef.current?.name || "Unknown",
                  data,
                  schema,
                  size: currentFileRef.current?.size || 0,
                  objectCount,
                };

                setProcessedFile(processed);
                onFileProcessed?.(data, schema);

                // Automatically run AI analysis
                setTimeout(() => {
                  const sampleData = Array.isArray(data)
                    ? (data.slice(0, 5) as Array<Record<string, unknown>>)
                    : [data as Record<string, unknown>];
                  analyzeSchema(schema, sampleData, processed.name);
                }, 100);
              } catch (schemaError) {
                setError("Failed to infer schema from parsed data");
              }
            }
            break;
        }
      };

      workerRef.current.onerror = (error) => {
        console.error("Worker error:", error);
        setError("Failed to process file due to worker error");
        setIsProcessing(false);
        setParseProgress(null);
      };
    }

    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
      }
    };
  }, [onFileProcessed, analyzeSchema]);

  const currentFileRef = useRef<File | null>(null);

  const processJsonFile = useCallback(
    async (file: File) => {
      setIsProcessing(true);
      setError(null);
      setParseProgress({ progress: 0, processed: 0, total: file.size });
      currentFileRef.current = file;

      try {
        if (workerRef.current) {
          // Always use worker when available
          const text = await file.text();
          const isLikelyArray = text.trim().startsWith("[");

          workerRef.current.postMessage({
            type: "parse",
            fileContent: text,
            isArray: isLikelyArray,
          });
        } else {
          // Fallback to main thread only when workers are not supported
          const text = await file.text();
          let data: unknown;

          try {
            data = JSON.parse(text);
          } catch (parseError) {
            throw new Error("Invalid format");
          }

          const schema = inferJsonSchema(data);
          const objectCount = Array.isArray(data) ? data.length : 1;

          const processed: ProcessedFile = {
            name: file.name,
            data,
            schema,
            size: file.size,
            objectCount,
          };

          setProcessedFile(processed);
          onFileProcessed?.(data, schema);
          setIsProcessing(false);

          // Automatically run AI analysis
          setTimeout(() => {
            const sampleData = Array.isArray(data)
              ? (data.slice(0, 5) as Array<Record<string, unknown>>)
              : [data as Record<string, unknown>];
            analyzeSchema(schema, sampleData, processed.name);
          }, 100);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to process file");
        setIsProcessing(false);
        setParseProgress(null);
      }
    },
    [onFileProcessed, analyzeSchema],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);

      const files = Array.from(e.dataTransfer.files);
      const jsonFile = files.find(
        (file) =>
          file.type === "application/json" || file.name.endsWith(".json"),
      );

      if (!jsonFile) {
        setError("Please drop a file");
        return;
      }

      processJsonFile(jsonFile);
    },
    [processJsonFile],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        processJsonFile(file);
      }
    },
    [processJsonFile],
  );

  const handleBrowseClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const clearFile = useCallback(() => {
    setProcessedFile(null);
    setError(null);
    setParseProgress(null);
    clearInsights(); // Clear analysis when clearing file
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [clearInsights]);

  // Add function to handle AI analysis
  const handleAnalyzeData = useCallback(async () => {
    if (!processedFile) return;

    // Convert data to sample for analysis (take first few items if array)
    const sampleData = Array.isArray(processedFile.data)
      ? (processedFile.data.slice(0, 5) as Array<Record<string, unknown>>)
      : [processedFile.data as Record<string, unknown>];

    await analyzeSchema(processedFile.schema, sampleData, processedFile.name);
  }, [processedFile, analyzeSchema]);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${Number.parseFloat((bytes / k ** i).toFixed(1))} ${sizes[i]}`;
  };

  const formatProgress = (progress: ParseProgress) => {
    if (progress.isStreaming && progress.currentCount) {
      return `Streaming... ${progress.currentCount.toLocaleString()} items`;
    }
    return `${Math.round(progress.progress)}% (${formatBytes(progress.processed)} / ${formatBytes(progress.total)})`;
  };

  return (
    <div className={cx("w-full", className)}>
      {!processedFile ? (
        <div
          className={cx(
            "text-left transition-colors",
            isDragOver && !isProcessing ? "opacity-50" : "",
            isProcessing && "opacity-50",
          )}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            onChange={handleFileSelect}
            className="hidden"
          />

          {isProcessing ? (
            <div className="flex flex-col items-center gap-3">
              <div className="animate-spin h-5 w-5 border-2 border-blue-600 border-t-transparent" />
              <div className="text-center">
                <p className="text-gray-600 font-medium text-sm">
                  Processing file...
                </p>
                {parseProgress && (
                  <div className="mt-2">
                    <div className="w-48 bg-gray-200 h-1 mx-auto">
                      <div
                        className="bg-blue-600 h-1 transition-all duration-300"
                        style={{ width: `${parseProgress.progress}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1 font-mono">
                      {formatProgress(parseProgress)}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div>
              <p className="text-sm text-gray-600 mb-3 max-w-sm leading-relaxed">
                Drop a file here for automatic data visualization and schema
                inference.{" "}
                <button
                  type="button"
                  onClick={handleBrowseClick}
                  className="text-blue-600 hover:text-blue-700 underline underline-offset-2 font-medium"
                >
                  Browse files.
                </button>
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-12">
          {/* Header */}
          <Subtitle2>Dataset</Subtitle2>
          <div className="flex items-center justify-between pb-4 border-b border-gray-200">
            <div className="flex flex-col gap-1">
              <h3 className="text-sm font-semibold text-gray-900 font-mono">
                {processedFile.name}
              </h3>
              <p className="text-xs text-gray-600 font-mono">
                {formatBytes(processedFile.size)} •{" "}
                {processedFile.objectCount.toLocaleString()} objects
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={clearFile}
                className="px-3 py-1.5 text-xs text-gray-600 hover:text-gray-800 border border-gray-300 hover:bg-gray-50"
              >
                Clear
              </button>
            </div>
          </div>

          {/* Static analysis */}
          <div>
            <DataStats
              data={
                Array.isArray(processedFile.data)
                  ? (processedFile.data as Array<Record<string, unknown>>)
                  : [processedFile.data as Record<string, unknown>]
              }
            />
          </div>

          {/* Schema and Raw Data */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <Subtitle2>Schema</Subtitle2>
              <SchemaInspector schema={processedFile.schema} />
            </div>
            <div>
              <Subtitle2>Data Preview</Subtitle2>
              <JsonViewer
                data={processedFile.data}
                objectCount={processedFile.objectCount}
                fileSize={processedFile.size}
              />
            </div>
          </div>

          {/* Data Insights */}
          <div>
            <ProactiveDataAnalysis
              data={
                Array.isArray(processedFile.data)
                  ? (processedFile.data as Array<Record<string, unknown>>)
                  : [processedFile.data as Record<string, unknown>]
              }
              fileName={processedFile.name}
              semanticFields={insights?.semanticAnalysis}
            />
          </div>

          {/* AI Analysis */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <button
                type="button"
                onClick={handleAnalyzeData}
                disabled={analyzeLoading}
                className={cx(
                  "px-3 py-1 text-xs font-medium border",
                  !analyzeLoading && "hidden",
                  analyzeLoading
                    ? "bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200"
                    : "bg-white text-gray-700 hover:bg-gray-50 border-gray-300",
                )}
              >
                {analyzeLoading ? "Analyzing..." : "Run Analysis"}
              </button>
            </div>
            {(insights || analyzeLoading || analyzeError) && (
              <>
                {insights && (
                  <DataInsights
                    insights={insights}
                    isLoading={analyzeLoading}
                    error={analyzeError}
                    onFieldSelect={(field) => {
                      console.log("Selected field:", field);
                    }}
                    onQuestionSelect={(question) => {
                      if (processedFile && onQuestionSelect) {
                        const dataArray = Array.isArray(processedFile.data)
                          ? (processedFile.data as Array<
                              Record<string, unknown>
                            >)
                          : [processedFile.data as Record<string, unknown>];
                        onQuestionSelect(question, dataArray, {
                          semanticAnalysis: insights.semanticAnalysis,
                          visualizationRecommendations:
                            insights.visualizationRecommendations,
                        });
                      }
                    }}
                  />
                )}
                {!insights && (analyzeLoading || analyzeError) && (
                  <div className="bg-white border border-gray-200 h-80">
                    <div className="bg-gray-50 border-b border-gray-200 p-3">
                      <div className="text-sm font-medium text-gray-900">
                        AI Data Analysis
                      </div>
                    </div>
                    <div className="p-4 h-64 overflow-y-auto">
                      {analyzeLoading && (
                        <div className="flex items-center justify-center h-full">
                          <div className="text-center">
                            <div className="animate-spin h-6 w-6 border-2 border-blue-600 border-t-transparent mx-auto mb-3" />
                            <p className="text-sm text-gray-600">
                              Analyzing data...
                            </p>
                          </div>
                        </div>
                      )}
                      {analyzeError && (
                        <div className="p-3 bg-red-50 border border-red-200">
                          <p className="text-sm text-red-600">{analyzeError}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}
    </div>
  );
};
